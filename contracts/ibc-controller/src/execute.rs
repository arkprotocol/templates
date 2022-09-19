use cosmwasm_std::entry_point;
use cosmwasm_std::{DepsMut, Env, MessageInfo, Response, SubMsg, WasmMsg, to_binary, Reply, StdResult, StdError};
use ibc_dispatcher::msg::{ExecuteMsg as IbcDispatcherExecuteMsg};
use echo::msg::{ExecuteMsg as EchoExecuteMsg};

use crate::error::ContractError;
use crate::msg::{InstantiateMsg, ExecuteMsg};

const REPLY_ID_MINT: u64 = 0;

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn instantiate(
    _deps: DepsMut,
    _env: Env,
    _info: MessageInfo,
    _msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    Ok(Response::new()
      .add_attribute("action", "instantiate")
    )
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn execute(
    _deps: DepsMut,
    _env: Env,
    _info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::Dispatch { dispatcher_address, channel, target_address, echo } => execute_dispatch_local(dispatcher_address, channel, target_address, echo),
    }
}

fn execute_dispatch_local(dispatcher_address: String, channel: String, target_address: String, echo: String) -> Result<Response, ContractError> {
    let echo_execute_msg = EchoExecuteMsg::Echo { echo };
    let dispatch_msg = IbcDispatcherExecuteMsg::Dispatch { channel, target_address, msg: to_binary(&echo_execute_msg)? };
    let submessage = SubMsg::reply_on_success(
        WasmMsg::Execute {
            contract_addr: dispatcher_address.clone(),
            msg: to_binary(&dispatch_msg)?,
            funds: vec![],
        }, REPLY_ID_MINT);
    Ok(Response::new()
            .add_attribute("action", "execute_controller")
            .add_attribute("ibc-contract", dispatcher_address)
            .add_submessage(submessage)
    )
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn reply(deps: DepsMut, _env: Env, msg: Reply) -> StdResult<Response> {
    match msg.id {
        REPLY_ID_MINT => handle_target_contract_reply(deps, msg),
        id => Err(StdError::generic_err(format!("Unknown reply id: {}", id))),
    }
}

fn handle_target_contract_reply(_deps: DepsMut, _msg: Reply) -> StdResult<Response> {
    //let sub_msg_response = msg.result.unwrap();
    Ok(Response::new()
        .add_attribute("action", "handle_target_contract_reply")
    )
}

#[cfg(test)]
mod tests {}
