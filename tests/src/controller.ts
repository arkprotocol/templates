import { CosmWasmSigner } from "@confio/relayer";
import { ExecuteResult } from "@cosmjs/cosmwasm-stargate";

export interface ibcPingResponse {
  result: string;
}

export interface Connections {
  connections: string[];
}

export interface Counter {
  count: number;
}

export function showConnections(
  cosmwasm: CosmWasmSigner,
  contractAddr: string
): Promise<Connections> {
  const query = { get_connections: {} };
  return cosmwasm.sign.queryContractSmart(contractAddr, query);
}

export function showCounter(
  cosmwasm: CosmWasmSigner,
  contractAddr: string,
  channel: string
): Promise<Counter> {
  const query = { get_counter: { channel } };
  return cosmwasm.sign.queryContractSmart(contractAddr, query);
}

export function executeContract(
  client: CosmWasmSigner,
  contractAddr: string,
  msg: Record<string, unknown>
): Promise<ExecuteResult> {
  return client.sign.execute(
    client.senderAddress,
    contractAddr,
    msg,
    "auto", // fee
    undefined, // no memo
    undefined // no funds
  );
}
