use cosmwasm_std::{from_slice, to_binary, Binary};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

/// IBC ACK. See:
/// https://github.com/cosmos/cosmos-sdk/blob/f999b1ff05a4db4a338a855713864497bedd4396/proto/ibc/core/channel/v1/channel.proto#L141-L147
#[derive(Serialize, Deserialize, JsonSchema, Debug)]
#[serde(rename_all = "snake_case")]
pub enum Ack {
    Result(Binary),
    Error(String),
}

impl Ack {
    pub fn success() -> Binary {
        let res = Ack::Result(b"1".into());
        to_binary(&res).unwrap()
    }

    pub fn success_data(data: impl Serialize) -> Binary {
        let res = Ack::Result(to_binary(&data).unwrap_or_else(|_| b"1".into()));
        to_binary(&res).unwrap()
    }

    // create a serialized error message
    pub fn fail(err: String) -> Binary {
        let res = Ack::Error(err);
        to_binary(&res).unwrap()
    }

    pub fn unwrap(self) -> Binary {
        match self {
            Ack::Result(data) => data,
            Ack::Error(err) => panic!("{}", err),
        }
    }

    pub fn unwrap_err(self) -> String {
        match self {
            Ack::Result(_) => panic!("not an error"),
            Ack::Error(err) => err,
        }
    }

    // For tests, to quickly get the response.
    pub fn parse<T: for<'de> Deserialize<'de>>(ack: Binary) -> T {
        let ack: Ack = from_slice(&ack).unwrap();
        from_slice(&ack.unwrap()).unwrap()
    }
}
