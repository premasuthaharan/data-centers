# Frontend

React + Vite app that renders the data center dataset on a Mapbox GL map
and shows per-facility impact details on click. All impact calculation
happens on the backend — this app only fetches and displays it.

## Setup

```
npm install
cp .env.example .env
```

Then fill in `.env`:

- `VITE_MAPBOX_TOKEN` — **required**, or the map will not render. Get a
  free token from
  [account.mapbox.com/access-tokens](https://account.mapbox.com/access-tokens/).
- `VITE_API_URL` — base URL of the backend API. Defaults to
  `http://localhost:8000` if unset, which matches the backend's default
  `uvicorn` port.

## Running locally

Start the backend first (see [`../backend/README.md`](../backend/README.md)),
then:

```
npm run dev
```

Serves on `http://localhost:5173` by default. The backend's
`ALLOWED_ORIGINS` CORS config already allows this origin out of the box.

## Other scripts

```
npm run build     # production build (outputs to dist/)
npm run preview   # preview the production build locally
npm run lint      # eslint
npm test          # vitest
```
