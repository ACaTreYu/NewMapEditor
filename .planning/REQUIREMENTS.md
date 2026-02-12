# Requirements: AC Map Editor

**Defined:** 2026-02-12
**Core Value:** The map editing experience should feel intuitive and professional — tools work correctly, the layout maximizes the editing canvas, and workflows match what users expect from image editors.

## v2.7 Requirements

Requirements for v2.7 Rendering & Navigation milestone.

### UI Cleanup

- [x] **UI-01**: Minimap empty state shows checkerboard only (no "Minimap" text label)

### Scrollbar Sync

- [x] **SCROLL-01**: Scrollbar thumb size correctly reflects viewport-to-map ratio at current zoom level
- [x] **SCROLL-02**: Scrollbar thumb position accurately tracks viewport position using standard formula (offset / maxOffset * scrollable range)
- [x] **SCROLL-03**: Scrollbars update in real-time during pan drag (not just on mouse release)
- [x] **SCROLL-04**: Scrollbars update when viewport changes via zoom wheel, minimap click, or keyboard shortcuts
- [x] **SCROLL-05**: Scrollbar thumb drag moves the viewport with correct sensitivity (accounting for thumb size in delta calculation)

### Real-Time Pan Rendering

- [x] **PAN-01**: Tiles render progressively during pan drag via RAF-debounced canvas re-render (no waiting for mouse release)
- [x] **PAN-02**: CSS transform provides immediate visual feedback while canvas catches up within 1 frame
- [x] **PAN-03**: Viewport state commits to Zustand on mouse release (not during drag, to avoid React overhead)

### Canvas Optimization

- [x] **PERF-01**: Static canvas layer uses `alpha: false` context option for compositor optimization
- [x] **PERF-02**: Tileset pre-sliced into ImageBitmap array at load time for GPU-ready tile rendering
- [x] **PERF-03**: Canvas layers consolidated from 4 to 2 (map layer + UI overlay layer)
- [x] **PERF-04**: Grid rendered via `createPattern()` fill instead of individual line segments

### Buffer Zone

- [ ] **BUF-01**: Visible tile range expanded by 3-4 tiles in each direction beyond viewport edges
- [ ] **BUF-02**: Pre-rendered buffer tiles slide into view during pan, reducing re-render frequency

## Future Requirements

### Advanced Rendering (deferred)

- **PERF-05**: OffscreenCanvas + Web Worker for off-main-thread tile rendering
- **PERF-06**: Chunked pre-rendering for potential larger map support
- **PERF-07**: Dirty rectangle rendering for paint-only partial redraws

## Out of Scope

| Feature | Reason |
|---------|--------|
| OffscreenCanvas + Web Workers | High complexity, overkill for 256x256 map |
| Chunked pre-rendering | Over-engineered for fixed map size |
| WebGL/WebGPU rendering | Massive rewrite, Canvas 2D sufficient |
| `desynchronized` canvas hint | Conflicts with stacked canvas layers |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| UI-01 | Phase 47 | Done |
| SCROLL-01 | Phase 47 | Done |
| SCROLL-02 | Phase 47 | Done |
| SCROLL-04 | Phase 47 | Done |
| SCROLL-05 | Phase 47 | Done |
| SCROLL-03 | Phase 48 | Done |
| PAN-01 | Phase 48 | Done |
| PAN-02 | Phase 48 | Done |
| PAN-03 | Phase 48 | Done |
| PERF-01 | Phase 49 | Done |
| PERF-02 | Phase 49 | Done |
| PERF-03 | Phase 49 | Done |
| PERF-04 | Phase 49 | Done |
| BUF-01 | Phase 50 | Pending |
| BUF-02 | Phase 50 | Pending |

**Coverage:**
- v2.7 requirements: 15 total
- Mapped to phases: 15 (100% ✓)
- Unmapped: 0

**Phase mapping:**
- Phase 47: 5 requirements (UI-01, SCROLL-01, SCROLL-02, SCROLL-04, SCROLL-05)
- Phase 48: 4 requirements (PAN-01, PAN-02, PAN-03, SCROLL-03)
- Phase 49: 4 requirements (PERF-01, PERF-02, PERF-03, PERF-04)
- Phase 50: 2 requirements (BUF-01, BUF-02)

---
*Requirements defined: 2026-02-12*
*Last updated: 2026-02-12 after Phase 49 execution*
