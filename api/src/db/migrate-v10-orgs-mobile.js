// migrate-v10-orgs-mobile.js
// Adds: organizations, org_members, org_invitations, geofences table,
// form_assignments, and extends forms/submissions for mobile app.
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const migration = `
  -- Organizations
  CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro','enterprise')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Org membership + roles
  CREATE TABLE IF NOT EXISTS org_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin','form_editor','data_collector','viewer')),
    invited_by UUID REFERENCES users(id),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, user_id)
  );

  -- Email invitations
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

  -- Geofences (polygon/radius) attached to forms
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

  -- Form assignments (which users/orgs can see a form in the mobile app)
  CREATE TABLE IF NOT EXISTS form_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID REFERENCES form_schemas(id) ON DELETE CASCADE,
    assignee_type TEXT NOT NULL CHECK (assignee_type IN ('user','org','role')),
    assignee_id TEXT NOT NULL,
    assigned_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(form_id, assignee_type, assignee_id)
  );

  -- Extend users with account_type and org_name for registration
  ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'individual'
    CHECK (account_type IN ('individual','organization'));
  ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token_hash TEXT;

  -- Extend features (submissions) with mobile fields
  ALTER TABLE features ADD COLUMN IF NOT EXISTS geofence_status TEXT
    NOT NULL DEFAULT 'not_applicable'
    CHECK (geofence_status IN ('inside','outside','bypassed','not_applicable'));
  ALTER TABLE features ADD COLUMN IF NOT EXISTS device_id TEXT;
  ALTER TABLE features ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
  ALTER TABLE features ADD COLUMN IF NOT EXISTS sync_status TEXT NOT NULL DEFAULT 'synced'
    CHECK (sync_status IN ('pending','synced','failed'));

  -- Indexes
  CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON org_members(user_id);
  CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON org_members(org_id);
  CREATE INDEX IF NOT EXISTS idx_form_assignments_form_id ON form_assignments(form_id);
  CREATE INDEX IF NOT EXISTS idx_org_invitations_token ON org_invitations(token);
  CREATE INDEX IF NOT EXISTS idx_org_invitations_email ON org_invitations(email);
  CREATE INDEX IF NOT EXISTS idx_geofences_form_id ON geofences(form_id);
`;

async function run() {
  const client = await pool.connect();
  try {
    console.log('Running migration v10: orgs + mobile API...');
    await client.query(migration);
    console.log('✓ Migration v10 complete');
  } catch (err) {
    console.error('Migration v10 failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
