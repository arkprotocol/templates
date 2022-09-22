import { CosmWasmSigner, Link, testutils } from "@confio/relayer";
import { assert } from "@cosmjs/utils";
import test from "ava";

const { osmosis: oldOsmo, setup, wasmd } = testutils;
const osmosis = { ...oldOsmo, minFee: "0.025uosmo" };

import { executeContract } from "./controller";
import {
  assertAckSuccess,
  IbcOrder,
  IbcVersion,
  parseAcknowledgementSuccess,
  setupAll,
  SetupInfo,
  setupOsmosisClient,
  setupWasmClient,
} from "./utils";

let wasmCodeIds: Record<string, number> = {};
let osmoCodeIds: Record<string, number> = {};

const WASM_FILE = "./internal/ibc_example.wasm";

//Upload contracts to chains.
test.before(async (t) => {
  const contracts = {
    ping: WASM_FILE,
  };
  const chainInfo = await setupAll(contracts, contracts);
  wasmCodeIds = chainInfo.wasmCodeIds;
  osmoCodeIds = chainInfo.wasmCodeIds;

  t.pass();
});

//Test that we init contracts correctly.
test.serial("set up channel with ping contract", async (t) => {
  // instantiate ping on wasmd
  const wasmClient = await setupWasmClient();
  const initPing = {};
  const { contractAddress: wasmContractAddress } =
    await wasmClient.sign.instantiate(
      wasmClient.senderAddress,
      wasmCodeIds.ping,
      initPing,
      "simple ping",
      "auto"
    );
  t.truthy(wasmContractAddress);
  const { ibcPortId: wasmContractIbcPortId } =
    await wasmClient.sign.getContract(wasmContractAddress);
  t.log(`Wasm ping Port: ${wasmContractIbcPortId}`);
  assert(wasmContractIbcPortId);

  // instantiate ping on osmosis
  const osmoClient = await setupOsmosisClient();
  const { contractAddress: osmoContractAddress } =
    await osmoClient.sign.instantiate(
      osmoClient.senderAddress,
      osmoCodeIds.ping,
      initPing,
      "simple ping",
      "auto"
    );
  t.truthy(osmoContractAddress);
  const { ibcPortId: osmoContractIbcPortId } =
    await osmoClient.sign.getContract(osmoContractAddress);
  t.log(`Osmo ping Port: ${osmoContractIbcPortId}`);
  assert(osmoContractIbcPortId);

  const [src, dest] = await setup(wasmd, osmosis);
  const link = await Link.createWithNewConnections(src, dest);
  await link.createChannel(
    "A",
    wasmContractIbcPortId,
    osmoContractIbcPortId,
    IbcOrder,
    IbcVersion
  );
});

//A setup function to init the contracts for tests.
async function demoSetup(): Promise<SetupInfo> {
  // instantiate ping on wasmd
  const wasmClient = await setupWasmClient();
  const initPing = {};
  const { contractAddress: wasmContractAddress } =
    await wasmClient.sign.instantiate(
      wasmClient.senderAddress,
      wasmCodeIds.ping,
      initPing,
      "simple ping",
      "auto"
    );
  const { ibcPortId: wasmContractIbcPortId } =
    await wasmClient.sign.getContract(wasmContractAddress);
  assert(wasmContractIbcPortId);

  // instantiate ping on osmosis
  const osmoClient = await setupOsmosisClient();

  const { contractAddress: osmoContractAddress } =
    await osmoClient.sign.instantiate(
      osmoClient.senderAddress,
      osmoCodeIds.ping,
      initPing,
      "simple ping",
      "auto"
    );
  const { ibcPortId: osmoContractIbcPortId } =
    await osmoClient.sign.getContract(osmoContractAddress);
  assert(osmoContractIbcPortId);

  // create a connection and channel
  const [src, dest] = await setup(wasmd, osmosis);
  const link = await Link.createWithNewConnections(src, dest);
  await link.createChannel(
    "A",
    wasmContractIbcPortId,
    osmoContractIbcPortId,
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
  const {
    wasmClient,
    wasmContractAddress,
    osmoClient,
    osmoContractAddress,
    link,
  } = await demoSetup();

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
  const info = await link.relayAll();

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
  t.log(`Wasm counter: ${osmoCounter}`);
});
