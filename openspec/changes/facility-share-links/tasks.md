## 1. URL sync

- [ ] 1.1 On `App.jsx` mount (after `datacenters` loads), read `?facility=`
      from `window.location.search`; if it matches a loaded facility ID,
      call `handleSelect` for it and fly the map to it
- [ ] 1.2 If the param doesn't match any loaded facility, ignore it
      silently (fall back to the default unselected view) rather than
      erroring
- [ ] 1.3 Update the URL via `history.pushState` whenever `selectedId`
      changes (set `?facility=<id>` on select, strip the param on close),
      without a full page reload

## 2. DataCenterCard copy-link

- [ ] 2.1 Add a "copy link" button to `DataCenterCard.jsx` that copies the
      current facility's shareable URL to the clipboard with a brief
      confirmation state

## 3. Tests

- [ ] 3.1 `App.test.jsx` (extend existing): mount with `?facility=<id>` in
      the URL, verify the matching card opens and the map centers on it;
      also test an unknown ID is ignored gracefully
- [ ] 3.2 `DataCenterCard.test.jsx`: copy-link button copies the expected
      URL for the rendered facility

## 4. Verification

- [ ] 4.1 `cd frontend && npm test` passes
- [ ] 4.2 Manual: select a facility, click "copy link," open that URL in a
      fresh tab, confirm the same card opens and the map is centered on
      the right facility; confirm closing the card clears the URL param
