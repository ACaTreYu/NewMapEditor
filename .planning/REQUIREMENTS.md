# Requirements: AC Map Editor v1.6 / v1.7

**Defined:** 2026-02-04
**Core Value:** The map editing experience should feel intuitive and professional

## v1.6 Requirements

Requirements for SELECT tool and Animation Panel redesign. Each maps to roadmap phases.

### Selection

- [x] **SEL-01**: User can marquee-select a rectangular region by dragging on the map canvas
- [x] **SEL-02**: Active selection displays marching ants animated border
- [x] **SEL-03**: User can cancel/deselect with Escape key
- [x] **SEL-04**: Selection coordinates are accurate at all zoom levels (0.25x-4x)

### Clipboard

- [x] **CLIP-01**: User can copy selection to clipboard (Ctrl+C)
- [x] **CLIP-02**: User can cut selection to clipboard (Ctrl+X)
- [x] **CLIP-03**: User can paste clipboard as floating preview (Ctrl+V)
- [x] **CLIP-04**: User can delete selection contents (Delete key)
- [x] **CLIP-05**: Floating paste preview renders semi-transparently and follows cursor
- [x] **CLIP-06**: User can commit floating paste with click, or cancel with Escape

### Transforms

- [ ] **XFRM-01**: User can mirror clipboard contents horizontally
- [ ] **XFRM-02**: User can mirror clipboard contents vertically
- [ ] **XFRM-03**: User can rotate clipboard contents 90 degrees
- [ ] **XFRM-04**: All transforms use SEdit keyboard shortcuts

### Animation Panel

- [ ] **ANIM-01**: Animation panel displays 00-FF hex-numbered vertical list (replacing grid)
- [ ] **ANIM-02**: Tile/Anim radio toggle switches between placing static tile vs animated tile
- [ ] **ANIM-03**: Offset field controls animation frame offset

## v1.7 Requirements

Requirements for performance optimization and Electron/React portability.

### Performance — Zustand Store

- [x] **PERF-01**: All components use granular Zustand selectors (no full-store destructuring)
- [x] **PERF-02**: animationFrame changes only re-render animation-displaying components
- [x] **PERF-03**: canUndo/canRedo update reactively via selector subscription

### Performance — Canvas Rendering

- [x] **PERF-04**: MapCanvas uses layered rendering (static tiles, overlays, animation as separate layers)
- [x] **PERF-05**: Grid lines drawn with batched path operations (2 strokes, not 60)
- [x] **PERF-06**: Canvas resize debounced via requestAnimationFrame

### Performance — Minimap

- [ ] **PERF-07**: Minimap uses pre-computed tile color lookup table (zero DOM canvas creation per draw)

### Performance — State Batching

- [ ] **PERF-08**: Wall/line drawing triggers single state update for entire operation
- [ ] **PERF-09**: Map tile mutations use consistent immutable pattern (no mutate + spread)

### Performance — Undo System

- [x] **PERF-10**: Undo entries store deltas (changed tiles only), not full 128KB array copies
- [x] **PERF-11**: Redo stack bounded to maxUndoLevels

### Portability

- [x] **PORT-01**: FileService adapter interface in src/core/ abstracts file I/O
- [x] **PORT-02**: Map decompression extracted from App.tsx into core service
- [x] **PORT-03**: No direct window.electronAPI calls in src/components/ or src/core/

## Future Requirements

Deferred to later milestones. Tracked but not in current roadmap.

### Visual Polish

- **WIN98-01**: Win98 panel interiors with authentic inset borders
- **WIN98-02**: Win98 scrollbars matching classic appearance
- **WIN98-03**: Win98 dialog controls (buttons, checkboxes, radio buttons)

### Tool Verification

- **TOOL-01**: Tool behavior verification at all zoom levels
- **TOOL-02**: Wall constrain mode (shift-key axis locking)

## Out of Scope

| Feature | Reason |
|---------|--------|
| System clipboard integration | Internal clipboard preserves tile encoding without serialization overhead |
| Multi-selection (non-contiguous) | SEdit only supports single rectangle selection |
| Resize selection handles | SEdit doesn't have this; standard marquee only |
| Rotation by arbitrary angle | SEdit only supports 90° rotation |
| Content-aware transform tables | SEdit's rotTbl/mirTbl are complex; start with geometric transforms, upgrade if needed |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEL-01 | Phase 16 | Complete |
| SEL-02 | Phase 16 | Complete |
| SEL-03 | Phase 16 | Complete |
| SEL-04 | Phase 16 | Complete |
| CLIP-01 | Phase 17 | Complete |
| CLIP-02 | Phase 17 | Complete |
| CLIP-04 | Phase 17 | Complete |
| CLIP-03 | Phase 18 | Complete |
| CLIP-05 | Phase 18 | Complete |
| CLIP-06 | Phase 18 | Complete |
| XFRM-01 | Phase 19 | Pending |
| XFRM-02 | Phase 19 | Pending |
| XFRM-03 | Phase 19 | Pending |
| XFRM-04 | Phase 19 | Pending |
| ANIM-01 | Phase 20 | Pending |
| ANIM-02 | Phase 20 | Pending |
| ANIM-03 | Phase 20 | Pending |

| PERF-01 | Phase 21 | Pending |
| PERF-02 | Phase 21 | Pending |
| PERF-03 | Phase 21 | Pending |
| PERF-04 | Phase 22 | Complete |
| PERF-05 | Phase 22 | Complete |
| PERF-06 | Phase 22 | Complete |
| PERF-07 | Phase 23 | Pending |
| PERF-08 | Phase 24 | Pending |
| PERF-09 | Phase 24 | Pending |
| PERF-10 | Phase 25 | Complete |
| PERF-11 | Phase 25 | Complete |
| PORT-01 | Phase 26 | Complete |
| PORT-02 | Phase 26 | Complete |
| PORT-03 | Phase 26 | Complete |

**Coverage:**
- v1.6 requirements: 17 total — mapped: 17, unmapped: 0 ✓
- v1.7 requirements: 14 total — mapped: 14, unmapped: 0 ✓

**Phase Mapping:**
- Phase 16 (Marquee Selection Foundation): 4 requirements (SEL-01 to SEL-04)
- Phase 17 (Clipboard Operations): 3 requirements (CLIP-01, CLIP-02, CLIP-04)
- Phase 18 (Floating Paste Preview): 3 requirements (CLIP-03, CLIP-05, CLIP-06)
- Phase 19 (Mirror/Rotate Transforms): 4 requirements (XFRM-01 to XFRM-04)
- Phase 20 (Animation Panel Redesign): 3 requirements (ANIM-01 to ANIM-03)
- Phase 21 (Zustand Store Optimization): 3 requirements (PERF-01 to PERF-03)
- Phase 22 (Canvas Rendering Optimization): 3 requirements (PERF-04 to PERF-06)
- Phase 23 (Minimap Performance): 1 requirement (PERF-07)
- Phase 24 (Batch State Operations): 2 requirements (PERF-08, PERF-09)
- Phase 25 (Undo System Optimization): 2 requirements (PERF-10, PERF-11)
- Phase 26 (Portability Layer): 3 requirements (PORT-01 to PORT-03)

---
*Requirements defined: 2026-02-04*
*Last updated: 2026-02-06 after phase 18 completion*
