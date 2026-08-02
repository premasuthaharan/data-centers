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

## 3. Frontend

- [ ] 3.1 New `AnnotationList` component: fetches and renders approved
      annotations for a facility, grouped/labeled by type
- [ ] 3.2 New `AnnotationForm` component: type selector + content input,
      posts to the submission endpoint, shows a "submitted for review"
      confirmation (not immediate publish)
- [ ] 3.3 `DataCenterCard.jsx`: new collapsible "Community" section
      rendering `AnnotationList` + `AnnotationForm` below the existing
      impact blocks
- [ ] 3.4 Frontend tests for both new components and the card integration

## 4. Verification

- [ ] 4.1 `cd backend && python3 -m pytest` passes
- [ ] 4.2 `cd frontend && npm test` passes
- [ ] 4.3 Manual: submit an annotation, confirm it's not visible until
      approved via the moderation path, then confirm it appears on the
      facility card once approved
- [ ] 4.4 Manual: confirm rate limiting blocks rapid repeat submissions
      from the same IP
