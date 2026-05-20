// ─── Auth ──────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  full_name: string;
  account_type: 'individual' | 'organization';
  created_at: string;
}

export interface OrgMembership {
  org_id: string;
  org_name: string;
  org_slug: string;
  role: OrgRole;
  joined_at: string;
}

export type OrgRole = 'admin' | 'form_editor' | 'data_collector' | 'viewer';

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

// ─── Forms ─────────────────────────────────────────────────────────
export type FieldType =
  | 'text' | 'number' | 'select' | 'multi_select'
  | 'date' | 'datetime' | 'boolean' | 'rating'
  | 'gps_point' | 'gps_track' | 'photo' | 'signature'
  | 'barcode' | 'calculated';

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  hint?: string;
  placeholder?: string;
  // select / multi_select
  options?: string[];
  // number
  min?: number;
  max?: number;
  // gps_point
  auto_capture?: boolean;
  // photo
  max_photos?: number;
  // calculated
  formula?: string;
  // conditional visibility
  visible_if?: { field_id: string; equals: string | number | boolean };
}

export interface FormSettings {
  allow_draft: boolean;
  require_gps: boolean;
  gps_accuracy_threshold_m: number;
}

export interface Geofence {
  id: string;
  form_id: string;
  name: string;
  type: 'radius' | 'polygon' | 'multi_polygon';
  geometry: GeoJSON.Geometry;
  enforcement: 'block' | 'warn' | 'track' | 'none';
  buffer_meters: number;
  active: boolean;
}

export interface Form {
  id: string;
  version: number;
  title: string;
  description?: string;
  org_id?: string;
  created_by: string;
  sharing: 'private' | 'organization' | 'specific_members' | 'public';
  geofence?: Geofence;
  fields: FormField[];
  settings: FormSettings;
  synced_at?: string;
}

// ─── Submissions ───────────────────────────────────────────────────
export type SubmissionStatus = 'draft' | 'pending' | 'synced' | 'failed';
export type GeofenceStatus = 'inside' | 'outside' | 'bypassed' | 'not_applicable';

export interface GPSPoint {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  captured_at: string;
}

export type AnswerValue =
  | string | number | boolean | null
  | string[]
  | GPSPoint
  | GPSPoint[]  // gps_track
  | string[];   // photo ids

export interface Submission {
  id: string;
  form_id: string;
  form_version: number;
  submitted_by: string;
  org_id?: string;
  device_id: string;
  submitted_at: string;
  synced_at?: string;
  status: SubmissionStatus;
  location?: GPSPoint;
  geofence_status: GeofenceStatus;
  answers: Record<string, AnswerValue>;
  attachment_ids: string[];
}

// ─── Export ────────────────────────────────────────────────────────
export type ExportFormat = 'csv' | 'geojson' | 'kml' | 'shapefile' | 'dxf' | 'json';

// ─── Organization ──────────────────────────────────────────────────
export interface OrgMember {
  user_id: string;
  email: string;
  full_name: string;
  role: OrgRole;
  joined_at: string;
}

export interface OrgInvitation {
  id: string;
  email: string;
  role: OrgRole;
  expires_at: string;
  created_at: string;
}
