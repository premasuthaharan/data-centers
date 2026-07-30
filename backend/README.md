GET /api/locate
takes IP and returns latitute and longitude

GET /api/datacenters/nearest
returns closest data centers & impact metrics

## Configuration

`ALLOWED_ORIGINS` — comma-separated list of origins allowed by CORS
(e.g. `https://example.com,https://www.example.com`). Defaults to
`http://localhost:5173,http://localhost:3000` if unset.
