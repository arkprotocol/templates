#[cfg(not(feature = "library"))]
use cosmwasm_std::entry_point;
use cosmwasm_std::{Binary, Deps, Env, StdResult};
use cw721_base::QueryMsg;

use crate::state::Cw721MetadataContract;

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn query(deps: Deps, env: Env, msg: QueryMsg) -> StdResult<Binary> {
    Cw721MetadataContract::default().query(deps, env, msg)
}

#[cfg(test)]
mod tests {}
