## 1. Frontend API URL
- [ ] 1.1 Replace `const API = "http://localhost:8000"` in `App.jsx` with
      `const API = import.meta.env.VITE_API_URL || "http://localhost:8000"`
- [ ] 1.2 Add `VITE_API_URL` to `frontend/.env.example`

## 2. Mapbox token
- [ ] 2.1 Add `frontend/.env.example` with `VITE_MAPBOX_TOKEN=` and a
      comment linking to Mapbox's token dashboard
- [ ] 2.2 Add a runtime check in `Map.jsx`: if the token is empty, render a
      clear message ("Mapbox token missing — see .env.example") instead of
      silently failing

## 3. Backend CORS
- [ ] 3.1 Make `allow_origins` in `main.py` read from an environment
      variable (comma-separated list), falling back to the current
      localhost defaults
- [ ] 3.2 Document the env var in `backend/README.md`

## 4. Verification
- [ ] 4.1 Confirm local dev still works with no env vars set (defaults
      apply)
- [ ] 4.2 Confirm setting `VITE_API_URL`/`VITE_MAPBOX_TOKEN`/CORS env var
      actually overrides the defaults
