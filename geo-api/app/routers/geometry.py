from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any, Dict
from shapely.geometry import shape
from shapely.validation import explain_validity
import json

router = APIRouter()

class GeometryInput(BaseModel):
    geometry: Dict[str, Any]

@router.post("/validate")
def validate_geometry(body: GeometryInput):
    try:
        geom = shape(body.geometry)
        valid = geom.is_valid
        return {
            "valid": valid,
            "reason": None if valid else explain_validity(geom),
            "type": geom.geom_type,
            "area": geom.area if geom.geom_type in ("Polygon","MultiPolygon") else None,
            "length": geom.length if geom.geom_type in ("LineString","MultiLineString") else None,
            "bounds": geom.bounds
        }
    except Exception as e:
        raise HTTPException(400, detail=str(e))

@router.post("/simplify")
def simplify_geometry(body: GeometryInput, tolerance: float = 0.0001):
    try:
        geom = shape(body.geometry)
        simplified = geom.simplify(tolerance, preserve_topology=True)
        return {"geometry": json.loads(simplified.wkt), "original_coords": len(list(geom.coords)) if hasattr(geom, 'coords') else None}
    except Exception as e:
        raise HTTPException(400, detail=str(e))

@router.post("/centroid")
def get_centroid(body: GeometryInput):
    try:
        geom = shape(body.geometry)
        c = geom.centroid
        return {"type": "Point", "coordinates": [c.x, c.y]}
    except Exception as e:
        raise HTTPException(400, detail=str(e))
