use cosmwasm_std::{entry_point, DepsMut, Env, IbcBasicResponse, IbcPacketAckMsg};

use crate::ContractError;

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn ibc_packet_ack(
    _deps: DepsMut,
    _env: Env,
    _ack: IbcPacketAckMsg,
) -> Result<IbcBasicResponse, ContractError> {
    // This will get the ack from the ibc packet we sent,
    // you either do pending things that you waited for confirmation on
    // or register something based on the confirmation

    Ok(IbcBasicResponse::new())
}
