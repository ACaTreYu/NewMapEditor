# Stack Research: React-Independent Canvas Rendering

**Project:** AC Map Editor v2.8 Canvas Engine
**Researched:** 2026-02-12
**Confidence:** HIGH (patterns verified against existing codebase, MDN docs, and production usage in react-three-fiber/Zustand ecosystem)

---

## Executive Summary

The core performance problem is that during drag operations (pencil, pan, selection), each mouse move triggers 5-10 Zustand state updates, which cause 5-10 React re-renders, each costing 5-10ms. The canvas drawing itself is <1ms. React is blocking the main thread from painting.

The solution requires **zero new dependencies**. Everything needed is already in the project: `useRef`, `requestAnimationFrame`, `useEditorStore.subscribe()`, `useEditorStore.getState()`, and the Canvas 2D API. The codebase already has partial implementations of these patterns (viewport subscription, `immediatePatchTile`, `pendingTilesRef`). The v2.8 milestone should complete and systematize what is already started.

---

## 1. requestAnimationFrame: Decoupling Rendering from React

### What RAF Does

`requestAnimationFrame(callback)` tells the browser to call your function before the next repaint. It fires at the display's refresh rate (typically 60Hz = 16.7ms, or 120Hz = 8.3ms). It is one-shot -- you must call it again inside the callback to continue.

**Confidence:** HIGH (MDN docs, universal browser API)

### Two RAF Patterns for Canvas

#### Pattern A: Persistent Render Loop (Game Loop)

A RAF loop that runs continuously, checking dirty flags each frame:

```typescript
const dirtyRef = useRef(false);

useEffect(() => {
  let rafId: number;

  const loop = () => {
    if (dirtyRef.current) {
      draw();  // Only draw when something changed
      dirtyRef.current = false;
    }
    rafId = requestAnimationFrame(loop);
  };

  rafId = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(rafId);
}, []);
```

**When to use:** Continuous animations, games, real-time simulations. The loop runs at display refresh rate regardless of input.

**Overhead:** Minimal. A RAF callback that checks a boolean and returns is ~0.01ms. The browser already runs a frame loop; RAF just hooks into it.

#### Pattern B: On-Demand RAF (Coalescing)

RAF requested only when input occurs, coalescing multiple inputs into one frame:

```typescript
const rafIdRef = useRef<number | null>(null);

function requestRender() {
  if (rafIdRef.current !== null) return;  // Already scheduled
  rafIdRef.current = requestAnimationFrame(() => {
    rafIdRef.current = null;
    draw();
  });
}

// Called on every mousemove (may fire 5-10x per frame)
function onMouseMove(e: MouseEvent) {
  updateState(e);     // Update ref-based state
  requestRender();    // Coalesce to next frame
}
```

**When to use:** Input-driven rendering where idle periods have nothing to draw. This is the correct pattern for a tile editor.

**Advantage over persistent loop:** Zero overhead when idle. No RAF callbacks running when the user is not interacting.

### Recommendation for AC Map Editor: Pattern B (On-Demand)

The editor is idle most of the time. A persistent loop would waste CPU checking dirty flags 60-120 times per second for nothing. On-demand RAF fires only during active drag operations, coalescing the 5-10 mousemove events per frame into a single draw call.

**Exception:** The animation tick (for animated tiles) already runs on a Zustand-driven timer. Keep that as-is -- it only fires every 100-200ms, not every frame.

**Confidence:** HIGH

---

## 2. Canvas 2D Context: Concurrent Access Safety

### Key Fact: Same Context Instance Guaranteed

`canvas.getContext('2d')` always returns the **same** CanvasRenderingContext2D instance for a given canvas element. Multiple calls from different code paths (React effects, imperative handlers, RAF callbacks) all operate on the same object.

**Confidence:** HIGH (MDN specification)

### Is Concurrent Access Safe?

**Yes, because JavaScript is single-threaded.** There is no true concurrent access to a canvas context on the main thread. Even though "concurrent" code paths exist (useEffect, event handlers, RAF callbacks), they never execute simultaneously. The event loop ensures:

1. Event handler runs to completion
2. RAF callback runs to completion
3. React effect runs to completion

They never overlap. There is no mutex or locking needed.

### Practical Implication for Our Architecture

Both React effects AND imperative code can safely draw to the same canvas context:

```typescript
// This is safe -- they never run at the same time:

// Path 1: React effect (runs after render)
useEffect(() => {
  const ctx = canvasRef.current.getContext('2d');
  ctx.drawImage(buffer, ...);
}, [someState]);

// Path 2: Imperative (runs in event handler)
function onMouseMove(e) {
  const ctx = canvasRef.current.getContext('2d');
  ctx.drawImage(buffer, ...);  // Same ctx object, safe
}
```

**Caution:** While access is safe, **state conflicts** are possible. If a React effect redraws the entire canvas at viewport A, but an imperative handler already drew at viewport B, the React effect will "overwrite" the imperative draw. This is managed by the `prevTilesRef` / `lastBlitVpRef` pattern already in the codebase -- making React's subsequent draw a no-op when the imperative draw already did the work.

**Confidence:** HIGH

---

## 3. The On-Demand Render Pattern with Dirty Flags

### Architecture for AC Map Editor

The pattern combines three concepts:

1. **Ref-based mutable state** (not React state) for transient drag data
2. **On-demand RAF** to coalesce renders
3. **Commit to Zustand on mouseup** for persistence/undo

```
mousemove event
  |
  v
Update refs (cursorTileRef, pendingTilesRef, viewportRef)  <-- NO React re-render
  |
  v
requestRender()  <-- Schedules ONE RAF per frame
  |
  v
RAF callback fires:
  - Read refs
  - Patch buffer (immediatePatchTile)
  - Blit to screen (immediateBlitToScreen)
  - Draw UI overlay (cursor, selection)

mouseup event
  |
  v
Commit pendingTilesRef to Zustand (setTiles batch)
Push undo, commit undo
  |
  v
React re-renders once (final state)
```

### Dirty Flag Design

For a tile editor with separate map and UI layers, use **per-layer dirty flags**:

```typescript
const dirtyFlags = useRef({
  mapBuffer: false,   // Tiles changed on the 4096x4096 buffer
  mapBlit: false,     // Viewport changed, need to re-blit buffer to screen
  uiOverlay: false,   // Cursor moved, selection changed, etc.
});

function renderFrame() {
  if (dirtyFlags.current.mapBuffer) {
    patchChangedTiles();  // Only the changed tiles on the buffer
    dirtyFlags.current.mapBuffer = false;
    dirtyFlags.current.mapBlit = true;  // Buffer changed means blit needed
  }
  if (dirtyFlags.current.mapBlit) {
    blitBufferToScreen();
    dirtyFlags.current.mapBlit = false;
  }
  if (dirtyFlags.current.uiOverlay) {
    drawUiLayer();
    dirtyFlags.current.uiOverlay = false;
  }
}
```

**Why per-layer:** During pencil drag, only `mapBuffer + mapBlit` are dirty (cursor doesn't move between tiles every mousemove). During pan drag, only `mapBlit` is dirty (no tiles change). During selection drag, only `uiOverlay` is dirty (no tiles change, no viewport change). This avoids redrawing layers that haven't changed.

**Confidence:** HIGH (MDN optimization guide recommends "render screen differences only, not the whole new state")

---

## 4. OffscreenCanvas and Web Workers

### Current State of Support

- **Electron 34** uses **Chromium 132** -- full OffscreenCanvas 2D context support
- OffscreenCanvas has been stable in Chrome since version 69
- 2D context on OffscreenCanvas has been stable since Chrome 80+
- Safari 16.4+ supports it (irrelevant for Electron, but relevant for portability to AC web app)

**Confidence:** HIGH (caniuse.com, Chromium feature status)

### Two Usage Modes

#### Mode 1: transferControlToOffscreen (Worker-Owned Canvas)

Transfer the visible canvas to a worker. The worker draws directly to the screen canvas from a background thread:

```typescript
// Main thread
const offscreen = canvas.transferControlToOffscreen();
worker.postMessage({ canvas: offscreen }, [offscreen]);

// Worker
onmessage = (e) => {
  const ctx = e.data.canvas.getContext('2d');
  // Draw in worker -- renders directly to screen
};
```

**Problem for our use case:** Once transferred, the main thread can NO LONGER draw to this canvas. All drawing must happen in the worker. This means mouse events (main thread) must be postMessage'd to the worker, which adds latency and complexity. The React UI overlay (cursor, selection, grid) would also need to be in the worker, or on a separate canvas.

#### Mode 2: OffscreenCanvas as Off-Screen Buffer (No Worker)

Create an OffscreenCanvas purely as a drawing surface, never transferred to a worker:

```typescript
const buffer = new OffscreenCanvas(4096, 4096);
const bufCtx = buffer.getContext('2d');
// Draw tiles to buffer
// Blit buffer to screen canvas via drawImage
```

**Advantage over `document.createElement('canvas')`:** Potentially faster because OffscreenCanvas doesn't need to interact with the DOM at all. In practice, for a pre-rendered buffer that's never displayed, the performance difference is negligible.

### Recommendation: NOT Worth the Complexity Now

The current architecture uses `document.createElement('canvas')` for the 4096x4096 buffer. This works well and is already proven performant. The canvas rendering itself takes <1ms -- the bottleneck is React re-renders, not canvas drawing speed.

**OffscreenCanvas in a worker** would add:
- postMessage overhead for every tile change
- Complexity of serializing tileset image data to worker
- Loss of direct main-thread canvas access for UI overlays
- Worker lifecycle management

**OffscreenCanvas as buffer (no worker)** provides:
- Negligible performance gain over createElement('canvas')
- May cause confusion with the other meaning of OffscreenCanvas

**Verdict:** Skip OffscreenCanvas for v2.8. The performance win is in eliminating React re-renders during drags, not in faster canvas operations. If future profiling shows canvas drawing itself is a bottleneck (e.g., maps larger than 256x256), revisit OffscreenCanvas workers then.

**Confidence:** HIGH

---

## 5. useRef: Bypassing React's Render Cycle

### The Core Pattern

`useRef` stores mutable values that persist across renders without triggering re-renders when mutated. This is THE mechanism for decoupling imperative canvas operations from React.

**Confidence:** HIGH (React documentation, universal pattern)

### What Should Be Refs vs State

| Data | Currently | Should Be | Why |
|------|-----------|-----------|-----|
| Cursor tile position (during drag) | `useState` (`cursorTile`) | `useRef` | Changes 5-10x per frame during drag. Only needs React state for final position (mouseup). |
| Selection drag coordinates | `useState` (`selectionDrag`) | `useRef` | Intermediate positions only matter for drawing, not for React. |
| Line endpoint during drag | `useState` (`lineState`) | `useRef` for `endX/endY` | Start point needs state (set once), end point changes every mousemove. |
| Wall pencil last position | `useState` (`lastWallPencilPos`) | `useRef` | Never displayed in React UI, purely for dedup logic. |
| Pending tile changes | `useRef` (`pendingTilesRef`) | `useRef` (keep) | Already correct! |
| Pan start / delta | `useRef` (pan refs) | `useRef` (keep) | Already correct! |
| isDragging | `useState` | `useRef` + CSS class via ref | Only triggers re-render for cursor:grabbing CSS. Can be set directly on DOM. |
| isDrawingWallPencil | `useState` | `useRef` | Only used in event handler logic, not in rendered JSX. |

### The react-three-fiber Lesson

React-three-fiber (the most successful React + canvas integration) explicitly documents this pattern:

> "Never call setState in useFrame. You would only complicate something as simple as an update by routing it through React's scheduler, triggering component render."

Their recommended pattern for fast updates:
```typescript
// Read state imperatively, write to canvas directly
useFrame(() => {
  ref.current.position.x = zustandStore.getState().x;
});
```

The AC Map Editor equivalent:
```typescript
// In mousemove handler:
cursorTileRef.current = { x, y };
dirtyFlags.current.uiOverlay = true;
requestRender();
// NOT: setCursorTile({ x, y })  // This causes a React re-render
```

**Confidence:** HIGH (react-three-fiber performance pitfalls documentation, Zustand docs)

---

## 6. Zustand Integration: subscribe() + getState()

### Pattern: Direct Store Subscription for Canvas

The codebase already uses `useEditorStore.subscribe()` for viewport blit (line 755). This is the correct pattern and should be extended:

```typescript
useEffect(() => {
  const unsub = useEditorStore.subscribe((state, prevState) => {
    // Compare specific slices, draw directly
    if (state.viewport !== prevState.viewport) {
      immediateBlitToScreen(state.viewport);
    }
  });
  return unsub;
}, []);
```

**Why this works:** Zustand's `subscribe` fires synchronously on every `set()` call, OUTSIDE React's render cycle. The callback runs immediately when state changes, with zero React overhead. This is how the viewport blit already achieves instant response.

### Pattern: getState() for Event Handlers

Event handlers that need current state but should NOT trigger re-renders:

```typescript
function handleMouseMove(e) {
  const state = useEditorStore.getState();
  const viewport = state.viewport;
  // Use viewport for coordinate conversion
  // Don't subscribe to viewport changes via useEditorStore(s => s.viewport)
}
```

**Caution:** Action functions selected individually (`const setTile = useEditorStore(s => s.setTile)`) are stable references and never cause re-renders. This is already done correctly in the codebase. Keep this pattern.

### Pattern: Deferred Commit on mouseup

During drag, accumulate changes in refs. On mouseup, batch-commit to Zustand:

```typescript
// mousedown
pendingTilesRef.current = new Map();
pushUndo();  // Snapshot before changes

// mousemove (many times)
pendingTilesRef.current.set(y * MAP_WIDTH + x, tile);
// Immediate visual: patch buffer + blit
// NO Zustand update

// mouseup
const pending = pendingTilesRef.current;
if (pending && pending.size > 0) {
  const tiles = Array.from(pending.entries()).map(([key, tile]) => ({
    x: key % MAP_WIDTH,
    y: Math.floor(key / MAP_WIDTH),
    tile
  }));
  setTiles(tiles);  // ONE Zustand update, ONE React re-render
  commitUndo('Edit tiles');
}
pendingTilesRef.current = null;
```

**Why batch matters:** 50 individual `setTile()` calls during a drag = 50 Zustand updates = 50 React re-renders. One `setTiles([...50 tiles])` call = 1 Zustand update = 1 React re-render.

**The codebase already has `pendingTilesRef` declared** (line 86) but it's not fully wired up for the pencil tool. The pencil tool currently calls `setTile()` on every mousemove (line 1312). This is the primary source of drag-time re-renders.

**Confidence:** HIGH (Zustand docs, already partially implemented in codebase)

---

## 7. Canvas 2D Performance Optimizations

### Relevant to Our Buffer Architecture

| Optimization | Status | Impact |
|--------------|--------|--------|
| Pre-render to off-screen buffer | DONE (4096x4096 buffer) | Major -- single drawImage blit vs 65536 tile draws |
| Integer coordinates in drawImage | PARTIALLY DONE | Moderate -- `Math.floor()` used in UI layer but not consistently in buffer patches |
| `imageSmoothingEnabled = false` | DONE | Correct for pixel art / tile rendering |
| Minimize canvas state changes | NEEDS WORK | UI layer sets/restores styles repeatedly per frame |
| Avoid clearing entire canvas | DONE for buffer (incremental patch) | N/A for screen canvas (full blit replaces all pixels) |
| CSS transforms for pan | DONE | GPU-accelerated panning during drag |
| Layer separation (map + UI) | DONE (2 canvas stack) | Correct -- map layer rarely needs full redraw |

### New Optimization: Avoid Redundant Blits

Currently, when React re-renders after an imperative draw already updated the canvas, `drawMapLayer` runs again. It diffs the tile array (`prevTilesRef`), finds no changes, and skips the blit (lines 310-314). This is correct but wasteful -- the useCallback is recreated, the effect fires, the function runs. The dirty-flag pattern eliminates this entirely by not triggering React re-renders during drags.

**Confidence:** HIGH (MDN Canvas optimization guide)

---

## 8. Summary: What to Build and What NOT to Build

### Build (Zero New Dependencies)

| Pattern | Purpose | Existing Precedent in Codebase |
|---------|---------|-------------------------------|
| Ref-based drag state | Eliminate re-renders during drag | `pendingTilesRef`, `cursorTileRef`, `panStartRef` |
| On-demand RAF coalescing | One draw per frame during drag | `requestProgressiveRender` (pan only, extend to all tools) |
| Per-layer dirty flags | Skip unchanged layers | `lastBlitVpRef` (viewport-only, extend to all layers) |
| Deferred Zustand commit | One state update on mouseup | `commitPan` pattern (pan only, extend to pencil/selection) |
| Direct store subscription | Instant canvas updates without React | `useEditorStore.subscribe` for viewport (extend to tiles) |

### Do NOT Build

| Approach | Why Not |
|----------|---------|
| OffscreenCanvas in Web Worker | Bottleneck is React re-renders, not canvas speed. Adds complexity for no gain. |
| Custom React reconciler (a la R3F) | Massive complexity. Our canvas is simpler -- just refs + imperative drawing. |
| Persistent RAF game loop | Editor is idle most of the time. On-demand RAF is more efficient. |
| WebGL/GPU rendering | Canvas 2D drawImage at 4096x4096 takes <1ms. No GPU acceleration needed. |
| Third-party canvas libraries (Konva, PixiJS, Fabric) | They add abstraction we don't need. Our rendering is a single drawImage blit + tile patches. |
| React state batching (React 18 automatic batching) | React 18 does batch setState calls within the same event handler, but the re-render still happens once per handler. The goal is ZERO re-renders during drag, not fewer. |

---

## 9. Technology Compatibility Matrix

| Technology | Version in Project | Relevant API | Notes |
|------------|-------------------|--------------|-------|
| React | 18.3.1 | `useRef`, `useEffect`, `useCallback` | All patterns use standard hooks. No React 19 features needed. |
| Zustand | 5.0.3 | `subscribe()`, `getState()`, `set()` | All APIs stable and already in use. |
| Electron | 34.x | Chromium 132 | Full Canvas 2D, OffscreenCanvas, RAF support. |
| Canvas 2D | Browser API | `drawImage`, `getContext('2d')` | No version concerns. Stable for 15+ years. |
| requestAnimationFrame | Browser API | `requestAnimationFrame`, `cancelAnimationFrame` | Already used in codebase (resize observer, pan). |
| TypeScript | 5.7.2 | Strict mode | All patterns type-safe with existing config. |

---

## 10. Migration Path from Current Architecture

### Phase 1: Convert Drag State from useState to useRef

**Scope:** Replace `setCursorTile`, `setSelectionDrag`, `setLineState`, `setIsDrawingWallPencil`, `setLastWallPencilPos` with ref-based equivalents during drag operations.

**Risk:** LOW. Refs are simpler than state. The UI overlay reads from refs instead of state during drag.

**Validation:** Cursor highlight still follows mouse. Selection rectangle still draws. Line preview still updates.

### Phase 2: Implement On-Demand RAF with Dirty Flags

**Scope:** Create `requestRender()` function that coalesces all draw requests into one RAF per frame. Each tool's mousemove sets dirty flags + calls `requestRender()` instead of triggering React re-renders.

**Risk:** LOW. The pattern already exists for pan (`requestProgressiveRender`). Generalize it.

**Validation:** Draw a line of tiles with pencil. Verify only 1 draw call per frame (not 5-10). Use Performance tab to confirm no React re-renders during drag.

### Phase 3: Deferred Zustand Commit for Pencil Tool

**Scope:** During pencil drag, accumulate changes in `pendingTilesRef`. Patch buffer + blit immediately. Call `setTiles()` only on mouseup.

**Risk:** MEDIUM. Must handle: Escape cancellation (discard pending), mouse leave (commit pending), multi-tile stamps, undo integration.

**Validation:** Draw 50 tiles with pencil drag. Verify React DevTools shows 2 renders total (mousedown + mouseup), not 50.

### Phase 4: Extend to All Drag Tools

**Scope:** Apply the same pattern to wall pencil, selection, rect tools.

**Risk:** LOW once Phase 3 is proven. Each tool has similar structure.

---

## Sources

### Official Documentation (HIGH confidence)
- [MDN: requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
- [MDN: Canvas Optimization](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)
- [MDN: OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas)
- [MDN: HTMLCanvasElement.getContext()](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext)
- [MDN: Game Loop Anatomy](https://developer.mozilla.org/en-US/docs/Games/Anatomy)
- [Electron 34 Release Notes](https://www.electronjs.org/blog/electron-34-0)
- [Zustand GitHub - subscribe and getState](https://github.com/pmndrs/zustand)

### Production Patterns (HIGH confidence)
- [React Three Fiber Performance Pitfalls](https://r3f.docs.pmnd.rs/advanced/pitfalls) -- "Never setState in render loop"
- [React Three Fiber Animation Techniques](https://deepwiki.com/pmndrs/react-three-fiber/4.3-animation-techniques)
- [Zustand: Prevent Rerenders with useShallow](https://zustand.docs.pmnd.rs/guides/prevent-rerenders-with-use-shallow)

### Community Patterns (MEDIUM confidence)
- [CSS-Tricks: requestAnimationFrame with React Hooks](https://css-tricks.com/using-requestanimationframe-with-react-hooks/)
- [Phil Nash: Techniques for Animating Canvas in React](https://philna.sh/blog/2018/09/27/techniques-for-animating-on-the-canvas-in-react/)
- [web.dev: OffscreenCanvas](https://web.dev/articles/offscreen-canvas)
- [OpenLayers: Tiled Layer Rendering in Offscreen Canvas](https://openlayers.org/en/latest/examples/tiled-layer-rendering-in-offscreen-canvas.html)
- [Aleksandr Hovhannisyan: Performant Game Loops in JavaScript](https://www.aleksandrhovhannisyan.com/blog/javascript-game-loop/)
- [CanIUse: OffscreenCanvas 2D Context](https://caniuse.com/mdn-api_offscreencanvas_getcontext_2d_context)

### Codebase Evidence (HIGH confidence)
- `MapCanvas.tsx` lines 755-782: Existing `useEditorStore.subscribe` for viewport blit
- `MapCanvas.tsx` lines 231-256: Existing `immediateBlitToScreen` and `immediatePatchTile`
- `MapCanvas.tsx` line 86: Existing `pendingTilesRef` (declared but not wired to pencil tool)
- `MapCanvas.tsx` lines 673-700: Existing `requestProgressiveRender` for pan
- `MapCanvas.tsx` lines 310-314: Existing early-exit in `drawMapLayer` when nothing changed
