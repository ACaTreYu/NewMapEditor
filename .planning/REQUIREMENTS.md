# Requirements: AC Map Editor

**Defined:** 2026-02-10
**Core Value:** The map editing experience should feel intuitive and professional

## v2.5 Requirements

Requirements for milestone v2.5 Selection Transform Tools. Each maps to roadmap phases.

### Rotation

- [x] **ROT-01**: User can rotate selected tiles 90° clockwise in-place on the map
- [x] **ROT-02**: User can rotate selected tiles 90° counter-clockwise (-90°) in-place on the map
- [x] ~~**ROT-03**: User can rotate selected tiles 180° in-place on the map~~ (removed — redundant, use 90° twice)
- [x] ~~**ROT-04**: User can rotate selected tiles -180° in-place on the map~~ (removed — redundant, use -90° twice)
- [x] **ROT-05**: Selection bounds resize to fit rotated tile dimensions (e.g., 3x5 becomes 5x3 for 90°)
- [x] **ROT-06**: Rotate buttons appear in toolbar (split into CW/CCW action buttons)

### Mirror

- [x] **MIR-01**: User can mirror selection rightward — mirrored copy placed adjacent to the right
- [x] **MIR-02**: User can mirror selection leftward — mirrored copy placed adjacent to the left
- [x] **MIR-03**: User can mirror selection upward — mirrored copy placed above
- [x] **MIR-04**: User can mirror selection downward — mirrored copy placed below
- [x] **MIR-05**: Mirror button appears in toolbar with dropdown listing all 4 directions

### Integration

- [x] **INT-01**: All rotate and mirror operations support undo/redo
- [x] **INT-02**: Old clipboard-based Ctrl+H/J/R transforms are removed
- [x] **INT-03**: Transforms only activate when a selection exists (disabled/no-op otherwise)

## Future Requirements

None deferred for this milestone.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Content-aware rotation (directional tiles) | Geometric transforms sufficient — no rotation tables |
| Free-angle rotation (arbitrary degrees) | Tile grid requires 90° increments |
| Mirror with gap/spacing | Adjacent mirroring is sufficient |
| Keyboard shortcuts for new tools | Can be added in a future milestone if needed |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ROT-01 | Phase 41 | Done |
| ROT-02 | Phase 41 | Done |
| ROT-03 | Phase 41/43 | Removed (redundant) |
| ROT-04 | Phase 41/43 | Removed (redundant) |
| ROT-05 | Phase 41 | Done |
| ROT-06 | Phase 41/43 | Done (split CW/CCW) |
| MIR-01 | Phase 42 | Done |
| MIR-02 | Phase 42 | Done |
| MIR-03 | Phase 42 | Done |
| MIR-04 | Phase 42 | Done |
| MIR-05 | Phase 42 | Done |
| INT-01 | Phase 43 | Done |
| INT-02 | Phase 43 | Done |
| INT-03 | Phase 43 | Done |

**Coverage:**
- v2.5 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0

**Coverage validation:** ✓ 100% (14/14 requirements mapped, 12 done, 2 removed as redundant)

---
*Requirements defined: 2026-02-10*
*Last updated: 2026-02-11 after Phase 43 completion*
