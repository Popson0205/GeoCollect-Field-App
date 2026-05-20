// api/src/db/migrate-v4-crdt.js
// Adds vector_clock JSONB column to features table for CRDT sync.
// Run: node src/db/migrate-v4-crdt.js
require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const migration = `
  ALTER TABLE features
    ADD COLUMN IF NOT EXISTS vector_clock JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ DEFAULT NOW();

  CREATE INDEX IF NOT EXISTS idx_features_sync_status ON features(sync_status);
  CREATE INDEX IF NOT EXISTS idx_features_project_id  ON features(project_id);
`;

pool.query(migration)
  .then(() => { console.log('✅ CRDT columns added'); process.exit(0); })
  .catch(err => { console.error('❌', err.message); process.exit(1); });
