use cosmwasm_std::{entry_point, StdResult};
use cosmwasm_std::{from_slice, DepsMut, Env, IbcBasicResponse, IbcPacketAckMsg};

use crate::{
    ack::Ack,
    ibc_msg::{IbcExecuteMsg, IbcPingResponse},
    state::COUNTERS,
    ContractError,
};

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn ibc_packet_ack(
    deps: DepsMut,
    env: Env,
    ack: IbcPacketAckMsg,
) -> Result<IbcBasicResponse, ContractError> {
    // This will get the ack from the ibc packet we sent,
    // you either do pending things that you waited for confirmation on
    // or register something based on the confirmation

    // which local channel was this packet send from
    let caller = ack.original_packet.src.channel_id.clone();
    // we need to parse the ack based on our request
    let original_packet: IbcExecuteMsg = from_slice(&ack.original_packet.data)?;
    let res: Ack = from_slice(&ack.acknowledgement.data)?;

    match original_packet {
        IbcExecuteMsg::Ping {} => ack_ping(deps, env, caller, res),
    }
}

pub fn ack_ping(
    deps: DepsMut,
    _env: Env,
    caller: String,
    res: Ack,
) -> Result<IbcBasicResponse, ContractError> {
    //Get the result from the ack, and make sure ack is success.
    let IbcPingResponse { result } = match res {
        Ack::Result(res) => from_slice(&res)?,
        Ack::Error(e) => {
            return Ok(IbcBasicResponse::new()
                .add_attribute("action", "ack_ping")
                .add_attribute("error", e))
        }
    };

    //Match the result to what we expect, if its a pong, save a counter.
    match result.as_str() {
        "pong" => {
            COUNTERS.update(deps.storage, &caller, |counter| -> StdResult<u32> {
                match counter {
                    Some(count) => Ok(count + 1),
                    None => Ok(1),
                }
            })?;

            Ok(IbcBasicResponse::new().add_attribute("action", "ack_ping"))
        }
        r => {
            return Ok(IbcBasicResponse::new()
                .add_attribute("action", "ack_ping")
                .add_attribute("error", format!("Not pong, Result is: {}", r)))
        }
    }
}
