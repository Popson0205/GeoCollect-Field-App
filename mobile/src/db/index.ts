import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

let _db: ReturnType<typeof drizzle> | null = null;

export function getDatabase() {
  if (!_db) {
    const sqlite = SQLite.openDatabaseSync('geocollect.db');
    _db = drizzle(sqlite, { schema });
  }
  return _db;
}

export async function initDatabase() {
  const db = getDatabase();
  const sqlite = SQLite.openDatabaseSync('geocollect.db');
  
  await sqlite.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS forms (
      id TEXT PRIMARY KEY,
      version INTEGER NOT NULL DEFAULT 1,
      title TEXT NOT NULL,
      description TEXT,
      org_id TEXT,
      created_by TEXT NOT NULL,
      sharing TEXT NOT NULL DEFAULT 'private',
      fields_json TEXT NOT NULL,
      settings_json TEXT NOT NULL,
      geofence_json TEXT,
      synced_at TEXT,
      last_used_at TEXT
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      form_id TEXT NOT NULL,
      form_version INTEGER NOT NULL,
      submitted_by TEXT NOT NULL,
      org_id TEXT,
      device_id TEXT NOT NULL,
      submitted_at TEXT NOT NULL,
      synced_at TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      location_json TEXT,
      geofence_status TEXT NOT NULL DEFAULT 'not_applicable',
      answers_json TEXT NOT NULL,
      attachment_ids_json TEXT NOT NULL DEFAULT '[]',
      sync_error TEXT,
      retry_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL,
      field_id TEXT NOT NULL,
      local_uri TEXT NOT NULL,
      filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      uploaded INTEGER NOT NULL DEFAULT 0,
      remote_url TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS gps_tracks (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL,
      field_id TEXT NOT NULL,
      points_json TEXT NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      distance_m REAL
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      ref_id TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      last_attempt_at TEXT,
      attempt_count INTEGER NOT NULL DEFAULT 0,
      error TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_submissions_form_id ON submissions(form_id);
    CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
    CREATE INDEX IF NOT EXISTS idx_attachments_submission_id ON attachments(submission_id);
    CREATE INDEX IF NOT EXISTS idx_sync_queue_type ON sync_queue(type);
  `);

  return db;
}

export { schema };
