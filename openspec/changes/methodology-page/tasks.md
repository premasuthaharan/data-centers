## 1. MethodologyPanel

- [ ] 1.1 Build `components/MethodologyPanel.jsx`: an overlay panel (same
      pattern as `DataCenterCard`'s slide-in) with sections for data
      sources (Epoch AI, Nominatim, per-country grid table) and impact
      methodology (carbon, water, cost, cars/homes equivalence), summarized
      from `backend/README.md` / `backend/SOURCES.md`
- [ ] 1.2 Add an "About this project" section crediting Prema Suthaharan
      as author with a link to `https://premasuthaharan.com` (opens in a
      new tab, `rel="noopener noreferrer"`)
- [ ] 1.3 Add a close action consistent with other overlay panels

## 2. Entry point

- [ ] 2.1 Add a persistent "i" info button (or similar) in `App.jsx`'s
      overlay UI (near the title/legend) that opens `MethodologyPanel`
- [ ] 2.2 Wire open/close state in `App.jsx`

## 3. Tests

- [ ] 3.1 `MethodologyPanel.test.jsx`: renders expected sections and the
      author link with correct href
- [ ] 3.2 `App.test.jsx` (extend): clicking the info button opens the
      panel; closing it returns to the default view

## 4. Verification

- [ ] 4.1 `cd frontend && npm test` passes
- [ ] 4.2 Manual: open the app, click the info entry point, confirm the
      panel renders methodology content and the author link opens
      premasuthaharan.com in a new tab; confirm it closes cleanly and
      doesn't interfere with facility selection or other panels
