import { CosmWasmSigner, Link, testutils } from "@confio/relayer";
import { assert } from "@cosmjs/utils";
import test from "ava";

const { osmosis: oldOsmo, setup, wasmd } = testutils;
const osmosis = { ...oldOsmo, minFee: "0.025uosmo" };

import {
  executeContract,
} from "./controller";
import {
  assertAckSuccess,
  IbcOrder,
  IbcVersion,
  parseAcknowledgementSuccess,
  setupContracts,
  SetupInfo,
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

//A setup function to init the contracts for tests.
async function demoSetup(): Promise<SetupInfo> {
  // instantiate ping on wasmd
  const wasmClient = await setupWasmClient();
  const initPing = {};
  const { contractAddress: wasmContractAddress } = await wasmClient.sign.instantiate(
    wasmClient.senderAddress,
    wasmIds.ping,
    initPing,
    "simple ping",
    "auto"
  );
  const { ibcPortId: wasmPingPort } = await wasmClient.sign.getContract(
    wasmContractAddress
  );
  assert(wasmPingPort);

  // instantiate ping on osmosis
  const osmoClient = await setupOsmosisClient();

  const { contractAddress: osmoContractAddress } = await osmoClient.sign.instantiate(
    osmoClient.senderAddress,
    osmosisIds.ping,
    initPing,
    "simple ping",
    "auto"
  );
  const { ibcPortId: osmoPingPort } = await osmoClient.sign.getContract(
    osmoContractAddress
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
    wasmContractAddress,
    osmoContractAddress,
    link,
  };
}

test.serial("ping the remote chain", async (t) => {
  const { wasmClient, wasmContractAddress, osmoClient, osmoContractAddress, link } =
    await demoSetup();

  // If init should send a packet to other chain, don't forget to relay it.
  // let info = await link.relayAll();
  // assertPacketsFromA(info, 1, true);

  // Query to see connections
  function showConnections(
    cosmwasm: CosmWasmSigner,
    contractAddr: string
  ): Promise<{connections: string[]}> {
    const query = { get_connections: {} };
    return cosmwasm.sign.queryContractSmart(contractAddr, query);
  }

  const wasmConnections = (await showConnections(wasmClient, wasmContractAddress))
    .connections;
  const osmoConnections = (await showConnections(osmoClient, osmoContractAddress))
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
  await executeContract(wasmClient, wasmContractAddress, msg);

  //relay
  const info = await link.relayAll();

  //Verify we got a success
  assertAckSuccess(info.acksFromB);

  //Get the parsed ack result
  const ackResult: {result: string} = parseAcknowledgementSuccess(
    info.acksFromB[0]
  );

  //Assert it is pong.
  t.is(ackResult.result, "pong");

  function showCounter(
    cosmwasm: CosmWasmSigner,
    contractAddr: string,
    channel: string
  ): Promise<{count: number}> {
    const query = { get_counter: { channel } };
    return cosmwasm.sign.queryContractSmart(contractAddr, query);
  }
  const wasmCounter = (await showCounter(wasmClient, wasmContractAddress, channelId))
    .count;

  t.is(wasmCounter, 1);
  t.log(`Wasm counter: ${wasmCounter}`);

  const osmoCounter = (await showCounter(osmoClient, osmoContractAddress, channelId))
    .count;

  t.is(osmoCounter, 0);
  t.log(`Wasm counter: ${osmoCounter}`);
});
