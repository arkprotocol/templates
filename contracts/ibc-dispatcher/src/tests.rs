//refrence: https://mirror.cnhub.dev/confio/cw-ibc-demo/blob/main/contracts/simple-ica-host/src/contract.rs

#[cfg(test)]
mod tests {
    // use crate::ack::Ack;
    // use crate::contract::{execute, instantiate, query};
    // use crate::ibc::{
    //     ibc_channel_close, ibc_channel_connect, ibc_channel_open, IBC_ORDER, IBC_VERSION,
    // };
    // use crate::ibc_ack::ibc_packet_ack;
    // use crate::msg::GetCounterResponse;
    // use crate::{
    //     ibc_msg::IbcExecuteMsg,
    //     ibc_receive::ibc_packet_receive,
    //     msg::{ExecuteMsg, GetConnectionsResponse, InstantiateMsg, QueryMsg},
    // };

    // use cosmwasm_std::testing::{
    //     mock_dependencies, mock_env, mock_ibc_channel_close_init, mock_ibc_channel_connect_ack,
    //     mock_ibc_channel_open_init, mock_ibc_channel_open_try, mock_ibc_packet_ack,
    //     mock_ibc_packet_recv, mock_info, MockApi, MockQuerier, MockStorage,
    // };
    // use cosmwasm_std::{
    //     from_binary, to_binary, Attribute, CosmosMsg, DepsMut, IbcAcknowledgement, IbcMsg,
    //     IbcOrder, IbcTimeout, MessageInfo, OwnedDeps, Response,
    // };

    // const CREATER_ADDR: &str = "creater";
    // const TEST_CHANNEL: &str = "channel-1";

    // pub const BAD_IBC_ORDER: IbcOrder = IbcOrder::Ordered;

    // //Quick init of the contract
    // fn setup(
    //     info: Option<MessageInfo>,
    //     msg: Option<InstantiateMsg>,
    // ) -> (
    //     OwnedDeps<MockStorage, MockApi, MockQuerier>,
    //     Response,
    //     MessageInfo,
    // ) {
    //     let mut deps = mock_dependencies();

    //     let info = match info {
    //         Some(info) => info,
    //         None => mock_info(CREATER_ADDR, &[]),
    //     };

    //     let msg = match msg {
    //         Some(msg) => msg,
    //         None => InstantiateMsg {},
    //     };

    //     let res = instantiate(deps.as_mut(), mock_env(), info.clone(), msg).unwrap();

    //     (deps, res, info)
    // }

    // //If you do anything on init for the IBC to work, doesn't require to call this function if your contract doesn't rely on IBC connection to happen.
    // fn connect(mut deps: DepsMut, channel_id: &str) {
    //     let handshake_open = mock_ibc_channel_open_init(channel_id, IBC_ORDER, IBC_VERSION);
    //     // first we try to open with a valid handshake
    //     ibc_channel_open(deps.branch(), mock_env(), handshake_open).unwrap();

    //     // then we connect (with counter-party version set)
    //     let handshake_connect = mock_ibc_channel_connect_ack(channel_id, IBC_ORDER, IBC_VERSION);
    //     let res = ibc_channel_connect(deps.branch(), mock_env(), handshake_connect).unwrap();

    //     assert_eq!(0, res.messages.len());
    // }

    // #[test]
    // fn proper_initialization() {
    //     let (mut _deps, res, _info) = setup(None, None);

    //     assert_eq!(0, res.messages.len());
    //     assert_eq!(
    //         res.attributes,
    //         vec![Attribute {
    //             key: "method".to_string(),
    //             value: "instantiate".to_string()
    //         },]
    //     );
    // }

    // #[test]
    // fn enforce_version_in_handshake() {
    //     let (mut deps, _res, _info) = setup(None, None);

    //     let wrong_order = mock_ibc_channel_open_try(TEST_CHANNEL, BAD_IBC_ORDER, IBC_VERSION);
    //     ibc_channel_open(deps.as_mut(), mock_env(), wrong_order).unwrap_err();

    //     let wrong_version = mock_ibc_channel_open_try(TEST_CHANNEL, IBC_ORDER, "wrong_version");
    //     ibc_channel_open(deps.as_mut(), mock_env(), wrong_version).unwrap_err();

    //     let valid_handshake = mock_ibc_channel_open_try(TEST_CHANNEL, IBC_ORDER, IBC_VERSION);
    //     ibc_channel_open(deps.as_mut(), mock_env(), valid_handshake).unwrap();
    // }

    // #[test]
    // fn proper_handshake_flow() {
    //     let (mut deps, _res, _info) = setup(None, None);

    //     let handshake_open = mock_ibc_channel_open_init(TEST_CHANNEL, IBC_ORDER, IBC_VERSION);
    //     ibc_channel_open(deps.as_mut(), mock_env(), handshake_open).unwrap();

    //     // then we connect (with counter-party version set)
    //     let handshake_connect = mock_ibc_channel_connect_ack(TEST_CHANNEL, IBC_ORDER, IBC_VERSION);
    //     let res = ibc_channel_connect(deps.as_mut(), mock_env(), handshake_connect).unwrap();

    //     assert_eq!(res.messages, vec![]);
    //     assert_eq!(
    //         res.attributes,
    //         vec![
    //             Attribute {
    //                 key: "method".to_string(),
    //                 value: "ibc_channel_connect".to_string()
    //             },
    //             Attribute {
    //                 key: "channel_id".to_string(),
    //                 value: TEST_CHANNEL.to_string()
    //             }
    //         ]
    //     );

    //     //We should have 1 item (test_channel) in the connections.
    //     let raw = query(deps.as_ref(), mock_env(), QueryMsg::GetConnections {}).unwrap();
    //     let res: GetConnectionsResponse = from_binary(&raw).unwrap();

    //     assert_eq!(1, res.connections.len());
    //     assert_eq!(TEST_CHANNEL, res.connections[0]);
    // }

    // #[test]
    // fn execute_ping() {
    //     let (mut deps, _res, info) = setup(None, None);

    //     connect(deps.as_mut(), TEST_CHANNEL);

    //     let msg = ExecuteMsg::Ping {
    //         channel: TEST_CHANNEL.to_string(),
    //     };
    //     let res = execute(deps.as_mut(), mock_env(), info, msg).unwrap();

    //     //verify attributes are correct.
    //     assert_eq!(
    //         res.attributes,
    //         vec![
    //             Attribute {
    //                 key: "method".to_string(),
    //                 value: "execute_ping".to_string()
    //             },
    //             Attribute {
    //                 key: "channel".to_string(),
    //                 value: TEST_CHANNEL.to_string()
    //             },
    //         ]
    //     );

    //     //Verify sent IbcPacket is correct
    //     assert_eq!(
    //         res.messages[0].msg,
    //         CosmosMsg::Ibc(IbcMsg::SendPacket {
    //             channel_id: TEST_CHANNEL.to_string(),
    //             data: to_binary(&IbcExecuteMsg::Ping {}).unwrap(),
    //             timeout: IbcTimeout::with_timestamp(mock_env().block.time.plus_seconds(300))
    //         })
    //     );

    //     // Verify we received the ping, and answered correctly.
    //     let ibc_msg = IbcExecuteMsg::Ping {};

    //     let msg = mock_ibc_packet_recv(TEST_CHANNEL, &ibc_msg).unwrap();
    //     let res = ibc_packet_receive(deps.as_mut(), mock_env(), msg).unwrap();

    //     //Verify we got the result attr, pong.
    //     assert_eq!(
    //         res.attributes,
    //         vec![Attribute {
    //             key: "method".to_string(),
    //             value: "execute_ping".to_string()
    //         },]
    //     );

    //     let ack: IbcPingResponse = Ack::parse(res.acknowledgement.clone());

    //     assert_eq!(ack.result.as_str(), "pong");

    //     //Verify we do the ack correctly.
    //     let ack = mock_ibc_packet_ack(
    //         TEST_CHANNEL,
    //         &ibc_msg,
    //         IbcAcknowledgement::new(res.acknowledgement),
    //     )
    //     .unwrap();
    //     let res = ibc_packet_ack(deps.as_mut(), mock_env(), ack).unwrap();

    //     assert_eq!(
    //         res.attributes,
    //         vec![Attribute {
    //             key: "action".to_string(),
    //             value: "ack_ping".to_string()
    //         },]
    //     );

    //     //Verify that after the ack, our counter is 1 and not 0
    //     let msg = QueryMsg::GetCounter {
    //         channel: TEST_CHANNEL.to_string(),
    //     };
    //     let res = query(deps.as_ref(), mock_env(), msg).unwrap();
    //     let value: GetCounterResponse = from_binary(&res).unwrap();

    //     assert_eq!(value.count, 1);

    //     //Do custom query
    //     let msg = QueryMsg::GetConnections {};
    //     let res = query(deps.as_ref(), mock_env(), msg).unwrap();
    //     let value: GetConnectionsResponse = from_binary(&res).unwrap();

    //     assert_eq!(value.connections, vec![TEST_CHANNEL.to_string()]);
    // }

    // #[test]
    // fn close_channel() {
    //     let (mut deps, _res, _info) = setup(None, None);

    //     connect(deps.as_mut(), TEST_CHANNEL);

    //     let msg = QueryMsg::GetConnections {};
    //     let res = query(deps.as_ref(), mock_env(), msg).unwrap();
    //     let value: GetConnectionsResponse = from_binary(&res).unwrap();

    //     assert_eq!(
    //         value,
    //         GetConnectionsResponse {
    //             connections: vec![TEST_CHANNEL.to_string()]
    //         }
    //     );

    //     let channel = mock_ibc_channel_close_init(TEST_CHANNEL, IBC_ORDER, IBC_VERSION);
    //     let res = ibc_channel_close(deps.as_mut(), mock_env(), channel).unwrap();

    //     //Check no messages
    //     assert_eq!(0, res.messages.len());

    //     //Verify attributes
    //     assert_eq!(
    //         res.attributes,
    //         vec![
    //             Attribute {
    //                 key: "method".to_string(),
    //                 value: "ibc_channel_close".to_string()
    //             },
    //             Attribute {
    //                 key: "channel".to_string(),
    //                 value: TEST_CHANNEL.to_string()
    //             },
    //         ]
    //     );
    // }
}
