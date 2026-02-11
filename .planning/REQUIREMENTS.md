# Requirements: AC Map Editor

**Defined:** 2026-02-10
**Core Value:** The map editing experience should feel intuitive and professional

## v2.5 Requirements

Requirements for milestone v2.5 Selection Transform Tools. Each maps to roadmap phases.

### Rotation

- [ ] **ROT-01**: User can rotate selected tiles 90° clockwise in-place on the map
- [ ] **ROT-02**: User can rotate selected tiles 90° counter-clockwise (-90°) in-place on the map
- [ ] **ROT-03**: User can rotate selected tiles 180° in-place on the map
- [ ] **ROT-04**: User can rotate selected tiles -180° in-place on the map
- [ ] **ROT-05**: Selection bounds resize to fit rotated tile dimensions (e.g., 3x5 becomes 5x3 for 90°)
- [ ] **ROT-06**: Rotate button appears in toolbar with dropdown listing all 4 rotation options

### Mirror

- [x] **MIR-01**: User can mirror selection rightward — mirrored copy placed adjacent to the right
- [x] **MIR-02**: User can mirror selection leftward — mirrored copy placed adjacent to the left
- [x] **MIR-03**: User can mirror selection upward — mirrored copy placed above
- [x] **MIR-04**: User can mirror selection downward — mirrored copy placed below
- [x] **MIR-05**: Mirror button appears in toolbar with dropdown listing all 4 directions

### Integration

- [ ] **INT-01**: All rotate and mirror operations support undo/redo
- [ ] **INT-02**: Old clipboard-based Ctrl+H/J/R transforms are removed
- [ ] **INT-03**: Transforms only activate when a selection exists (disabled/no-op otherwise)

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
| ROT-01 | Phase 41 | Pending |
| ROT-02 | Phase 41 | Pending |
| ROT-03 | Phase 41 | Pending |
| ROT-04 | Phase 41 | Pending |
| ROT-05 | Phase 41 | Pending |
| ROT-06 | Phase 41 | Pending |
| MIR-01 | Phase 42 | Done |
| MIR-02 | Phase 42 | Done |
| MIR-03 | Phase 42 | Done |
| MIR-04 | Phase 42 | Done |
| MIR-05 | Phase 42 | Done |
| INT-01 | Phase 43 | Pending |
| INT-02 | Phase 43 | Pending |
| INT-03 | Phase 43 | Pending |

**Coverage:**
- v2.5 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0

**Coverage validation:** ✓ 100% (14/14 requirements mapped)

---
*Requirements defined: 2026-02-10*
*Last updated: 2026-02-10 after roadmap creation*
