use std::env::current_dir;
use std::fs::create_dir_all;

use cosmwasm_schema::{export_schema, remove_schemas, schema_for};

use ibc_example::{
    ibc_msg::{IbcExecuteMsg, IbcPingResponse},
    msg::{ExecuteMsg, GetConnectionsResponse, GetCounterResponse, InstantiateMsg, QueryMsg},
};

fn main() {
    let mut out_dir = current_dir().unwrap();
    out_dir.push("schema");
    create_dir_all(&out_dir).unwrap();
    remove_schemas(&out_dir).unwrap();

    export_schema(&schema_for!(InstantiateMsg), &out_dir);
    export_schema(&schema_for!(ExecuteMsg), &out_dir);
    export_schema(&schema_for!(QueryMsg), &out_dir);
    export_schema(&schema_for!(IbcExecuteMsg), &out_dir);
    export_schema(&schema_for!(IbcPingResponse), &out_dir);
    export_schema(&schema_for!(GetConnectionsResponse), &out_dir);
    export_schema(&schema_for!(GetCounterResponse), &out_dir);
}
