import { CosmWasmSigner } from "@confio/relayer";
import test from "ava";
import { Order } from "cosmjs-types/ibc/core/channel/v1/channel";

import {
  allTokens,
  mint,
  ownerOf,
  transfer,
} from "./cw721-utils";
import {
  assertAckSuccess,
  ChannelInfo,
  ContractInfo,
  ContractMsg,
  createIbcConnectionAndChannel,
  OSMO_RELAYER_WALLET,
  uploadAndInstantiateAll,
  WASM_RELAYER_WALLET,
} from "./utils";

let wasmContractInfos: Record<string, ContractInfo> = {};
let osmoContractInfos: Record<string, ContractInfo> = {};
let wasmClient: CosmWasmSigner;
let osmoClient: CosmWasmSigner;
let channelInfo: ChannelInfo;

const WASM_FILE_CW721 = "./src/cw721_base.wasm";
const WASM_FILE_CW_ICS721_BRIDGE = "./src/cw_ics721_bridge.wasm";

//Upload contracts to chains.
test.before(async (t) => {
  const wasmContracts: Record<string, ContractMsg> = {
    cw721: {
      path: WASM_FILE_CW721,
      instantiateMsg: {
        name: "Ark NFT Multichain",
        symbol: "ArkAlpha",
        minter: WASM_RELAYER_WALLET,
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
      instantiateMsg: {
        name: "Ark NFT Multichain",
        symbol: "ArkAlpha",
        minter: OSMO_RELAYER_WALLET,
      },
    },
    ics721: {
      path: WASM_FILE_CW_ICS721_BRIDGE,
      instantiateMsg: { cw721_base_code_id: 0 },
    },
  };
  const chainInfo = await uploadAndInstantiateAll(wasmContracts, osmoContracts);
  wasmContractInfos = chainInfo.wasmContractInfos;
  osmoContractInfos = chainInfo.osmoContractInfos;
  wasmClient = chainInfo.wasmClient;
  osmoClient = chainInfo.osmoClient;

  channelInfo = await createIbcConnectionAndChannel(
    chainInfo.wasmClient,
    chainInfo.osmoClient,
    chainInfo.wasmContractInfos.ics721.address,
    chainInfo.osmoContractInfos.ics721.address,
    Order.ORDER_UNORDERED,
    "ics721-1"
  );

  t.pass();
});

test.serial("transfer NFT", async (t) => {
  const token_id = "0001";
  const response = await mint(
    wasmClient,
    wasmContractInfos.cw721.address,
    token_id,
    wasmClient.senderAddress,
    undefined
  );
  // assert token is minted
  t.is(1, response.logs.length);
  const allTokensResponse = await allTokens(
    wasmClient,
    wasmContractInfos.cw721.address
  );
  t.log(`all tokens: ${JSON.stringify(allTokensResponse)}`);
  t.truthy(allTokensResponse);
  t.truthy(allTokensResponse.tokens);
  t.is(1, allTokensResponse.tokens.length);
  t.is("0001", allTokensResponse.tokens[0]);
  let tokenOwner = await ownerOf(
    wasmClient,
    wasmContractInfos.cw721.address,
    token_id
  );
  t.is(WASM_RELAYER_WALLET, tokenOwner.owner);

  const ibcMsg = {
    receiver: OSMO_RELAYER_WALLET, // wallet address of new owner on other side (osmo)
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
    wasmContractInfos.cw721.address,
    wasmContractInfos.ics721.address,
    ibcMsg,
    token_id
  );
  t.log(`>>>>transfer response ${JSON.stringify(transferResponse)}`);

  //relay
  const info = await channelInfo.link.relayAll();
  t.log(`>>>>relayed: ${JSON.stringify(info)}`);
  //Verify we got a success
  assertAckSuccess(info.acksFromB);

  tokenOwner = await ownerOf(wasmClient, wasmContractInfos.cw721.address, token_id);
  t.is(wasmContractInfos.cw721.address, tokenOwner.owner);
});
