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

- [ ] **MIR-01**: User can mirror selection rightward — mirrored copy placed adjacent to the right
- [ ] **MIR-02**: User can mirror selection leftward — mirrored copy placed adjacent to the left
- [ ] **MIR-03**: User can mirror selection upward — mirrored copy placed above
- [ ] **MIR-04**: User can mirror selection downward — mirrored copy placed below
- [ ] **MIR-05**: Mirror button appears in toolbar with dropdown listing all 4 directions

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
| ROT-01 | — | Pending |
| ROT-02 | — | Pending |
| ROT-03 | — | Pending |
| ROT-04 | — | Pending |
| ROT-05 | — | Pending |
| ROT-06 | — | Pending |
| MIR-01 | — | Pending |
| MIR-02 | — | Pending |
| MIR-03 | — | Pending |
| MIR-04 | — | Pending |
| MIR-05 | — | Pending |
| INT-01 | — | Pending |
| INT-02 | — | Pending |
| INT-03 | — | Pending |

**Coverage:**
- v2.5 requirements: 14 total
- Mapped to phases: 0
- Unmapped: 14

---
*Requirements defined: 2026-02-10*
*Last updated: 2026-02-10 after initial definition*
