import { sqliteTable, text, integer, real, blob } from 'drizzle-orm/sqlite-core';

// ─── Forms (cached locally) ────────────────────────────────────────
export const forms = sqliteTable('forms', {
  id: text('id').primaryKey(),
  version: integer('version').notNull().default(1),
  title: text('title').notNull(),
  description: text('description'),
  org_id: text('org_id'),
  created_by: text('created_by').notNull(),
  sharing: text('sharing').notNull().default('private'),
  fields_json: text('fields_json').notNull(),   // JSON.stringify(FormField[])
  settings_json: text('settings_json').notNull(), // JSON.stringify(FormSettings)
  geofence_json: text('geofence_json'),           // JSON.stringify(Geofence) | null
  synced_at: text('synced_at'),
  last_used_at: text('last_used_at'),
});

// ─── Submissions ───────────────────────────────────────────────────
export const submissions = sqliteTable('submissions', {
  id: text('id').primaryKey(),
  form_id: text('form_id').notNull(),
  form_version: integer('form_version').notNull(),
  submitted_by: text('submitted_by').notNull(),
  org_id: text('org_id'),
  device_id: text('device_id').notNull(),
  submitted_at: text('submitted_at').notNull(),
  synced_at: text('synced_at'),
  status: text('status').notNull().default('pending'), // draft|pending|synced|failed
  location_json: text('location_json'),
  geofence_status: text('geofence_status').notNull().default('not_applicable'),
  answers_json: text('answers_json').notNull(),
  attachment_ids_json: text('attachment_ids_json').notNull().default('[]'),
  sync_error: text('sync_error'),
  retry_count: integer('retry_count').notNull().default(0),
});

// ─── Attachments ───────────────────────────────────────────────────
export const attachments = sqliteTable('attachments', {
  id: text('id').primaryKey(),
  submission_id: text('submission_id').notNull(),
  field_id: text('field_id').notNull(),
  local_uri: text('local_uri').notNull(),
  filename: text('filename').notNull(),
  mime_type: text('mime_type').notNull(),
  size_bytes: integer('size_bytes').notNull(),
  uploaded: integer('uploaded', { mode: 'boolean' }).notNull().default(false),
  remote_url: text('remote_url'),
  created_at: text('created_at').notNull(),
});

// ─── GPS Tracks (stored separately for efficiency) ─────────────────
export const gps_tracks = sqliteTable('gps_tracks', {
  id: text('id').primaryKey(),
  submission_id: text('submission_id').notNull(),
  field_id: text('field_id').notNull(),
  points_json: text('points_json').notNull(), // JSON.stringify(GPSPoint[])
  started_at: text('started_at').notNull(),
  ended_at: text('ended_at'),
  distance_m: real('distance_m'),
});

// ─── Sync Queue ────────────────────────────────────────────────────
export const sync_queue = sqliteTable('sync_queue', {
  id: text('id').primaryKey(),
  type: text('type').notNull(), // 'submission' | 'attachment'
  ref_id: text('ref_id').notNull(),
  priority: integer('priority').notNull().default(0),
  created_at: text('created_at').notNull(),
  last_attempt_at: text('last_attempt_at'),
  attempt_count: integer('attempt_count').notNull().default(0),
  error: text('error'),
});
