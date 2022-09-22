import { CosmWasmSigner } from "@confio/relayer";
import { assert } from "@cosmjs/utils";
import test from "ava";
import { Order } from "cosmjs-types/ibc/core/channel/v1/channel";

import { executeContract } from "./controller";
import {
  assertAckSuccess,
  ChannelInfo,
  ContractInfo,
  ContractMsg,
  createIbcConnectionAndChannel,
  parseAcknowledgementSuccess,
  uploadAndInstantiateAll,
} from "./utils";

let wasmContractInfos: Record<string, ContractInfo> = {};
let osmoContractInfos: Record<string, ContractInfo> = {};
let wasmClient: CosmWasmSigner;
let osmoClient: CosmWasmSigner;
let channelInfo: ChannelInfo;

const WASM_FILE = "./internal/ibc_example.wasm";

//Upload contracts to chains.
test.before(async (t) => {
  const contracts: Record<string, ContractMsg> = {
    ping: {
      path: WASM_FILE,
      instantiateMsg: {},
    },
  };
  const chainInfo = await uploadAndInstantiateAll(contracts, contracts);
  wasmContractInfos = chainInfo.wasmContractInfos;
  osmoContractInfos = chainInfo.osmoContractInfos;
  wasmClient = chainInfo.wasmClient;
  osmoClient = chainInfo.osmoClient;

  channelInfo = await createIbcConnectionAndChannel(
    chainInfo.wasmClient,
    chainInfo.osmoClient,
    chainInfo.wasmContractInfos["ping"].address,
    chainInfo.osmoContractInfos["ping"].address,
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

  const wasmContractAddress = wasmContractInfos.ping.address;
  const wasmConnections = (
    await showConnections(wasmClient, wasmContractAddress)
  ).connections;
  const osmoContractAddress = osmoContractInfos.ping.address;
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
  t.log(`Wasm counter: ${osmoCounter}`);
});
