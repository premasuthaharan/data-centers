## 1. Moderation design (resolve before building)

- [ ] 1.1 Decide submission flow: held-for-review (recommended) vs.
      open-publish, and how approval is performed (admin endpoint gated
      by a shared secret env var, following the `ALLOWED_ORIGINS`
      precedent in `main.py`)
- [ ] 1.2 Define content rules (max length, allowed annotation types,
      basic profanity/spam filtering) and per-IP rate limits

## 2. Backend

- [ ] 2.1 Add an annotations data store (`backend/data/annotations.json`
      or SQLite) with fields: `id`, `facility_id`, `type`
      (`"comment" | "news_link" | "hearing_date"`), `content`, `label`
      (for links), `submitted_at`, `status` (`"pending" | "approved"`)
- [ ] 2.2 `GET /api/datacenters/{id}/annotations`: return only
      `"approved"` annotations for a facility
- [ ] 2.3 `POST /api/datacenters/{id}/annotations`: validate against the
      content rules from 1.2, apply rate limiting via `client_ip`, store
      as `"pending"`
- [ ] 2.4 Admin-only moderation endpoint(s) to list pending and
      approve/reject, gated by shared-secret env var
- [ ] 2.5 Backend tests: submission validation, rate limiting, pending
      annotations excluded from the public list endpoint, moderation
      endpoint auth

## 3. Public pressure / concern metric

- [ ] 3.1 Choose and implement a scoring formula from `"approved"`
      annotations only: weighted, time-decayed count of comments +
      news links, with a lexicon-based sentiment pass (e.g. VADER) on
      comment text weighting negative comments more heavily
- [ ] 3.2 Enforce a minimum annotation count (e.g. 3) below which the
      facility returns "not enough data" rather than a computed score
- [ ] 3.3 New endpoint or field exposing the score (e.g.
      `GET /api/datacenters/{id}/pressure-score`, computed on request
      from current approved annotations, not cached/stale)
- [ ] 3.4 Backend tests: score computation correctness, minimum-count
      threshold behavior, and that `"pending"`/rejected annotations never
      influence the score

## 4. Frontend

- [ ] 4.1 New `AnnotationList` component: fetches and renders approved
      annotations for a facility, grouped/labeled by type
- [ ] 4.2 New `AnnotationForm` component: type selector + content input,
      posts to the submission endpoint, shows a "submitted for review"
      confirmation (not immediate publish)
- [ ] 4.3 `DataCenterCard.jsx`: new collapsible "Community" section
      rendering `AnnotationList` + `AnnotationForm` below the existing
      impact blocks
- [ ] 4.4 New pressure-score badge near the existing `dc-detail-stats`
      chip row, labeled as derived from this site's own submissions
      (e.g. "Community concern: based on N comments"), showing
      "not enough data" when below the minimum-count threshold
- [ ] 4.5 Frontend tests for all new components, the card integration,
      and the badge's threshold/labeling behavior

## 5. Verification

- [ ] 5.1 `cd backend && python3 -m pytest` passes
- [ ] 5.2 `cd frontend && npm test` passes
- [ ] 5.3 Manual: submit an annotation, confirm it's not visible until
      approved via the moderation path, then confirm it appears on the
      facility card once approved
- [ ] 5.4 Manual: confirm rate limiting blocks rapid repeat submissions
      from the same IP
- [ ] 5.5 Manual: confirm the pressure-score badge shows "not enough
      data" for a facility with few/no approved annotations, and a
      plausible score once enough exist; confirm pending/rejected
      submissions never move the score
