// ── GeoCollect Portal — Type Definitions ─────────────────────

export type GeometryType = "Point" | "LineString" | "Polygon" | "MultiPoint" | "MultiLineString" | "MultiPolygon";

export type FieldType =
  | "text" | "number" | "select" | "multiselect" | "date" | "datetime"
  | "photo" | "file" | "boolean" | "rating" | "calculated" | "geopoint" | "barcode";

export interface FieldDef {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  hint?: string;
  default?: string | number | boolean;
  options?: string[];          // for select / multiselect
  min?: number;
  max?: number;
  formula?: string;            // for calculated
  mediaType?: "image" | "video" | "any";
}

export interface Form {
  id: string;
  name: string;
  description?: string;
  geometry_type: GeometryType;
  fields: FieldDef[];
  is_published: boolean;
  share_token?: string;
  project_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Feature {
  id: string;
  form_id: string;
  geometry: GeoJSONGeometry | null;
  properties: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  collector?: string;
  is_synced?: boolean;
}

export interface GeoJSONGeometry {
  type: GeometryType;
  coordinates: unknown;
}

export interface User {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: "admin" | "analyst" | "collector" | "viewer";
  org_id?: string;
  avatar?: string;
  created_at?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  form_count?: number;
  feature_count?: number;
}

export interface ContentItem {
  id: string;
  name: string;
  type: "layer" | "view" | "form" | "map" | "dash" | "scene" | "app";
  subtype: string;
  owner: string;
  modified: string;
  sharing: "private" | "organization" | "public";
  size?: string;
  tags?: string[];
  thumbnail?: string;
}

export interface DashboardWidget {
  id: string;
  type: "bar" | "line" | "pie" | "map" | "table" | "stat" | "text";
  title: string;
  source?: string;
  w: number;
  h: number;
  config?: Record<string, unknown>;
}

export interface MapLayer {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  opacity: number;
  type?: "feature" | "tile" | "wms" | "geojson";
}

export interface OrgMember {
  id: string;
  name: string;
  username: string;
  role: string;
  email: string;
  lastLogin: string;
  status: "active" | "inactive";
}
