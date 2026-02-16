# Requirements: AC Map Editor

**Defined:** 2026-02-16
**Core Value:** The map editing experience should feel intuitive and professional — tools work correctly, the layout maximizes the editing canvas, and workflows match what users expect from image editors.

## v3.6 Requirements

Requirements for v3.6 Toolbar Icons & Panel Polish. All already shipped (ad-hoc).

### Toolbar Icons

- [x] **ICON-01**: Toolbar shows custom PNG icons for bunker, conveyor, flag, switch tools
- [x] **ICON-02**: Toolbar shows tileset-rendered icons for spawn (tile 1100), pole (tile 1361), warp (anim 0x9E)
- [x] **ICON-03**: Spawn dropdown shows 3x3 tile preview for Type 1 and single tile for Type 2
- [x] **ICON-04**: Flag dropdown shows 3x3 tile preview for each team color
- [x] **ICON-05**: Pole dropdown shows 3x3 tile preview with per-team center tiles (not flag receivers)
- [x] **ICON-06**: Wall type names updated (Brushed Metal, Carbon Fiber, Alt. A, Alt. B)

### Panel Layout

- [x] **PANEL-01**: Minimap always visible independent of sidebar collapse
- [x] **PANEL-02**: Tileset panel fixed at 660px width, notepad fills remaining space
- [x] **PANEL-03**: Tabbed notepad/measurements panel with auto-switch on ruler pin
- [x] **PANEL-04**: Layer-style eye icon visibility toggle for pinned measurements

### UI Cleanup

- [x] **CLEAN-01**: Switch tool dropdown removed (no variants needed)
- [x] **CLEAN-02**: Animation panel toggle button and label removed

## Future Requirements

None currently defined.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Animated toolbar icons | Complexity for marginal UX benefit |
| Resizable tileset/notepad split | Fixed layout simpler, notepad fills remaining space |
| Session persistence for notepad | Measurement log is per-session |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ICON-01 | Phase 79 | Complete |
| ICON-02 | Phase 79 | Complete |
| ICON-03 | Phase 79 | Complete |
| ICON-04 | Phase 79 | Complete |
| ICON-05 | Phase 79 | Complete |
| ICON-06 | Phase 79 | Complete |
| PANEL-01 | Phase 79 | Complete |
| PANEL-02 | Phase 79 | Complete |
| PANEL-03 | Phase 79 | Complete |
| PANEL-04 | Phase 79 | Complete |
| CLEAN-01 | Phase 79 | Complete |
| CLEAN-02 | Phase 79 | Complete |

**Coverage:**
- v3.6 requirements: 12 total
- Mapped to phases: 12
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-16*
*Last updated: 2026-02-16 after initial definition*
