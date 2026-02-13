# Requirements: AC Map Editor

**Defined:** 2026-02-12
**Core Value:** The map editing experience should feel intuitive and professional — tools work correctly, the layout maximizes the editing canvas, and workflows match what users expect from image editors.

## v2.8 Requirements

Requirements for v2.8 Canvas Engine milestone — decouple canvas rendering from React's render cycle.

### Canvas Engine Extraction

- [ ] **ENG-01**: Canvas rendering encapsulated in a CanvasEngine class (`src/core/canvas/CanvasEngine.ts`) that owns buffer, contexts, and draw functions
- [ ] **ENG-02**: React component delegates all pixel operations to the engine via lifecycle effects (attach/detach on mount/unmount)
- [ ] **ENG-03**: Engine manages off-screen buffer, tile rendering, incremental patching, and viewport blitting — no rendering logic remains in React useCallbacks

### Subscription-Driven Rendering

- [ ] **SUB-01**: Engine subscribes directly to Zustand store for viewport, map, and animation state changes — canvas redraws happen outside React's render cycle
- [ ] **SUB-02**: Per-layer dirty flags (mapBuffer, mapBlit, uiOverlay) ensure only changed layers are redrawn
- [ ] **SUB-03**: `isDragActive` guard prevents subscription-driven redraws from interfering during drag operations

### Pencil Drag Performance

- [ ] **DRAG-01**: During pencil drag, tile changes accumulate in a local Map ref — zero Zustand updates until mouseup
- [ ] **DRAG-02**: Buffer patched and screen blitted imperatively on each mousemove (<1ms per tile, no React re-render)
- [ ] **DRAG-03**: On mouseup, single `setTiles()` batch commit + `commitUndo()` — one React re-render per drag operation
- [ ] **DRAG-04**: Escape during drag discards pending tiles and restores buffer from store state
- [ ] **DRAG-05**: Undo (Ctrl+Z) blocked during active drag to prevent two-source-of-truth corruption

### UI Overlay Decoupling

- [ ] **UI-01**: Cursor tile position tracked via ref during mousemove — no `setCursorTile()` state updates
- [ ] **UI-02**: Line preview, selection rectangle, and paste preview positions tracked via refs
- [ ] **UI-03**: UI overlay layer redrawn imperatively via dirty flag + on-demand RAF, not React useEffect
- [ ] **UI-04**: Zero React re-renders during any tool's mousemove interaction

### All-Tool Consistency

- [ ] **TOOL-01**: Selection drag uses ref-based tracking with imperative UI overlay redraw
- [ ] **TOOL-02**: Wall pencil continues using Zustand per-move (auto-connection requires neighbor reads)
- [ ] **TOOL-03**: Tool switch during active drag commits pending tiles before switching
- [ ] **TOOL-04**: Component unmount during drag commits pending tiles via cleanup effect
- [ ] **TOOL-05**: Animation tick skips tiles in `pendingTilesRef` to avoid overwriting user's in-progress edits

### Performance Targets

- [ ] **PERF-01**: Zero React re-renders during pencil drag (verified via React DevTools Profiler)
- [ ] **PERF-02**: Canvas blit latency <1ms per mousemove during any drag operation
- [ ] **PERF-03**: Single React re-render on mouseup for any drag operation
- [ ] **PERF-04**: No visible stutter or lag when drawing tiles at any speed

## v2.7 Requirements (Complete)

<details>
<summary>v2.7 Rendering & Navigation — SHIPPED 2026-02-12</summary>

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

</details>

## Out of Scope

| Feature | Reason |
|---------|--------|
| OffscreenCanvas + Web Workers | Bottleneck is React re-renders, not canvas speed |
| WebGL/WebGPU rendering | Canvas 2D is <1ms — no GPU acceleration needed |
| Custom signals library | Zustand subscribe + refs sufficient for our complexity |
| Third-party canvas libraries | Adds abstraction over 2 drawImage calls |
| Persistent RAF game loop | Editor is idle most of the time, on-demand RAF is better |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ENG-01 | Phase 51 | Pending |
| ENG-02 | Phase 51 | Pending |
| ENG-03 | Phase 51 | Pending |
| SUB-01 | Phase 52 | Pending |
| SUB-02 | Phase 52 | Pending |
| SUB-03 | Phase 52 | Pending |
| DRAG-01 | Phase 53 | Pending |
| DRAG-02 | Phase 53 | Pending |
| DRAG-03 | Phase 53 | Pending |
| DRAG-04 | Phase 53 | Pending |
| DRAG-05 | Phase 53 | Pending |
| UI-01 | Phase 54 | Pending |
| UI-02 | Phase 54 | Pending |
| UI-03 | Phase 54 | Pending |
| UI-04 | Phase 54 | Pending |
| TOOL-01 | Phase 55 | Pending |
| TOOL-02 | Phase 55 | Pending |
| TOOL-03 | Phase 55 | Pending |
| TOOL-04 | Phase 55 | Pending |
| TOOL-05 | Phase 55 | Pending |
| PERF-01 | Phase 53 | Pending |
| PERF-02 | Phase 53 | Pending |
| PERF-03 | Phase 53 | Pending |
| PERF-04 | Phase 55 | Pending |

**Coverage:**
- v2.8 requirements: 24 total
- Mapped to phases: 24 (100% ✓)
- Unmapped: 0

**Phase mapping:**
- Phase 51: 3 requirements (ENG-01, ENG-02, ENG-03)
- Phase 52: 3 requirements (SUB-01, SUB-02, SUB-03)
- Phase 53: 8 requirements (DRAG-01..05, PERF-01..03)
- Phase 54: 4 requirements (UI-01..04)
- Phase 55: 6 requirements (TOOL-01..05, PERF-04)

---
*Requirements defined: 2026-02-12*
*Last updated: 2026-02-12 for v2.8 Canvas Engine*
