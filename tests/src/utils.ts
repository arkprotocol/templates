import { readFileSync } from "fs";

import {
  AckWithMetadata,
  CosmWasmSigner,
  Link,
  RelayInfo,
  testutils,
} from "@confio/relayer";
import { fromBase64, fromUtf8 } from "@cosmjs/encoding";
import { assert } from "@cosmjs/utils";
import { Order } from "cosmjs-types/ibc/core/channel/v1/channel";

const {
  fundAccount,
  generateMnemonic,
  osmosis: oldOsmo,
  signingCosmWasmClient,
  wasmd,
} = testutils;

const osmosis = { ...oldOsmo, minFee: "0.025uosmo" };

export const IbcVersion = "ping-1";
export const IbcOrder = Order.ORDER_UNORDERED;

export interface ChainInfo {
  wasmClient: CosmWasmSigner;
  osmoClient: CosmWasmSigner;
  wasmCodeIds: Record<string, number>;
  osmoCodeIds: Record<string, number>;
}

//This is the setupInfo we pass, to make sure we don't forget any data we need.
export interface SetupInfo {
  wasmClient: CosmWasmSigner;
  osmoClient: CosmWasmSigner;
  wasmContractAddress: string;
  osmoContractAddress: string;
  link: Link;
}

export async function setupAll(
  wasmContracts: Record<string, string>,
  osmoContracts: Record<string, string>
): Promise<ChainInfo> {
  console.debug("Upload contract to wasmd...");
  const wasmClient = await setupWasmClient();
  const wasmCodeIds = await setupContracts(wasmClient, wasmContracts);

  console.debug("Upload contract to osmosis...");
  const osmoClient = await setupOsmosisClient();
  const osmoCodeIds = await setupContracts(osmoClient, osmoContracts);
  return {
    wasmClient,
    osmoClient,
    wasmCodeIds,
    osmoCodeIds,
  };
}
/**
 * Stores contracts (wasm files) into chain and returns contracts containing code ids.
 *
 * @param cosmwasm
 * @param contracts key-value pair where key is contract and value path to wasm file
 * @returns a key-value pair where key is contract and value contains code id
 */
export async function setupContracts(
  cosmwasm: CosmWasmSigner,
  contracts: Record<string, string>
): Promise<Record<string, number>> {
  const results: Record<string, number> = {};

  for (const name in contracts) {
    const path = contracts[name];
    console.info(`Storing ${name} from ${path}...`);
    const wasm = await readFileSync(path);
    const receipt = await cosmwasm.sign.upload(
      cosmwasm.senderAddress,
      wasm,
      "auto", // auto fee
      `Upload ${name}` // memo
    );
    console.debug(`Uploaded ${name} with CodeID: ${receipt.codeId}`);
    results[name] = receipt.codeId;
  }

  return results;
}

/**
 * This creates a client for the Wasmd chain, that can interact with contracts.
 *
 * @param mnemonic optional, by default it generates a mnemonic
 * @returns
 */
export async function setupWasmClient(
  mnemonic = generateMnemonic()
): Promise<CosmWasmSigner> {
  // create apps and fund an account
  const cosmwasm = await signingCosmWasmClient(wasmd, mnemonic);
  await fundAccount(wasmd, cosmwasm.senderAddress, "4000000");
  return cosmwasm;
}

/**
 * This creates a client for the Osmosis chain, that can interact with contracts.
 *
 * @param mnemonic optional, by default it generates a mnemonic
 * @returns
 */
export async function setupOsmosisClient(
  mnemonic = generateMnemonic()
): Promise<CosmWasmSigner> {
  // create apps and fund an account
  const cosmwasm = await signingCosmWasmClient(osmosis, mnemonic);
  await fundAccount(osmosis, cosmwasm.senderAddress, "4000000");
  return cosmwasm;
}

// throws error if not all are success
export function assertAckSuccess(acks: AckWithMetadata[]) {
  for (const ack of acks) {
    const parsed = JSON.parse(fromUtf8(ack.acknowledgement));
    if (parsed.error) {
      throw new Error(`Unexpected error in ack: ${parsed.error}`);
    }
    if (!parsed.result) {
      throw new Error(`Ack result unexpectedly empty`);
    }
  }
}

// throws error if not all are errors
export function assertAckErrors(acks: AckWithMetadata[]) {
  for (const ack of acks) {
    const parsed = JSON.parse(fromUtf8(ack.acknowledgement));
    if (parsed.result) {
      throw new Error(`Ack result unexpectedly set`);
    }
    if (!parsed.error) {
      throw new Error(`Ack error unexpectedly empty`);
    }
  }
}

export function assertPacketsFromA(
  relay: RelayInfo,
  count: number,
  success: boolean
) {
  if (relay.packetsFromA !== count) {
    throw new Error(`Expected ${count} packets, got ${relay.packetsFromA}`);
  }
  if (relay.acksFromB.length !== count) {
    throw new Error(`Expected ${count} acks, got ${relay.acksFromB.length}`);
  }
  if (success) {
    assertAckSuccess(relay.acksFromB);
  } else {
    assertAckErrors(relay.acksFromB);
  }
}

export function assertPacketsFromB(
  relay: RelayInfo,
  count: number,
  success: boolean
) {
  if (relay.packetsFromB !== count) {
    throw new Error(`Expected ${count} packets, got ${relay.packetsFromB}`);
  }
  if (relay.acksFromA.length !== count) {
    throw new Error(`Expected ${count} acks, got ${relay.acksFromA.length}`);
  }
  if (success) {
    assertAckSuccess(relay.acksFromA);
  } else {
    assertAckErrors(relay.acksFromA);
  }
}

export function parseAcknowledgementSuccess<T>(ack: AckWithMetadata): T {
  const response = JSON.parse(fromUtf8(ack.acknowledgement));
  assert(response.result);
  return JSON.parse(fromUtf8(fromBase64(response.result)));
}
