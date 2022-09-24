import { CosmWasmSigner } from "@confio/relayer";
import test from "ava";
import { Order } from "cosmjs-types/ibc/core/channel/v1/channel";

import { allTokens, mint, ownerOf, transfer } from "./cw721-utils";
import {
  assertAckSuccess,
  ChannelInfo,
  ContractInfo,
  ContractMsg,
  createIbcConnectionAndChannel,
  MNEMONIC,
  setupOsmosisClient,
  setupWasmClient,
  uploadAndInstantiateAll,
} from "./utils";

let wasmClient: CosmWasmSigner;
let osmoClient: CosmWasmSigner;

let wasmContractInfos: Record<string, ContractInfo> = {};
let osmoContractInfos: Record<string, ContractInfo> = {};
let wasmContractAddressCw721: string;
let wasmContractAddressIcs721: string;
let osmoContractAddressIcs721: string;

let channelInfo: ChannelInfo;

const WASM_FILE_CW721 = "./src/cw721_base.wasm";
const WASM_FILE_CW_ICS721_BRIDGE = "./src/cw_ics721_bridge.wasm";

//Upload contracts to chains.
test.before(async (t) => {
  wasmClient = await setupWasmClient(MNEMONIC);
  console.debug(
    `Wasm client ${wasmClient.senderAddress}, acount: ${JSON.stringify(
      wasmClient.sign.getAccount
    )}, balance: ${JSON.stringify(wasmClient.sign.getBalance)}`
  );
  osmoClient = await setupOsmosisClient(MNEMONIC);
  console.debug(
    `Osmo client ${osmoClient.senderAddress}, acount: ${JSON.stringify(
      osmoClient.sign.getAccount
    )}, balance: ${JSON.stringify(osmoClient.sign.getBalance)}`
  );

  const wasmContracts: Record<string, ContractMsg> = {
    cw721: {
      path: WASM_FILE_CW721,
      instantiateMsg: {
        name: "Ark NFT Multichain",
        symbol: "ArkAlpha",
        minter: wasmClient.senderAddress,
      },
    },
    ics721: {
      path: WASM_FILE_CW_ICS721_BRIDGE,
      instantiateMsg: { cw721_base_code_id: 0 },
    },
  };
  const osmoContracts: Record<string, ContractMsg> = {
    cw721: {
      path: WASM_FILE_CW721,
      instantiateMsg: undefined,
    },
    ics721: {
      path: WASM_FILE_CW_ICS721_BRIDGE,
      instantiateMsg: { cw721_base_code_id: 0 },
    },
  };
  const chainInfo = await uploadAndInstantiateAll(
    wasmClient,
    osmoClient,
    wasmContracts,
    osmoContracts
  );
  wasmContractInfos = chainInfo.wasmContractInfos;
  wasmContractAddressCw721 = wasmContractInfos.cw721.address as string;
  wasmContractAddressIcs721 = wasmContractInfos.ics721.address as string;
  osmoContractInfos = chainInfo.osmoContractInfos;
  osmoContractAddressIcs721 = osmoContractInfos.ics721.address as string;

  channelInfo = await createIbcConnectionAndChannel(
    chainInfo.wasmClient,
    chainInfo.osmoClient,
    wasmContractAddressIcs721,
    osmoContractAddressIcs721,
    Order.ORDER_UNORDERED,
    "ics721-1"
  );
  // console.log(`Channel created: ${JSON.stringify(channelInfo)}`);

  t.pass();
});

test.serial("transfer NFT", async (t) => {
  const token_id = "0001";
  const response = await mint(
    wasmClient,
    wasmContractAddressCw721,
    token_id,
    wasmClient.senderAddress,
    undefined
  );
  // assert token is minted
  t.is(1, response.logs.length);
  const allTokensResponse = await allTokens(
    wasmClient,
    wasmContractAddressCw721
  );
  t.log(`all tokens: ${JSON.stringify(allTokensResponse)}`);
  t.truthy(allTokensResponse);
  t.truthy(allTokensResponse.tokens);
  t.is(1, allTokensResponse.tokens.length);
  t.is("0001", allTokensResponse.tokens[0]);
  let tokenOwner = await ownerOf(
    wasmClient,
    wasmContractAddressCw721,
    token_id
  );
  t.is(wasmClient.senderAddress, tokenOwner.owner);

  const ibcMsg = {
    receiver: osmoClient.senderAddress, // wallet address of new owner on other side (osmo)
    channel_id: channelInfo.channel.src.channelId,
    timeout: {
      block: {
        revision: 1,
        height: 1000000, // set as high as possible for avoiding timeout
      },
    },
  };
  const transferResponse = await transfer(
    wasmClient,
    wasmContractAddressCw721,
    wasmContractAddressIcs721,
    ibcMsg,
    token_id
  );
  t.log(`>>>>transfer response ${JSON.stringify(transferResponse)}`);

  // relay
  const info = await channelInfo.link.relayAll();
  t.log(`>>>>relayed: ${JSON.stringify(info)}`);
  // Verify we got a success
  assertAckSuccess(info.acksFromB);

  // assert NFT on chain A is locked/owned by ICS contract
  tokenOwner = await ownerOf(wasmClient, wasmContractAddressCw721, token_id);
  t.is(wasmContractAddressIcs721, tokenOwner.owner);
});
