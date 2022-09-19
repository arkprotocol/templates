#[cfg(not(feature = "library"))]
use cosmwasm_std::entry_point;
use cosmwasm_std::{Binary, Deps, Env, StdResult, to_binary};

use crate::{msg::{QueryMsg, EchoResponse}, state::STATE};

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::Echo {  } => to_binary(&query_echo(deps))
    }
}

fn query_echo(deps: Deps) -> EchoResponse {
    let state = STATE.load(deps.storage).unwrap();
    EchoResponse{echo: state.echo}
}

#[cfg(test)]
mod tests {}
