#[cfg(not(feature = "library"))]
use cosmwasm_std::entry_point;
use cosmwasm_std::{DepsMut, Env, MessageInfo, Response};

use crate::error::ContractError;
use crate::msg::{InstantiateMsg, ExecuteMsg};
use crate::state::{STATE, State};

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    _info: MessageInfo,
    _msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    let state = State {
        echo: "".to_string()
    };
    STATE.save(deps.storage, &state)?;
    Ok(Response::new()
        .add_attribute("action", "instantiate")
        .add_attribute("echo", "")
    )
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn execute(
    deps: DepsMut,
    _env: Env,
    _info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::Echo { echo } => execute_echo(deps, echo),
    }
}

fn execute_echo(
    deps: DepsMut,
    echo: String,
) -> Result<Response, ContractError> {
    STATE.update(deps.storage, |mut state| -> Result<_, ContractError> {
        state.echo = echo.clone();
        Ok(state)
    }).unwrap();
    Ok(Response::new()
        .add_attribute("action", "execute_echo")
        .add_attribute("echo", echo)
    )
}
#[cfg(test)]
mod tests {
    use cosmwasm_std::{testing::{mock_dependencies, mock_env, mock_info}, coins, from_binary};

    use crate::{msg::{InstantiateMsg, ExecuteMsg, QueryMsg, EchoResponse}, query::query};

    use super::{instantiate, execute};


    #[test]
    fn proper_initialization() {
        let mut deps = mock_dependencies();
        let env = mock_env();
        let info = mock_info("sender", &coins(1000, "denom"));
        let msg = InstantiateMsg{};
        let response = instantiate(deps.as_mut(), env, info, msg).unwrap();
        // assert response contains empty echo
        let attribute = response.attributes.iter().find(|a| a.key == "echo").unwrap();
        assert_eq!("", attribute.value);
    }

    #[test]
    fn execute_echo() {
        let mut deps = mock_dependencies();
        let env = mock_env();
        let info = mock_info("sender", &coins(1000, "denom"));
        let msg = InstantiateMsg{};
        instantiate(deps.as_mut(), env, info.clone(), msg).unwrap();

        let msg = ExecuteMsg::Echo { echo: "Hello, world!".to_string() };
        let response = execute(deps.as_mut(), mock_env(), info, msg).unwrap();
        // assert response contains hello world echo
        let attribute = response.attributes.iter().find(|a| a.key == "echo").unwrap();
        assert_eq!("Hello, world!", attribute.value);

        // assert query
        let msg = QueryMsg::Echo {  };
        let response = query(deps.as_ref(), mock_env(), msg).unwrap();
        let echo_response: EchoResponse = from_binary(&response).unwrap();
        assert_eq!("Hello, world!", echo_response.echo);

    }

}
