# Requirements: AC Map Editor

**Defined:** 2026-02-16
**Core Value:** The map editing experience should feel intuitive and professional — tools work correctly, the layout maximizes the editing canvas, and workflows match what users expect from image editors.

## v1.0.2 Requirements

Requirements for v1.0.2 Bug Fixes milestone. Each maps to roadmap phases.

### Bug Fixes

- [x] **BUG-01**: Switch tool places correct tile pattern from custom.dat when user clicks on map
- [x] **BUG-02**: custom.dat file loads successfully on app startup (file served from correct public path)
- [x] **BUG-03**: Painting DEFAULT_TILE (280) over an animated tile fully erases it in a single pass (no residual animation frames)

### Branding

- [x] **BRAND-01**: About dialog accessible from Help menu shows "© Arcbound Interactive 2026", "by aTreYu (Jacob Albert)" (smaller), and version number
- [x] **BRAND-02**: Splash screen displays on app startup with copyright, author, and version

## Future Requirements

None for this milestone.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Switch type dropdown UI | Only one switch type exists — no selector needed |
| Custom.dat file picker | Auto-load from assets is sufficient |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BUG-01 | Phase 81 | ✓ Complete |
| BUG-02 | Phase 81 | ✓ Complete |
| BUG-03 | Phase 81 | ✓ Complete |
| BRAND-01 | Phase 81 | ✓ Complete |
| BRAND-02 | Phase 81 | ✓ Complete |

**Coverage:**
- v1.0.2 requirements: 5 total
- Mapped to phases: 5 ✓
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-16*
*Last updated: 2026-02-17 after phase 81 completion*
