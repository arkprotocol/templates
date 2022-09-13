use cosmwasm_std::entry_point;
use cosmwasm_std::{from_binary, DepsMut, Env, IbcPacketReceiveMsg, IbcReceiveResponse};

use crate::{
    ack::Ack,
    error::Never,
    ibc_msg::{IbcExecuteMsg, IbcPingResponse},
    ContractError,
};

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
    // The channel this packet is being relayed along on this chain.
    //let channel = msg.packet.dest.channel_id;
    let msg: IbcExecuteMsg = from_binary(&msg.packet.data)?;

    match msg {
        IbcExecuteMsg::Ping {} => receive_ping(deps),
    }
}

pub fn receive_ping(_deps: DepsMut) -> Result<IbcReceiveResponse, ContractError> {
    Ok(IbcReceiveResponse::new()
        .add_attribute("method", "execute_ping")
        .set_ack(Ack::success_data(IbcPingResponse {
            result: "pong".to_string(),
        })))
}
