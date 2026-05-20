// api/src/db/migrate.js
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const migrations = `
  CREATE EXTENSION IF NOT EXISTS postgis;
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

  CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'field_collector'
      CHECK (role IN ('field_collector','project_manager','gis_analyst','platform_admin')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS project_members (
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'field_collector'
      CHECK (role IN ('field_collector','project_manager','gis_analyst','platform_admin')),
    PRIMARY KEY (project_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS form_schemas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    geometry_type TEXT NOT NULL DEFAULT 'Point'
      CHECK (geometry_type IN ('Point','LineString','Polygon','Multi')),
    schema JSONB NOT NULL DEFAULT '{}',
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Geofence boundary: GeoJSON Polygon stored as JSONB.
  -- Added in migration v2 — safe to run multiple times.
  ALTER TABLE form_schemas
    ADD COLUMN IF NOT EXISTS geofence JSONB DEFAULT NULL;

  -- Missing columns needed by forms route
  ALTER TABLE form_schemas
    ADD COLUMN IF NOT EXISTS geofences JSONB NOT NULL DEFAULT '[]'::jsonb;

  ALTER TABLE form_schemas
    ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private'
      CHECK (visibility IN ('private','project','organization','public'));

  ALTER TABLE form_schemas
    ADD COLUMN IF NOT EXISTS share_token TEXT;

  ALTER TABLE form_schemas
    ADD COLUMN IF NOT EXISTS schema JSONB NOT NULL DEFAULT '{}'::jsonb;

  -- geofences array (JSONB) on form_schemas — used by forms route
  ALTER TABLE form_schemas
    ADD COLUMN IF NOT EXISTS geofences JSONB DEFAULT '[]'::jsonb;

  -- visibility column for form sharing
  ALTER TABLE form_schemas
    ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private'
      CHECK (visibility IN ('private','project','organization','public'));

  CREATE TABLE IF NOT EXISTS features (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_schema_id UUID REFERENCES form_schemas(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    geometry GEOMETRY NOT NULL,
    attributes JSONB NOT NULL DEFAULT '{}',
    sync_status TEXT NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('synced','pending','conflict')),
    device_id TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS features_geometry_idx ON features USING GIST (geometry);
  CREATE INDEX IF NOT EXISTS features_project_idx ON features (project_id);
  CREATE INDEX IF NOT EXISTS features_form_idx ON features (form_schema_id);

  CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feature_id UUID REFERENCES features(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    field_key TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    changed_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Phase 2: Media attachments (photo, audio, video, file)
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

  -- Phase 2: CRDT vector clock for conflict-free offline sync
  ALTER TABLE features ADD COLUMN IF NOT EXISTS vector_clock JSONB DEFAULT '{}';

  CREATE INDEX IF NOT EXISTS idx_features_sync_status ON features(sync_status);
  -- v10: Organizations, roles, geofences, mobile API
  CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro','enterprise')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS org_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin','form_editor','data_collector','viewer')),
    invited_by UUID REFERENCES users(id),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS org_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin','form_editor','data_collector','viewer')),
    token TEXT UNIQUE NOT NULL,
    invited_by UUID REFERENCES users(id),
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS geofences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID REFERENCES form_schemas(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('radius','polygon','multi_polygon')),
    geometry JSONB NOT NULL,
    enforcement TEXT NOT NULL DEFAULT 'warn' CHECK (enforcement IN ('block','warn','track','none')),
    buffer_meters FLOAT NOT NULL DEFAULT 0,
    radius_meters FLOAT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS form_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID REFERENCES form_schemas(id) ON DELETE CASCADE,
    assignee_type TEXT NOT NULL CHECK (assignee_type IN ('user','org','role')),
    assignee_id TEXT NOT NULL,
    assigned_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(form_id, assignee_type, assignee_id)
  );

  ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'individual'
    CHECK (account_type IN ('individual','organization'));
  ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token_hash TEXT;

  ALTER TABLE features ADD COLUMN IF NOT EXISTS geofence_status TEXT
    NOT NULL DEFAULT 'not_applicable';
  ALTER TABLE features ADD COLUMN IF NOT EXISTS device_id TEXT;
  ALTER TABLE features ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;

  CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON org_members(user_id);
  CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON org_members(org_id);
  CREATE INDEX IF NOT EXISTS idx_form_assignments_form_id ON form_assignments(form_id);
  CREATE INDEX IF NOT EXISTS idx_org_invitations_token ON org_invitations(token);
  CREATE INDEX IF NOT EXISTS idx_geofences_form_id ON geofences(form_id);

`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running migrations...');
    await client.query(migrations);
    console.log('Migrations complete.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
