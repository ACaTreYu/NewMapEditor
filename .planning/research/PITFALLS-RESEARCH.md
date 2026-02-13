# Pitfalls: Decoupling Canvas from React Render Cycle

**Domain:** React 18 + Zustand + Canvas 2D imperative rendering in Electron 28
**Researched:** 2026-02-12
**Overall Confidence:** HIGH (based on codebase analysis + verified patterns)

---

## Critical Pitfalls

These WILL cause bugs or rewrites if not planned for. Each is grounded in the actual codebase.

---

### Pitfall 1: Two Sources of Truth During Drag (pendingTiles vs Zustand)

**What goes wrong:** During a pencil drag, tile state lives in TWO places simultaneously: the `pendingTilesRef` Map (local) and `map.tiles` Uint16Array (Zustand). If anything reads from Zustand mid-drag (undo, other component, animation tick, fill tool), it sees stale data. If anything writes to Zustand mid-drag (keyboard shortcut triggers undo), the pendingTiles ref has no knowledge of the revert.

**Why this is real in our codebase:**

The current code (lines 1305-1340 of MapCanvas.tsx) calls `setTile()` on every mousemove during pencil drag, which updates Zustand immediately. The planned change is to STOP calling setTile during drag and instead accumulate changes in `pendingTilesRef`, committing them all on mouseup.

But the codebase has multiple consumers of `map.tiles`:
- `drawMapLayer` reads `map.tiles` for incremental diff (lines 295-308)
- Animation tick reads `map.tiles` for animated tile lookup (line 814)
- `handleToolAction` for fill reads `map.tiles` via `fillArea` (line 1342)
- Undo/redo replaces `map.tiles` entirely (documentsSlice lines 200+)
- `prevTilesRef` snapshot is compared against `map.tiles` to detect changes

If pendingTiles holds tile (50,50) = wall, but Zustand still says (50,50) = empty, then:
1. Animation tick renders the empty tile, overwriting the wall on the buffer
2. User triggers undo via Ctrl+Z mid-drag: Zustand reverts, but pendingTiles still has the wall
3. Another component reads map.tiles and shows "no changes" even though tiles are visually changed

**Consequences:**
- Visual flicker: buffer shows tile, then animation tick overwrites it with old value
- Undo corruption: undo snapshot captured before drag misses pending tiles
- Data loss: if component unmounts mid-drag, pendingTiles never committed

**Prevention:**

```typescript
// PATTERN: Overlay reads with pending tiles
function getTileAt(x: number, y: number): number {
  const key = y * MAP_WIDTH + x;
  const pending = pendingTilesRef.current;
  if (pending && pending.has(key)) {
    return pending.get(key)!;
  }
  return map.tiles[key];
}
```

Apply this overlay function in:
- `drawMapLayer` incremental diff (check pending before prev)
- Animation tick tile lookup
- Any tool that reads neighboring tiles (wall auto-connect reads 8 neighbors)

For undo: either (a) block undo during drag, or (b) commit pending tiles before undo executes. Option (a) is simpler and what most editors do.

**Detection:**
- Draw a few tiles with pencil, then quickly press Ctrl+Z before releasing mouse
- Draw over animated tiles during drag -- do they flicker?
- Draw tiles, then resize window mid-drag -- does the redraw show old tiles?

---

### Pitfall 2: React Re-render Overwrites Imperative Canvas Content

**What goes wrong:** The imperative `immediatePatchTile()` draws directly to the buffer canvas. But React still re-renders MapCanvas because `setTile()` updates Zustand's `map` reference (see EditorState.ts line 235: `set({ map: doc.map })`). This triggers the `drawMapLayer` useEffect (line 745-747), which re-reads `map.tiles` and blits the buffer to screen -- potentially BEFORE the next immediatePatchTile call, or AFTER animation tick has overwritten the buffer region.

**Why this is real in our codebase:**

The current flow during pencil drag:
1. `handleToolAction` calls `setTile(x, y, tile)` -- updates Zustand
2. `immediatePatchTile()` draws to buffer -- immediate visual feedback
3. Zustand's `set({ map: doc.map })` triggers React re-render
4. React re-render fires `drawMapLayer` useEffect
5. `drawMapLayer` diffs `map.tiles` against `prevTilesRef` -- BUT `immediatePatchTile` already updated `prevTilesRef` (line 254), so diff finds nothing changed
6. Blit proceeds anyway (drawImage to screen)

Step 6 is a wasted blit. Currently this is merely wasteful, not incorrect, because `immediatePatchTile` updates `prevTilesRef`. BUT: if we decouple and stop calling `setTile()` during drag, then React won't re-render from tile changes... unless something ELSE triggers a re-render (cursor position change, animation frame advance, tool state change).

The real danger is: if React re-renders for any reason during drag, `drawMapLayer` runs, reads `map.tiles` (which does NOT have pending tiles), diffs against `prevTilesRef` (which DOES have pending tiles from immediatePatchTile), and sees a REVERSE diff -- it "patches" the buffer back to the old tile values.

**Consequences:**
- Tiles drawn during drag visually disappear and reappear
- Buffer state and prevTilesRef get out of sync
- User sees "flickering tiles" during fast pencil drag

**Prevention:**

```typescript
// PATTERN: Guard drawMapLayer against running during active drag
const isDragActiveRef = useRef(false);

// In drawMapLayer:
if (isDragActiveRef.current && !needsFullBuild) {
  // During drag, only blit -- don't diff/patch tiles
  // Pending tiles are managed imperatively
  immediateBlitToScreen(vp);
  return;
}
```

Alternatively, keep `prevTilesRef` authoritative by ensuring it always matches what's on the buffer canvas, regardless of what's in Zustand. This is what the current `immediatePatchTile` does (line 254), but it breaks down when `drawMapLayer` runs a full diff loop.

**Detection:**
- Enable React DevTools "Highlight renders" -- watch for yellow flashes during pencil drag
- Add `console.count('drawMapLayer')` and count calls during a 1-second drag
- Draw rapidly over animated tiles and watch for visual flicker

---

### Pitfall 3: Stale Closures in useCallback Capturing Old Viewport/Map State

**What goes wrong:** `drawMapLayer`, `drawUiLayer`, `immediatePatchTile`, and `immediateBlitToScreen` are all wrapped in `useCallback` with dependency arrays. During drag, these callbacks may close over stale `viewport` or `map` values if the dependency hasn't triggered a re-create. The direct store subscription (lines 754-782) bypasses React and reads fresh state, but the imperative patch functions read from the closure.

**Why this is real in our codebase:**

Look at `immediatePatchTile` (lines 247-256):
```typescript
const immediatePatchTile = useCallback((tileX, tileY, tile, vp) => {
  // ...
  renderTile(bufCtx, tilesetImage, tile, ...);
  if (prevTilesRef.current) prevTilesRef.current[...] = tile;
  immediateBlitToScreen(vp);
}, [tilesetImage, immediateBlitToScreen]);
```

This depends on `tilesetImage` and `immediateBlitToScreen`. If viewport changes during drag (user scrolls with scroll wheel while drawing), `immediateBlitToScreen` gets recreated because `drawMapLayer` dependency changes... but `immediatePatchTile` may still hold the OLD `immediateBlitToScreen` for one render cycle.

The ref pattern (`drawMapLayerRef.current = drawMapLayer`, line 741) partially mitigates this for ResizeObserver, but the mouse event handlers call these functions directly, not through refs.

**Consequences:**
- Tiles render at wrong screen position after zoom-during-drag
- Buffer blit uses old viewport coordinates
- Subtle: works 95% of time, breaks only when viewport changes mid-drag

**Prevention:**

1. **Pass viewport as parameter, not from closure:**
```typescript
// GOOD: viewport passed in, no closure dependency
const immediatePatchTile = useCallback((tileX, tileY, tile, vp) => {
  // Use vp parameter, not viewport from closure
  immediateBlitToScreen(vp);
}, [tilesetImage]); // viewport not in deps

// BETTER: read current viewport from store at call time
const immediatePatchTile = useCallback((tileX, tileY, tile) => {
  const vp = useEditorStore.getState().viewport;
  immediateBlitToScreen(vp);
}, [tilesetImage]);
```

2. **Use stable refs for hot-path functions:**
```typescript
const immediatePatchTileRef = useRef<(...) => void>();
immediatePatchTileRef.current = immediatePatchTile;
// In mouse handler: immediatePatchTileRef.current(x, y, tile);
```

**Detection:**
- Zoom with scroll wheel while holding left mouse button and drawing
- Pan with middle mouse while drawing with left button (multi-button)
- If tiles appear at wrong position, stale closure is the cause

---

### Pitfall 4: Zustand store.subscribe + useStore Double-Work

**What goes wrong:** The direct store subscription (lines 754-782) does an immediate blit when viewport changes. But the React `useStore` hook ALSO triggers a re-render, which fires `drawMapLayer` via useEffect, which does ANOTHER blit. Two blits for one viewport change. Worse: if the subscription fires first and blits, then React re-render fires drawMapLayer which diffs tiles (finds nothing changed) but still blits because viewport changed.

**Why this is real in our codebase:**

The subscription at line 755:
```typescript
const unsub = useEditorStore.subscribe((state, prevState) => {
  const vp = getVp(state);
  const prevVp = getVp(prevState);
  if (vp !== prevVp && mapBufferRef.current) {
    // Immediate blit
    ctx.drawImage(mapBufferRef.current, ...);
  }
});
```

And the React-triggered path at lines 745-747:
```typescript
useEffect(() => {
  drawMapLayer();
}, [drawMapLayer]); // drawMapLayer depends on viewport
```

Both fire on the same viewport change. The subscription fires synchronously when Zustand's `set()` is called. The useEffect fires after React commits the render. Result: two full-canvas blits for one viewport change.

**Consequences:**
- Double GPU work per viewport change (wasted frames)
- On slow machines: visible double-draw or tearing
- The early-exit guard in drawMapLayer (lines 311-314) prevents the second blit only if viewport AND tiles are unchanged, but viewport just changed so the guard fails

**Prevention:**

```typescript
// PATTERN: Let subscription handle viewport-only changes,
// let drawMapLayer handle tile changes
useEffect(() => {
  // Only run drawMapLayer when tiles/tileset change, NOT viewport
  drawMapLayer();
}, [map, tilesetImage]); // Remove viewport from deps

// Subscription handles viewport blits (already does this)
```

Or add a "skip if subscription already handled it" guard:
```typescript
const lastSubscriptionBlitRef = useRef<number>(0);

// In subscription:
lastSubscriptionBlitRef.current = performance.now();

// In drawMapLayer:
if (performance.now() - lastSubscriptionBlitRef.current < 16) {
  // Subscription already blitted this frame, skip
  return;
}
```

**Detection:**
- Add `console.count('blit')` in both blit paths
- Profile in DevTools: look for two drawImage calls in same frame after scroll/zoom
- Viewport changes should show exactly 1 blit, not 2

---

## Moderate Pitfalls

These cause bugs that are harder to reproduce but still real.

---

### Pitfall 5: Component Unmount During Active Drag

**What goes wrong:** In MDI (multi-document interface), closing a document window or switching tabs while a drag operation is active causes the MapCanvas component to unmount. If pendingTiles has uncommitted changes, they're lost. If RAF is running, the callback fires after unmount and accesses dead refs. If global event listeners (mouseup on window) aren't cleaned up, they fire on a dead component.

**Why this is real in our codebase:**

The cleanup effects (lines 1416-1434) cancel RAF and null out buffer refs. But:
1. `pendingTilesRef` is not committed before cleanup -- data loss
2. The `handleMouseUp` function is only registered on the canvas element, not on `window`. If the user's mouse is outside the canvas when they release, mouseup never fires. (Currently mitigated by `handleMouseLeave` calling `commitPan`, but for tile drag there's no equivalent.)
3. Scroll drag registers global listeners (lines 1404-1413) but tile drag does not

For the MDI case: `closeDocument` is called, MapCanvas unmounts, cleanup fires, but the useEffect cleanup runs AFTER the render that removed the component. Between the Zustand state change and cleanup, React attempts one final render with null map data.

**Consequences:**
- Uncommitted tile edits lost on window close during drag
- Console errors: "Cannot read property 'tiles' of null" on final render
- RAF callback fires after unmount: "Can't perform a React state update on an unmounted component" (suppressed in React 18 but still indicates a bug)

**Prevention:**

```typescript
// PATTERN: Commit pending tiles in cleanup
useEffect(() => {
  return () => {
    // Commit any pending drag tiles before unmount
    if (pendingTilesRef.current && pendingTilesRef.current.size > 0) {
      const tiles = Array.from(pendingTilesRef.current.entries()).map(([key, tile]) => ({
        x: key % MAP_WIDTH,
        y: Math.floor(key / MAP_WIDTH),
        tile
      }));
      setTiles(tiles);
      commitUndo('Edit tiles');
      pendingTilesRef.current = null;
    }
  };
}, []); // Empty deps -- runs on unmount only

// PATTERN: Register mouseup on window for tile drag (like scroll drag does)
useEffect(() => {
  if (!isDraggingTiles) return;
  const handleGlobalMouseUp = () => {
    commitPendingTiles();
  };
  window.addEventListener('mouseup', handleGlobalMouseUp);
  return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
}, [isDraggingTiles]);
```

**Detection:**
- Draw tiles, then close the document window (X button) while holding left mouse
- Draw tiles, then Ctrl+W (close) during drag
- Draw tiles, move mouse outside canvas to another window, release mouse

---

### Pitfall 6: Window Resize During Drag Invalidates Buffer and Coordinates

**What goes wrong:** ResizeObserver fires during drag, calling `drawMapLayerRef.current()` and `drawUiLayerRef.current()`. If drag state is in pendingTiles but not in Zustand, the buffer rebuild reads stale `map.tiles` and overwrites the buffer tiles that were imperatively patched. Additionally, setting `canvas.width` clears the canvas content (per HTML spec), so any imperative drawing is wiped.

**Why this is real in our codebase:**

Lines 1510-1550:
```typescript
const resizeObserver = new ResizeObserver(() => {
  rafId = requestAnimationFrame(() => {
    // This clears canvas content:
    c.width = width;   // <-- canvas goes blank
    c.height = height;
    // Then redraws from Zustand (missing pending tiles):
    drawMapLayerRef.current();  // <-- reads map.tiles, not pendingTiles
    drawUiLayerRef.current();
  });
});
```

Setting `canvas.width` or `canvas.height` to ANY value (even the same value) clears the canvas bitmap. This is per the HTML spec. So even `c.width = c.width` destroys content.

After the clear, `drawMapLayer` does a full rebuild from `map.tiles`. If pending tiles exist only in `pendingTilesRef`, they're not reflected in the rebuild.

**Consequences:**
- Tiles drawn during drag disappear on window resize
- Buffer shows pre-drag state until mouseup commits to Zustand
- Grid/UI overlay redraws correctly (reads from local state), but map layer is wrong

**Prevention:**

```typescript
// PATTERN: Apply pending tiles to buffer after resize rebuild
const resizeObserver = new ResizeObserver(() => {
  rafId = requestAnimationFrame(() => {
    c.width = width;
    c.height = height;
    drawMapLayerRef.current(); // Rebuilds from Zustand

    // Re-apply pending tiles to buffer
    if (pendingTilesRef.current && pendingTilesRef.current.size > 0) {
      reapplyPendingTilesToBuffer(); // Patch buffer with pending
    }

    drawUiLayerRef.current();
  });
});
```

Or simpler: skip canvas resize during active drag (defer it):
```typescript
if (isDragActiveRef.current) {
  pendingResizeRef.current = true;
  return; // Don't resize now, do it on mouseup
}
```

**Detection:**
- Start drawing tiles, then resize the Electron window by dragging its edge
- Start drawing tiles, then maximize/restore the window
- Snap window to half-screen while drawing

---

### Pitfall 7: Tool Switch During Active Drag

**What goes wrong:** User presses a keyboard shortcut (e.g., 'W' for wall tool) while in the middle of a pencil drag. The current tool changes from PENCIL to WALL, but the drag state (pendingTiles, isDragging flags) is still active from the pencil operation. Next mousemove now tries to execute wall logic with pencil's pending state.

**Why this is real in our codebase:**

Tool switching via keyboard (handled outside MapCanvas, likely in a toolbar or App component) calls `setTool()` on Zustand. This triggers a re-render of MapCanvas because `currentTool` is subscribed at line 144:
```typescript
const currentTool = useEditorStore(state => state.currentTool);
```

The re-render changes `currentTool` but does NOT clear `pendingTilesRef`, `isDrawingWallPencil`, `lineState.active`, or `selectionDrag.active`. The drag is still "in progress" from the old tool's perspective.

**Consequences:**
- Pencil pending tiles committed as "wall draws" or vice versa
- Wall pencil `isDrawingWallPencil` flag stays true even after switching to pencil tool
- Possible null/undefined access if new tool handler doesn't expect the old tool's state

**Prevention:**

```typescript
// PATTERN: Cancel active drag on tool change
useEffect(() => {
  // When tool changes, abort any in-progress drag
  if (pendingTilesRef.current && pendingTilesRef.current.size > 0) {
    commitPendingTiles(); // or discard, depending on UX preference
  }
  if (isDrawingWallPencil) {
    commitUndo('Draw walls');
    setIsDrawingWallPencil(false);
  }
  if (lineState.active) {
    setLineState({ active: false, startX: 0, startY: 0, endX: 0, endY: 0 });
  }
  if (selectionDrag.active) {
    setSelectionDrag({ active: false, startX: 0, startY: 0, endX: 0, endY: 0 });
  }
}, [currentTool]); // Fires when tool changes
```

**Detection:**
- Start pencil drag, press 'W' (wall tool), continue dragging, release
- Start wall line (click), press 'B' (pencil), click again -- does it crash?
- Start selection drag, press 'F' (fill), move mouse -- what happens?

---

### Pitfall 8: Undo/Redo During Active Drag

**What goes wrong:** User presses Ctrl+Z while actively drawing tiles. The undo system replaces `map.tiles` with a previous snapshot. But `pendingTilesRef` still holds the current drag's tiles. The buffer now shows a mix: some tiles from undo snapshot (via drawMapLayer re-render) and some tiles from pending (via immediatePatchTile). On mouseup, pending tiles are committed ON TOP of the undone state, creating a corrupted hybrid.

**Why this is real in our codebase:**

The undo flow (EditorState.ts line 292-298):
```typescript
undo: () => {
  get().undoForDocument(id);
  const doc = get().documents.get(id);
  if (doc) set({ map: doc.map, undoStack: doc.undoStack, redoStack: doc.redoStack });
},
```

This replaces `map` in Zustand, triggering React re-render, which triggers `drawMapLayer`. The new `map.tiles` is the undone state. But `prevTilesRef` was updated by `immediatePatchTile` to reflect pending tiles. The diff between new `map.tiles` and `prevTilesRef` shows "changes" that are actually the REVERSE of pending tiles -- so drawMapLayer "un-patches" the buffer.

Then on mouseup, pending tiles are committed. But the undo stack now has the wrong base snapshot.

**Consequences:**
- Visual state becomes inconsistent (mix of undone and pending tiles)
- Undo stack corruption: redo doesn't restore expected state
- Possible assertion failures in delta-based undo system (deltas don't add up)

**Prevention:**

**Option A (recommended): Block undo during drag**
```typescript
// In undo handler:
undo: () => {
  if (isDragActiveRef.current) return; // Ignore during active drag
  // ... existing undo logic
}
```

**Option B: Commit pending before undo**
```typescript
undo: () => {
  commitPendingTiles(); // Flush drag state to store
  // ... then undo
}
```

Option A is simpler and what most professional editors (Photoshop, GIMP) do -- undo is disabled/blocked during active brush strokes.

**Detection:**
- Draw tiles with pencil, press Ctrl+Z while still holding mouse button
- Draw tiles, release mouse (commit), Ctrl+Z, then immediately start drawing again

---

## Minor Pitfalls

These are performance issues or cosmetic bugs, not data corruption.

---

### Pitfall 9: getContext('2d') Called Repeatedly in Hot Paths

**What goes wrong:** Several hot paths call `canvas?.getContext('2d')` on every invocation: `immediateBlitToScreen` (line 233), the store subscription (line 769), animation tick (line 799). While the browser returns the same cached context, the null-check and property lookup add unnecessary overhead in a path that runs 60+ times per second.

**Why it matters in our codebase:**

The store subscription at line 769:
```typescript
const ctx = canvas?.getContext('2d');
if (canvas && ctx) {
  ctx.imageSmoothingEnabled = false; // Set every blit!
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(mapBufferRef.current, ...);
}
```

`imageSmoothingEnabled = false` is set every single blit. This is a state change on the context. While browsers optimize this if the value hasn't changed, it's still a property write in a hot loop.

**Prevention:**

Cache the context in a ref at setup time:
```typescript
const mapCtxRef = useRef<CanvasRenderingContext2D | null>(null);

// On canvas mount / resize:
mapCtxRef.current = mapLayerRef.current?.getContext('2d', { alpha: false }) ?? null;
if (mapCtxRef.current) {
  mapCtxRef.current.imageSmoothingEnabled = false;
}
```

Note the `{ alpha: false }` option -- per MDN, this tells the browser the canvas has no transparency, enabling rendering optimizations. Currently the codebase does not set this.

**Detection:**
- Profile in DevTools: look for getContext calls in flame chart during drag
- Marginal: 0.01-0.1ms per frame saved, but adds up at high refresh rates

---

### Pitfall 10: Memory Leak from Orphaned Event Listeners and RAF

**What goes wrong:** Multiple `useEffect` hooks register/unregister event listeners based on state flags (`rectDragState.active`, `lineState.active`, `selection.active`, etc.). If state transitions happen faster than React can process effects (rapid tool switching, double-click), listeners can stack up or be orphaned.

**Why this is real in our codebase:**

Lines 1446-1508 have FIVE separate useEffect hooks for Escape key handling, each with its own add/remove listener pair. If `rectDragState.active` changes from true to false and back to true within the same React batch, the cleanup from the first true-to-false runs AFTER the setup from the second false-to-true. This means two listeners are briefly registered.

Similarly, `scrollTimeoutRef` and `scrollIntervalRef` (lines 940-946) use `window.setTimeout` and `window.setInterval`. If scroll button is clicked rapidly, multiple intervals could stack.

**Prevention:**

The current cleanup code is already mostly correct (each useEffect returns a cleanup function). The main risk is:

1. **Consolidate Escape handlers into one useEffect:**
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    if (rectDragState.active) setRectDragState({ active: false, ... });
    if (lineState.active) setLineState({ active: false, ... });
    if (selectionDrag.active) setSelectionDrag({ active: false, ... });
    if (selection.active) clearSelection();
    if (isPasting) cancelPasting();
    // Also cancel tile drag:
    if (pendingTilesRef.current) discardPendingTiles();
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [rectDragState.active, lineState.active, selectionDrag.active,
    selection.active, isPasting]);
```

2. **Clear intervals before setting new ones:**
```typescript
if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);
scrollIntervalRef.current = window.setInterval(...);
```

**Detection:**
- Click scroll arrows rapidly (100+ clicks) -- does scrolling speed increase? (stacked intervals)
- Press Escape rapidly during selection -- any listeners leak?
- Monitor event listener count in DevTools Memory tab during extended use

---

### Pitfall 11: Animation Tick Fights with Imperative Buffer Patches

**What goes wrong:** The animation tick useEffect (lines 786-839) runs on every `animationFrame` change (every ~500ms based on the animation system). It patches animated tiles on the buffer and blits to screen. If a pencil drag is actively patching the same buffer region, the animation tick can overwrite a just-placed tile with the previous animation frame, or the pencil patch can overwrite the animation update.

**Why this is real in our codebase:**

The animation tick at line 819:
```typescript
bufCtx.clearRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
renderTile(bufCtx, tilesetImage, tile, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, animationFrame);
```

If the user just placed a non-animated tile at (x, y) via `immediatePatchTile`, the animation tick reads `map.tiles[y * MAP_WIDTH + x]` which (in the decoupled model) still shows the OLD animated tile. The tick re-renders the old animated tile, overwriting the user's placement.

Even with the `(tile & 0x8000) === 0` check (line 815), the problem occurs when the user is REPLACING an animated tile with a non-animated one. The pending change is "animated -> non-animated", but map.tiles still says "animated", so the animation tick still patches it.

**Consequences:**
- Placing tiles on animated areas causes visible flicker
- Tile appears, gets overwritten by animation, reappears on next immediatePatchTile
- Only affects tiles that were animated before the drag started

**Prevention:**

```typescript
// PATTERN: Skip animation patching for tiles in pendingTiles
for (let y = startY; y < endY; y++) {
  for (let x = startX; x < endX; x++) {
    const key = y * MAP_WIDTH + x;
    // Skip tiles being actively edited
    if (pendingTilesRef.current?.has(key)) continue;

    const tile = currentMap.tiles[key];
    if ((tile & 0x8000) === 0) continue;
    // ... patch animated tile
  }
}
```

**Detection:**
- Place a non-animated tile on top of an animated conveyor during drag
- The tile flickers between user's tile and the animation frame

---

## Electron-Specific Pitfalls

---

### Pitfall 12: GPU Process Crash Leaves Canvas Dead

**What goes wrong:** Chromium's GPU process can crash independently of the renderer process. When this happens, all canvas contexts become silently dead -- `getContext('2d')` returns an object, draw calls "succeed" without error, but nothing renders. The canvas stays blank. This is documented in Electron issue #17386.

**Why this matters for our architecture:**

The off-screen buffer (`mapBufferRef`) is a canvas element created via `document.createElement('canvas')`. If the GPU process crashes and recovers, the off-screen buffer's context may be dead. All subsequent `drawImage`, `clearRect`, and `renderTile` calls silently no-op. The on-screen canvases (mapLayerRef, uiLayerRef) may also be dead.

In Electron 28 (our version), this is rare but not impossible. Windows machines with older GPU drivers are most susceptible. Common triggers: laptop sleep/wake, GPU driver update, running out of GPU memory.

**Prevention:**

```typescript
// PATTERN: Detect dead canvas and force recovery
function isCanvasAlive(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  // Write a pixel and read it back
  ctx.fillStyle = '#ff0000';
  ctx.fillRect(0, 0, 1, 1);
  const pixel = ctx.getImageData(0, 0, 1, 1).data;
  ctx.clearRect(0, 0, 1, 1);
  return pixel[0] === 255; // Red channel should be 255
}

// Listen for GPU crash in main process:
// webContents.on('gpu-process-crashed', () => { ... });
// Send IPC to renderer to force canvas recreation
```

In practice, the simplest recovery is: detect blank canvas, destroy all canvas refs, force full remount of MapCanvas component. This is a rare enough event that brute-force recovery is acceptable.

**Detection:**
- Hard to reproduce intentionally
- Monitor for user reports of "blank map canvas after laptop sleep"
- Add periodic alive-check in development builds

---

### Pitfall 13: DevTools Performance Tab Distorts Canvas Timing

**What goes wrong:** Opening Chrome DevTools' Performance tab in Electron adds significant overhead to canvas operations. `drawImage` calls that take 0.1ms normally take 2-5ms with DevTools open. This makes performance profiling unreliable -- you optimize for profiled performance, not actual performance.

**Why this matters:**

When profiling the decoupled render system, timestamps in the Performance flame chart include DevTools overhead. A "slow blit" that appears to take 5ms may actually take 0.1ms in production. Optimizing this is wasted effort.

Additionally, DevTools forces synchronous layout calculations that wouldn't happen in production, making ResizeObserver callbacks appear slower than they are.

**Prevention:**
- Use `performance.now()` in-code timing, not DevTools flame chart timing, for canvas operations
- Profile with DevTools closed, using only in-code metrics:
```typescript
const t0 = performance.now();
ctx.drawImage(buffer, ...);
const t1 = performance.now();
if (t1 - t0 > 2) console.warn(`Slow blit: ${(t1 - t0).toFixed(1)}ms`);
```
- Use `--enable-precise-memory-info` flag for memory profiling
- Test final performance with DevTools completely closed

**Detection:**
- Compare in-code timing with DevTools open vs closed
- If blit timing is 10x worse with DevTools, the measurement is unreliable

---

## Performance Traps

| Trap | Symptom | Root Cause | Fix |
|------|---------|-----------|-----|
| Double blit per viewport change | 2x GPU work per scroll/zoom | store.subscribe + useEffect both blit | Route viewport blits through subscription only |
| Full 65K tile diff during drag | CPU spike on every mousemove | drawMapLayer diffs entire map.tiles | Scope diff to buffer bounds, skip during drag |
| canvas.width assignment clears content | Flash of blank canvas on resize | HTML spec: width/height setter clears bitmap | Only set if actually changed: `if (c.width !== w) c.width = w` |
| save()/restore() in tight loops | Measurable overhead at 1000+ calls/frame | Context state stack push/pop | Minimize state changes, batch by style |
| New Map() on every pendingTiles update | GC pressure during fast drag | Creating new Map for each tile | Reuse single Map, clear on commit |

---

## Edge Case Matrix

| Edge Case | During Pencil Drag | During Pan Drag | During Wall Line |
|-----------|-------------------|-----------------|------------------|
| **Ctrl+Z** | Block or commit first | N/A (no state change) | Cancel line |
| **Tool switch (keyboard)** | Commit pending, switch tool | Cancel pan, switch tool | Cancel line, switch tool |
| **Window resize** | Rebuild buffer, reapply pending | Commit pan at current position | Rebuild buffer, keep line state |
| **Component unmount** | Commit pending to store | Commit pan viewport | Discard line (no tiles changed) |
| **Tab switch (MDI)** | Commit pending to store | Commit pan | Cancel line |
| **Escape key** | Discard pending, revert buffer | Cancel pan | Cancel line |
| **Animation tick** | Skip pending tile regions | Normal (buffer still valid) | Normal |
| **Scroll wheel (zoom)** | Commit pending, rebuild buffer at new zoom | N/A (pan blocks zoom) | Keep line, rerender preview |

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Severity | Mitigation |
|-------------|---------------|----------|------------|
| Decouple pencil drag from React | Pitfalls 1, 2, 11 (two sources of truth, React overwrite, animation fight) | CRITICAL | Implement overlay read, drag guard in drawMapLayer, skip animation for pending tiles |
| Decouple wall pencil from React | Pitfall 7 (wall auto-connect reads neighbors from stale map.tiles) | HIGH | Wall system must read through overlay function that checks pendingTiles |
| Batch commit on mouseup | Pitfall 5 (unmount data loss) | HIGH | Global mouseup listener + unmount cleanup commits pending |
| Buffer zone + drag | Pitfall 6 (resize during drag) | MEDIUM | Defer resize during active drag, or reapply pending after rebuild |
| Undo integration | Pitfall 8 (undo during drag) | HIGH | Block undo during active drag |
| Store subscription optimization | Pitfall 4 (double blit) | MEDIUM | Route viewport blits through subscription only, remove from useEffect |

---

## Sources

### Verified (HIGH confidence)
- [MDN: HTMLCanvasElement.getContext()](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext) -- context caching, alpha option
- [MDN: Optimizing Canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas) -- save/restore cost, off-screen buffers
- [Zustand: Prevent rerenders with useShallow](https://zustand.docs.pmnd.rs/guides/prevent-rerenders-with-use-shallow) -- subscription vs useStore patterns
- [Zustand Transient Updates](https://awesomedevin.github.io/zustand-vue/en/docs/advanced/transiend-updates) -- subscribe for bypassing React render
- [Electron Issue #17386: Canvases blank after GPU crash](https://github.com/electron/electron/issues/17386) -- GPU process crash recovery

### Community Verified (MEDIUM confidence)
- [Josh Comeau: Why React Re-Renders](https://www.joshwcomeau.com/react/why-react-re-renders/) -- render trigger mechanics
- [CSS-Tricks: Using requestAnimationFrame with React Hooks](https://css-tricks.com/using-requestanimationframe-with-react-hooks/) -- RAF cleanup patterns
- [Jakub Arnold: RAF and useEffect vs useLayoutEffect](https://blog.jakuba.net/request-animation-frame-and-use-effect-vs-use-layout-effect/) -- useEffect cleanup timing
- [Ali Karaki: Building Canvas Editors in React (Konva)](https://www.alikaraki.me/blog/canvas-editors-konva) -- sync state on drag end, not during drag
- [Canvas Performance Best Practices (GitHub Gist)](https://gist.github.com/jaredwilli/5469626) -- save/restore cost, batching
- [Mark Erikson: Complete Guide to React Rendering Behavior](https://blog.isquaredsoftware.com/2020/05/blogged-answers-a-mostly-complete-guide-to-react-rendering-behavior/) -- when React re-renders
- [DhiWise: React Stale Closure Issues](https://www.dhiwise.com/post/react-stale-closure-common-problems-and-easy-solutions) -- useRef pattern for stale closures
- [TkDodo: Working with Zustand](https://tkdodo.eu/blog/working-with-zustand) -- selector patterns, avoiding over-subscription

### Codebase Analysis (HIGH confidence)
- `MapCanvas.tsx` full analysis (1628 lines) -- all line references verified against current code
- `EditorState.ts` (453 lines) -- backward-compat wrapper flow traced
- `documentsSlice.ts` (200+ lines) -- setTileForDocument mutation pattern analyzed
- `globalSlice.ts` (197 lines) -- animationFrame, tool switching mechanics
- `types.ts` (127 lines) -- DocumentState shape, Viewport type

---

*Researched: 2026-02-12*
*Focus: Decoupling canvas rendering from React render cycle during drag operations*
*Applicable to: v2.8 Canvas Engine milestone*
