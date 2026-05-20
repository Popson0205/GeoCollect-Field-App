// api/src/db/migrate-v3-attachments.js
// Run: node src/db/migrate-v3-attachments.js
// Adds the attachments table for Phase 2 media support.
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const migration = `
  CREATE TABLE IF NOT EXISTS attachments (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feature_id    UUID REFERENCES features(id) ON DELETE CASCADE,
    field_key     TEXT NOT NULL,
    bucket        TEXT NOT NULL DEFAULT 'geocollect-media',
    object_key    TEXT NOT NULL,
    original_name TEXT,
    mime_type     TEXT NOT NULL,
    size_bytes    BIGINT,
    uploaded_by   UUID REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at   TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_attachments_feature_id ON attachments(feature_id);
  CREATE INDEX IF NOT EXISTS idx_attachments_field_key  ON attachments(field_key);
`;

pool.query(migration)
  .then(() => { console.log('✅ attachments table ready'); process.exit(0); })
  .catch(err => { console.error('❌ Migration failed:', err.message); process.exit(1); });
