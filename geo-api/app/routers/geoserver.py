# geo-api/app/routers/geoserver.py  — REPLACE existing file
# Fix: publish_layer was calling undefined auth_gs(); corrected to gs_auth()
# Also adds: GET /layers (list), DELETE /layers/{name}, POST /layers/{name}/reload

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import httpx, os

router = APIRouter()

GEOSERVER_URL  = os.getenv("GEOSERVER_URL",  "http://geoserver:8080/geoserver")
GEOSERVER_USER = os.getenv("GEOSERVER_USER", "admin")
GEOSERVER_PASS = os.getenv("GEOSERVER_PASS", "geoserver")
PG_HOST        = os.getenv("POSTGRES_HOST",  "postgres")
PG_DB          = os.getenv("POSTGRES_DB",    "geocollect")
PG_USER        = os.getenv("POSTGRES_USER",  "geocollect")
PG_PASS        = os.getenv("POSTGRES_PASSWORD", "geocollect")
WORKSPACE      = "geocollect"
DATASTORE      = "geocollect_postgis"


def gs_auth():
    return (GEOSERVER_USER, GEOSERVER_PASS)


def gs_headers():
    return {"Content-Type": "application/json", "Accept": "application/json"}


class PublishLayerRequest(BaseModel):
    layer_name: str
    table_name: Optional[str] = None
    title:      Optional[str] = None


@router.post("/workspace/init")
def init_workspace():
    """Create the geocollect workspace and PostGIS datastore in GeoServer (idempotent)."""
    base = GEOSERVER_URL + "/rest"
    auth = gs_auth()

    ws_resp = httpx.post(
        f"{base}/workspaces",
        json={"workspace": {"name": WORKSPACE}},
        auth=auth, headers=gs_headers(), timeout=30,
    )

    ds_body = {
        "dataStore": {
            "name": DATASTORE,
            "connectionParameters": {
                "entry": [
                    {"@key": "host",     "$": PG_HOST},
                    {"@key": "port",     "$": "5432"},
                    {"@key": "database", "$": PG_DB},
                    {"@key": "user",     "$": PG_USER},
                    {"@key": "passwd",   "$": PG_PASS},
                    {"@key": "dbtype",   "$": "postgis"},
                    {"@key": "schema",   "$": "public"},
                ]
            },
        }
    }
    ds_resp = httpx.post(
        f"{base}/workspaces/{WORKSPACE}/datastores",
        json=ds_body, auth=auth, headers=gs_headers(), timeout=30,
    )
    return {
        "workspace_status": ws_resp.status_code,
        "datastore_status":  ds_resp.status_code,
    }


@router.post("/layers/publish")
def publish_layer(body: PublishLayerRequest):
    """Publish a PostGIS table as a WFS/WMS layer in GeoServer."""
    base  = GEOSERVER_URL + "/rest"
    table = body.table_name or body.layer_name
    ft_body = {
        "featureType": {
            "name":       body.layer_name,
            "nativeName": table,
            "title":      body.title or body.layer_name,
            "srs":        "EPSG:4326",
            "enabled":    True,
        }
    }
    resp = httpx.post(
        f"{base}/workspaces/{WORKSPACE}/datastores/{DATASTORE}/featuretypes",
        json=ft_body, auth=gs_auth(), headers=gs_headers(), timeout=30,  # ← FIXED
    )
    if resp.status_code not in (200, 201):
        raise HTTPException(502, detail=f"GeoServer error: {resp.text}")
    return {
        "published": body.layer_name,
        "wms_url":   f"{GEOSERVER_URL}/{WORKSPACE}/wms",
        "wfs_url":   f"{GEOSERVER_URL}/{WORKSPACE}/ows?service=WFS&version=2.0.0&request=GetFeature&typeName={WORKSPACE}:{body.layer_name}",
    }


@router.get("/layers")
def list_layers():
    """List all published layers in the GeoCollect workspace."""
    base = GEOSERVER_URL + "/rest"
    resp = httpx.get(
        f"{base}/workspaces/{WORKSPACE}/datastores/{DATASTORE}/featuretypes.json",
        auth=gs_auth(), headers=gs_headers(), timeout=30,
    )
    if resp.status_code != 200:
        raise HTTPException(502, detail=f"GeoServer error: {resp.text}")
    data = resp.json()
    return {"layers": data.get("featureTypes", {}).get("featureType", [])}


@router.delete("/layers/{layer_name}")
def delete_layer(layer_name: str):
    """Unpublish a layer (does not drop the PostGIS table)."""
    base = GEOSERVER_URL + "/rest"
    resp = httpx.delete(
        f"{base}/workspaces/{WORKSPACE}/datastores/{DATASTORE}/featuretypes/{layer_name}?recurse=true",
        auth=gs_auth(), headers=gs_headers(), timeout=30,
    )
    if resp.status_code == 200:
        return {"deleted": layer_name}
    if resp.status_code == 404:
        raise HTTPException(404, detail=f"Layer '{layer_name}' not found")
    raise HTTPException(502, detail=f"GeoServer error: {resp.text}")


@router.post("/layers/{layer_name}/reload")
def reload_layer(layer_name: str):
    """Force GeoServer to reload a layer's schema after table changes."""
    base = GEOSERVER_URL + "/rest"
    resp = httpx.put(
        f"{base}/workspaces/{WORKSPACE}/datastores/{DATASTORE}/featuretypes/{layer_name}?recalculate=nativebbox,latlonbbox",
        auth=gs_auth(), headers=gs_headers(), timeout=30,
    )
    if resp.status_code in (200, 201):
        return {"reloaded": layer_name}
    raise HTTPException(502, detail=f"GeoServer reload failed: {resp.text}")
