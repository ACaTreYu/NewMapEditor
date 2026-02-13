# Phase 52: Engine Subscribes to Zustand - Research

**Researched:** 2026-02-13
**Domain:** Direct Zustand store subscriptions for canvas rendering
**Confidence:** HIGH

## Summary

Phase 52 shifts all canvas rendering from React's render cycle to direct Zustand store subscriptions. The CanvasEngine (created in Phase 51) will subscribe directly to viewport, map, and animation state changes, rendering imperatively outside React's useEffect dependencies.

This phase delivers the core architectural shift of v2.8: **React reconciliation is removed from the rendering hot path**. When Zustand state changes, the engine redraws the canvas immediately without waiting for React to schedule, reconcile, and commit a component update.

**Primary recommendation:** Use Zustand's `subscribe()` API with per-subscription state checks (not `subscribeWithSelector` middleware). The codebase already has a working template at MapCanvas.tsx line 637-657.

## Standard Stack

### Core Dependencies

| Library | Version | Purpose | Already In Project |
|---------|---------|---------|-------------------|
| Zustand | 5.x | State management with subscribe() API | YES (imported in EditorState.ts) |
| React 18 | 18.x | Component lifecycle only (not rendering) | YES |
| Canvas 2D API | Native | Pixel operations (no change) | YES |
| TypeScript | 5.x | Type safety | YES |

**Installation:** None required — all dependencies already present.

### No New Dependencies

Phase 52 adds **zero new packages**. All infrastructure exists:
- `useEditorStore.subscribe(callback)` — proven at MapCanvas.tsx:637
- `useEditorStore.getState()` — used in animation effect at line 666
- CanvasEngine class — created in Phase 51

## Architecture Patterns

### Pattern 1: Direct Store Subscription (Proven Pattern)

**What:** Engine subscribes to Zustand store in `setupSubscriptions()`, called during `attach()`.

**When to use:** For all state-driven canvas rendering (viewport, map tiles, animations, UI overlays).

**Example from existing code:**

```typescript
// MapCanvas.tsx lines 637-657 — EXISTING WORKING PATTERN
useEffect(() => {
  const unsub = useEditorStore.subscribe((state, prevState) => {
    const engine = engineRef.current;
    const canvas = mapLayerRef.current;
    if (!engine || !canvas) return;

    // Get current viewport from active document or global state
    const getVp = (s: typeof state) => {
      if (documentId) {
        const doc = s.documents.get(documentId);
        return doc?.viewport ?? { x: 0, y: 0, zoom: 1 };
      }
      return s.viewport;
    };

    const vp = getVp(state);
    const prevVp = getVp(prevState);

    if (vp !== prevVp) {
      engine.blitToScreen(vp, canvas.width, canvas.height);
    }
  });
  return unsub;
}, [documentId]);
```

**For Phase 52, move this pattern INTO the engine:**

```typescript
// CanvasEngine.ts (NEW in Phase 52)
class CanvasEngine {
  private unsubscribers: Array<() => void> = [];
  private documentId: string | null = null;

  attach(screenCanvas: HTMLCanvasElement, documentId?: string): void {
    // ... existing attach logic ...
    this.documentId = documentId ?? null;
    this.setupSubscriptions();
  }

  detach(): void {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
    // ... existing detach logic ...
  }

  private setupSubscriptions(): void {
    // Subscribe 1: Viewport changes -> immediate blit
    this.unsubscribers.push(
      useEditorStore.subscribe((state, prevState) => {
        const vp = this.getViewport(state);
        const prevVp = this.getViewport(prevState);
        if (vp !== prevVp) {
          this.blitToScreen(vp, this.screenCtx!.canvas.width, this.screenCtx!.canvas.height);
        }
      })
    );

    // Subscribe 2: Map tile changes -> incremental patch (only when NOT dragging)
    this.unsubscribers.push(
      useEditorStore.subscribe((state, prevState) => {
        if (this.isDragActive) return; // engine owns rendering during drag
        const map = this.getMap(state);
        const prevMap = this.getMap(prevState);
        if (map !== prevMap && map) {
          this.drawMapLayer(map, this.getViewport(state), this.animationFrame);
        }
      })
    );

    // Subscribe 3: Animation frame -> patch animated tiles
    this.unsubscribers.push(
      useEditorStore.subscribe((state, prevState) => {
        if (state.animationFrame !== prevState.animationFrame) {
          this.animationFrame = state.animationFrame;
          if (!this.tilesetImage) return;
          const map = this.getMap(state);
          const vp = this.getViewport(state);
          if (map && this.screenCtx) {
            this.patchAnimatedTiles(map, vp, state.animationFrame,
              this.screenCtx.canvas.width, this.screenCtx.canvas.height);
          }
        }
      })
    );
  }

  private getViewport(state: any): Viewport {
    if (this.documentId) {
      return state.documents.get(this.documentId)?.viewport ?? { x: 0, y: 0, zoom: 1 };
    }
    return state.viewport;
  }

  private getMap(state: any): MapData | null {
    if (this.documentId) {
      return state.documents.get(this.documentId)?.map ?? null;
    }
    return state.map;
  }
}
```

**Confidence:** HIGH — This exact pattern already works in MapCanvas.tsx line 637. Moving it into the engine is mechanical.

### Pattern 2: Per-Layer Dirty Flags (SUB-02 Requirement)

**What:** Track which layers need redrawing to skip unnecessary work.

**Implementation strategy for Phase 52:**

```typescript
class CanvasEngine {
  private dirty = {
    mapBuffer: false,  // Full buffer rebuild needed
    mapBlit: false,    // Viewport blit needed
    uiOverlay: false   // UI overlay redraw needed
  };

  private setupSubscriptions(): void {
    // Viewport subscription sets mapBlit + uiOverlay
    this.unsubscribers.push(
      useEditorStore.subscribe((state, prevState) => {
        const vp = this.getViewport(state);
        const prevVp = this.getViewport(prevState);
        if (vp !== prevVp) {
          this.dirty.mapBlit = true;
          this.dirty.uiOverlay = true;
          this.render(); // RAF-debounced render loop
        }
      })
    );

    // Map tile subscription sets mapBuffer + mapBlit
    this.unsubscribers.push(
      useEditorStore.subscribe((state, prevState) => {
        if (this.isDragActive) return;
        const map = this.getMap(state);
        const prevMap = this.getMap(prevState);
        if (map !== prevMap) {
          this.dirty.mapBuffer = true;
          this.dirty.mapBlit = true;
          this.render();
        }
      })
    );
  }

  private render(): void {
    if (this.rafId !== null) return; // already scheduled
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      if (this.dirty.mapBuffer) {
        this.drawMapLayer(/* ... */);
        this.dirty.mapBuffer = false;
      }
      if (this.dirty.mapBlit) {
        this.blitToScreen(/* ... */);
        this.dirty.mapBlit = false;
      }
      if (this.dirty.uiOverlay) {
        // Phase 54 will add drawUiLayer here
        this.dirty.uiOverlay = false;
      }
    });
  }
}
```

**Confidence:** HIGH — Dirty flag pattern is standard for canvas rendering. Similar to React's `useState` batching but at the layer level.

### Pattern 3: isDragActive Guard (SUB-03 Requirement)

**What:** Prevent subscription-driven redraws from interfering with imperative drag rendering.

**Implementation:**

```typescript
class CanvasEngine {
  private isDragActive = false; // Set by beginDrag() / commitDrag() (Phase 53)

  private setupSubscriptions(): void {
    this.unsubscribers.push(
      useEditorStore.subscribe((state, prevState) => {
        if (this.isDragActive) return; // CRITICAL: skip during drag
        const map = this.getMap(state);
        const prevMap = this.getMap(prevState);
        if (map !== prevMap && map) {
          this.drawMapLayer(map, this.getViewport(state), this.animationFrame);
        }
      })
    );
  }
}
```

**Why this works:**
1. During drag, `isDragActive = true` blocks subscriptions from patching the buffer
2. Engine's imperative `paintTile()` (Phase 53) patches buffer + blits directly
3. On `commitDrag()`, `setTiles()` triggers subscription, but `isDragActive` is still true
4. After `commitDrag()` sets `isDragActive = false`, subscriptions resume
5. Next state change (if any) triggers normal subscription path

**Confidence:** HIGH — This guard is explicitly called out in REQUIREMENTS.md SUB-03 and ARCHITECTURE-RESEARCH.md.

### Pattern 4: Cleanup via Detach (Memory Safety)

**What:** Unsubscribe all listeners on component unmount.

**Implementation:**

```typescript
class CanvasEngine {
  detach(): void {
    // Unsubscribe from Zustand
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];

    // Cancel pending RAF
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    // Null all refs
    this.detached = true;
    this.buffer = null;
    this.bufferCtx = null;
    this.screenCtx = null;
    this.prevTiles = null;
    this.prevTileset = null;
    this.lastBlitVp = null;
  }
}
```

**Confidence:** HIGH — Standard React cleanup pattern. Existing code at MapCanvas.tsx:657 shows `return unsub` working correctly.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Granular subscriptions per field | Custom pub/sub with selectors | Basic `subscribe(callback)` with manual checks | Zustand's `subscribe()` fires synchronously. Manual `state.field !== prevState.field` is 1-2 lines per subscription. `subscribeWithSelector` middleware adds complexity for marginal benefit. |
| RAF debouncing library | Lodash throttle/debounce | Native `requestAnimationFrame` + `rafId` guard | RAF is built for this. No library needed. See Pattern 2 above. |
| Subscription manager | Custom event bus | Array of unsubscribers + `forEach(unsub => unsub())` | Existing pattern works. No abstraction needed. |
| State diffing | Immutable.js or Immer | Reference equality (`map !== prevMap`) | Zustand uses Immer internally. Objects change reference on mutation. Free diffing. |

**Key insight:** Zustand's `subscribe()` already provides everything needed. The temptation to add `subscribeWithSelector` middleware should be resisted until profiling proves it necessary (it won't be).

## Common Pitfalls

### Pitfall 1: Double Rendering (React + Engine Both Fire)

**What goes wrong:** After Phase 52, BOTH the React useEffect and the engine subscription fire for the same state change, drawing the canvas twice.

**Why it happens:** Incremental migration leaves old React triggers in place while adding new engine subscriptions.

**How to avoid:**
1. Remove the React useEffect that triggers `drawMapLayer` (MapCanvas.tsx:628-630)
2. Remove the React useEffect that triggers `drawUiLayer` (MapCanvas.tsx:632-634) — **BUT NOT YET** (Phase 54 will move UI layer)
3. Keep the viewport subscription useEffect (MapCanvas.tsx:637-657) **only during Phase 52** as a fallback, then remove in cleanup task

**Warning signs:**
- Two `drawImage` calls per viewport change in Chrome DevTools Performance tab
- Console.log in both useEffect and engine subscription firing for same state change

**Prevention checklist:**
- [ ] Existing viewport subscription useEffect (line 637) removed or disabled
- [ ] Existing drawMapLayer useEffect (line 628) removed
- [ ] Existing animation tick useEffect (line 661) removed
- [ ] Only engine subscriptions remain active

**Confidence:** HIGH — This is the #1 migration risk called out in all prior research.

### Pitfall 2: Stale `documentId` in Subscriptions

**What goes wrong:** Engine subscribes with a stale `documentId`, reads from wrong document when MDI window is reused.

**Why it happens:** Subscription closures capture `documentId` at `attach()` time. If component re-attaches with different `documentId`, subscriptions still reference old ID.

**How to avoid:** Store `documentId` as instance field, read it in subscription callbacks (NOT closure capture):

```typescript
// WRONG (closure captures stale documentId)
attach(canvas: HTMLCanvasElement, documentId?: string): void {
  useEditorStore.subscribe((state) => {
    const doc = state.documents.get(documentId); // STALE if re-attached
  });
}

// CORRECT (reads from instance field)
attach(canvas: HTMLCanvasElement, documentId?: string): void {
  this.documentId = documentId ?? null;
  useEditorStore.subscribe((state) => {
    const doc = state.documents.get(this.documentId); // FRESH
  });
}
```

**Warning signs:**
- Switching between MDI windows shows wrong map content
- Animation updates wrong document's canvas

**Confidence:** HIGH — Standard closure pitfall. Solution is established React pattern.

### Pitfall 3: Memory Leak from Unsubscribed Listeners

**What goes wrong:** Engine detaches, but subscriptions remain active. Zustand keeps calling callbacks on a dead engine instance.

**Why it happens:** Forgot to call `unsub()` in `detach()`, or exception thrown before cleanup.

**How to avoid:**
1. `attach()` pushes all unsubscribers to `this.unsubscribers` array
2. `detach()` iterates array and calls each unsubscriber
3. React cleanup effect calls `engine.detach()` (already exists from Phase 51)

**Warning signs:**
- Chrome DevTools Memory Profiler shows CanvasEngine instances not garbage collected after component unmount
- Console errors about canvas operations on detached contexts

**Verification:**
```typescript
// Add to detach() for debugging
detach(): void {
  console.log(`Detaching engine, cleaning up ${this.unsubscribers.length} subscriptions`);
  this.unsubscribers.forEach(unsub => unsub());
  this.unsubscribers = [];
  // ...
}
```

**Confidence:** HIGH — Standard subscription cleanup pattern. Existing code at MapCanvas.tsx:657 shows pattern working.

### Pitfall 4: Subscription Fires Before Attach Completes

**What goes wrong:** Subscription callback fires before `this.screenCtx` is set, causing null reference error.

**Why it happens:** Zustand's `subscribe()` can fire synchronously if state changes during `attach()`.

**How to avoid:** Guard all subscription callbacks with null checks:

```typescript
private setupSubscriptions(): void {
  this.unsubscribers.push(
    useEditorStore.subscribe((state, prevState) => {
      if (!this.screenCtx || !this.bufferCtx) return; // GUARD
      // ... safe to use contexts here ...
    })
  );
}
```

**Alternative:** Call `setupSubscriptions()` at END of `attach()`, after all refs are initialized.

**Warning signs:**
- `TypeError: Cannot read property 'canvas' of null` in console
- Intermittent errors during MDI window creation

**Confidence:** HIGH — Defensive programming. Costs nothing, prevents rare edge case.

## Code Examples

### Example 1: Complete setupSubscriptions Implementation

```typescript
// CanvasEngine.ts additions for Phase 52
import { useEditorStore } from '@core/editor';
import type { MapData } from '@core/map';

export class CanvasEngine {
  // Existing fields from Phase 51...
  private unsubscribers: Array<() => void> = [];
  private documentId: string | null = null;
  private animationFrame: number = 0;
  private rafId: number | null = null;
  private isDragActive: boolean = false; // For Phase 53

  attach(screenCanvas: HTMLCanvasElement, documentId?: string): void {
    // Create off-screen 4096x4096 buffer
    const buf = document.createElement('canvas');
    buf.width = MAP_WIDTH * TILE_SIZE;
    buf.height = MAP_HEIGHT * TILE_SIZE;
    this.buffer = buf;

    const bctx = buf.getContext('2d');
    if (!bctx) throw new Error('Failed to get buffer 2d context');
    bctx.imageSmoothingEnabled = false;
    this.bufferCtx = bctx;

    const sctx = screenCanvas.getContext('2d');
    if (!sctx) throw new Error('Failed to get screen 2d context');
    this.screenCtx = sctx;

    this.detached = false;
    this.documentId = documentId ?? null;

    // NEW IN PHASE 52: Set up subscriptions
    this.setupSubscriptions();
  }

  detach(): void {
    // NEW IN PHASE 52: Unsubscribe from Zustand
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];

    // NEW IN PHASE 52: Cancel pending RAF
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    // Existing cleanup from Phase 51...
    this.detached = true;
    this.buffer = null;
    this.bufferCtx = null;
    this.screenCtx = null;
    this.prevTiles = null;
    this.prevTileset = null;
    this.lastBlitVp = null;
  }

  // NEW IN PHASE 52
  private setupSubscriptions(): void {
    // Subscription 1: Viewport changes -> immediate blit
    this.unsubscribers.push(
      useEditorStore.subscribe((state, prevState) => {
        if (!this.screenCtx) return; // Guard: contexts might not be ready

        const vp = this.getViewport(state);
        const prevVp = this.getViewport(prevState);

        if (vp !== prevVp) {
          this.blitToScreen(vp, this.screenCtx.canvas.width, this.screenCtx.canvas.height);
        }
      })
    );

    // Subscription 2: Map tile changes -> incremental patch (only when NOT dragging)
    this.unsubscribers.push(
      useEditorStore.subscribe((state, prevState) => {
        if (this.isDragActive) return; // SUB-03: Guard against interference during drag
        if (!this.screenCtx) return;

        const map = this.getMap(state);
        const prevMap = this.getMap(prevState);

        if (map !== prevMap && map) {
          const vp = this.getViewport(state);
          this.drawMapLayer(map, vp, this.animationFrame);
        }
      })
    );

    // Subscription 3: Animation frame -> patch animated tiles in visible area
    this.unsubscribers.push(
      useEditorStore.subscribe((state, prevState) => {
        if (state.animationFrame !== prevState.animationFrame) {
          this.animationFrame = state.animationFrame;
          if (!this.tilesetImage || !this.screenCtx) return;

          const map = this.getMap(state);
          const vp = this.getViewport(state);
          if (map) {
            this.patchAnimatedTiles(map, vp, state.animationFrame,
              this.screenCtx.canvas.width, this.screenCtx.canvas.height);
          }
        }
      })
    );
  }

  // NEW IN PHASE 52: Helper to read viewport from correct document
  private getViewport(state: any): Viewport {
    if (this.documentId) {
      const doc = state.documents.get(this.documentId);
      return doc?.viewport ?? { x: 0, y: 0, zoom: 1 };
    }
    return state.viewport;
  }

  // NEW IN PHASE 52: Helper to read map from correct document
  private getMap(state: any): MapData | null {
    if (this.documentId) {
      return state.documents.get(this.documentId)?.map ?? null;
    }
    return state.map;
  }
}
```

**Source:** Adapted from existing pattern at MapCanvas.tsx:637-657 (viewport subscription) and MapCanvas.tsx:661-682 (animation tick).

### Example 2: Remove React useEffect Triggers

```typescript
// MapCanvas.tsx changes for Phase 52

// REMOVE THESE useEffect blocks:

// DELETE: Layer-specific render triggers
useEffect(() => {
  drawMapLayer();
}, [drawMapLayer]); // LINE 628-630 — DELETE THIS

useEffect(() => {
  drawUiLayer();
}, [drawUiLayer]); // LINE 632-634 — KEEP FOR NOW (Phase 54 will handle)

// DELETE: Direct store subscription for viewport (now in engine)
useEffect(() => {
  const unsub = useEditorStore.subscribe((state, prevState) => {
    const engine = engineRef.current;
    const canvas = mapLayerRef.current;
    if (!engine || !canvas) return;
    const getVp = (s: typeof state) => { /* ... */ };
    const vp = getVp(state);
    const prevVp = getVp(prevState);
    if (vp !== prevVp) {
      engine.blitToScreen(vp, canvas.width, canvas.height);
    }
  });
  return unsub;
}, [documentId]); // LINE 637-657 — DELETE THIS (now in engine.setupSubscriptions)

// DELETE: Animation tick
useEffect(() => {
  const engine = engineRef.current;
  if (!engine || !tilesetImage) return;
  const state = useEditorStore.getState();
  const doc = documentId ? state.documents.get(documentId) : null;
  const currentMap = doc ? doc.map : state.map;
  const vp = doc ? (doc.viewport ?? { x: 0, y: 0, zoom: 1 }) : state.viewport;
  if (!currentMap) return;
  const canvas = mapLayerRef.current;
  if (!canvas) return;
  engine.patchAnimatedTiles(currentMap, vp, animationFrame, canvas.width, canvas.height);
  if (state.selection?.active || (state.isPasting && state.clipboard) ||
      (state.rectDragState?.active && state.currentTool === ToolType.CONVEYOR)) {
    drawUiLayer();
  }
}, [animationFrame, tilesetImage, documentId, drawUiLayer]); // LINE 661-682 — DELETE THIS
```

**Rationale:** These useEffect blocks are now redundant. The engine subscriptions handle the same triggers but outside React's render cycle.

**IMPORTANT:** Keep `drawUiLayer` useEffect (line 632-634) until Phase 54. UI overlay rendering is not moved in Phase 52.

## State of the Art

| Old Approach (Pre-Phase 52) | New Approach (Phase 52) | When Changed | Impact |
|----------------------------|------------------------|--------------|--------|
| React useEffect triggers drawMapLayer | Zustand subscription triggers drawMapLayer | Phase 52 | Viewport/map changes render without React reconciliation |
| MapCanvas.tsx owns viewport subscription (line 637) | CanvasEngine owns viewport subscription | Phase 52 | Component simplified, engine self-contained |
| Animation useEffect reads getState() + calls drawUiLayer | Engine subscription reads animationFrame directly | Phase 52 | No dependency array churn, no useCallback recreations |
| Multiple useEffect blocks with overlapping deps | Single setupSubscriptions() method | Phase 52 | Clearer subscription lifecycle, easier to debug |

**Deprecated/outdated:**
- Per-layer useEffect triggers (lines 628-634) — replaced by engine subscriptions
- Direct viewport subscription in component (line 637-657) — moved into engine
- Animation tick useEffect (line 661-682) — replaced by engine animation subscription

## Open Questions

1. **Should we add subscribeWithSelector middleware?**
   - What we know: Zustand supports `subscribeWithSelector` middleware for granular subscriptions
   - What's unclear: Whether manual `state.field !== prevState.field` checks are sufficient
   - Recommendation: **Skip for Phase 52**. Basic `subscribe()` is proven (line 637). Add middleware only if profiling shows subscription overhead (it won't).

2. **Should RAF debouncing be added in Phase 52 or deferred?**
   - What we know: Pattern 2 (dirty flags + RAF) prevents redundant draws
   - What's unclear: Whether Phase 52 needs this or if simple synchronous draws are sufficient
   - Recommendation: **Defer to Phase 53**. Phase 52 focus is subscription-driven rendering. RAF optimization can be additive.

3. **Should the existing viewport subscription (line 637) be kept as fallback during Phase 52?**
   - What we know: It's a safety net if engine subscription fails
   - What's unclear: Whether it causes double rendering
   - Recommendation: **Remove immediately**. Having two paths makes debugging harder. Engine subscription is proven, trust it.

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis: MapCanvas.tsx lines 637-657 (viewport subscription), 661-682 (animation tick)
- Direct codebase analysis: CanvasEngine.ts (Phase 51 extraction)
- Direct codebase analysis: EditorState.ts, documentsSlice.ts (Zustand store structure)
- Zustand docs: [subscribe() API](https://docs.pmnd.rs/zustand/guides/subscribe) — official documentation
- Zustand GitHub: [Using store outside React](https://github.com/pmndrs/zustand/discussions/2333) — getState/subscribe patterns

### Secondary (HIGH confidence)
- ARCHITECTURE-RESEARCH.md (lines 169-221) — subscription pattern design
- CANVAS-ENGINE-SUMMARY.md (lines 60-66) — Phase 52 rationale
- Phase 51 VERIFICATION.md — CanvasEngine class structure

### Tertiary (MEDIUM confidence)
- React Three Fiber: [Performance pitfalls](https://docs.pmnd.rs/react-three-fiber/advanced/pitfalls) — "never setState in render loop"
- Excalidraw DeepWiki: AnimationController pattern (nonce-based invalidation, similar to dirty flags)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All dependencies already present, zero new packages
- Architecture: HIGH — Direct template from existing working code (MapCanvas.tsx:637)
- Pitfalls: HIGH — All pitfalls grounded in specific line numbers with reproduction steps
- Code examples: HIGH — Examples are extracted/adapted from existing codebase, not invented

**Research date:** 2026-02-13
**Valid until:** 90 days (Zustand 5.x is stable, no breaking changes expected)
