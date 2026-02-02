# Requirements: AC Map Editor v1.1

**Defined:** 2026-02-02
**Core Value:** Maximize map editing canvas space with professional navigation

## v1.1 Requirements

Requirements for v1.1 Canvas & Polish release.

### Navigation

- [ ] **NAV-01**: Scrollbars have arrow buttons at each end (classic Windows style)
- [ ] **NAV-02**: Clicking scrollbar track jumps viewport by one page
- [ ] **NAV-03**: Arrow buttons scroll by one tile (16px) per click
- [ ] **NAV-04**: Holding arrow button continuously scrolls

### Panels

- [ ] **PNL-01**: Bottom panel default size is smaller (20% instead of 25%)
- [ ] **PNL-02**: Bottom panel can be collapsed to tab bar only
- [ ] **PNL-03**: Collapsed panel has explicit expand button
- [ ] **PNL-04**: Double-click resize divider resets to default size

### Polish

- [x] **POL-01**: AnimationPanel.css uses CSS variables instead of hardcoded colors
- [x] **POL-02**: MapSettingsPanel.css uses CSS variables instead of hardcoded colors
- [x] **POL-03**: MapCanvas.css uses CSS variables instead of hardcoded colors
- [x] **POL-04**: StatusBar.css uses CSS variables instead of hardcoded colors

## Future Requirements

Deferred to later milestones.

### Navigation (v1.2+)

- **NAV-05**: Continuous scroll accelerates when holding arrow button
- **NAV-06**: Keyboard-only viewport navigation (arrow keys when canvas focused)

### Polish (v1.2+)

- **POL-05**: Light/dark mode toggle in UI
- **POL-06**: Panel collapse animation

## Out of Scope

| Feature | Reason |
|---------|--------|
| Custom scrollbar track themes | Unnecessary complexity, classic style is sufficient |
| Floating/detachable panels | Explicit design decision from v1.0 |
| Keyboard shortcut remapping | Low priority, deferred |
| Workspace presets/layouts | Over-engineering for current needs |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| NAV-01 | Phase 5 | Pending |
| NAV-02 | Phase 5 | Pending |
| NAV-03 | Phase 5 | Pending |
| NAV-04 | Phase 5 | Pending |
| PNL-01 | Phase 6 | Pending |
| PNL-02 | Phase 6 | Pending |
| PNL-03 | Phase 6 | Pending |
| PNL-04 | Phase 6 | Pending |
| POL-01 | Phase 4 | Complete |
| POL-02 | Phase 4 | Complete |
| POL-03 | Phase 4 | Complete |
| POL-04 | Phase 4 | Complete |

**Coverage:**
- v1.1 requirements: 12 total
- Mapped to phases: 12
- Unmapped: 0

---
*Requirements defined: 2026-02-02*
*Last updated: 2026-02-02 after Phase 4 completion*
