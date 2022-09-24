import { CosmWasmSigner } from "@confio/relayer";
import { assert } from "@cosmjs/utils";
import test from "ava";
import { Order } from "cosmjs-types/ibc/core/channel/v1/channel";

import { executeContract } from "./controller";
import {
  assertAckSuccess,
  ChannelInfo,
  ContractMsg,
  createIbcConnectionAndChannel,
  MNEMONIC,
  parseAcknowledgementSuccess,
  setupOsmosisClient,
  setupWasmClient,
  uploadAndInstantiateAll,
} from "./utils";

let wasmClient: CosmWasmSigner;
let osmoClient: CosmWasmSigner;

let wasmContractAddress: string;
let osmoContractAddress: string;

let channelInfo: ChannelInfo;

const WASM_FILE = "./internal/ibc_dispatcher.wasm";

//Upload contracts to chains.
test.before(async (t) => {
  wasmClient = await setupWasmClient(MNEMONIC);
  osmoClient = await setupOsmosisClient(MNEMONIC);
  const contracts: Record<string, ContractMsg> = {
    contract1: {
      path: WASM_FILE,
      instantiateMsg: {},
    },
  };
  const chainInfo = await uploadAndInstantiateAll(
    wasmClient,
    osmoClient,
    contracts,
    contracts
  );
  wasmContractAddress = chainInfo.wasmContractInfos.contract1.address as string;
  osmoContractAddress = chainInfo.osmoContractInfos.contract1.address as string;

  channelInfo = await createIbcConnectionAndChannel(
    chainInfo.wasmClient,
    chainInfo.osmoClient,
    wasmContractAddress,
    osmoContractAddress,
    Order.ORDER_UNORDERED,
    "ping-1"
  );

  t.pass();
});

test.serial("ping the remote chain", async (t) => {
  // If init should send a packet to other chain, don't forget to relay it.
  // let info = await link.relayAll();
  // assertPacketsFromA(info, 1, true);

  // Query to see connections
  function showConnections(
    cosmwasm: CosmWasmSigner,
    contractAddr: string
  ): Promise<{ connections: string[] }> {
    const query = { get_connections: {} };
    return cosmwasm.sign.queryContractSmart(contractAddr, query);
  }

  const wasmConnections = (
    await showConnections(wasmClient, wasmContractAddress)
  ).connections;
  const osmoConnections = (
    await showConnections(osmoClient, osmoContractAddress)
  ).connections;

  t.is(wasmConnections.length, 1);
  t.is(osmoConnections.length, 1);
  assert(wasmConnections[0]);
  t.is(wasmConnections[0], osmoConnections[0]);

  const channelId = wasmConnections[0];

  t.log(`Wasm channel id: ${wasmConnections[0]}`);
  t.log(`Osmo channel id: ${osmoConnections[0]}`);
  //Send msg with ping
  const msg = {
    ping: {
      channel: channelId,
    },
  };
  await executeContract(wasmClient, wasmContractAddress, msg);

  //relay
  const info = await channelInfo.link.relayAll();

  //Verify we got a success
  assertAckSuccess(info.acksFromB);

  //Get the parsed ack result
  const ackResult: { result: string } = parseAcknowledgementSuccess(
    info.acksFromB[0]
  );

  //Assert it is pong.
  t.is(ackResult.result, "pong");

  function showCounter(
    cosmwasm: CosmWasmSigner,
    contractAddr: string,
    channel: string
  ): Promise<{ count: number }> {
    const query = { get_counter: { channel } };
    return cosmwasm.sign.queryContractSmart(contractAddr, query);
  }
  const wasmCounter = (
    await showCounter(wasmClient, wasmContractAddress, channelId)
  ).count;

  t.is(wasmCounter, 1);
  t.log(`Wasm counter: ${wasmCounter}`);

  const osmoCounter = (
    await showCounter(osmoClient, osmoContractAddress, channelId)
  ).count;

  t.is(osmoCounter, 0);
  t.log(`Osmo counter: ${osmoCounter}`);
});
