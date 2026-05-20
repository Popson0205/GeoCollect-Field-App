from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Any, Dict, List, Optional
import geopandas as gpd
import json, io, zipfile, tempfile, os
from shapely.geometry import shape

router = APIRouter()

class ExportRequest(BaseModel):
    features: List[Dict[str, Any]]
    format: str  # geojson | gpkg | shapefile | kml | csv
    layer_name: Optional[str] = "geocollect_features"

def features_to_gdf(features):
    geoms, props = [], []
    for f in features:
        try:
            geoms.append(shape(f["geometry"]))
            props.append(f.get("properties", {}))
        except Exception:
            pass
    return gpd.GeoDataFrame(props, geometry=geoms, crs="EPSG:4326")

@router.post("/")
def export_features(body: ExportRequest):
    gdf = features_to_gdf(body.features)
    fmt = body.format.lower()
    name = body.layer_name

    if fmt == "geojson":
        content = gdf.to_json()
        return StreamingResponse(
            io.BytesIO(content.encode()),
            media_type="application/geo+json",
            headers={"Content-Disposition": f'attachment; filename="{name}.geojson"'}
        )

    elif fmt == "gpkg":
        with tempfile.NamedTemporaryFile(suffix=".gpkg", delete=False) as tmp:
            gdf.to_file(tmp.name, driver="GPKG", layer=name)
            tmp.seek(0)
            data = open(tmp.name, "rb").read()
        os.unlink(tmp.name)
        return StreamingResponse(
            io.BytesIO(data),
            media_type="application/geopackage+sqlite3",
            headers={"Content-Disposition": f'attachment; filename="{name}.gpkg"'}
        )

    elif fmt == "shapefile":
        with tempfile.TemporaryDirectory() as tmpdir:
            shp_path = os.path.join(tmpdir, name + ".shp")
            gdf.to_file(shp_path, driver="ESRI Shapefile")
            buf = io.BytesIO()
            with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
                for fn in os.listdir(tmpdir):
                    zf.write(os.path.join(tmpdir, fn), fn)
            buf.seek(0)
        return StreamingResponse(
            buf,
            media_type="application/zip",
            headers={"Content-Disposition": f'attachment; filename="{name}_shp.zip"'}
        )

    elif fmt == "kml":
        with tempfile.NamedTemporaryFile(suffix=".kml", delete=False) as tmp:
            gdf.to_file(tmp.name, driver="KML")
            data = open(tmp.name, "rb").read()
        os.unlink(tmp.name)
        return StreamingResponse(
            io.BytesIO(data),
            media_type="application/vnd.google-earth.kml+xml",
            headers={"Content-Disposition": f'attachment; filename="{name}.kml"'}
        )

    elif fmt == "csv":
        gdf["geometry_wkt"] = gdf.geometry.apply(lambda g: g.wkt if g else None)
        df = gdf.drop(columns=["geometry"])
        content = df.to_csv(index=False)
        return StreamingResponse(
            io.BytesIO(content.encode()),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{name}.csv"'}
        )

    else:
        raise HTTPException(400, detail=f"Unsupported format: {fmt}")


# ── Mobile app export endpoints ────────────────────────────────────────────────
from fastapi import HTTPException
from fastapi.responses import Response
import json, tempfile, os, zipfile, io

@router.post("/shapefile")
async def export_shapefile(body: dict):
    """Convert GeoJSON FeatureCollection to Shapefile zip."""
    try:
        import geopandas as gpd
        from shapely.geometry import shape

        geojson = body.get("geojson")
        if not geojson:
            raise HTTPException(400, "geojson required")

        features = geojson.get("features", [])
        if not features:
            raise HTTPException(400, "No features to export")

        gdf = gpd.GeoDataFrame.from_features(features, crs="EPSG:4326")

        with tempfile.TemporaryDirectory() as tmpdir:
            shp_path = os.path.join(tmpdir, "export.shp")
            gdf.to_file(shp_path, driver="ESRI Shapefile")

            # Zip all shapefile components
            zip_buffer = io.BytesIO()
            with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
                for fname in os.listdir(tmpdir):
                    zf.write(os.path.join(tmpdir, fname), fname)

        zip_buffer.seek(0)
        return Response(
            content=zip_buffer.read(),
            media_type="application/zip",
            headers={"Content-Disposition": "attachment; filename=export.zip"}
        )
    except ImportError:
        raise HTTPException(500, "geopandas not available")
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/dxf")
async def export_dxf(body: dict):
    """Convert GeoJSON point features to DXF."""
    geojson = body.get("geojson")
    if not geojson:
        raise HTTPException(400, "geojson required")

    features = geojson.get("features", [])
    entities = []

    for feat in features:
        geom = feat.get("geometry", {})
        if geom.get("type") == "Point":
            coords = geom["coordinates"]
            lng, lat = coords[0], coords[1]
            alt = coords[2] if len(coords) > 2 else 0
            entities.append(f"  0\nPOINT\n  8\nGeoCollect\n 10\n{lng}\n 20\n{lat}\n 30\n{alt}")
        elif geom.get("type") == "LineString":
            coords = geom["coordinates"]
            for i in range(len(coords) - 1):
                x1, y1 = coords[i][0], coords[i][1]
                x2, y2 = coords[i+1][0], coords[i+1][1]
                entities.append(f"  0\nLINE\n  8\nGeoCollect\n 10\n{x1}\n 20\n{y1}\n 30\n0\n 11\n{x2}\n 21\n{y2}\n 31\n0")

    dxf = "  0\nSECTION\n  2\nHEADER\n  0\nENDSEC\n  0\nSECTION\n  2\nENTITIES\n"
    dxf += "\n".join(entities)
    dxf += "\n  0\nENDSEC\n  0\nEOF"

    return {"dxf": dxf, "feature_count": len(features)}
