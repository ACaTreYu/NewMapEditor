# Architecture Research: Decoupled Canvas Engine Integration

**Domain:** Canvas rendering decoupled from React/Zustand for tile map editor
**Researched:** 2026-02-12
**Overall confidence:** HIGH (based on direct codebase analysis + established Zustand patterns)

---

## 1. Current Architecture Analysis

### The Problem Chain

The current MapCanvas.tsx (~1630 lines) has this rendering chain for pencil drag:

```
User drags pencil
  -> handleToolAction(x, y)
    -> setTile(x, y, tile)           // Zustand store mutation
      -> set({ map: doc.map })       // React state update
        -> useShallow selector fires  // React re-render scheduled
          -> drawMapLayer useCallback recreated (map in deps)
            -> useEffect fires        // drawMapLayer effect
              -> diffing 65,536 tiles // O(n) scan
                -> patch + blit       // actual canvas work
```

This chain has 6+ hops between "user painted a tile" and "pixel appears on screen."
The existing `immediatePatchTile()` function (line 247) already bypasses this for single-tile
pencil strokes, but it is a workaround bolted onto the side, not a clean architecture.

### What Already Works Well

1. **Off-screen buffer pattern** -- 4096x4096 buffer pre-renders full map at native resolution,
   viewport changes are a single `drawImage` blit. This is sound and should be preserved.

2. **Immediate patch bypass** -- `immediatePatchTile()` directly updates the buffer and blits,
   then updates `prevTilesRef` so the React-triggered drawMapLayer finds nothing changed.
   This proves the concept works.

3. **Direct store subscription** -- Line 754-782 already subscribes to viewport changes outside
   React's render cycle for instant blit on pan. This is the exact pattern to expand.

4. **Ref-based cursor tracking** -- `cursorTileRef` (line 87) avoids re-renders during drag.
   The approach is correct but underutilized.

### What Needs to Change

| Current | Problem | Target |
|---------|---------|--------|
| `drawMapLayer` is a `useCallback` | Recreated when deps change, causes useEffect re-fires | Stable method on CanvasEngine class |
| `drawUiLayer` is a `useCallback` | Same; 20+ deps in dependency array | Stable method on CanvasEngine class |
| Tile mutations go through Zustand during drag | Each setTile() triggers React reconciliation | Local buffer during drag, batch commit on mouseup |
| Buffer management via `useRef` scattered across component | 8 separate refs for buffer state | Encapsulated in CanvasEngine instance |
| Tool logic embedded in mouse handlers | 300+ lines of tool-specific code in component | Tool handlers read/write engine directly |

---

## 2. Recommended Architecture: CanvasEngine Class

### Design Principle

**React owns layout and lifecycle. CanvasEngine owns pixels.**

React responsibilities:
- Mount/unmount canvases (DOM lifecycle)
- Provide container sizing via ResizeObserver
- Render scrollbars and other DOM overlays
- Route mouse events to the engine

CanvasEngine responsibilities:
- Own the off-screen buffer (4096x4096)
- Own the map layer canvas context and UI layer canvas context
- Subscribe directly to Zustand for state-driven redraws
- Maintain local tile buffer during drags
- Handle all `drawImage`, tile patching, grid rendering, overlays

### Class Structure

```typescript
// src/core/canvas/CanvasEngine.ts

import { useEditorStore } from '@core/editor';

export class CanvasEngine {
  // Canvas references (set by React component via attach())
  private mapCanvas: HTMLCanvasElement | null = null;
  private uiCanvas: HTMLCanvasElement | null = null;
  private mapCtx: CanvasRenderingContext2D | null = null;
  private uiCtx: CanvasRenderingContext2D | null = null;

  // Off-screen buffer (stable, not recreated)
  private buffer: HTMLCanvasElement;
  private bufferCtx: CanvasRenderingContext2D;
  private prevTiles: Uint16Array | null = null;
  private prevTileset: HTMLImageElement | null = null;

  // Local drag state (NOT in Zustand during drag)
  private pendingTiles: Map<number, number> | null = null; // key: y*256+x, value: tile
  private isDragActive = false;

  // Animation
  private lastAnimFrame = -1;

  // Grid pattern cache
  private gridPattern: CanvasPattern | null = null;
  private gridPatternZoom = -1;

  // Last blit viewport (skip redundant blits)
  private lastBlitVp: { x: number; y: number; zoom: number } | null = null;

  // Zustand unsubscribers
  private unsubscribers: Array<() => void> = [];

  // Document context
  private documentId: string | null = null;
  private tilesetImage: HTMLImageElement | null = null;

  constructor() {
    this.buffer = document.createElement('canvas');
    this.buffer.width = 256 * 16;  // MAP_WIDTH * TILE_SIZE = 4096
    this.buffer.height = 256 * 16; // MAP_HEIGHT * TILE_SIZE = 4096
    this.bufferCtx = this.buffer.getContext('2d')!;
    this.bufferCtx.imageSmoothingEnabled = false;
  }

  // --- Lifecycle ---

  attach(mapCanvas: HTMLCanvasElement, uiCanvas: HTMLCanvasElement, documentId?: string): void {
    this.mapCanvas = mapCanvas;
    this.uiCanvas = uiCanvas;
    this.mapCtx = mapCanvas.getContext('2d');
    this.uiCtx = uiCanvas.getContext('2d');
    this.documentId = documentId ?? null;
    this.setupSubscriptions();
  }

  detach(): void {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
    this.mapCanvas = null;
    this.uiCanvas = null;
    this.mapCtx = null;
    this.uiCtx = null;
    this.prevTiles = null;
    this.prevTileset = null;
  }

  setTilesetImage(img: HTMLImageElement | null): void {
    this.tilesetImage = img;
    if (img !== this.prevTileset) {
      this.fullBufferRebuild();
    }
  }

  resize(width: number, height: number): void {
    if (this.mapCanvas) {
      this.mapCanvas.width = width;
      this.mapCanvas.height = height;
    }
    if (this.uiCanvas) {
      this.uiCanvas.width = width;
      this.uiCanvas.height = height;
    }
    this.gridPatternZoom = -1; // invalidate
    this.drawMapLayer();
    this.drawUiLayer();
  }

  // --- Zustand Subscriptions (fire outside React render cycle) ---

  private setupSubscriptions(): void {
    const store = useEditorStore;

    // 1. Viewport changes -> immediate blit (no React)
    this.unsubscribers.push(
      store.subscribe((state, prevState) => {
        const vp = this.getViewport(state);
        const prevVp = this.getViewport(prevState);
        if (vp !== prevVp) {
          this.blitToScreen(vp);
          this.drawUiLayer(vp);
        }
      })
    );

    // 2. Map tile changes -> incremental patch (only when NOT dragging)
    this.unsubscribers.push(
      store.subscribe((state, prevState) => {
        if (this.isDragActive) return; // engine owns rendering during drag
        const map = this.getMap(state);
        const prevMap = this.getMap(prevState);
        if (map !== prevMap && map) {
          this.incrementalPatch(map.tiles);
          const vp = this.getViewport(state);
          this.blitToScreen(vp);
        }
      })
    );

    // 3. Animation frame -> patch animated tiles in visible area
    this.unsubscribers.push(
      store.subscribe((state, prevState) => {
        if (state.animationFrame !== prevState.animationFrame) {
          this.onAnimationTick(state.animationFrame);
        }
      })
    );

    // 4. UI state changes -> redraw UI layer only
    this.unsubscribers.push(
      store.subscribe((state, prevState) => {
        // Check relevant UI state changes
        if (state.showGrid !== prevState.showGrid ||
            state.currentTool !== prevState.currentTool ||
            state.rectDragState !== prevState.rectDragState ||
            state.selection !== prevState.selection) {
          this.drawUiLayer();
        }
      })
    );
  }

  // --- Helper: read from correct document ---

  private getViewport(state: any) {
    if (this.documentId) {
      return state.documents.get(this.documentId)?.viewport ?? { x: 0, y: 0, zoom: 1 };
    }
    return state.viewport;
  }

  private getMap(state: any) {
    if (this.documentId) {
      return state.documents.get(this.documentId)?.map ?? null;
    }
    return state.map;
  }

  // --- Rendering (stable methods, never recreated) ---

  drawMapLayer(overrideVp?: { x: number; y: number; zoom: number }): void {
    // ... same logic as current drawMapLayer, but as stable class method
  }

  drawUiLayer(overrideVp?: { x: number; y: number; zoom: number }): void {
    // ... same logic as current drawUiLayer, but as stable class method
  }

  private blitToScreen(vp: { x: number; y: number; zoom: number }): void {
    // ... same as current immediateBlitToScreen
  }

  private fullBufferRebuild(): void {
    // ... same as current needsFullBuild branch in drawMapLayer
  }

  private incrementalPatch(tiles: Uint16Array): void {
    // ... same as current incremental diff/patch logic
  }

  private onAnimationTick(frame: number): void {
    // ... same as current animation useEffect logic
  }

  // --- Drag-Local Tile Operations ---

  /** Called on mousedown: snapshot tiles for undo, begin local accumulation */
  beginDrag(): void {
    this.isDragActive = true;
    this.pendingTiles = new Map();
    // pushUndo is still called on Zustand (undo needs the snapshot)
    useEditorStore.getState().pushUndo();
  }

  /** Called during drag: update buffer + blit immediately, accumulate locally */
  paintTile(x: number, y: number, tile: number): void {
    if (!this.pendingTiles) return;
    const key = y * 256 + x; // MAP_WIDTH = 256
    this.pendingTiles.set(key, tile);

    // Immediate visual: patch buffer + blit
    this.patchBufferTile(x, y, tile);
    const vp = this.getViewport(useEditorStore.getState());
    this.blitToScreen(vp);
  }

  /** Called on mouseup: batch-commit accumulated tiles to Zustand */
  commitDrag(description: string): void {
    if (!this.pendingTiles || this.pendingTiles.size === 0) {
      this.isDragActive = false;
      this.pendingTiles = null;
      return;
    }

    // Convert pending map to array for setTiles()
    const tiles: Array<{ x: number; y: number; tile: number }> = [];
    for (const [key, tile] of this.pendingTiles) {
      tiles.push({
        x: key % 256,
        y: Math.floor(key / 256),
        tile
      });
    }

    // Single Zustand mutation with all accumulated changes
    const store = useEditorStore.getState();
    store.setTiles(tiles);
    store.commitUndo(description);

    this.isDragActive = false;
    this.pendingTiles = null;
  }

  /** Called on mouseup/mouseleave: cancel drag without committing */
  cancelDrag(): void {
    // Restore buffer from Zustand state (discard local changes)
    if (this.pendingTiles && this.pendingTiles.size > 0) {
      const state = useEditorStore.getState();
      const map = this.getMap(state);
      if (map) {
        for (const [key] of this.pendingTiles) {
          const x = key % 256;
          const y = Math.floor(key / 256);
          const originalTile = map.tiles[key];
          this.patchBufferTile(x, y, originalTile);
        }
        const vp = this.getViewport(state);
        this.blitToScreen(vp);
      }
    }
    this.isDragActive = false;
    this.pendingTiles = null;
  }

  private patchBufferTile(x: number, y: number, tile: number): void {
    // Same as immediatePatchTile but without React deps
    const TILE_SIZE = 16;
    this.bufferCtx.clearRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    this.renderTile(this.bufferCtx, tile, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE);
    if (this.prevTiles) {
      this.prevTiles[y * 256 + x] = tile;
    }
  }

  private renderTile(ctx: CanvasRenderingContext2D, tile: number,
                     destX: number, destY: number, destSize: number): void {
    // Same as current renderTile function, using this.tilesetImage
  }
}
```

### Confidence: HIGH

This pattern is directly validated by:
- The existing `immediateBlitToScreen` / `immediatePatchTile` in MapCanvas.tsx proving the bypass works
- The existing direct `useEditorStore.subscribe()` at line 754 proving Zustand subscriptions work outside React
- Zustand's documented support for `subscribe()`, `getState()`, `setState()` outside components

---

## 3. CanvasEngine <-> Zustand Communication

### Recommended: Direct Subscribe + getState()

The CanvasEngine should subscribe directly to the Zustand store, NOT use an event bus or
custom pub/sub. Rationale:

1. **Already proven** -- The codebase already uses `useEditorStore.subscribe()` at line 754 for
   viewport changes. This is the exact same pattern, expanded.

2. **No new abstractions** -- An event bus would add a parallel communication channel alongside
   Zustand, creating two sources of truth. Direct subscription keeps Zustand as the single
   source of truth.

3. **Granular subscriptions** -- Zustand's `subscribe(callback)` fires on every state change
   and provides both `state` and `prevState`. The CanvasEngine can check which fields changed
   and only act on relevant changes. For more granular control, `subscribeWithSelector`
   middleware could be added, but the basic `subscribe` is sufficient since the engine already
   needs to check multiple fields.

### Communication Flow

```
                    Zustand Store
                   /      |      \
                  /       |       \
       subscribe()   subscribe()   useEditorStore()
            |            |              |
      CanvasEngine  CanvasEngine   React Components
      (map tiles)   (viewport)    (toolbar, panels)
            |
       getState()
    (read on demand)
```

**Writes from CanvasEngine to Zustand:**
- `beginDrag()` calls `getState().pushUndo()`
- `commitDrag()` calls `getState().setTiles()` + `getState().commitUndo()`
- Viewport updates during pan: `getState().setViewport()`

**Reads from Zustand by CanvasEngine:**
- `getState()` for current map tiles, viewport, tool state (on demand)
- `subscribe()` for reactive updates when not dragging

### subscribeWithSelector Consideration

The `subscribeWithSelector` middleware provides: `subscribe(selector, callback, { equalityFn?, fireImmediately? })`

This is useful for fine-grained subscriptions like:
```typescript
store.subscribe(
  (state) => state.animationFrame,
  (frame, prevFrame) => this.onAnimationTick(frame)
);
```

**Recommendation:** Add `subscribeWithSelector` middleware to the store. It is non-breaking --
existing `subscribe(callback)` calls continue to work, and the new form with selector becomes
available. This gives the CanvasEngine precise, efficient subscriptions.

**Confidence: HIGH** -- `subscribeWithSelector` is a first-party Zustand middleware documented
at https://zustand.docs.pmnd.rs/middlewares/subscribe-with-selector

---

## 4. React Owns Layout, Engine Owns Pixels

### The Boundary

```
React Component (MapCanvas.tsx)              CanvasEngine
-------------------------------------------  --------------------------------
- containerRef (div)                         - mapCanvas context
- ResizeObserver -> engine.resize()          - uiCanvas context
- Mouse events -> engine.onMouseDown() etc.  - off-screen buffer
- Scroll bar DOM + state                     - all drawImage calls
- Mount: engine.attach(canvas1, canvas2)     - tile rendering
- Unmount: engine.detach()                   - grid pattern
- Passes tilesetImage prop                   - cursor/overlay rendering
                                             - local drag state
```

### React Component After Refactor (Conceptual)

```typescript
export const MapCanvas: React.FC<Props> = ({ tilesetImage, documentId }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapLayerRef = useRef<HTMLCanvasElement>(null);
  const uiLayerRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CanvasEngine | null>(null);

  // Create engine once, attach to canvases
  useEffect(() => {
    if (!mapLayerRef.current || !uiLayerRef.current) return;
    const engine = new CanvasEngine();
    engine.attach(mapLayerRef.current, uiLayerRef.current, documentId);
    engineRef.current = engine;
    return () => {
      engine.detach();
      engineRef.current = null;
    };
  }, [documentId]);

  // Pass tileset image to engine
  useEffect(() => {
    engineRef.current?.setTilesetImage(tilesetImage);
  }, [tilesetImage]);

  // ResizeObserver -> engine.resize()
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        engineRef.current?.resize(w, h);
      });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Mouse handlers delegate to engine
  const handleMouseDown = (e: React.MouseEvent) => {
    engineRef.current?.onMouseDown(e);
  };

  // Scroll bars still in React (DOM elements, not canvas)
  // ... scrollMetrics, thumb rendering, arrow buttons ...

  return (
    <div className="map-window-frame">
      <div ref={containerRef} className="map-canvas-container">
        <canvas ref={mapLayerRef} className="map-canvas-layer no-events" />
        <canvas ref={uiLayerRef} className="map-canvas-layer map-canvas"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
          onContextMenu={(e) => e.preventDefault()}
        />
        {/* Scrollbars remain as React DOM */}
      </div>
    </div>
  );
};
```

### What Stays in React

1. **Scrollbar DOM elements** -- These are HTML divs/buttons, not canvas-rendered. They read
   viewport state from Zustand via `useEditorStore` hooks as they do today.

2. **Cursor style** -- The `panning` CSS class on the canvas. This is a DOM attribute managed
   by React state (or the engine can set it directly via `this.uiCanvas.style.cursor`).

3. **Component lifecycle** -- Mount, unmount, documentId changes trigger engine attach/detach.

4. **Tileset image loading** -- The image is loaded elsewhere and passed as prop. The engine
   receives it via `setTilesetImage()`.

### What Moves to the Engine

1. **All `drawImage` / canvas rendering** -- Map layer, UI layer, grid, overlays
2. **Buffer management** -- Off-screen buffer, prevTiles tracking, animation patching
3. **Mouse coordinate conversion** -- `screenToTile`, `tileToScreen`
4. **Pan viewport calculation** -- CSS transform + progressive render + commit
5. **Local drag tile accumulation** -- `pendingTiles` map

**Confidence: HIGH** -- This boundary is natural: DOM = React, Canvas 2D API = Engine

---

## 5. Local Drag Buffer + Undo/Redo Integration

### Current Undo/Redo Flow

```
mousedown:  pushUndo()  -> snapshots current tiles as pendingUndoSnapshot
during drag: setTile() multiple times -> mutates tiles in Zustand
mouseup:    commitUndo() -> diffs pendingUndoSnapshot vs current tiles -> creates TileDelta[]
```

### Problem

During drag, every `setTile()` call triggers Zustand state update + React re-render. For a
pencil dragging across 50 tiles, that is 50 Zustand mutations, 50 React re-renders, 50
useCallback recreations, and 50 useEffect fires.

### Solution: Engine-Local Tile Buffer

```
mousedown:  engine.beginDrag()
              -> calls store.pushUndo() (snapshot BEFORE any changes)
              -> sets isDragActive = true
              -> creates pendingTiles = new Map()

during drag: engine.paintTile(x, y, tile)
              -> pendingTiles.set(y*256+x, tile)  (local only)
              -> patchBufferTile(x, y, tile)      (immediate visual)
              -> blitToScreen(viewport)            (user sees it instantly)
              // NO Zustand mutation, NO React re-render

mouseup:    engine.commitDrag('Edit tiles')
              -> store.setTiles(allPendingTiles)  (single Zustand mutation)
              -> store.commitUndo('Edit tiles')   (creates TileDelta[] from snapshot)
              -> isDragActive = false
```

### Why This Preserves Undo/Redo Perfectly

The undo system works on **snapshots and deltas**, not on individual tile mutations:

1. `pushUndo()` saves `new Uint16Array(doc.map.tiles)` as `pendingUndoSnapshot`
2. `commitUndo()` diffs `pendingUndoSnapshot` against current `doc.map.tiles`
3. The diff produces `TileDelta[]` entries

This means the undo system **does not care** how many intermediate mutations happened. It only
sees the before-snapshot and the after-state. Whether we call `setTile()` 50 times during drag
or `setTiles()` once at the end, the delta diff is identical.

**Key invariant:** `pushUndo()` must be called BEFORE any tile changes (captures "before" state).
`commitUndo()` must be called AFTER all tile changes are in the store (captures "after" state).
The engine respects this by calling `pushUndo()` in `beginDrag()` and `setTiles()` + `commitUndo()`
in `commitDrag()`.

### Edge Cases

**Escape cancellation during drag:**
- `cancelDrag()` restores the buffer from Zustand state (which still has the pre-drag tiles)
- `pendingUndoSnapshot` is discarded (set to null without creating a delta)
- Store adds a method: `discardPendingUndo()` that clears `pendingUndoSnapshot` without creating an entry

**Mouse leaves canvas during drag:**
- Same as current behavior: commit the pending changes
- `commitDrag()` handles this cleanly

**Multi-tile stamp (pencil with tileSelection width > 1):**
- `paintTile()` is called for each tile in the stamp
- All tiles accumulate in `pendingTiles`
- `commitDrag()` sends them all in one `setTiles()` call

**Wall pencil tool:**
- More complex: `placeWall()` modifies neighbors (auto-connection)
- Option A: Use existing `placeWall()` on Zustand during drag (acceptable if wall placement is fast)
- Option B: Move wall auto-connection logic into engine (better performance, more work)
- **Recommendation:** Option A for initial implementation. Wall painting is much less frequent
  than pencil drag and the neighbor update logic in WallSystem is not trivially extractable.

**Confidence: HIGH** -- The undo system's snapshot-diff design is proven by the existing code
and naturally accommodates batch commits.

---

## 6. Tool Logic: Engine vs React State

### Classification of Tools

| Tool | During Drag | Needs Engine? | Notes |
|------|-------------|---------------|-------|
| Pencil | Paint tiles continuously | YES - high frequency | Primary beneficiary of local buffer |
| Wall Pencil | Place walls continuously | PARTIAL - use Zustand during drag | Wall auto-connection needs store access |
| Wall Line | Preview line, commit on mouseup | NO - preview is UI layer | Uses getLineTiles() for preview overlay |
| Line | Preview line, commit on mouseup | NO - preview is UI layer | Same as wall line |
| Fill | Instant (no drag) | NO | Single pushUndo/fillArea/commitUndo |
| Select | Drag rectangle (no tile changes) | NO | Selection is UI overlay state |
| Paste | Click to commit | NO | Single commit operation |
| Picker | Click to sample | NO | Reads map state, no drag |
| Game Objects | Click or drag rect | NO | Single commit operations |

### Engine's Role in Tool Logic

The engine should NOT contain tool selection logic or know about tool types. Instead:

```typescript
// In the React mouse handler (simplified):
const handleMouseDown = (e: React.MouseEvent) => {
  const engine = engineRef.current;
  if (!engine) return;

  const { x, y } = engine.screenToTile(e.clientX - rect.left, e.clientY - rect.top);

  if (isPanClick(e)) {
    engine.beginPan(e.clientX, e.clientY);
  } else if (currentTool === ToolType.PENCIL) {
    engine.beginDrag();
    engine.paintTile(x, y, selectedTile);
  } else if (currentTool === ToolType.FILL) {
    store.pushUndo();
    store.fillArea(x, y);
    store.commitUndo('Fill area');
  }
  // ... etc
};
```

The React component retains tool-routing logic because:
1. Tool state (`currentTool`) is in Zustand GlobalSlice (read by toolbar, shortcuts, etc.)
2. Different tools have fundamentally different interaction models (drag vs click vs rect)
3. Tool-specific UI (line preview, rect preview) is drawn by the engine's `drawUiLayer` but
   driven by state the component passes to the engine

### What the Engine Exposes for Tools

```typescript
class CanvasEngine {
  // Coordinate conversion
  screenToTile(screenX: number, screenY: number): { x: number; y: number };
  tileToScreen(tileX: number, tileY: number): { x: number; y: number };

  // Drag operations (pencil, wall pencil)
  beginDrag(): void;
  paintTile(x: number, y: number, tile: number): void;
  paintTiles(tiles: Array<{ x: number; y: number; tile: number }>): void;
  commitDrag(description: string): void;
  cancelDrag(): void;

  // Pan operations
  beginPan(clientX: number, clientY: number): void;
  updatePan(clientX: number, clientY: number): void;
  commitPan(clientX: number, clientY: number): void;

  // UI overlay state (for tool previews)
  setCursorTile(x: number, y: number): void;
  setLinePreview(start: {x,y} | null, end: {x,y} | null): void;
  setRectPreview(start: {x,y} | null, end: {x,y} | null): void;
  setSelectionPreview(sel: Selection | null): void;

  // Rendering (called by subscriptions, not by React)
  drawMapLayer(overrideVp?: Viewport): void;
  drawUiLayer(overrideVp?: Viewport): void;
}
```

**Confidence: HIGH** -- This keeps tool logic in the component (where it has access to all Zustand
state for tool-specific behavior) while giving the engine only generic rendering primitives.

---

## 7. Migration Path: Incremental, Not Big-Bang

### Why Incremental Works

The existing MapCanvas.tsx is well-structured with clear functional boundaries:
- `drawMapLayer` / `drawUiLayer` are self-contained rendering functions
- `immediatePatchTile` / `immediateBlitToScreen` are already engine-like methods
- Mouse handlers are clearly separated (handleMouseDown/Move/Up/Leave)

Each boundary can be migrated independently because the engine subscribes to the same
Zustand store that React uses. During migration, both the old React path and the new engine
path can coexist -- the engine's subscriptions simply supersede the React useEffects.

### Migration Phases

#### Phase 1: Extract CanvasEngine Class (Buffer Management)

**Move:** Buffer creation, `renderTile()`, `fullBufferRebuild()`, `incrementalPatch()`,
`blitToScreen()` into `CanvasEngine`.

**Keep in React:** All mouse handlers, `drawUiLayer`, tool logic, scroll bars.

**Integration point:** React component creates engine in `useEffect`, calls `engine.attach()`.
The old `drawMapLayer` useCallback is replaced by `engine.drawMapLayer()` called from the
same useEffect triggers.

**Risk:** LOW -- This is a mechanical extraction with no behavioral change.

```typescript
// Phase 1: React component still drives rendering, but via engine
useEffect(() => {
  engineRef.current?.drawMapLayer();
}, [map, viewport, tilesetImage]); // same deps as before
```

#### Phase 2: Engine Subscribes to Zustand (Viewport + Map)

**Move:** The existing direct subscription (line 754-782) into the engine. Add map tile
subscription. Remove the React `useEffect` triggers for `drawMapLayer`.

**Keep in React:** `drawUiLayer`, mouse handlers, tool logic.

**Integration point:** Engine now self-renders when Zustand state changes. React `useEffect`
for map rendering is removed. The engine's `isDragActive` flag prevents re-rendering during
drag (since the engine handles it directly).

**Risk:** LOW-MEDIUM -- Need to verify that removing the React useEffect doesn't break any
edge case where React-triggered rendering was needed.

#### Phase 3: Local Drag Buffer

**Move:** `pendingTilesRef` logic from React into engine's `beginDrag()`/`paintTile()`/`commitDrag()`.
Modify pencil mousedown/mousemove/mouseup to use engine drag API.

**Keep in React:** Non-drag tools (fill, picker, game objects), UI overlay rendering.

**Risk:** MEDIUM -- This changes the undo/redo integration. Need to verify that `pushUndo()`
before drag and `commitUndo()` after `setTiles()` produces identical deltas to the current
incremental `setTile()` approach.

#### Phase 4: UI Layer Migration

**Move:** `drawUiLayer` into engine. Grid rendering, cursor highlight, line preview,
rect preview, selection rectangle, paste preview.

**Keep in React:** Tool state routing (which overlay to show), scroll bar DOM.

**Risk:** LOW -- `drawUiLayer` is already a pure rendering function that reads state. Moving it
into the engine just changes where it lives, not what it does.

#### Phase 5: Pan Migration

**Move:** CSS transform pan logic, progressive render, `commitPan()` into engine.

**Keep in React:** `isDragging` state for cursor style (or engine sets cursor directly).

**Risk:** LOW -- Pan is self-contained.

#### Phase 6: Scroll Bar Simplification (Optional)

**Move:** Scroll metric calculation, scroll-by-tiles into engine (or keep in React).

**Keep in React:** Scroll bar DOM elements, click handlers.

**Risk:** LOW -- Scroll bars are purely DOM, optional to move.

### Migration Validation at Each Phase

After each phase, the following must still work:
- [ ] Pencil draw (single tile + multi-tile stamp)
- [ ] Pencil drag (continuous painting)
- [ ] Undo/redo after pencil drag
- [ ] Wall line tool (preview + commit)
- [ ] Fill tool
- [ ] Pan (right-click drag)
- [ ] Zoom (mouse wheel to cursor)
- [ ] Selection tool
- [ ] Paste preview + commit
- [ ] Animation tick
- [ ] Resize (window/MDI child resize)
- [ ] Document switching (MDI)

**Confidence: HIGH** -- Each phase has a clear boundary, low coupling to the next, and can be
validated independently.

---

## 8. Multi-Document Considerations

The current architecture supports multiple documents via `documentId` prop on MapCanvas.
Each ChildWindow renders a MapCanvas with its own `documentId`.

### Engine Instance Per Document

Each MapCanvas instance should create its own CanvasEngine instance. The engine stores its
`documentId` and reads from the correct document in the Zustand store:

```typescript
// In CanvasEngine
private getMap(state: EditorState) {
  if (this.documentId) {
    return state.documents.get(this.documentId)?.map ?? null;
  }
  return state.map;
}
```

This mirrors the existing pattern at line 758 in MapCanvas.tsx.

### Buffer Memory

Each engine instance has its own 4096x4096 buffer. With 8 max documents, that is 8 * 4096 * 4096 * 4 bytes = 512 MB of buffer memory at worst. This is the same as the current architecture (each MapCanvas already creates its own buffer via `mapBufferRef`).

If memory becomes a concern, a future optimization could share a buffer pool or only maintain
buffers for visible/active documents. But this is not needed for v2.8.

---

## 9. File Structure

```
src/core/canvas/
  CanvasEngine.ts       # Main engine class
  TileRenderer.ts       # renderTile() function (extracted from MapCanvas.tsx)
  BufferManager.ts      # Off-screen buffer management (optional split)
  GridRenderer.ts       # Grid pattern rendering (optional split)
  UiOverlayRenderer.ts  # Cursor, selection, line preview, paste preview (optional split)
  index.ts              # Public exports
```

**Recommendation:** Start with a single `CanvasEngine.ts` file. Only split into sub-modules
if the class exceeds ~500 lines. The current rendering code is ~400 lines total (drawMapLayer
+ drawUiLayer + renderTile + helpers), so a single file is manageable.

The `src/core/canvas/` location follows the existing `src/core/` convention for portable
logic that does not depend on React.

---

## 10. Key Risks and Mitigations

### Risk 1: Stale State in Engine Subscriptions

**What:** Engine reads `getState()` in a subscription callback and gets stale state because
another subscription hasn't fired yet.

**Mitigation:** Zustand's `subscribe` fires synchronously after `setState`. Within a single
`setState` call, all subscriptions see the same new state. Multiple `setState` calls in
sequence (like `setTiles()` + `commitUndo()`) each trigger subscriptions, but the engine's
`isDragActive` flag prevents acting on intermediate states during drag.

### Risk 2: Double Rendering (Engine + React Both Trigger Draws)

**What:** During migration, both the old React useEffect and the new engine subscription
fire for the same state change, causing a double draw.

**Mitigation:** Remove the React useEffect when the corresponding engine subscription is added.
Each migration phase explicitly lists which React trigger is replaced by which engine subscription.

### Risk 3: Memory Leaks from Unsubscribed Listeners

**What:** Engine subscriptions not cleaned up when component unmounts.

**Mitigation:** `detach()` method iterates `this.unsubscribers` and calls each one. React's
`useEffect` cleanup calls `engine.detach()`. This is the same pattern as the existing
subscription at line 754.

### Risk 4: Engine Methods Called After Detach

**What:** Async callbacks (RAF, setTimeout) fire after engine is detached.

**Mitigation:** All engine methods check `this.mapCanvas !== null` as a guard. `detach()`
nullifies all references. Any pending RAF is cancelled in `detach()`.

---

## Sources

- Direct codebase analysis of `MapCanvas.tsx` (1629 lines), `EditorState.ts`, `documentsSlice.ts`, `globalSlice.ts`, `types.ts`
- [Zustand subscribeWithSelector middleware](https://zustand.docs.pmnd.rs/middlewares/subscribe-with-selector) -- selector-based subscriptions
- [Zustand GitHub - using store outside React](https://github.com/pmndrs/zustand/discussions/2333) -- getState/subscribe patterns
- [Zustand GitHub - getState vs useStore](https://github.com/pmndrs/zustand/discussions/2194) -- non-reactive access
- [React useImperativeHandle docs](https://react.dev/reference/react/useImperativeHandle) -- imperative handle pattern for canvas
- [Babylon.js forum: React UI avoiding useState re-rendering canvas](https://forum.babylonjs.com/t/react-ui-babylon-js-how-to-avoid-usestate-re-rendering-canvas/35154) -- decoupled canvas pattern
- [TkDodo: Working with Zustand](https://tkdodo.eu/blog/working-with-zustand) -- Zustand best practices
- [Konva React Undo/Redo](https://konvajs.org/docs/react/Undo-Redo.html) -- canvas undo patterns
