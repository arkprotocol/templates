use cw_storage_plus::Map;

// Mapping between connections and the counter on that connection.
pub const CONNECTIONS: Map<&str, bool> = Map::new("connections");
pub const COUNTERS: Map<&str, u32> = Map::new("counters");
