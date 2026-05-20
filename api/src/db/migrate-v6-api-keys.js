// api/src/db/migrate-v6-api-keys.js
// Adds api_keys table for programmatic access to WFS/OGC endpoints.
// Run: node src/db/migrate-v6-api-keys.js

require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const sql = `
  CREATE TABLE IF NOT EXISTS api_keys (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id    UUID REFERENCES projects(id) ON DELETE CASCADE,
    created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    name          TEXT NOT NULL,
    key_hash      TEXT NOT NULL UNIQUE,
    key_prefix    TEXT NOT NULL,
    scopes        TEXT[] NOT NULL DEFAULT '{"read"}',
    last_used_at  TIMESTAMPTZ,
    expires_at    TIMESTAMPTZ DEFAULT NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    revoked_at    TIMESTAMPTZ DEFAULT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_api_keys_project_id ON api_keys(project_id);
  CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('[v6] Running API keys migration...');
    await client.query(sql);
    console.log('[v6] api_keys table ready.');
  } catch (err) {
    console.error('[v6] Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
