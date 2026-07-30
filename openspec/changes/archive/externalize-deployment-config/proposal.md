## Why

Two related hardcoding issues block the app from running anywhere but a
developer's own machine:

- `frontend/src/App.jsx` hardcodes `const API = "http://localhost:8000"`
  with no environment-variable override.
- `frontend/.env` has `VITE_MAPBOX_TOKEN=` blank, so the map doesn't render
  without a developer manually supplying their own token, and there's no
  `.env.example` documenting that this is required.
- CORS in `backend/main.py` only allows `localhost:5173`/`localhost:3000`
  origins, which would also need to change for any real deployment.

These are grouped because they're the same underlying gap (the app assumes
local dev only) and the fix is the same shape for both: externalize to
env vars and document them.

## What Changes

- Replace the hardcoded `API` constant in `App.jsx` with
  `import.meta.env.VITE_API_URL`, defaulting to `http://localhost:8000` for
  local dev.
- Add a `frontend/.env.example` documenting `VITE_MAPBOX_TOKEN` and
  `VITE_API_URL` with comments on where to obtain a Mapbox token.
- Make backend CORS `allow_origins` configurable via an environment
  variable instead of a hardcoded list.

## Impact

- Affected code: `frontend/src/App.jsx`, `frontend/.env` /
  `frontend/.env.example`, `backend/main.py` (CORS middleware config).
- No functional change to local dev behavior (defaults preserved).
