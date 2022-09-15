import { CosmWasmSigner, Link, testutils } from "@confio/relayer";
import { assert } from "@cosmjs/utils";
import test from "ava";

const { osmosis: oldOsmo, setup, wasmd } = testutils;
const osmosis = { ...oldOsmo, minFee: "0.025uosmo" };

import {
  ibcPingResponse,
  sendPing,
  showConnections,
  showCounter,
} from "./controller";
import {
  assertAckSuccess,
  IbcOrder,
  IbcVersion,
  parseAcknowledgementSuccess,
  setupContracts,
  setupOsmosisClient,
  setupWasmClient,
} from "./utils";

// code ids from instantiated contracts
let wasmCodeIds: Record<string, number> = {};
let osmosisCodeIds: Record<string, number> = {};

const WASM_FILE = "./internal/ibc_dispatcher.wasm";

//Upload contracts to chains.
test.before(async (t) => {
  console.debug("Upload contract to wasmd...");
  const wasmContracts = {
    contract1: WASM_FILE,
  };
  const wasmSign = await setupWasmClient();
  wasmCodeIds = await setupContracts(wasmSign, wasmContracts);

  console.debug("Upload contract to osmosis...");
  const osmosisContracts = {
    contract1: WASM_FILE,
  };
  const osmosisSign = await setupOsmosisClient();
  osmosisCodeIds = await setupContracts(osmosisSign, osmosisContracts);

  t.pass();
});

//Test that we init contracts correctly.
test.serial("set up channel with contract", async (t) => {
  // instantiate ping on wasmd
  const wasmClient = await setupWasmClient();
  const msg = {};
  const { contractAddress: wasmContractAddress } =
    await wasmClient.sign.instantiate(
      wasmClient.senderAddress,
      wasmCodeIds.contract1,
      msg,
      "wasm contract 1",
      "auto"
    );
  t.log(`Wasm contract address: ${wasmContractAddress}`);
  t.truthy(wasmContractAddress);
  const { ibcPortId: wasmIbcPortId } = await wasmClient.sign.getContract(
    wasmContractAddress
  );
  t.log(`Wasm IBC port id: ${wasmIbcPortId}`);
  assert(wasmIbcPortId);

  // instantiate ping on osmosis
  const osmoClient = await setupOsmosisClient();
  const { contractAddress: osmoContractAddress } =
    await osmoClient.sign.instantiate(
      osmoClient.senderAddress,
      osmosisCodeIds.contract1,
      msg,
      "osmosis contract 1",
      "auto"
    );
  t.truthy(osmoContractAddress);
  t.log(`Osmo contract address: ${osmoContractAddress}`);
  const { ibcPortId: osmoIbcPortId } = await osmoClient.sign.getContract(
    osmoContractAddress
  );
  t.log(`Osmo IBC port id: ${osmoIbcPortId}`);
  assert(osmoIbcPortId);

  const [src, dest] = await setup(wasmd, osmosis);
  const link = await Link.createWithNewConnections(src, dest);
  await link.createChannel(
    "A",
    wasmIbcPortId,
    osmoIbcPortId,
    IbcOrder,
    IbcVersion
  );
});

//This is the setupInfo we pass, to make sure we don't forget any data we need.
interface SetupInfo {
  wasmClient: CosmWasmSigner;
  osmoClient: CosmWasmSigner;
  wasmContract1Address: string;
  osmoContract1Address: string;
  link: Link;
}

//A setup function to init the contracts for tests.
async function demoSetup(): Promise<SetupInfo> {
  // instantiate contract 1 on wasmd
  const wasmClient = await setupWasmClient();
  const msg = {};
  const { contractAddress: wasmContract1Address } =
    await wasmClient.sign.instantiate(
      wasmClient.senderAddress,
      wasmCodeIds.contract1,
      msg,
      "contract 1",
      "auto"
    );
  const { ibcPortId: wasmIbcPortId } = await wasmClient.sign.getContract(
    wasmContract1Address
  );
  assert(wasmIbcPortId);

  // instantiate contract 1 on osmosis
  const osmoClient = await setupOsmosisClient();

  const { contractAddress: osmoContract1Address } =
    await osmoClient.sign.instantiate(
      osmoClient.senderAddress,
      osmosisCodeIds.contract1,
      msg,
      "contract 1",
      "auto"
    );
  const { ibcPortId: osmoIbcPortId } = await osmoClient.sign.getContract(
    osmoContract1Address
  );
  assert(osmoIbcPortId);

  // create a connection and channel
  // - create ibc client for each chain
  const [ibcClientWasmChain, ibcClientOsomoChain] = await setup(wasmd, osmosis);
  // - create connection between both chains
  const link = await Link.createWithNewConnections(ibcClientWasmChain, ibcClientOsomoChain);
  // - create channel between contract on wasm chain and contract on osmo chain
  await link.createChannel(
    "A", // initialize from left side (A)
    wasmIbcPortId,
    osmoIbcPortId,
    IbcOrder,
    IbcVersion
  );

  return {
    wasmClient,
    osmoClient,
    wasmContract1Address,
    osmoContract1Address,
    link,
  };
}

test.serial("ping the remote chain", async (t) => {
  const {
    wasmClient,
    wasmContract1Address,
    osmoClient,
    osmoContract1Address,
    link,
  } = await demoSetup();

  // If init should send a packet to other chain, don't forget to relay it.
  // let info = await link.relayAll();
  // assertPacketsFromA(info, 1, true);

  // Query to see connections
  const wasmConnections = (
    await showConnections(wasmClient, wasmContract1Address)
  ).connections;
  const osmoConnections = (
    await showConnections(osmoClient, osmoContract1Address)
  ).connections;

  t.is(wasmConnections.length, 1);
  t.is(osmoConnections.length, 1);
  assert(wasmConnections[0]);
  t.is(wasmConnections[0], osmoConnections[0]);

  const channelId = wasmConnections[0];

  t.log(`Wasm channel id: ${wasmConnections[0]}`);
  t.log(`Osmo channel id: ${osmoConnections[0]}`);
  //Send msg with ping
  await sendPing(wasmClient, wasmContract1Address, channelId);

  //relay
  const info = await link.relayAll();

  //Verify we got a success
  assertAckSuccess(info.acksFromB);

  //Get the parsed ack result
  const ackResult: ibcPingResponse = parseAcknowledgementSuccess(
    info.acksFromB[0]
  );

  //Assert it is pong.
  t.is(ackResult.result, "pong");

  const wasmCounter = (
    await showCounter(wasmClient, wasmContract1Address, channelId)
  ).count;

  t.is(wasmCounter, 1);
  t.log(`Wasm counter: ${wasmCounter}`);

  const osmoCounter = (
    await showCounter(osmoClient, osmoContract1Address, channelId)
  ).count;

  t.is(osmoCounter, 0);
  t.log(`Wasm counter: ${osmoCounter}`);
});
