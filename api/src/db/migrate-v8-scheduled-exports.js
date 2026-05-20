// api/src/db/migrate-v8-scheduled-exports.js
// Adds scheduled_exports table for recurring export jobs.
// Run: node src/db/migrate-v8-scheduled-exports.js

require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const sql = `
  CREATE TABLE IF NOT EXISTS scheduled_exports (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id          UUID REFERENCES projects(id) ON DELETE CASCADE,
    created_by          UUID REFERENCES users(id) ON DELETE SET NULL,
    name                TEXT NOT NULL,
    format              TEXT NOT NULL CHECK (format IN ('geojson','gpkg','shapefile','kml','csv','xlsx')),
    cron                TEXT NOT NULL,
    destination         TEXT NOT NULL CHECK (destination IN ('minio','email','webhook')),
    destination_config  JSONB NOT NULL DEFAULT '{}',
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    last_run_at         TIMESTAMPTZ,
    next_run_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_scheduled_exports_project_id ON scheduled_exports(project_id);
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('[v8] Running scheduled exports migration...');
    await client.query(sql);
    console.log('[v8] scheduled_exports table ready.');
  } catch (err) {
    console.error('[v8] Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
