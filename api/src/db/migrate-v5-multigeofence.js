// api/src/db/migrate-v5-multigeofence.js
// Migration v5 — multi-geofence zones, share tokens, visibility
//
// Safe to run multiple times (all ADD COLUMN IF NOT EXISTS).
// Does NOT drop the existing `geofence` column — it is kept as a
// legacy fallback and normalised on read by the forms route.

require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const sql = `
  -- 1. Array of geofence zone objects:
  --    [{ id, name, polygon: GeoJSON Polygon }]
  ALTER TABLE form_schemas
    ADD COLUMN IF NOT EXISTS geofences JSONB NOT NULL DEFAULT '[]'::jsonb;

  -- 2. Shareable token — generated on publish, NULL until then
  ALTER TABLE form_schemas
    ADD COLUMN IF NOT EXISTS share_token UUID UNIQUE DEFAULT NULL;

  -- 3. Visibility level
  ALTER TABLE form_schemas
    ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private'
      CHECK (visibility IN ('private', 'organization', 'public'));

  -- 4. Index for fast token lookups (public share route)
  CREATE INDEX IF NOT EXISTS idx_form_schemas_share_token
    ON form_schemas (share_token)
    WHERE share_token IS NOT NULL;

  -- 5. Back-fill: migrate any existing single geofence into the
  --    new geofences array so old data is not lost.
  UPDATE form_schemas
  SET geofences = jsonb_build_array(
    jsonb_build_object(
      'id',      gen_random_uuid()::text,
      'name',    'Zone 1',
      'polygon', geofence
    )
  )
  WHERE geofence IS NOT NULL
    AND (geofences = '[]'::jsonb OR geofences IS NULL);
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('[v5] Running multi-geofence migration…');
    await client.query(sql);
    console.log('[v5] Migration complete.');
  } catch (err) {
    console.error('[v5] Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
