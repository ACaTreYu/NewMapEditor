# Requirements: AC Map Editor

**Defined:** 2026-02-11
**Core Value:** The map editing experience should feel intuitive and professional

## v2.6 Requirements

Requirements for Viewport & Animation Fixes milestone. Each maps to roadmap phases.

### Viewport Fixes

- [x] **VIEW-01**: Tile animations render correctly at all zoom levels (0.25x to 4x), not just at extreme zoom-out
- [x] **VIEW-02**: Pan drag moves the map 1:1 with mouse movement at all zoom levels (no over-sensitivity or under-sensitivity)

### Zoom Controls

- [ ] **ZOOM-01**: User can type a zoom percentage in a numeric input field to set exact zoom level
- [ ] **ZOOM-02**: User can adjust zoom via a slider control
- [ ] **ZOOM-03**: User can click preset zoom buttons (25%, 50%, 100%, 200%, 400%)
- [ ] **ZOOM-04**: User can zoom via keyboard shortcuts (Ctrl+0 reset to 100%, Ctrl+= zoom in, Ctrl+- zoom out)
- [ ] **ZOOM-05**: Mouse wheel zoom continues to work (existing scroll-to-cursor behavior preserved)

### Performance

- [x] **PERF-01**: Rendering pipeline verified — no unnecessary redraws or lag at normal zoom levels

## Future Requirements

None deferred — all identified features included in v2.6.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Touch/pinch-to-zoom gestures | Desktop Electron app, no touch input needed |
| High-DPI/Retina display scaling | Separate concern, not related to current bugs |
| Momentum/inertia panning | Anti-feature for precision tile editing |
| Logarithmic zoom slider scale | Start with linear, revisit if user testing shows issues |
| Content-aware transform tables | Deferred from v2.5, separate concern |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| VIEW-01 | Phase 44 | Complete |
| VIEW-02 | Phase 45 | Complete |
| ZOOM-01 | Phase 46 | Pending |
| ZOOM-02 | Phase 46 | Pending |
| ZOOM-03 | Phase 46 | Pending |
| ZOOM-04 | Phase 46 | Pending |
| ZOOM-05 | Phase 46 | Pending |
| PERF-01 | Phase 44 | Complete |

**Coverage:**
- v2.6 requirements: 8 total
- Mapped to phases: 8/8 (100%)
- Unmapped: 0

---
*Requirements defined: 2026-02-11*
*Last updated: 2026-02-11 after phase 45 completion*
