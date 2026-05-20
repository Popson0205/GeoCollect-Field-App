# geo-api/routers/ogc.py
# OGC API Features — Part 1: Core (2022)
# Exposes published GeoCollect form schemas as OGC-compliant feature collections.
#
# Register in main.py:
#   from routers import ogc
#   app.include_router(ogc.router, prefix="/ogc", tags=["OGC API Features"])

from fastapi import APIRouter, HTTPException, Query, Header, Request
from typing import Optional
import httpx
import os
import psycopg2
import psycopg2.extras
import json

router = APIRouter()

DATABASE_URL = os.getenv("DATABASE_URL")
API_SERVICE   = os.getenv("API_SERVICE_URL", "http://api:3001")


def get_conn():
    return psycopg2.connect(DATABASE_URL)


async def validate_api_key(api_key: Optional[str]) -> dict:
    """Validate a GeoCollect API key via the Fastify API service."""
    if not api_key:
        return {"valid": False}
    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"{API_SERVICE}/portal/api-keys/validate",
            headers={"x-api-key": api_key},
            timeout=5.0
        )
    return res.json() if res.status_code == 200 else {"valid": False}


def require_access(form_row: dict, api_key_info: dict) -> bool:
    """Public collections are open; org/private require a valid key."""
    if form_row["visibility"] == "public":
        return True
    return api_key_info.get("valid") and api_key_info.get("projectId") == str(form_row["project_id"])


# ── Landing page ──────────────────────────────────────────────────────────────
@router.get("/")
async def landing_page(request: Request):
    base = str(request.base_url).rstrip("/")
    return {
        "title": "GeoCollect OGC API Features",
        "description": "Access GeoCollect feature collections via OGC API Features (Part 1, 2022)",
        "links": [
            {"href": f"{base}/ogc", "rel": "self", "type": "application/json", "title": "This document"},
            {"href": f"{base}/ogc/conformance", "rel": "conformance", "type": "application/json"},
            {"href": f"{base}/ogc/collections", "rel": "data", "type": "application/json"},
        ]
    }


# ── Conformance ───────────────────────────────────────────────────────────────
@router.get("/conformance")
async def conformance():
    return {
        "conformsTo": [
            "http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/core",
            "http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/oas30",
            "http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/geojson",
        ]
    }


# ── Collections list ──────────────────────────────────────────────────────────
@router.get("/collections")
async def list_collections(
    request: Request,
    x_api_key: Optional[str] = Header(default=None),
    api_key: Optional[str] = Query(default=None)
):
    key = x_api_key or api_key
    key_info = await validate_api_key(key)

    conn = get_conn()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        SELECT id, project_id, name, geometry_type, visibility, updated_at
        FROM form_schemas
        WHERE is_published = TRUE
          AND visibility IN ('public', 'organization')
        ORDER BY updated_at DESC
    """)
    rows = cur.fetchall()
    cur.close(); conn.close()

    base = str(request.base_url).rstrip("/")
    collections = []
    for row in rows:
        if not require_access(row, key_info):
            continue
        collections.append({
            "id": str(row["id"]),
            "title": row["name"],
            "description": f"{row['geometry_type']} feature collection",
            "links": [
                {"href": f"{base}/ogc/collections/{row['id']}/items", "rel": "items", "type": "application/geo+json"},
            ]
        })

    return {"collections": collections, "links": [{"href": f"{base}/ogc/collections", "rel": "self"}]}


# ── Single collection ─────────────────────────────────────────────────────────
@router.get("/collections/{collection_id}")
async def get_collection(
    collection_id: str,
    request: Request,
    x_api_key: Optional[str] = Header(default=None),
    api_key: Optional[str] = Query(default=None)
):
    key = x_api_key or api_key
    key_info = await validate_api_key(key)

    conn = get_conn()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT * FROM form_schemas WHERE id = %s AND is_published = TRUE", (collection_id,))
    row = cur.fetchone()
    cur.close(); conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Collection not found")
    if not require_access(row, key_info):
        raise HTTPException(status_code=401, detail="API key required for this collection")

    base = str(request.base_url).rstrip("/")
    return {
        "id": str(row["id"]),
        "title": row["name"],
        "description": f"{row['geometry_type']} collection — project {row['project_id']}",
        "links": [
            {"href": f"{base}/ogc/collections/{collection_id}/items", "rel": "items", "type": "application/geo+json"},
        ]
    }


# ── Items (features) ──────────────────────────────────────────────────────────
@router.get("/collections/{collection_id}/items")
async def get_items(
    collection_id: str,
    request: Request,
    limit: int = Query(default=100, le=1000),
    offset: int = Query(default=0),
    bbox: Optional[str] = Query(default=None),
    x_api_key: Optional[str] = Header(default=None),
    api_key: Optional[str] = Query(default=None)
):
    key = x_api_key or api_key
    key_info = await validate_api_key(key)

    conn = get_conn()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # Auth check
    cur.execute("SELECT * FROM form_schemas WHERE id = %s AND is_published = TRUE", (collection_id,))
    schema = cur.fetchone()
    if not schema:
        raise HTTPException(status_code=404, detail="Collection not found")
    if not require_access(schema, key_info):
        raise HTTPException(status_code=401, detail="API key required")

    # Build query
    bbox_filter = ""
    params = [collection_id, limit, offset]
    if bbox:
        minx, miny, maxx, maxy = [float(v) for v in bbox.split(",")]
        bbox_filter = "AND ST_Intersects(f.geometry, ST_MakeEnvelope(%s,%s,%s,%s,4326))"
        params = [collection_id] + [minx, miny, maxx, maxy] + [limit, offset]

    cur.execute(f"""
        SELECT f.id, ST_AsGeoJSON(f.geometry)::json AS geometry, f.attributes, f.created_at
        FROM features f
        WHERE f.form_schema_id = %s
        {bbox_filter}
        ORDER BY f.created_at DESC
        LIMIT %s OFFSET %s
    """, params)

    rows = cur.fetchall()
    cur.close(); conn.close()

    base = str(request.base_url).rstrip("/")
    features = [
        {
            "type": "Feature",
            "id": str(r["id"]),
            "geometry": r["geometry"],
            "properties": {**r["attributes"], "_created_at": str(r["created_at"])}
        }
        for r in rows
    ]

    return {
        "type": "FeatureCollection",
        "timeStamp": __import__("datetime").datetime.utcnow().isoformat() + "Z",
        "numberReturned": len(features),
        "features": features,
        "links": [
            {"href": f"{base}/ogc/collections/{collection_id}/items?limit={limit}&offset={offset}", "rel": "self"},
            {"href": f"{base}/ogc/collections/{collection_id}/items?limit={limit}&offset={offset+limit}", "rel": "next"},
        ]
    }


# ── Single item ───────────────────────────────────────────────────────────────
@router.get("/collections/{collection_id}/items/{feature_id}")
async def get_item(
    collection_id: str,
    feature_id: str,
    x_api_key: Optional[str] = Header(default=None),
    api_key: Optional[str] = Query(default=None)
):
    key = x_api_key or api_key
    key_info = await validate_api_key(key)

    conn = get_conn()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cur.execute("SELECT visibility, project_id FROM form_schemas WHERE id = %s", (collection_id,))
    schema = cur.fetchone()
    if not schema or not require_access(schema, key_info):
        raise HTTPException(status_code=401, detail="API key required")

    cur.execute("""
        SELECT id, ST_AsGeoJSON(geometry)::json AS geometry, attributes, created_at
        FROM features WHERE id = %s AND form_schema_id = %s
    """, (feature_id, collection_id))
    row = cur.fetchone()
    cur.close(); conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Feature not found")

    return {
        "type": "Feature",
        "id": str(row["id"]),
        "geometry": row["geometry"],
        "properties": {**row["attributes"], "_created_at": str(row["created_at"])}
    }
