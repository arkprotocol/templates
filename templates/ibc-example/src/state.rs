use cw_storage_plus::Map;

// Mapping between connections and the counter on that connection.
pub const CONNECTIONS: Map<String, bool> = Map::new("connections");
