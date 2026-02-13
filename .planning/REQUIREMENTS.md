# Requirements: AC Map Editor

**Defined:** 2026-02-13
**Core Value:** The map editing experience should feel intuitive and professional — tools work correctly, the layout maximizes the editing canvas, and workflows match what users expect from image editors.

## v2.9 Requirements

Requirements for v2.9 Measurement & Grid milestone. Each maps to roadmap phases.

### Grid Customization

- [x] **GRID-01**: User can adjust grid line opacity from transparent to fully opaque via slider
- [x] **GRID-02**: User can adjust grid line weight from thin (1px) to thick via control
- [x] **GRID-03**: User can choose grid line color via color picker
- [ ] **GRID-04**: User can center the viewport on the current selection

### Ruler Tool

- [x] **RULER-01**: User can measure straight-line distance between two points (Manhattan + Euclidean in tiles)
- [ ] **RULER-02**: User can measure rectangular area by dragging (W×H and tile count)
- [ ] **RULER-03**: User can measure cumulative path length along clicked waypoints
- [ ] **RULER-04**: User can measure radius from a center point (radius in tiles, circle area)
- [ ] **RULER-05**: User can pin/lock a measurement so it persists on canvas until cleared

### Selection Info

- [x] **SEL-01**: User can see selection dimensions and tile count in status bar (e.g. "Sel: 5x3 (15 tiles)")
- [x] **SEL-02**: User can see floating dimension label positioned outside the selection border

## Future Requirements

Deferred to future milestone. Tracked but not in current roadmap.

### Measurement Extensions

- **RULER-06**: Ruler measurements display angle in degrees
- **RULER-07**: Ruler supports custom measurement scales (e.g. 1 tile = X meters)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Arbitrary grid size | AC maps are fixed 16x16px tiles, changing grid size breaks tileset alignment |
| Measurement scale/units | Photoshop-style "1 pixel = 1 foot" adds complexity for zero game design benefit |
| Persistent measurement objects | CAD-style saved annotations are overkill for a tile map editor; transient UI + pin is sufficient |
| Grid snap (sub-tile) | Tiles are atomic units in this format, sub-tile snapping has no meaning |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| GRID-01 | Phase 56 | ✅ Done |
| GRID-02 | Phase 56 | ✅ Done |
| GRID-03 | Phase 56 | ✅ Done |
| GRID-04 | Phase 60 | Pending |
| RULER-01 | Phase 58 | ✅ Done |
| RULER-02 | Phase 59 | Pending |
| RULER-03 | Phase 59 | Pending |
| RULER-04 | Phase 59 | Pending |
| RULER-05 | Phase 59 | Pending |
| SEL-01 | Phase 57 | ✅ Done |
| SEL-02 | Phase 57 | ✅ Done |

**Coverage:**
- v2.9 requirements: 11 total
- Mapped to phases: 11
- Unmapped: 0

**Coverage validation:** ✓ All 11 v2.9 requirements mapped to phases 56-60

---
*Requirements defined: 2026-02-13*
*Last updated: 2026-02-13 after Phase 58 complete*
