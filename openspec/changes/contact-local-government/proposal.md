## Why

trackpolicy.org's framing is legislative — bills, categories like "Local
Control," real policy debates tied to specific jurisdictions. A user who
lands on a facility's detail card and cares about its impact today has no
path from "I'm concerned about this" to "here's who represents this
address and how to reach them." A "Contact your representatives" action
on a facility, similar in spirit to the "search by legislator/district"
idea, turns the site from awareness into a concrete next step — closely
related to [[community-impact-annotations]]'s organizing framing and
[[facility-lifecycle-status]]'s `"planned"`/`"under_construction"`
facilities, where contacting a representative before a permitting
decision is finalized is far more actionable than after.

## What Changes

- New "Contact local government" button on `DataCenterCard.jsx`'s detail
  panel (near the existing "Copy link" button), which needs to resolve a
  facility's address to its actual representatives — this requires a new
  external dependency the project doesn't have today. The project
  currently has no legislator/district data source anywhere in the
  codebase (Nominatim, used for geocoding, does not provide legislative
  district info).
  - Recommend the Google Civic Information API or a similar
    address-to-representatives lookup service (state/federal
    legislators by address is a well-covered use case for these APIs)
    rather than trying to maintain district-boundary data ourselves —
    this project has consistently favored free/keyless sources
    (Nominatim, ip-api) where possible, so evaluate keyless options first,
    but representative-lookup APIs generally do require an API key,
    which would be this project's first.
  - Given facilities are already geocoded (`lat`/`lng`, `address`), the
    lookup can run server-side, keyed by the same address already stored,
    with results cached per facility (representatives don't change often
    enough to look up on every request) rather than calling the external
    API on every card open.
- Clicking the button shows the resolved representatives (name, office,
  contact method — phone/email/contact-form link where the API provides
  one) rather than immediately opening an external contact form, so the
  user can see who they'd be contacting before committing. This also
  keeps the site itself from ever sending a message on the user's
  behalf — it only surfaces contact info and links out, avoiding any
  concern about looking like automated/bulk contact generation.
- Scope to facility-level (using the facility's own address), not a
  separate "search by my address" feature — the ask here is "who
  represents *this* facility," which is simpler than
  [[realistic-policy-scenarios]]'s adjacent idea of district-based
  search across the whole map.

## Impact

- Affected code: new backend endpoint (e.g.
  `GET /api/datacenters/{id}/representatives`) wrapping the external
  lookup + a cache (reuse the `backend/data/` snapshot-style caching
  pattern already used for datacenter snapshots), `frontend/src/
  components/DataCenterCard.jsx` (new button + representatives display,
  likely a small new component).
- Requires a new external API dependency and, likely, an API key — this
  is a real product/ops decision (who owns the key, rate limits, cost at
  scale) that should be confirmed before implementation, not assumed.
  Flag explicitly during implementation if a genuinely keyless
  alternative isn't found.
- Depends conceptually on [[facility-lifecycle-status]] for framing
  (contacting representatives is most actionable for
  `"planned"`/`"under_construction"` facilities) but doesn't require it
  to ship first — the button is useful for any facility's address
  regardless of construction status.
