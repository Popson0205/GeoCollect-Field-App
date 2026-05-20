// api/src/db/migrate-v9-portal-config.js
// Adds portal_config table for per-project dashboard widget configuration.
// Run: node src/db/migrate-v9-portal-config.js

require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const sql = `
  CREATE TABLE IF NOT EXISTS portal_config (
    project_id  UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
    widgets     JSONB NOT NULL DEFAULT '[]',
    branding    JSONB NOT NULL DEFAULT '{}',
    updated_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at  TIMESTAMPTZ DEFAULT NOW()
  );
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('[v9] Running portal config migration...');
    await client.query(sql);
    console.log('[v9] portal_config table ready.');
  } catch (err) {
    console.error('[v9] Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
