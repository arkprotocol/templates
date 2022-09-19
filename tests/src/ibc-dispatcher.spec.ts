import { CosmWasmSigner, Link, testutils } from "@confio/relayer";
import { assert } from "@cosmjs/utils";
import test from "ava";

const { osmosis: oldOsmo, setup, wasmd } = testutils;
const osmosis = { ...oldOsmo, minFee: "0.025uosmo" };

import { ibcPingResponse, sendPing, showConnections } from "./controller";
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
let osmoCodeIds: Record<string, number> = {};

const WASM_FILE_IBC_DISPATCHER_CONTRACT = "./internal/ibc_dispatcher.wasm";
const WASM_FILE_IBC_CONTROLLER_CONTRACT = "./internal/ibc_controller.wasm";
const WASM_FILE_ECHO_CONTRACT = "./internal/echo.wasm";

//Upload contracts to chains.
test.before(async (t) => {
  console.debug("Upload contract to wasmd...");
  const wasmContracts = {
    ibcControllerContract: WASM_FILE_IBC_CONTROLLER_CONTRACT,
    ibcDispatcherContract: WASM_FILE_IBC_DISPATCHER_CONTRACT,
  };
  const wasmSign = await setupWasmClient();
  wasmCodeIds = await setupContracts(wasmSign, wasmContracts);

  console.debug("Upload contract to osmosis...");
  const osmosisContracts = {
    echoContract: WASM_FILE_ECHO_CONTRACT,
    ibcDispatcherContract: WASM_FILE_IBC_DISPATCHER_CONTRACT,
  };
  const osmosisSign = await setupOsmosisClient();
  osmoCodeIds = await setupContracts(osmosisSign, osmosisContracts);

  t.pass();
});

//Test that we init contracts correctly.
// test.serial(
//   "set up ibc controller and ibc dispatcher on Wasm chain, echo and ibc dispatcher on chain Osmo and a channel between dispatcher contract on each chain",
//   async (t) => {
//     // instantiate ibc contract on wasmd
//     const wasmClient = await setupWasmClient();
//     const msg = {};
//     const { contractAddress: wasmIbcDispatcherContractAddress } =
//       await wasmClient.sign.instantiate(
//         wasmClient.senderAddress,
//         wasmCodeIds.ibcDispatcherContract,
//         msg,
//         "wasm IBC Dispatcher contract",
//         "auto"
//       );
//     // assert address is returned
//     t.log(
//       `Wasm IBC Dispatcher contract address: ${wasmIbcDispatcherContractAddress}`
//     );
//     t.truthy(wasmIbcDispatcherContractAddress);
//     // assert contract is instantiated
//     const { ibcPortId: wasmIbcDispatcherContractIbcPortId } =
//       await wasmClient.sign.getContract(wasmIbcDispatcherContractAddress);
//     t.log(`Wasm IBC Dispatcher port id: ${wasmIbcDispatcherContractIbcPortId}`);
//     assert(wasmIbcDispatcherContractIbcPortId);

//     // instantiate IBC Controller contract on wasmd
//     t.log(`Instantiate Wasm IBC Controller`);
//     const { contractAddress: wasmIbcControllerContractAddress } =
//       await wasmClient.sign.instantiate(
//         wasmClient.senderAddress,
//         wasmCodeIds.ibcControllerContract,
//         msg,
//         "wasm IBC Controller contract",
//         "auto"
//       );
//     // assert address is returned
//     t.log(
//       `Wasm IBC Controller contract address: ${wasmIbcControllerContractAddress}`
//     );
//     t.truthy(wasmIbcControllerContractAddress);
//     // assert contract is instantiated
//     const { address: wasmIbcControllerContractAddressResponse } =
//       await wasmClient.sign.getContract(wasmIbcControllerContractAddress);
//     t.log(
//       `Wasm IBC Controller contract response: ${wasmIbcControllerContractAddressResponse}`
//     );
//     assert(wasmIbcControllerContractAddressResponse);

//     // instantiate IBC Dispatcher contract on osmosis
//     const osmoClient = await setupOsmosisClient();
//     const { contractAddress: osmoIbcDispatcherContractAddress } =
//       await osmoClient.sign.instantiate(
//         osmoClient.senderAddress,
//         osmoCodeIds.ibcDispatcherContract,
//         msg,
//         "osmosis IBC Dispatcher contract",
//         "auto"
//       );
//     // assert address is returned
//     t.log(`Osmo contract address: ${osmoIbcDispatcherContractAddress}`);
//     t.truthy(osmoIbcDispatcherContractAddress);
//     // assert contract is instantiated
//     const { ibcPortId: osmoIbcDispatcherContractIbcPortId } =
//       await osmoClient.sign.getContract(osmoIbcDispatcherContractAddress);
//     t.log(`Osmo IBC port id: ${osmoIbcDispatcherContractIbcPortId}`);
//     assert(osmoIbcDispatcherContractIbcPortId);

//     // instantiate Echo contract on osmosis
//     const { contractAddress: osmoEchoContractAddress } =
//       await osmoClient.sign.instantiate(
//         osmoClient.senderAddress,
//         osmoCodeIds.echoContract,
//         msg,
//         "osmosis Echo contract",
//         "auto"
//       );
//     // assert address is returned
//     t.log(`Osmo Echo contract address: ${osmoEchoContractAddress}`);
//     t.truthy(osmoEchoContractAddress);
//     // assert contract is instantiated
//     const { address: osmoEchoContractAddressResponse } =
//       await osmoClient.sign.getContract(osmoEchoContractAddress);
//     t.log(`Osmo Echo contract response: ${osmoEchoContractAddressResponse}`);
//     assert(osmoEchoContractAddressResponse);

//     // create a channel between both ibc contracts
//     // - create ibc client for each chain
//     t.log(`Create Osmo and Wasm clients`);
//     const [ibcClientWasmChain, ibcClientOsmoChain] = await setup(
//       wasmd,
//       osmosis
//     );
//     t.log(`Create connections between both chains`);
//     // - create connection between both chains
//     const link = await Link.createWithNewConnections(
//       ibcClientWasmChain,
//       ibcClientOsmoChain
//     );
//     t.log(`Create channel between both IBC Dispatcher contracts`);
//     // - create channel between ibc contract on wasm chain and ibc contract on osmo chain
//     const channelPair = await link.createChannel(
//       "A", // initialize from left side (A)
//       wasmIbcDispatcherContractIbcPortId,
//       osmoIbcDispatcherContractIbcPortId,
//       IbcOrder,
//       IbcVersion
//     );
//     assert(channelPair.src);
//     assert(channelPair.dest);
//   }
// );

//This is the setupInfo we pass, to make sure we don't forget any data we need.
interface SetupInfo {
  wasmClient: CosmWasmSigner;
  osmoClient: CosmWasmSigner;
  wasmIbcDispatcherContractAddress: string;
  wasmIbcControllerContractAddress: string;
  osmoIbcDispatcherContractAddress: string;
  osmoEchoContractAddress: string;
  link: Link;
}

//A setup function to init the contracts for tests.
async function demoSetup(): Promise<SetupInfo> {
  // instantiate ibc contract on wasmd
  const wasmClient = await setupWasmClient();
  const msg = {};
  const { contractAddress: wasmIbcDispatcherContractAddress } =
    await wasmClient.sign.instantiate(
      wasmClient.senderAddress,
      wasmCodeIds.ibcDispatcherContract,
      msg,
      "wasm IBC Dispatcher contract",
      "auto"
    );
  console.log(
    `Wasm IBC Dispatcher contract address: ${wasmIbcDispatcherContractAddress}`
  );
  // assert contract is instantiated
  const { ibcPortId: wasmIbcDispatcherContractIbcPortId } =
    await wasmClient.sign.getContract(wasmIbcDispatcherContractAddress);
  assert(wasmIbcDispatcherContractIbcPortId);

  // instantiate IBC Controller contract on wasmd
  const { contractAddress: wasmIbcControllerContractAddress } =
    await wasmClient.sign.instantiate(
      wasmClient.senderAddress,
      wasmCodeIds.ibcControllerContract,
      msg,
      "wasm IBC Controller contract",
      "auto"
    );
  console.log(
    `Wasm IBC Controller contract address: ${wasmIbcControllerContractAddress}`
  );
  // assert contract is instantiated
  const { address: wasmIbcControllerContractAddressResponse } =
    await wasmClient.sign.getContract(wasmIbcControllerContractAddress);
  console.log(
    `Wasm IBC Controller contract address response: ${wasmIbcControllerContractAddressResponse}`
  );
  assert(wasmIbcControllerContractAddressResponse);

  // instantiate IBC Dispatcher contract on osmosis
  const osmoClient = await setupOsmosisClient();
  const { contractAddress: osmoIbcDispatcherContractAddress } =
    await osmoClient.sign.instantiate(
      osmoClient.senderAddress,
      osmoCodeIds.ibcDispatcherContract,
      msg,
      "osmosis IBC Dispatcher contract",
      "auto"
    );
  console.log(
    `Osmo IBC Dispatcher contract address: ${osmoIbcDispatcherContractAddress}`
  );
  // assert contract is instantiated
  const { ibcPortId: osmoIbcDispatcherContractIbcPortId } =
    await osmoClient.sign.getContract(osmoIbcDispatcherContractAddress);
  assert(osmoIbcDispatcherContractIbcPortId);

  // instantiate Echo contract on osmosis
  const { contractAddress: osmoEchoContractAddress } =
    await osmoClient.sign.instantiate(
      osmoClient.senderAddress,
      osmoCodeIds.echoContract,
      msg,
      "osmo Echo contract",
      "auto"
    );
  console.log(`Osmo Echo contract address: ${osmoEchoContractAddress}`);
  // assert contract is instantiated
  const { address: osmoEchoContractAddressResponse } =
    await osmoClient.sign.getContract(osmoEchoContractAddress);
  console.log(
    `Osmo Echo contract address response: ${osmoEchoContractAddressResponse}`
  );
  assert(osmoEchoContractAddressResponse);

  // create a channel between both ibc contracts
  // - create ibc client for each chain
  console.log(`Create Osmo and Wasm clients`);
  const [ibcClientWasmChain, ibcClientOsomoChain] = await setup(wasmd, osmosis);
  // - create connection between both chains
  console.log(`Create connections between both chains`);
  const link = await Link.createWithNewConnections(
    ibcClientWasmChain,
    ibcClientOsomoChain
  );
  // - create channel between ibc contract on wasm chain and ibc contract on osmo chain
  console.log(`Create channel between both IBC Dispatcher contracts`);
  const channelPair = await link.createChannel(
    "A", // initialize from left side (A)
    wasmIbcDispatcherContractIbcPortId,
    osmoIbcDispatcherContractIbcPortId,
    IbcOrder,
    IbcVersion
  );
  assert(channelPair.src);
  assert(channelPair.dest);

  return {
    wasmClient,
    osmoClient,
    wasmIbcDispatcherContractAddress,
    wasmIbcControllerContractAddress,
    osmoIbcDispatcherContractAddress,
    osmoEchoContractAddress,
    link,
  };
}

test.serial("send echo from wasm to osmo chain", async (t) => {
  const {
    wasmClient,
    wasmIbcDispatcherContractAddress,
    osmoClient,
    osmoIbcDispatcherContractAddress,
    osmoEchoContractAddress,
    link,
  } = await demoSetup();

  // If init should send a packet to other chain, don't forget to relay it.
  // let info = await link.relayAll();
  // assertPacketsFromA(info, 1, true);

  // Query to see connections
  t.log("Get Wasm connections");
  const wasmConnections = (
    await showConnections(wasmClient, wasmIbcDispatcherContractAddress)
  ).connections;
  t.log("Get Osmo connections");
  const osmoConnections = (
    await showConnections(osmoClient, osmoIbcDispatcherContractAddress)
  ).connections;

  t.is(wasmConnections.length, 1);
  t.is(osmoConnections.length, 1);
  assert(wasmConnections[0]);
  t.is(wasmConnections[0], osmoConnections[0]);

  const channelId = wasmConnections[0];

  t.log(`Wasm channel ids: ${wasmConnections}`);
  t.log(`Osmo channel ids: ${osmoConnections}`);
  // Send dispatch msg
  const msg = {
    dispatch: {
      dispatcher_address: wasmIbcDispatcherContractAddress,
      channel: channelId,
      target_address: osmoEchoContractAddress,
      echo: "testecho",
    },
  };
  t.log(`Executing ${JSON.stringify(msg)} on channel ${channelId}`);
  const response = await sendPing(
    wasmClient,
    wasmIbcDispatcherContractAddress,
    msg
  );
  t.log(`>>>dispatch response: ${JSON.stringify(response)}`);

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
});
