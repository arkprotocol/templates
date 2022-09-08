#[cfg(not(feature = "library"))]
use cosmwasm_std::entry_point;
use cosmwasm_std::{
    to_binary, Binary, Deps, DepsMut, Env, IbcMsg, IbcTimeout, MessageInfo, Order, Response,
    StdResult,
};
use cw2::set_contract_version;

use crate::error::ContractError;
use crate::msg::{ExecuteMsg, GetConnectionsResponse, IbcExecuteMsg, InstantiateMsg, QueryMsg};
use crate::state::CONNECTIONS;

const CONTRACT_NAME: &str = "crates.io:ap-ibc-example";
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

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn execute(
    _deps: DepsMut,
    env: Env,
    _info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::Ping { channel } => ping(env, channel),
    }
}

fn ping(env: Env, channel: String) -> Result<Response, ContractError> {
    let msg = IbcMsg::SendPacket {
        channel_id: channel.clone(),
        data: to_binary(&IbcExecuteMsg::Ping {})?,
        timeout: IbcTimeout::with_timestamp(env.block.time.plus_seconds(300)),
    };

    Ok(Response::new()
        .add_attribute("method", "execute_ping")
        .add_attribute("channel", channel)
        .add_message(msg))
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
