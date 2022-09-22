import { CosmWasmSigner } from "@confio/relayer";
import { ExecuteResult } from "@cosmjs/cosmwasm-stargate";

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
