# Requirements: AC Map Editor

**Defined:** 2026-02-15
**Core Value:** The map editing experience should feel intuitive and professional — tools work correctly, the layout maximizes the editing canvas, and workflows match what users expect from image editors.

## v3.4 Requirements

Requirements for v3.4 Tool Polish & Warm UI milestone.

### Wall Tools

- [x] **WALL-01**: User can select from all 15 wall types via dropdown variant selector
- [x] **WALL-02**: Wall type dropdown shows visual preview of each wall type (horizontal segment with end tiles)
- [x] **WALL-03**: Selected wall type is used by wall, wall pencil, and wall rect tools
- [x] **WALL-04**: Wall tool icons are visually distinct for different wall-related tools

### Warp Routing

- [x] **WARP-01**: 9E warp tile encodes src/dest routing identical to FA encoding
- [x] **WARP-02**: 3x3 animated warp block center (9E) carries routing data when placed

### Animation

- [x] **ANIM-01**: Animation offset control applies to all animated tile types (not just spawn/warp)

### Tool Previews

- [x] **PREV-01**: Multi-tile game object tools show full tile pattern as semi-transparent preview before placement
- [x] **PREV-02**: 3x3 warp block preview shows all 9 border tiles on hover
- [x] **PREV-03**: Bunker tool preview shows full 4x4 pattern on hover
- [x] **PREV-04**: Bridge and conveyor tools show full strip pattern preview on hover

### Tool Icons

- [ ] **ICON-01**: Bunker tool has a distinct visual icon (not generic shield)
- [ ] **ICON-02**: Conveyor tool has a distinct visual icon (not generic arrow)
- [x] **ICON-03**: Wall tools have distinct icons per tool type

### UI Warmth

- [ ] **UI-01**: OKLCH neutral palette shifted from cool (hue 280) to warm tones (cream/beige direction)
- [ ] **UI-02**: All surfaces, backgrounds, and hover states reflect the warmer palette

## Future Requirements

### Animation Enhancements (deferred)

- **OFST-04**: Offset increment/decrement hotkeys
- **OFST-05**: Batch offset adjustment for selected region
- **OFST-06**: Per-tile offset editing post-placement

### Measurement (deferred)

- **RULER-07**: Custom measurement scales

## Out of Scope

| Feature | Reason |
|---------|--------|
| Content-aware transform tables | Geometric transforms sufficient, high complexity |
| Custom keyboard shortcut remapping | Low priority |
| Floating/dockable panels | Fixed layout for simplicity |
| OffscreenCanvas + Web Worker | Only if further perf needed |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| WALL-01 | Phase 71 | ✅ Done |
| WALL-02 | Phase 71 | ✅ Done |
| WALL-03 | Phase 71 | ✅ Done |
| WALL-04 | Phase 71 | ✅ Done |
| WARP-01 | Phase 72 | ✅ Done |
| WARP-02 | Phase 72 | ✅ Done |
| ANIM-01 | Phase 73 | ✅ Done |
| PREV-01 | Phase 74 | ✅ Done |
| PREV-02 | Phase 74 | ✅ Done |
| PREV-03 | Phase 74 | ✅ Done |
| PREV-04 | Phase 74 | ✅ Done |
| ICON-01 | Phase 75 | Pending |
| ICON-02 | Phase 75 | Pending |
| ICON-03 | Phase 71 | ✅ Done |
| UI-01 | Phase 76 | Pending |
| UI-02 | Phase 76 | Pending |

**Coverage:**
- v3.4 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-15*
*Last updated: 2026-02-16 after Phase 74 completion*
*Last updated: 2026-02-16 after Phase 73 completion*
