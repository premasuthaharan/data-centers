import urllib.request
import json
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from logic import all_datacenters_with_impact, nearest_datacenters

app = FastAPI(title="Data Centers API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["GET"],
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
    return all_datacenters_with_impact()


@app.get("/api/locate")
def locate(ip: str = Query(...)):
    try:
        geo = geolocate_ip(ip)
        return {"lat": geo["lat"], "lng": geo["lon"], "city": geo["city"], "country": geo["country"]}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.get("/api/datacenters/nearest")
def get_nearest(lat: float = Query(...), lng: float = Query(...), n: int = Query(3, ge=1, le=20)):
    return nearest_datacenters(lat, lng, n)
