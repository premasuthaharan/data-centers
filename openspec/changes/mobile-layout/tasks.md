## 1. Layout

- [ ] 1.1 Add a phone breakpoint (`@media (max-width: 640px)`) to `App.css`
- [ ] 1.2 Header panel fits within the viewport (16px side gutter), with
      compact subtitle and action buttons
- [ ] 1.3 Legend collapses behind a toggle on phones
- [ ] 1.4 Near-me button and panel no longer overlap the legend or Mapbox
      attribution
- [ ] 1.5 Facility details, policy scenarios, region scorecard and
      methodology panels open full-width on phones
- [ ] 1.6 Compare modal fits the viewport; comparison table scrolls
      horizontally inside the modal

## 2. Verification

- [ ] 2.1 Check at 375×812 and 390×844 (portrait) and 844×390 (landscape):
      no horizontal page scroll, every button reachable, markers tappable
- [ ] 2.2 Desktop layout (1440×900) unchanged
- [ ] 2.3 `cd frontend && npm test` passes
- [ ] 2.4 Remove the phone caveat from "Known rough edges" in `README.md`
