# Requirements: AC Map Editor

**Defined:** 2026-02-15
**Core Value:** The map editing experience should feel intuitive and professional — tools work correctly, the layout maximizes the editing canvas, and workflows match what users expect from image editors.

## v3.3 Requirements

Requirements for Animation Offset Control milestone. Each maps to roadmap phases.

### Offset Control

- [x] **OFST-01**: User can set animation offset (0-127) in the Animations panel when a game object tool is active
- [x] **OFST-02**: Placed animated tiles encode the current panel offset value into the tile
- [x] **OFST-03**: Offset value persists between placements until user changes it

### Picker Integration

- [x] **PICK-01**: Picker tool captures offset from existing animated tiles and updates the Animations panel offset field
- [x] **PICK-02**: After picking an animated tile, switching back to a game object tool uses the captured offset

### Warp UI

- [x] **WARP-01**: Warp tool shows Source/Destination dropdown controls that encode offset as dest*10 + src
- [x] **WARP-02**: Picking an existing warp tile populates Source/Dest dropdowns with decoded values

### Feedback & Validation

- [x] **FDBK-01**: Status bar shows offset value when hovering over animated tiles on the map canvas
- [x] **FDBK-02**: Offset input enforces valid range with error feedback for out-of-range values

## Future Requirements

### Offset Enhancements

- **OFST-04**: Offset increment/decrement hotkeys (arrow keys when panel focused)
- **OFST-05**: Batch offset adjustment for selected region of animated tiles
- **OFST-06**: Per-tile offset editing post-placement without re-placing

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time animation preview at offset | High complexity, performance cost, low ROI |
| Custom measurement scales | Separate milestone concern (RULER-07) |
| Separate offset state per tool type | Creates state sync complexity — unified field with contextual UI instead |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| OFST-01 | Phase 70 | ✅ Complete |
| OFST-02 | Phase 70 | ✅ Complete |
| OFST-03 | Phase 70 | ✅ Complete |
| PICK-01 | Phase 70 | ✅ Complete |
| PICK-02 | Phase 70 | ✅ Complete |
| WARP-01 | Phase 70 | ✅ Complete |
| WARP-02 | Phase 70 | ✅ Complete |
| FDBK-01 | Phase 70 | ✅ Complete |
| FDBK-02 | Phase 70 | ✅ Complete |

**Coverage:**
- v3.3 requirements: 9 total
- Mapped to phases: 9 (100% coverage)
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-15*
*Last updated: 2026-02-16 after phase 70 completion*
