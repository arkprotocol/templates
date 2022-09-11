#[cfg(not(feature = "library"))]
use cosmwasm_std::entry_point;
use cosmwasm_std::{DepsMut, Env, MessageInfo, Response};
use cw2::set_contract_version;
use cw721_base::{ContractError, InstantiateMsg};

use crate::msg::ExecuteMsg;
use crate::state::{Cw721MetadataContract, CONTRACT_NAME, CONTRACT_VERSION};

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn instantiate(
    mut deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    let res = Cw721MetadataContract::default().instantiate(deps.branch(), env, info, msg)?;
    // Explicitly set contract name and version, otherwise set to cw721-base info
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)
        .map_err(ContractError::Std)?;
    Ok(res)
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    Cw721MetadataContract::default().execute(deps, env, info, msg)
}

#[cfg(test)]
mod tests {
    use crate::state::{Extension, Metadata};

    use super::*;

    use cosmwasm_std::{
        testing::{mock_dependencies, mock_env, mock_info},
        DepsMut, MessageInfo,
    };
    use cw721::Cw721Query;
    use cw721_base::{ExecuteMsg, MintMsg};

    const CREATOR: &str = "creator";

    fn instantiate_contract<'a>(deps: DepsMut, info: MessageInfo) -> Cw721MetadataContract<'a> {
        let contract = Cw721MetadataContract::default();

        // instantiate contract
        let init_msg = InstantiateMsg {
            name: "Ark NFT Multichain".to_string(),
            symbol: "Ark Protocol".to_string(),
            minter: CREATOR.to_string(),
        };
        contract
            .instantiate(deps, mock_env(), info.clone(), init_msg)
            .unwrap();
        contract
    }

    fn mint<'a>(
        token_id: String,
        owner: String,
        contract: &Cw721MetadataContract,
        deps: DepsMut,
        info: MessageInfo,
    ) -> MintMsg<Extension> {
        let mint_msg = MintMsg {
            token_id: token_id.to_string(),
            owner,
            token_uri: Some("https://foo.bar".into()),
            extension: Some(Metadata {
                description: Some("Ark NFT available on any IBC chain".into()),
                name: Some("Ark NFT #0001".to_string()),
                ..Metadata::default()
            }),
        };
        let exec_msg = ExecuteMsg::Mint(mint_msg.clone());
        contract.execute(deps, mock_env(), info, exec_msg).unwrap();

        mint_msg
    }

    #[test]
    fn use_metadata_extension() {
        let mut deps = mock_dependencies();

        // instantiate contract
        let info = mock_info(CREATOR, &[]);
        let contract = instantiate_contract(deps.as_mut(), info.clone());

        // mint
        let token_id = "0001";
        let owner = "minter";
        let mint_msg = mint(
            token_id.to_string(),
            owner.to_string(),
            &contract,
            deps.as_mut(),
            info.clone(),
        );

        let nft_info = contract.nft_info(deps.as_ref(), token_id.into()).unwrap();
        assert_eq!(nft_info.token_uri, mint_msg.token_uri);
        assert_eq!(nft_info.extension, mint_msg.extension);
    }

    #[test]
    fn transfer() {
        let mut deps = mock_dependencies();

        // instantiate contract
        let info = mock_info(CREATOR, &[]);
        let contract = instantiate_contract(deps.as_mut(), info.clone());

        // mint
        let token_id = "0001";
        let owner = "minter";
        mint(
            token_id.to_string(),
            owner.to_string(),
            &contract,
            deps.as_mut(),
            info.clone(),
        );

        // transfer
        let info = mock_info(owner, &[]);
        let new_owner = "other";
        let transfer_nft: ExecuteMsg<Extension> = ExecuteMsg::TransferNft {
            recipient: new_owner.to_string(),
            token_id: token_id.to_string(),
        };
        let res = contract
            .execute(deps.as_mut(), mock_env(), info, transfer_nft)
            .unwrap();

        // assert
        let recipient = res
            .attributes
            .iter()
            .find(|a| a.key == "recipient")
            .unwrap();
        assert_eq!(recipient.value, new_owner.to_string());
    }
}
