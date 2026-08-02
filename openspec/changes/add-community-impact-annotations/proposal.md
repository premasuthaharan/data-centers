## Why

Today the site is a pure data viewer: `DataCenterCard.jsx`'s detail panel
shows computed impact stats (power, water, carbon, land) and nothing
about the lived, local reaction to a facility — no way to see or add a
public comment, a link to local news coverage, or an upcoming permitting
hearing date. For a site whose stated purpose is visualizing data
centers' impact "on their surrounding area" (`README.md`), the people
actually experiencing that impact have no voice in it. Adding a
lightweight annotation layer turns the map from something you look at
into something a community can use to organize around — e.g. someone
preparing for a permitting hearing on a `"planned"` facility (once
[[add-facility-lifecycle-status]] lands) could see and add to a shared
record of local news and hearing dates for that specific site.

## What Changes

- New backend data store for annotations, keyed by facility `id`. Given
  the project's current data model is static JSON files with no database
  and no auth (`backend/data/datacenters.json`, no user accounts
  anywhere in the codebase), this needs a genuinely new persistence layer
  — recommend starting with a simple append-only JSON/SQLite store
  (`backend/data/annotations.json` or `annotations.db`) rather than
  introducing a full database dependency, consistent with the project's
  existing "static file + FastAPI" scale.
- New annotation types, each minimal: a free-text comment, a link (with
  label) to local news coverage, or a permitting-hearing date. Each
  annotation records facility id, type, content, and submission
  timestamp. No user accounts — submissions are anonymous, matching the
  project's current no-auth posture, but see moderation note below.
- New API endpoints: `GET /api/datacenters/{id}/annotations` (list) and
  `POST /api/datacenters/{id}/annotations` (submit). Follows the existing
  REST-ish pattern of `main.py`'s other endpoints
  (`/api/datacenters/nearest`, `/api/scenario`).
- **Moderation is the hard part of this change and must be resolved
  before launch, not after**: an open, anonymous, unauthenticated
  annotation endpoint on a public site is an abuse vector (spam, off-topic
  content, harassment, defamation risk if false claims are published
  under the site's name). Recommend starting with a conservative design —
  submissions held in a `pending` state and not publicly visible until
  approved via a simple admin-only review path (e.g. a moderation
  endpoint gated by a shared secret env var, matching how
  `ALLOWED_ORIGINS` is already configured via environment variable) —
  rather than shipping open publish-on-submit.
- `DataCenterCard.jsx`: new collapsible "Community" section in the
  detail panel (below the existing impact blocks) listing approved
  annotations for that facility, plus a form to submit a new one.
- Rate limiting / basic spam protection (e.g. a simple per-IP submission
  cap, reusing the existing `client_ip` helper already in `main.py` for
  `/api/locate`) so the open endpoint isn't trivially floodable.

## Impact

- Affected code: new `backend/annotations.py` (or extend `main.py`) +
  new data store, `frontend/src/components/DataCenterCard.jsx` (new
  section), likely a new `AnnotationForm`/`AnnotationList` component.
- This is the largest-scope idea of the four in this batch — it's the
  first user-generated-content feature in a project that has none today,
  and moderation/abuse-prevention is a real product decision, not just
  an implementation detail. Recommend treating the moderation design
  (open vs. reviewed, rate limits, content rules) as something to align
  on explicitly before writing code, not something to default silently.
- Independent of the other three new changes in this batch, though a
  "Contact local government" button ([[add-contact-local-government]])
  and a permitting-hearing-date annotation type would naturally
  cross-reference each other on the same detail card.
