import os
import urllib.request
import json
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from logic import (
    aggregate_impact,
    all_datacenters_with_impact,
    compute_impact,
    datacenter_by_id_with_impact,
    load_datacenters,
    nearest_datacenters,
    get_dataset_metadata,
    regions_with_aggregate_impact,
)

app = FastAPI(title="Data Centers API")

DEFAULT_ALLOWED_ORIGINS = ["http://localhost:5173", "http://localhost:3000"]
allowed_origins_env = os.environ.get("ALLOWED_ORIGINS")
allow_origins = (
    [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]
    if allowed_origins_env
    else DEFAULT_ALLOWED_ORIGINS
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


def geolocate_ip(ip: str) -> dict:
    url = f"http://ip-api.com/json/{ip}?fields=status,lat,lon,city,country,countryCode"
    req = urllib.request.Request(url, headers={"User-Agent": "datacenter-mapper/1.0"})
    with urllib.request.urlopen(req, timeout=5) as resp:
        data = json.loads(resp.read())
    if data.get("status") != "success":
        raise ValueError(f"ip-api failed: {data}")
    return data


@app.get("/api/datacenters")
def get_all():
    return {
        "generated_at": get_dataset_metadata()["generated_at"],
        "data_centers": all_datacenters_with_impact(),
    }


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host


@app.get("/api/locate")
def locate(request: Request, ip: str | None = Query(None)):
    try:
        geo = geolocate_ip(ip or client_ip(request))
        return {"lat": geo["lat"], "lng": geo["lon"], "city": geo["city"], "country": geo["country"]}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.get("/api/regions")
def get_regions():
    return regions_with_aggregate_impact()


@app.get("/api/datacenters/nearest")
def get_nearest(lat: float = Query(...), lng: float = Query(...), n: int = Query(3, ge=1, le=20)):
    return nearest_datacenters(lat, lng, n)


@app.get("/api/datacenters/{facility_id}")
def get_one(facility_id: str):
    dc = datacenter_by_id_with_impact(facility_id)
    if dc is None:
        raise HTTPException(status_code=404, detail=f"Unknown facility id: {facility_id}")
    return dc


class ScenarioOverrides(BaseModel):
    renewable_pct: float | None = None
    carbon_intensity_gco2_per_kwh: float | None = None
    water_liters_per_kwh: float | None = None
    pue: float | None = None
    cost_allocation_reform: bool | None = None
    tax_incentive_rollback: bool | None = None


class ScenarioRequest(BaseModel):
    scenario: ScenarioOverrides
    facility_ids: list[str] | None = None


@app.post("/api/scenario")
def post_scenario(body: ScenarioRequest):
    centers = load_datacenters()

    if body.facility_ids is not None:
        by_id = {dc["id"]: dc for dc in centers}
        unknown = [fid for fid in body.facility_ids if fid not in by_id]
        if unknown:
            raise HTTPException(status_code=404, detail=f"Unknown facility_ids: {unknown}")
        targeted = [by_id[fid] for fid in body.facility_ids]
    else:
        targeted = centers

    overrides = body.scenario.model_dump(exclude={"pue"}, exclude_none=True)
    # None (not the global PUE constant) lets compute_impact apply the
    # category-appropriate default when the scenario doesn't explicitly
    # override PUE.
    pue = body.scenario.pue

    baseline = [{**dc, "impact": compute_impact(dc)} for dc in targeted]
    scenario = [{**dc, "impact": compute_impact(dc, overrides=overrides, pue=pue)} for dc in targeted]

    return {
        "data_centers": scenario,
        "baseline_totals": aggregate_impact(baseline),
        "scenario_totals": aggregate_impact(scenario),
    }
