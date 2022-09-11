use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use crate::state::Extension;

pub type ExecuteMsg = cw721_base::ExecuteMsg<Extension>;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub struct CustomResponse {
    val: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum MigrateMsg {}
