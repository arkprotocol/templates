import { CosmWasmSigner, Link, testutils } from "@confio/relayer";
import { assert } from "@cosmjs/utils";
import test from "ava";

const { osmosis: oldOsmo, setup, wasmd } = testutils;
const osmosis = { ...oldOsmo, minFee: "0.025uosmo" };

import {
  ibcPingResponse,
  executeContract,
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

let wasmIds: Record<string, number> = {};
let osmosisIds: Record<string, number> = {};

//Upload contracts to chains.
test.before(async (t) => {
  console.debug("Upload contract to wasmd...");
  const wasmContracts = {
    ping: "./internal/ibc_example.wasm",
  };
  const wasmSign = await setupWasmClient();
  wasmIds = await setupContracts(wasmSign, wasmContracts);

  console.debug("Upload contract to osmosis...");
  const osmosisContracts = {
    ping: "./internal/ibc_example.wasm",
  };
  const osmosisSign = await setupOsmosisClient();
  osmosisIds = await setupContracts(osmosisSign, osmosisContracts);

  t.pass();
});

//Test that we init contracts correctly.
test.serial("set up channel with ping contract", async (t) => {
  // instantiate ping on wasmd
  const wasmClient = await setupWasmClient();
  const initPing = {};
  const { contractAddress: wasmCont } = await wasmClient.sign.instantiate(
    wasmClient.senderAddress,
    wasmIds.ping,
    initPing,
    "simple ping",
    "auto"
  );
  t.truthy(wasmCont);
  const { ibcPortId: wasmPingPort } = await wasmClient.sign.getContract(
    wasmCont
  );
  t.log(`Wasm ping Port: ${wasmPingPort}`);
  assert(wasmPingPort);

  // instantiate ping on osmosis
  const osmoClient = await setupOsmosisClient();
  const { contractAddress: osmoHost } = await osmoClient.sign.instantiate(
    osmoClient.senderAddress,
    osmosisIds.ping,
    initPing,
    "simple ping",
    "auto"
  );
  t.truthy(osmoHost);
  const { ibcPortId: osmoPingPort } = await osmoClient.sign.getContract(
    osmoHost
  );
  t.log(`Osmo ping Port: ${osmoPingPort}`);
  assert(osmoPingPort);

  const [src, dest] = await setup(wasmd, osmosis);
  const link = await Link.createWithNewConnections(src, dest);
  await link.createChannel(
    "A",
    wasmPingPort,
    osmoPingPort,
    IbcOrder,
    IbcVersion
  );
});

//This is the setupInfo we pass, to make sure we don't forget any data we need.
interface SetupInfo {
  wasmClient: CosmWasmSigner;
  osmoClient: CosmWasmSigner;
  wasmPing: string;
  osmoPing: string;
  link: Link;
}

//A setup function to init the contracts for tests.
async function demoSetup(): Promise<SetupInfo> {
  // instantiate ping on wasmd
  const wasmClient = await setupWasmClient();
  const initPing = {};
  const { contractAddress: wasmPing } = await wasmClient.sign.instantiate(
    wasmClient.senderAddress,
    wasmIds.ping,
    initPing,
    "simple ping",
    "auto"
  );
  const { ibcPortId: wasmPingPort } = await wasmClient.sign.getContract(
    wasmPing
  );
  assert(wasmPingPort);

  // instantiate ping on osmosis
  const osmoClient = await setupOsmosisClient();

  const { contractAddress: osmoPing } = await osmoClient.sign.instantiate(
    osmoClient.senderAddress,
    osmosisIds.ping,
    initPing,
    "simple ping",
    "auto"
  );
  const { ibcPortId: osmoPingPort } = await osmoClient.sign.getContract(
    osmoPing
  );
  assert(osmoPingPort);

  // create a connection and channel
  const [src, dest] = await setup(wasmd, osmosis);
  const link = await Link.createWithNewConnections(src, dest);
  await link.createChannel(
    "A",
    wasmPingPort,
    osmoPingPort,
    IbcOrder,
    IbcVersion
  );

  // You Can create more channels on the same connection.

  // also create a ics20 channel on this connection
  // const ics20Info = await link.createChannel(
  //   "A",
  //   wasmd.ics20Port,
  //   osmosis.ics20Port,
  //   Order.ORDER_UNORDERED,
  //   "ics20-1"
  // );
  // const ics20 = {
  //   wasm: ics20Info.src.channelId,
  //   osmo: ics20Info.dest.channelId,
  // };

  return {
    wasmClient,
    osmoClient,
    wasmPing,
    osmoPing,
    link,
  };
}

test.serial("ping from wasm to osmo chain", async (t) => {
  const { wasmClient, wasmPing, osmoClient, osmoPing, link } =
    await demoSetup();

  // If init should send a packet to other chain, don't forget to relay it.
  // let info = await link.relayAll();
  // assertPacketsFromA(info, 1, true);

  // Query to see connections
  const wasmConnections = (await showConnections(wasmClient, wasmPing))
    .connections;
  const osmoConnections = (await showConnections(osmoClient, osmoPing))
    .connections;

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
  const pingResponse = await executeContract(wasmClient, wasmPing, msg);
  t.log(`>>>ping response: ${JSON.stringify(pingResponse)}`);

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

  const wasmCounter = (await showCounter(wasmClient, wasmPing, channelId))
    .count;

  t.is(wasmCounter, 1);
  t.log(`Wasm counter: ${wasmCounter}`);

  const osmoCounter = (await showCounter(osmoClient, osmoPing, channelId))
    .count;

  t.is(osmoCounter, 0);
  t.log(`Wasm counter: ${osmoCounter}`);
});
