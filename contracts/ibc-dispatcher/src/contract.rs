use cosmwasm_std::{
    entry_point, to_binary, Binary, Deps, DepsMut, Env, IbcMsg, IbcTimeout, MessageInfo, Order, Response,StdResult,
};
use cw2::set_contract_version;

use crate::{
    error::ContractError,
    ibc_msg::IbcExecuteMsg,
    msg::{ExecuteMsg, GetConnectionsResponse, InstantiateMsg, QueryMsg},
    state::CONNECTIONS,
};

const CONTRACT_NAME: &str = "crates.io:ap-ibc-dispatcher";
const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    _info: MessageInfo,
    _msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;
    Ok(Response::new().add_attribute("method", "instantiate"))
}

/// Receives msg in source chain to be dispatched on target chain.
#[cfg_attr(not(feature = "library"), entry_point)]
pub fn execute(
    _deps: DepsMut,
    env: Env,
    _info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::Dispatch {
            msg,
            channel,
            target_address,
        } => execute_dispatch_remote(env, msg, channel, target_address),
    }
}

/// Dispatch via channel to target chain by sending an IBC message.
fn execute_dispatch_remote(
    env: Env,
    msg: Binary,
    channel: String,
    target_address: String,
) -> Result<Response, ContractError> {
    let packet_msg = IbcMsg::SendPacket {
        channel_id: channel.clone(),
        data: to_binary(&IbcExecuteMsg::Dispatch {
            msg,
            target_address,
        })?,
        timeout: IbcTimeout::with_timestamp(env.block.time.plus_seconds(300)),
    };

    Ok(Response::new()
        .add_attribute("method", "execute_dispatch_remote")
        .add_attribute("channel", channel)
        .add_message(packet_msg))
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::GetConnections {} => to_binary(&query_connections(deps)?),
    }
}

fn query_connections(deps: Deps) -> StdResult<GetConnectionsResponse> {
    let connections: Vec<String> = CONNECTIONS
        .keys(deps.storage, None, None, Order::Ascending)
        .map(|x| x.unwrap_or_else(|_| "".to_string()))
        .collect();
    Ok(GetConnectionsResponse { connections })
}
