// api/src/db/migrate-v7-webhooks.js
// Adds webhooks and webhook_deliveries tables.
// Run: node src/db/migrate-v7-webhooks.js

require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const sql = `
  CREATE TABLE IF NOT EXISTS webhooks (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id    UUID REFERENCES projects(id) ON DELETE CASCADE,
    created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    name          TEXT NOT NULL,
    url           TEXT NOT NULL,
    secret        TEXT,
    events        TEXT[] NOT NULL DEFAULT '{"feature.created"}',
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    last_fired_at TIMESTAMPTZ,
    failure_count INTEGER NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id    UUID REFERENCES webhooks(id) ON DELETE CASCADE,
    event         TEXT NOT NULL,
    payload       JSONB NOT NULL,
    status_code   INTEGER,
    response_body TEXT,
    attempt       INTEGER NOT NULL DEFAULT 1,
    delivered_at  TIMESTAMPTZ DEFAULT NOW(),
    success       BOOLEAN NOT NULL DEFAULT FALSE
  );

  CREATE INDEX IF NOT EXISTS idx_webhooks_project_id ON webhooks(project_id);
  CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('[v7] Running webhooks migration...');
    await client.query(sql);
    console.log('[v7] webhooks + webhook_deliveries tables ready.');
  } catch (err) {
    console.error('[v7] Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
