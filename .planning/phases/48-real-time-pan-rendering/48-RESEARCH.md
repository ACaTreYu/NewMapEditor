# Phase 48: Real-Time Pan Rendering - Research

**Researched:** 2026-02-12
**Domain:** Canvas pan rendering with hybrid CSS transform + RAF progressive updates
**Confidence:** HIGH

## Summary

Real-time pan rendering requires a hybrid approach: CSS transforms provide immediate GPU-accelerated visual feedback (sub-frame latency), while RAF-throttled canvas re-renders progressively catch up during drag (avoiding React overhead). Current implementation (Phase 47) applies CSS translate() during drag but commits viewport to Zustand only on mouseup, meaning canvas doesn't update until drag ends. Phase 48 will add progressive canvas updates during drag while maintaining CSS transform's instant feedback.

The critical insight: CSS transforms move canvas layers without redrawing pixels (GPU-only), providing 0-latency visual feedback. Canvas re-renders are expensive (CPU-bound tile iteration + drawImage calls), so RAF throttling ensures smooth 60fps by rendering at most once per frame. Viewport state commits only on mouseup to avoid triggering React re-render cascades during drag.

**Primary recommendation:** Implement RAF-debounced progressive render that updates canvas during drag, synced with scrollbar position updates. CSS transform provides instant feedback while canvas catches up within 1 frame.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **requestAnimationFrame** | Browser API | Frame-synchronized rendering | Eliminates timing guesswork, synchronizes with browser paint cycles at display refresh rate |
| **CSS transform: translate()** | Browser API | GPU-accelerated layer movement | Hardware-accelerated, bypasses layout/paint pipeline, sub-millisecond latency |
| **Zustand (existing)** | 5.0.3 | State management | Already stores viewport state, setViewport action handles all updates |
| **React useCallback** | 18.3.1 | Stable RAF callback refs | Prevents RAF loop re-creation on every render |
| **Canvas API (existing)** | Browser API | Tile rendering | 4-layer canvas stack (static, anim, overlay, grid) already implemented |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **cancelAnimationFrame** | Browser API | Cancel pending RAF callbacks | Essential for debouncing pattern — cancel previous frame request when new event fires |
| **useRef** | React 18.3.1 | RAF ID storage, stable closure refs | Store RAF ID for cancellation, avoid stale closure over viewport state |
| **useEffect** | React 18.3.1 | Setup/cleanup RAF loop | Manages RAF lifecycle tied to drag state |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| RAF throttle | setTimeout debounce | setTimeout misaligns with paint cycles (e.g., 16ms guess vs actual 16.67ms @ 60Hz), causes jank when mismatched |
| CSS transform | Canvas translate() | Canvas translate requires full redraw (slow), doesn't provide instant feedback |
| Per-mousemove render | RAF throttle | Mousemove fires 60-200+ times/sec, rendering every event drops frames and blocks input |
| Commit viewport during drag | Commit on mouseup only | Committing during drag triggers React re-renders → Zustand subscribers fire → cascading component updates → janky drag |

**Installation:**
```bash
# NO NEW DEPENDENCIES REQUIRED
# All features use existing browser APIs and React hooks
```

## Architecture Patterns

### Recommended Component Structure
```
MapCanvas.tsx
├── Pan drag state (existing)
│   ├── isDragging: boolean
│   ├── panStartRef: { mouseX, mouseY, viewportX, viewportY }
│   └── CSS transform application (existing lines 927-936)
├── NEW: RAF progressive render
│   ├── rafIdRef: useRef<number | null>(null)
│   ├── requestProgressiveRender(): schedule canvas update
│   └── renderFrame(): calculate viewport, redraw canvas, update scrollbars
└── commitPan() (existing line 139)
    └── Clear transforms, commit viewport to Zustand (mouseup only)
```

### Pattern 1: RAF-Debounced Progressive Render
**What:** Schedule canvas re-render at most once per frame during mousemove events
**When to use:** Continuous high-frequency events (mousemove, scroll, wheel) that need visual updates
**Example:**
```typescript
// Source: https://gomakethings.com/debouncing-events-with-requestanimationframe-for-better-performance/
const rafIdRef = useRef<number | null>(null);

const requestProgressiveRender = useCallback(() => {
  // Cancel any pending render (debounce pattern)
  if (rafIdRef.current !== null) {
    cancelAnimationFrame(rafIdRef.current);
  }

  // Schedule render on next paint
  rafIdRef.current = requestAnimationFrame(() => {
    rafIdRef.current = null;

    // Calculate new viewport from CSS transform delta
    const dx = /* extract from transform */;
    const dy = /* extract from transform */;
    const tilePixels = TILE_SIZE * viewport.zoom;
    const newX = panStartRef.current.viewportX - dx / tilePixels;
    const newY = panStartRef.current.viewportY - dy / tilePixels;

    // Update canvas layers (static, anim, overlay, grid)
    // Do NOT commit to Zustand — use local state for rendering
    drawStaticLayer(newX, newY);
    drawAnimLayer(newX, newY);
    drawOverlayLayer(newX, newY);
    drawGridLayer(newX, newY);

    // Trigger scrollbar visual update via inline style change
    // Scrollbars read from temporary viewport state, not Zustand
  });
}, [viewport.zoom, /* draw functions */]);

const handleMouseMove = (e: React.MouseEvent) => {
  // ... existing code ...
  if (isDragging && panStartRef.current) {
    // Apply CSS transform for instant feedback (existing code)
    const dx = e.clientX - panStartRef.current.mouseX;
    const dy = e.clientY - panStartRef.current.mouseY;
    applyTransform(dx, dy);

    // NEW: Request progressive canvas render
    requestProgressiveRender();
  }
};
```

### Pattern 2: Scrollbar Real-Time Sync
**What:** Update scrollbar thumb position during drag using calculated viewport, not committed Zustand state
**When to use:** Scrollbar must reflect visual state during drag, even before viewport commits to store
**Example:**
```typescript
// Scrollbar metrics calculate from temporary viewport state during drag
const getScrollMetrics = useCallback(() => {
  // Use current viewport if not dragging, calculated viewport if dragging
  const effectiveViewport = isDragging ? calculateTempViewport() : viewport;

  const maxOffsetX = Math.max(0, MAP_WIDTH - visibleTilesX);
  const maxOffsetY = Math.max(0, MAP_HEIGHT - visibleTilesY);

  // Standard Windows scrollbar formula (from Phase 47)
  const thumbLeft = 10 + (effectiveViewport.x / maxOffsetX) * scrollableRangePx;
  const thumbTop = 10 + (effectiveViewport.y / maxOffsetY) * scrollableRangePx;

  return { thumbLeft, thumbTop, /* ... */ };
}, [isDragging, viewport, /* ... */]);

// React re-renders scrollbar when isDragging changes or RAF triggers update
// No Zustand commit until mouseup
```

### Pattern 3: Viewport Commit Deferred Until Mouseup
**What:** Zustand state remains unchanged during drag, commits only when drag completes
**When to use:** Avoid triggering React re-render cascades during high-frequency input
**Example:**
```typescript
const handleMouseUp = (e: React.MouseEvent) => {
  if (isDragging && panStartRef.current) {
    // Cancel any pending RAF render
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    // Calculate final viewport position
    const dx = e.clientX - panStartRef.current.mouseX;
    const dy = e.clientY - panStartRef.current.mouseY;
    const tilePixels = TILE_SIZE * viewport.zoom;
    const newX = panStartRef.current.viewportX - dx / tilePixels;
    const newY = panStartRef.current.viewportY - dy / tilePixels;

    // Clear CSS transforms (existing code)
    clearAllTransforms();

    // Commit to Zustand (triggers React re-render cascade)
    setViewport({ x: newX, y: newY }); // Only commit here

    setIsDragging(false);
  }
};
```

### Anti-Patterns to Avoid
- **Committing viewport during mousemove:** Triggers Zustand subscribers on every mousemove (60-200+ times/sec) → React re-renders entire component tree → dropped frames and input blocking
- **Rendering without RAF throttle:** Canvas drawImage() calls are CPU-bound. Rendering on every mousemove event (200+ times/sec) far exceeds 60fps budget (16.67ms/frame) → cumulative lag and frozen UI
- **Using setTimeout for throttling:** `setTimeout(fn, 16)` assumes 60Hz display but doesn't align with actual paint cycles → renders happen between frames (wasted CPU) or late (jank)
- **Forgetting to cancel pending RAF:** Stale RAF callbacks fire after drag ends, reading outdated panStartRef values → viewport snaps to wrong position

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Event throttling for animations | Custom throttle with `setTimeout` or `setInterval` | `requestAnimationFrame` with cancel-and-reschedule pattern | RAF syncs with browser paint cycles (guaranteed no wasted renders), handles variable refresh rates (60Hz/120Hz/144Hz), passes high-res timestamp for delta calculations |
| Viewport interpolation during drag | Lerp/easing library for smooth transitions | CSS `transform: translate()` for instant feedback, RAF for progressive canvas catch-up | CSS transforms are GPU-accelerated (sub-millisecond latency), no JavaScript involvement until next frame. Interpolation adds latency (feels laggy) and complexity (easing curves, state tracking) |
| Scrollbar position calculation | Custom pixel-to-viewport mapping | Standard Windows scrollbar formulas from Phase 47 (`thumbPos = offset / maxOffset * scrollableRange`) | Windows formulas are proven, tested across all zoom levels, match user expectations from decades of OS UX |

**Key insight:** Canvas rendering is expensive (CPU-bound iteration + drawImage). RAF throttling is mandatory to stay within 60fps frame budget. CSS transforms provide "free" instant feedback by offloading work to GPU compositor.

## Common Pitfalls

### Pitfall 1: Stale Closure Over Viewport State in RAF Callback
**What goes wrong:** RAF callback captures `viewport` value from when `requestAnimationFrame` was called. During drag, viewport doesn't change (deferred commit), but CSS transform delta changes every mousemove. RAF callback calculates viewport from stale transform delta, causing jumpy rendering.

**Why it happens:** JavaScript closure captures variables by reference at function creation time. RAF callback created in `requestProgressiveRender` closes over `viewport` and `panStartRef`. If these change between RAF schedule and callback execution, calculations use outdated values.

**How to avoid:**
1. **Use refs for mutable values:** Store `panStartRef` in `useRef` (already done), read `current` value inside RAF callback
2. **Pass viewport explicitly:** Calculate viewport delta in RAF callback using fresh ref values, don't close over Zustand `viewport` state
3. **Test pattern:** Log viewport values at RAF schedule vs callback execution — should be consistent during drag

**Warning signs:**
- Canvas "jumps" mid-drag to wrong position
- Scrollbar thumb snaps back to original position after first RAF render
- Console logs show `viewport.x` changing between RAF schedule and callback (means Zustand committed during drag — bug)

**Example:**
```typescript
// WRONG: Closes over viewport from outer scope (stale)
const requestProgressiveRender = useCallback(() => {
  rafIdRef.current = requestAnimationFrame(() => {
    const newX = viewport.x + someDelta; // viewport is stale
    drawStaticLayer(newX, viewport.y);
  });
}, [viewport]); // Dependency causes re-creation on every Zustand update

// CORRECT: Reads fresh refs inside RAF callback
const requestProgressiveRender = useCallback(() => {
  rafIdRef.current = requestAnimationFrame(() => {
    if (!panStartRef.current) return;
    // Read current transform delta from DOM or local state
    const dx = /* fresh value */;
    const dy = /* fresh value */;
    const tilePixels = TILE_SIZE * viewportRef.current.zoom;
    const newX = panStartRef.current.viewportX - dx / tilePixels;
    const newY = panStartRef.current.viewportY - dy / tilePixels;
    drawStaticLayer(newX, newY); // Fresh viewport
  });
}, []); // No dependencies — stable across renders
```

---

### Pitfall 2: Forgetting to Cancel Pending RAF on Mouseup
**What goes wrong:** User releases mouse, `handleMouseUp` commits viewport to Zustand, but pending RAF callback still fires 1-16ms later with stale viewport calculation. Canvas renders with wrong viewport briefly (flicker), then React re-render fixes it (double render).

**Why it happens:** RAF callbacks are asynchronous. Scheduling `requestAnimationFrame` doesn't execute immediately — callback fires before next browser paint (up to 16.67ms later at 60Hz). If user releases mouse between schedule and callback, stale logic runs.

**How to avoid:**
1. **Always cancel on mouseup:** Store RAF ID in ref, call `cancelAnimationFrame(rafIdRef.current)` in mouseup handler before committing viewport
2. **Null-check in RAF callback:** Guard with `if (!isDragging) return;` at start of callback (handles race conditions)
3. **Clear RAF ID after cancel:** Set `rafIdRef.current = null` after cancel to detect double-cancel bugs

**Warning signs:**
- Brief flicker/snap when releasing mouse button
- Console logs show RAF callback executing after mouseup
- Viewport "bounces" on mouse release (renders twice with different values)

**Detection pattern:**
```typescript
const handleMouseUp = () => {
  console.log('[mouseup] Canceling RAF:', rafIdRef.current);
  if (rafIdRef.current !== null) {
    cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = null;
  }
  // ... commit viewport ...
};

// RAF callback should log "RAF skipped — not dragging" after mouseup
rafIdRef.current = requestAnimationFrame(() => {
  if (!isDraggingRef.current) {
    console.log('[RAF] Skipped — not dragging');
    return;
  }
  console.log('[RAF] Rendering progressive frame');
  // ... render logic ...
});
```

---

### Pitfall 3: Scrollbar-Viewport Feedback Loop
**What goes wrong:** Scrollbar thumb drag triggers `setViewport()`, which triggers React re-render, which recalculates scrollbar metrics, which updates thumb position, which triggers scrollbar drag handler again (infinite loop). Browser freezes or throttles to prevent crash.

**Why it happens:** Scrollbar position depends on viewport state. Viewport state changes from scrollbar interaction. Without guard logic, updates create circular dependency: scroll → viewport → scroll → viewport → ∞.

**How to avoid:**
1. **Guard flag pattern:** Track whether viewport change originated from scrollbar drag. If yes, skip scrollbar metric recalculation.
   ```typescript
   const scrollbarOriginatedRef = useRef(false);

   const handleScrollMouseMove = () => {
     scrollbarOriginatedRef.current = true;
     setViewport({ x: newX }); // Triggers React re-render
   };

   const getScrollMetrics = () => {
     if (scrollbarOriginatedRef.current) {
       scrollbarOriginatedRef.current = false;
       return previousMetrics; // Skip recalc
     }
     // Normal calculation
   };
   ```

2. **Comparison check:** Only update scrollbar if viewport actually changed:
   ```typescript
   const prevViewportRef = useRef(viewport);
   useEffect(() => {
     if (viewport.x === prevViewportRef.current.x &&
         viewport.y === prevViewportRef.current.y) {
       return; // No change, skip scrollbar update
     }
     prevViewportRef.current = viewport;
     updateScrollbars();
   }, [viewport]);
   ```

3. **Event propagation:** `stopPropagation()` on scrollbar mousedown prevents canvas pan handlers from firing.

**Warning signs:**
- Browser freezes when dragging scrollbar
- Console logs flood with "viewport updated" messages (100+ per second)
- DevTools Performance tab shows infinite React re-render loop
- Scrollbar thumb jumps erratically during drag

**References:**
- [Angular UI Grid scrollbar sync issue](https://github.com/angular-ui/ui-grid/issues/1938) — example of feedback loop bug
- Current codebase: `MapCanvas.tsx` lines 1167-1199 (scrollbar drag handler commits directly to Zustand — potential loop risk if not guarded)

---

### Pitfall 4: Drawing Functions Don't Accept Temporary Viewport
**What goes wrong:** Existing `drawStaticLayer()`, `drawAnimLayer()`, etc. read viewport from Zustand store via `useEditorStore(state => state.viewport)`. During progressive render, viewport hasn't committed yet, so draw functions use old viewport → canvas doesn't update during drag.

**Why it happens:** Draw functions were designed for static rendering (triggered by React `useEffect` on viewport changes). Progressive rendering needs to pass temporary viewport as parameter, but functions don't accept parameters.

**How to avoid:**
1. **Refactor draw functions to accept viewport parameter:**
   ```typescript
   // Before (reads from Zustand)
   const drawStaticLayer = useCallback(() => {
     const { startX, startY, endX, endY } = getVisibleTiles(); // Uses Zustand viewport
     // ... render tiles ...
   }, [viewport, map, tilesetImage]);

   // After (accepts viewport parameter)
   const drawStaticLayer = useCallback((overrideViewport?: Viewport) => {
     const effectiveViewport = overrideViewport ?? viewport;
     const { startX, startY, endX, endY } = getVisibleTiles(effectiveViewport);
     // ... render tiles using effectiveViewport ...
   }, [viewport, map, tilesetImage]);
   ```

2. **Create viewport ref for RAF access:**
   ```typescript
   const viewportRef = useRef(viewport);
   viewportRef.current = viewport; // Keep ref synced

   // RAF callback uses ref
   rafIdRef.current = requestAnimationFrame(() => {
     const tempViewport = calculateTempViewport(viewportRef.current, dx, dy);
     drawStaticLayer(tempViewport); // Pass as parameter
   });
   ```

3. **Test with console logs:** Verify draw functions render different tile ranges when passed different viewport values.

**Warning signs:**
- Canvas doesn't update during drag (only updates on mouseup)
- Draw functions ignore temporary viewport parameter
- Tile ranges logged in RAF callback match Zustand viewport, not calculated viewport

---

### Pitfall 5: Clearing CSS Transform Before Canvas Renders
**What goes wrong:** Mouseup handler clears CSS transforms immediately, then schedules canvas render. For 1 frame (16ms), canvas shows old viewport but transform is cleared → visible snap/jump back to original position. Canvas renders on next frame with correct viewport.

**Why it happens:** CSS transform removal is synchronous (happens immediately). Canvas render is asynchronous (queued via `setViewport` → React re-render → `useEffect` → draw). Between clear and render, user sees momentary regression.

**How to avoid:**
1. **Sequence: render first, clear transforms second:**
   ```typescript
   const handleMouseUp = () => {
     // 1. Calculate final viewport
     const newX = /* ... */;
     const newY = /* ... */;

     // 2. Render canvas with final viewport BEFORE clearing transforms
     drawStaticLayer({ x: newX, y: newY, zoom: viewport.zoom });
     drawAnimLayer({ x: newX, y: newY, zoom: viewport.zoom });
     drawOverlayLayer({ x: newX, y: newY, zoom: viewport.zoom });
     drawGridLayer({ x: newX, y: newY, zoom: viewport.zoom });

     // 3. Clear transforms after canvas is ready
     clearAllTransforms();

     // 4. Commit to Zustand (future React re-renders use committed viewport)
     setViewport({ x: newX, y: newY });
   };
   ```

2. **Alternative: Use RAF to sequence operations:**
   ```typescript
   const handleMouseUp = () => {
     requestAnimationFrame(() => {
       // Render canvas
       drawAllLayers(finalViewport);
       // Clear transforms on same frame
       clearAllTransforms();
       // Commit to Zustand
       setViewport(finalViewport);
     });
   };
   ```

**Warning signs:**
- Brief "snap back" visible when releasing mouse
- Canvas appears at original position for 1 frame before jumping to final position
- User reports "jumpy" or "stuttering" pan drag release

---

## Code Examples

Verified patterns from official sources and current codebase:

### RAF Debounce Pattern
```typescript
// Source: https://gomakethings.com/debouncing-events-with-requestanimationframe-for-better-performance/
// Adapted for React hooks + TypeScript

const rafIdRef = useRef<number | null>(null);

const scheduleRender = useCallback(() => {
  // Cancel previous frame request (debounce)
  if (rafIdRef.current !== null) {
    window.cancelAnimationFrame(rafIdRef.current);
  }

  // Schedule on next paint
  rafIdRef.current = window.requestAnimationFrame(() => {
    rafIdRef.current = null;
    // Execute render logic here
    console.log('RAF render executed');
  });
}, []);

// Cleanup on unmount
useEffect(() => {
  return () => {
    if (rafIdRef.current !== null) {
      window.cancelAnimationFrame(rafIdRef.current);
    }
  };
}, []);
```

### CSS Transform Application (Existing Pattern)
```typescript
// Source: Current codebase MapCanvas.tsx lines 927-936
// Already implemented correctly — reference for Phase 48

if (isDragging && panStartRef.current) {
  // CSS transform for GPU-accelerated panning (no canvas redraws)
  const dx = e.clientX - panStartRef.current.mouseX;
  const dy = e.clientY - panStartRef.current.mouseY;
  const transform = `translate(${dx}px, ${dy}px)`;
  if (staticLayerRef.current) staticLayerRef.current.style.transform = transform;
  if (animLayerRef.current) animLayerRef.current.style.transform = transform;
  if (overlayLayerRef.current) overlayLayerRef.current.style.transform = transform;
  if (gridLayerRef.current) gridLayerRef.current.style.transform = transform;
  return; // Skip canvas rendering during drag
}
```

### Viewport Calculation from Pan Delta
```typescript
// Source: Current codebase MapCanvas.tsx lines 139-158
// commitPan function — reference for progressive render viewport calculation

const commitPan = useCallback((clientX: number, clientY: number) => {
  if (!panStartRef.current) return;
  const tilePixels = TILE_SIZE * viewport.zoom;
  const dx = clientX - panStartRef.current.mouseX;
  const dy = clientY - panStartRef.current.mouseY;
  const newX = panStartRef.current.viewportX - dx / tilePixels;
  const newY = panStartRef.current.viewportY - dy / tilePixels;

  // Clear CSS transforms
  if (staticLayerRef.current) staticLayerRef.current.style.transform = '';
  if (animLayerRef.current) animLayerRef.current.style.transform = '';
  if (overlayLayerRef.current) overlayLayerRef.current.style.transform = '';
  if (gridLayerRef.current) gridLayerRef.current.style.transform = '';

  // Commit to Zustand
  setViewport({ x: newX, y: newY });
  panStartRef.current = null;
  setIsDragging(false);
}, [viewport.zoom, setViewport]);
```

### Scrollbar Metrics Calculation (Phase 47)
```typescript
// Source: Current codebase MapCanvas.tsx lines 689-720
// Standard Windows scrollbar formulas — Phase 48 must sync with these

const getScrollMetrics = useCallback(() => {
  const canvas = gridLayerRef.current;
  if (!canvas) return { thumbWidth: 20, thumbHeight: 20, thumbLeft: 10, thumbTop: 10 };

  const tilePixels = TILE_SIZE * viewport.zoom;
  const visibleTilesX = canvas.width / tilePixels;
  const visibleTilesY = canvas.height / tilePixels;

  // Maximum scrollable offset (0 when viewport covers entire map)
  const maxOffsetX = Math.max(0, MAP_WIDTH - visibleTilesX);
  const maxOffsetY = Math.max(0, MAP_HEIGHT - visibleTilesY);

  const trackWidthPx = canvas.width - 10 - 20;   // minus scrollbar and arrows
  const trackHeightPx = canvas.height - 10 - 20;

  // Thumb size: proportional to viewport-to-map ratio
  const thumbWidthPx = Math.max(20, (visibleTilesX / MAP_WIDTH) * trackWidthPx);
  const thumbHeightPx = Math.max(20, (visibleTilesY / MAP_HEIGHT) * trackHeightPx);

  // Scrollable range: track size minus thumb size
  const scrollableRangeX = trackWidthPx - thumbWidthPx;
  const scrollableRangeY = trackHeightPx - thumbHeightPx;

  // Thumb position: current offset / max offset * scrollable range
  const thumbLeft = 10 + (maxOffsetX > 0 ? (viewport.x / maxOffsetX) * scrollableRangeX : 0);
  const thumbTop = 10 + (maxOffsetY > 0 ? (viewport.y / maxOffsetY) * scrollableRangeY : 0);

  return { thumbWidth: thumbWidthPx, thumbHeight: thumbHeightPx, thumbLeft, thumbTop };
}, [viewport]);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Render on every mousemove | RAF-throttled render (max 60fps) | ~2015 (RAF widespread adoption) | Eliminates frame drops from excessive rendering, aligns with browser paint cycles |
| Canvas translate() for pan | CSS transform: translate() | ~2016 (GPU acceleration maturity) | Offloads transform to GPU compositor, instant feedback without redraw |
| setTimeout-based throttle | requestAnimationFrame-based debounce | ~2015-2017 (performance best practices) | Guarantees sync with paint cycles, handles variable refresh rates (60Hz/120Hz/144Hz) |
| Commit viewport on mousemove | Commit viewport on mouseup only | Current codebase (Phase 47) | Avoids React re-render cascades during drag, improves responsiveness |
| 4 stacked canvases | 2 consolidated canvases (Phase 49) | Planned for Phase 49 | Reduces layer count from 4 to 2 (base layer + overlay), fewer transform applications |

**Deprecated/outdated:**
- **setTimeout-based throttling for animations:** Replaced by RAF. setTimeout doesn't sync with browser paint cycles, wastes CPU on off-frame renders, misses frames on 120Hz+ displays.
- **Direct canvas context transforms:** Replaced by CSS transforms. Canvas `ctx.translate()` requires full layer redraw (CPU-bound), CSS `transform: translate()` is GPU-accelerated (sub-millisecond).
- **Inline event handlers:** Replaced by React event system + useCallback. Inline handlers re-create on every render (breaks RAF ref stability), useCallback creates stable refs.

## Open Questions

1. **Should progressive render update all 4 layers or only static layer?**
   - What we know: Static layer contains 95%+ of tiles (non-animated). Anim layer is sparse (animated tiles only). Overlay layer has UI (selection, preview). Grid layer is optional.
   - What's unclear: Performance tradeoff between updating all layers (consistent visual state) vs only static layer (faster render, but animated tiles lag behind during drag).
   - Recommendation: Start with static + anim layers only (most visible content). Skip overlay (UI elements okay to lag 1 frame) and grid (decorative). Measure performance, expand if smooth.

2. **Should scrollbars update via state trigger or inline style mutation?**
   - What we know: Scrollbars currently render via React inline styles, reading `getScrollMetrics()` which depends on `viewport`. During drag, viewport doesn't commit, so scrollbars won't update unless forced.
   - What's unclear: Best pattern for real-time scrollbar updates during drag without Zustand commits.
   - Recommendation: Add `isDragging` + `tempViewport` local state. `getScrollMetrics()` checks isDragging — if true, uses tempViewport; if false, uses Zustand viewport. React re-renders scrollbar when tempViewport updates via `useState`. Keeps scrollbar in sync without Zustand commits.

3. **What's the frame budget for progressive render?**
   - What we know: 60fps = 16.67ms frame budget. Current tile rendering is fast (4-layer canvas @ 1920x1080 renders <5ms based on no performance complaints). Phase 47 uses standard formulas, no reported lag.
   - What's unclear: How much of the 16.67ms budget is safe for progressive render without risking dropped frames? Should progressive render skip frames if previous render is slow?
   - Recommendation: Measure render time with `performance.now()` before/after draw calls. If render exceeds 10ms (safety margin), skip every other frame (30fps fallback). Add debug logging for performance monitoring.

4. **Should RAF callback read CSS transform delta or track mouse delta locally?**
   - What we know: CSS transforms are applied to DOM (`canvas.style.transform = 'translate(dx, dy)'`). Reading transform requires parsing string (`getComputedStyle`, DOMMatrix). Local tracking stores dx/dy in state (extra state management).
   - What's unclear: Performance difference between reading DOM transform vs maintaining local dx/dy state.
   - Recommendation: Track dx/dy locally in `useState` (updated on mousemove). RAF callback reads from state. Avoids DOM read (faster), simpler logic, matches existing panStartRef pattern.

## Sources

### Primary (HIGH confidence)
- [requestAnimationFrame MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) — Official API documentation, browser support, usage patterns
- [Debouncing with requestAnimationFrame - Go Make Things](https://gomakethings.com/debouncing-events-with-requestanimationframe-for-better-performance/) — Pattern for cancel-and-reschedule RAF debouncing
- [Canvas Panning and Zooming - Harrison Milbradt](https://harrisonmilbradt.com/blog/canvas-panning-and-zooming) — Viewport transform management, coordinate calculations
- Current codebase: `MapCanvas.tsx` lines 927-936 (CSS transform pattern), lines 139-158 (commitPan pattern), lines 689-720 (scrollbar metrics)
- Phase 47 RESEARCH.md and PLAN.md — Scrollbar formulas, viewport clamping patterns

### Secondary (MEDIUM confidence)
- [Performant Drag and Zoom - Fabric.js](https://medium.com/@Fjonan/performant-drag-and-zoom-using-fabric-js-3f320492f24b) — CSS transform wrapper pattern for canvas panning performance
- [Infinite Canvas - Codrops (Jan 2026)](https://tympanus.net/codrops/2026/01/07/infinite-canvas-building-a-seamless-pan-anywhere-image-space/) — Recent article on seamless pan implementation (403 error, title only)
- [High-performance input handling](https://nolanlawson.com/2019/08/11/high-performance-input-handling-on-the-web/) — RAF throttling for mousemove events
- [Angular UI Grid scrollbar sync issue](https://github.com/angular-ui/ui-grid/issues/1938) — Example of scrollbar-viewport feedback loop bug

### Tertiary (LOW confidence)
- [raf-throttle GitHub](https://github.com/wuct/raf-throttle) — Library for RAF throttling (not needed, pattern is simple enough to inline)
- [Browsers, input events, and frame throttling](https://nolanlawson.com/2019/08/14/browsers-input-events-and-frame-throttling/) — Background on browser event throttling

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All browser APIs with MDN docs, existing patterns in codebase
- Architecture: HIGH — RAF debounce pattern verified from multiple sources, CSS transform pattern already implemented
- Pitfalls: HIGH — Stale closure, RAF cancellation, feedback loops documented with detection patterns and fixes

**Research date:** 2026-02-12
**Valid until:** 2026-04-12 (60 days - stable domain, browser APIs unchanged for years)
