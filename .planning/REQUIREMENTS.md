# Requirements: AC Map Editor

**Defined:** 2026-02-10
**Core Value:** The map editing experience should feel intuitive and professional

## v2.3 Requirements

Requirements for Minimap Independence milestone. The minimap must be an always-visible, self-contained component.

### Minimap

- [ ] **MMAP-01**: Minimap renders independently of animation panel visibility/state
- [ ] **MMAP-02**: Minimap is always visible in top-right corner, including on startup with no map loaded
- [ ] **MMAP-03**: Empty/unoccupied map areas show a checkerboard pattern (transparency indicator)
- [ ] **MMAP-04**: Occupied map areas show tile average colors (existing behavior preserved)
- [ ] **MMAP-05**: Minimap rendering remains lightweight with no performance regression

## Future Requirements

None identified for this cycle.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Draggable/resizable minimap | Fixed position keeps implementation simple |
| Minimap zoom level control | Fixed 1:1 tile-to-pixel is standard for 256x256 maps |
| Minimap in a separate panel/window | Top-right overlay is the established pattern |

## Traceability

| Req | Phase | Plan | Status |
|-----|-------|------|--------|
| MMAP-01 | Phase 38 | — | Pending |
| MMAP-02 | Phase 38 | — | Pending |
| MMAP-03 | Phase 38 | — | Pending |
| MMAP-04 | Phase 38 | — | Pending |
| MMAP-05 | Phase 38 | — | Pending |

**Coverage:**
- v2.3 requirements: 5 total
- Mapped to phases: 5
- Unmapped: 0

**Coverage: 100%** ✓

---
*Requirements defined: 2026-02-10*
*Last updated: 2026-02-10 after roadmap creation*
