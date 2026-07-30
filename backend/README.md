GET /api/locate
takes IP and returns latitute and longitude

GET /api/datacenters/nearest
returns closest data centers & impact metrics

## Configuration

`ALLOWED_ORIGINS` — comma-separated list of origins allowed by CORS
(e.g. `https://example.com,https://www.example.com`). Defaults to
`http://localhost:5173,http://localhost:3000` if unset.

## Refreshing the dataset

`data/datacenters.json` is generated from the Epoch AI data centers CSV
and is not fetched at runtime — refresh it with:

```
make refresh-data
```

(run from the repo root; wraps `python3 fetch_data.py`). This re-fetches
the source CSV, re-geocodes every entry via Nominatim, and overwrites
`data/datacenters.json`. It takes a while (Nominatim is rate-limited to
~1 request/second) and requires network access. A GitHub Actions workflow
(`.github/workflows/refresh-data.yml`) also runs this monthly and opens a
PR with the resulting diff for review — see that workflow for the
automated schedule.
