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
[[facility-lifecycle-status]] lands) could see and add to a shared
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
- **New "public pressure" metric per facility**: a computed indicator of
  how much local opposition/concern a facility is attracting, shown as a
  new stat on `DataCenterCard.jsx` (e.g. a small badge or gauge near the
  existing `dc-detail-stats` chip row) rather than an isolated number
  elsewhere on the page, so it reads alongside power/cost/impact-radius
  as another at-a-glance fact about the facility.
  - This must be *derived from the annotation data this change actually
    collects* — comment volume, news-link volume, and a rough
    negative/positive lean on comment text — not a fabricated or
    hand-set score. A facility with zero annotations should show as
    "no signal" (or be omitted entirely), never default to a
    misleadingly neutral or low score that implies "checked, and it's
    fine."
  - Concretely: start with a simple, explainable formula — e.g. a
    weighted count of `"comment"` + `"news_link"` annotations in a
    trailing window (so old activity decays rather than accumulating
    forever), plus a lightweight sentiment pass on comment text
    (keyword/lexicon-based, e.g. VADER or a similar off-the-shelf
    lexicon rather than standing up an ML pipeline for this) to weight
    negative comments more heavily than neutral ones. Avoid a "vibes"
    LLM-scored approach for v1 — a transparent, auditable formula is
    more defensible for a metric this easy to misread as authoritative.
  - Must be presented carefully: label it explicitly as derived from
    *this site's own user submissions* (e.g. "Community concern: based
    on N recent comments") so it can't be mistaken for an independent or
    validated measure of actual public sentiment — it's only as
    representative as who happens to submit annotations here, which for
    a niche site will often be a handful of people, not a scientific
    sample. Facilities with very few annotations (below some minimum
    count, e.g. 3) should show "not enough data" rather than a
    confident-looking score computed from 1-2 comments.
  - Backend: compute this alongside the existing annotation-list
    endpoint (or a new `GET /api/datacenters/{id}/pressure-score`) rather
    than storing it as a stale precomputed field, since it should reflect
    approved annotations as of the current request.
  - Only `"approved"` annotations (per the moderation flow above) feed
    the score — pending/rejected submissions must not influence it,
    both to prevent gaming (flooding a facility with spam to fake a
    "high pressure" reading) and because unmoderated content shouldn't
    drive a published metric.

## Impact

- Affected code: new `backend/annotations.py` (or extend `main.py`) +
  new data store, a new pressure-score computation (in `annotations.py`
  or `logic.py`), `frontend/src/components/DataCenterCard.jsx` (new
  Community section + pressure badge in `dc-detail-stats`), likely a new
  `AnnotationForm`/`AnnotationList` component.
- This is the largest-scope idea of the four in this batch — it's the
  first user-generated-content feature in a project that has none today,
  and moderation/abuse-prevention is a real product decision, not just
  an implementation detail. Recommend treating the moderation design
  (open vs. reviewed, rate limits, content rules) as something to align
  on explicitly before writing code, not something to default silently.
- The pressure/anger metric compounds that risk rather than sitting
  beside it: it turns raw annotation counts into a published,
  facility-labeled score, which raises the stakes on moderation (a
  handful of coordinated spam submissions could otherwise fabricate a
  "high concern" reading for a specific, named company's facility) and
  on the "not enough data" / minimum-count threshold being taken
  seriously rather than treated as a nice-to-have.
- Independent of the other three new changes in this batch, though a
  "Contact local government" button ([[contact-local-government]])
  and a permitting-hearing-date annotation type would naturally
  cross-reference each other on the same detail card.
