CREATE TABLE IF NOT EXISTS cloud_spaces (
  space_id TEXT PRIMARY KEY,
  secret_hash TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  backup_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cloud_spaces_updated_at ON cloud_spaces (updated_at DESC);
