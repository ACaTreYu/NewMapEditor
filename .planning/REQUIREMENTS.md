# Requirements: AC Map Editor

**Defined:** 2026-02-12
**Core Value:** The map editing experience should feel intuitive and professional — tools work correctly, the layout maximizes the editing canvas, and workflows match what users expect from image editors.

## v2.7 Requirements

Requirements for v2.7 Rendering & Navigation milestone.

### UI Cleanup

- [ ] **UI-01**: Minimap empty state shows checkerboard only (no "Minimap" text label)

### Scrollbar Sync

- [ ] **SCROLL-01**: Scrollbar thumb size correctly reflects viewport-to-map ratio at current zoom level
- [ ] **SCROLL-02**: Scrollbar thumb position accurately tracks viewport position using standard formula (offset / maxOffset * scrollable range)
- [ ] **SCROLL-03**: Scrollbars update in real-time during pan drag (not just on mouse release)
- [ ] **SCROLL-04**: Scrollbars update when viewport changes via zoom wheel, minimap click, or keyboard shortcuts
- [ ] **SCROLL-05**: Scrollbar thumb drag moves the viewport with correct sensitivity (accounting for thumb size in delta calculation)

### Real-Time Pan Rendering

- [ ] **PAN-01**: Tiles render progressively during pan drag via RAF-debounced canvas re-render (no waiting for mouse release)
- [ ] **PAN-02**: CSS transform provides immediate visual feedback while canvas catches up within 1 frame
- [ ] **PAN-03**: Viewport state commits to Zustand on mouse release (not during drag, to avoid React overhead)

### Canvas Optimization

- [ ] **PERF-01**: Static canvas layer uses `alpha: false` context option for compositor optimization
- [ ] **PERF-02**: Tileset pre-sliced into ImageBitmap array at load time for GPU-ready tile rendering
- [ ] **PERF-03**: Canvas layers consolidated from 4 to 2 (map layer + UI overlay layer)
- [ ] **PERF-04**: Grid rendered via `createPattern()` fill instead of individual line segments

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
| UI-01 | — | Pending |
| SCROLL-01 | — | Pending |
| SCROLL-02 | — | Pending |
| SCROLL-03 | — | Pending |
| SCROLL-04 | — | Pending |
| SCROLL-05 | — | Pending |
| PAN-01 | — | Pending |
| PAN-02 | — | Pending |
| PAN-03 | — | Pending |
| PERF-01 | — | Pending |
| PERF-02 | — | Pending |
| PERF-03 | — | Pending |
| PERF-04 | — | Pending |
| BUF-01 | — | Pending |
| BUF-02 | — | Pending |

**Coverage:**
- v2.7 requirements: 15 total
- Mapped to phases: 0
- Unmapped: 15 ⚠️

---
*Requirements defined: 2026-02-12*
*Last updated: 2026-02-12 after initial definition*
