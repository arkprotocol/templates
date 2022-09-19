use cosmwasm_std::{entry_point, Binary, SubMsg, WasmMsg, Reply, StdResult, Response, StdError};
use cosmwasm_std::{from_binary, to_binary, DepsMut, Env, IbcPacketReceiveMsg, IbcReceiveResponse};

use crate::{ack::Ack, error::Never, ibc_msg::IbcExecuteMsg, ContractError};

const REPLY_ID_DISPATCH: u64 = 1;

/// Receives incoming IBC message from source cain and dispatches to contract in this target chain.
#[cfg_attr(not(feature = "library"), entry_point)]
pub fn ibc_packet_receive(
    deps: DepsMut,
    env: Env,
    msg: IbcPacketReceiveMsg,
) -> Result<IbcReceiveResponse, Never> {
    // Regardless of if our processing of this packet works we need to
    // commit an ACK to the chain. As such, we wrap all handling logic
    // in a seprate function and on error write out an error ack.
    match do_ibc_packet_receive(deps, env, msg) {
        Ok(response) => Ok(response),
        Err(error) => Ok(IbcReceiveResponse::new()
            .add_attribute("method", "ibc_packet_receive")
            .add_attribute("error", error.to_string())
            .set_ack(Ack::fail(error.to_string()))),
    }
}

pub fn do_ibc_packet_receive(
    deps: DepsMut,
    _env: Env,
    msg: IbcPacketReceiveMsg,
) -> Result<IbcReceiveResponse, ContractError> {
    // The channel this packet is being relayed along on this target chain.
    let msg: IbcExecuteMsg = from_binary(&msg.packet.data)?;

    match msg {
        IbcExecuteMsg::Dispatch {
            msg,
            target_address,
        } => dispatch_target_contract(deps, target_address, msg),
    }
}

pub fn dispatch_target_contract(
    _deps: DepsMut,
    contract_addr: String,
    msg: Binary,
) -> Result<IbcReceiveResponse, ContractError> {
    let msg = SubMsg::reply_on_success(
        WasmMsg::Execute {
            contract_addr,
            msg,
            funds: vec![],
        },
        REPLY_ID_DISPATCH,
    );
    // dispatch via sub message, no set_ack() needed since this is handled by reply (response.set_data() will be used as ack)
    Ok(IbcReceiveResponse::new()
        .add_attribute("method", "dispatch_target_contract")
        .add_submessage(msg))
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn reply(deps: DepsMut, _env: Env, msg: Reply) -> StdResult<Response> {
    match msg.id {
        REPLY_ID_DISPATCH => handle_target_contract_reply(deps, msg),
        id => Err(StdError::generic_err(format!("Unknown reply id: {}", id))),
    }
}

fn handle_target_contract_reply(_deps: DepsMut, msg: Reply) -> StdResult<Response> {
    // match reply.result {
    //     SubMsgResult::OK(response) => Ok(Response::new().set_data(response)),
    //     SubMsgResult::Error(error) => E
    // }

    let sub_msg_result = to_binary(&msg.result).unwrap();
    Ok(Response::new()
        .add_attribute("action", "handle_target_contract_reply")
        // set data will be handle as ack
        .set_data(sub_msg_result))
}
