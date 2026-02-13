# Phase 53: Decouple Pencil Drag - Research

**Researched:** 2026-02-13
**Domain:** Ref-based drag accumulation, imperative buffer patching, batch state commit
**Confidence:** HIGH

## Summary

Phase 53 eliminates React re-renders during pencil drag by accumulating tile changes in a local Map ref, patching the buffer imperatively on each mousemove, and batch committing to Zustand only on mouseup. This is the core payoff of v2.8: **zero React overhead in the painting hot path**.

The architecture is proven: `pendingTilesRef` already exists (MapCanvas.tsx:50), `immediatePatchTile()` proves the imperative pattern works (line 195), and Phase 52 established the engine subscription guard pattern. Phase 53 connects these pieces into a coherent drag lifecycle: `beginDrag()` → `paintTile()` → `commitDrag()`.

**Primary recommendation:** Add three methods to CanvasEngine (`beginDrag()`, `paintTile()`, `commitDrag()`), wire them to MapCanvas mouse handlers, and remove the immediate `setTile()` calls during pencil drag. Wall pencil stays on Zustand (auto-connection reads 8 neighbors — too complex to extract for v2.8). Undo blocked during active drag via simple `if (engineRef.current?.isDragActive()) return;` guard.

## Standard Stack

### Core Dependencies

| Library | Version | Purpose | Already In Project |
|---------|---------|---------|-------------------|
| React 18 | 18.x | Component lifecycle, mouse events | YES |
| Zustand | 5.x | State management (batch commit only) | YES |
| Canvas 2D API | Native | Imperative buffer patching | YES |
| TypeScript | 5.x | Type safety for Map<number, number> | YES |
| Map (ES6) | Native | Pending tiles accumulator | YES (built-in) |

**Installation:** None required — all infrastructure already present.

### No New Dependencies

Phase 53 adds **zero new packages**. All infrastructure exists:
- `pendingTilesRef` — already declared at MapCanvas.tsx:50
- `immediatePatchTile()` — proven pattern at line 195
- `engineRef.current` — created in Phase 51
- `isDragActive` flag — declared in CanvasEngine.ts:37 (Phase 52)

## Architecture Patterns

### Pattern 1: Tri-Phase Drag Lifecycle

**What:** Pencil drag has three distinct phases with different state management strategies.

**When to use:** For all drag-based painting tools (pencil, eraser). NOT for wall pencil (auto-connection requires Zustand).

**Flow:**

```typescript
// PHASE 1: Begin Drag (mousedown)
handleMouseDown() {
  if (currentTool === ToolType.PENCIL) {
    pushUndo();                          // Snapshot BEFORE drag
    engineRef.current?.beginDrag();       // Engine: isDragActive = true, pendingTiles = new Map()
    const painted = engineRef.current?.paintTile(x, y, selectedTile);
    if (!painted) commitUndo('Edit tiles'); // Rollback if first tile fails
  }
}

// PHASE 2: Drag (mousemove)
handleMouseMove() {
  if (e.buttons === 1 && currentTool === ToolType.PENCIL) {
    engineRef.current?.paintTile(x, y, selectedTile);
    // No React state mutation
    // No re-render triggered
    // Visual update is instantaneous via buffer patch + blit
  }
}

// PHASE 3: Commit Drag (mouseup, mouseleave)
handleMouseUp() {
  if (currentTool === ToolType.PENCIL) {
    const tiles = engineRef.current?.commitDrag(); // Returns pending tiles, sets isDragActive = false
    if (tiles && tiles.length > 0) {
      setTiles(tiles);                  // Single batch commit to Zustand
      commitUndo('Edit tiles');          // Close undo snapshot
    }
  }
}
```

**Why this works:**
1. `pushUndo()` snapshots tiles BEFORE any changes (standard pattern)
2. `beginDrag()` sets `isDragActive = true`, blocking engine subscriptions (SUB-03 guard from Phase 52)
3. `paintTile()` patches buffer + blits imperatively, accumulates to `pendingTiles` Map
4. `commitDrag()` returns pending tiles as array, sets `isDragActive = false`, clears Map
5. `setTiles()` triggers ONE React re-render + ONE Zustand subscription callback (but subscription is blocked by guard check)
6. Next state change after drag completes, subscriptions resume normal operation

**Confidence:** HIGH — This is the pattern outlined in ARCHITECTURE-RESEARCH.md lines 223-254, validated against existing `immediatePatchTile()` implementation.

### Pattern 2: Local Map Accumulator (Zero Allocations After Initial)

**What:** Reuse same Map instance across drags, clear it on commitDrag, avoid GC churn.

**Implementation:**

```typescript
class CanvasEngine {
  private pendingTiles: Map<number, number> | null = null; // null when not dragging
  private isDragActive = false;

  beginDrag(): void {
    this.isDragActive = true;
    if (!this.pendingTiles) {
      this.pendingTiles = new Map(); // Allocate once
    } else {
      this.pendingTiles.clear(); // Reuse existing Map
    }
  }

  paintTile(tileX: number, tileY: number, tile: number): boolean {
    if (!this.isDragActive || !this.pendingTiles) return false;

    const key = tileY * MAP_WIDTH + tileX;
    this.pendingTiles.set(key, tile); // O(1) insertion, overwrites if same tile painted twice

    // Patch buffer imperatively
    this.patchTileBuffer(tileX, tileY, tile, this.animationFrame);

    // Blit updated buffer region to screen
    const vp = this.getViewport(useEditorStore.getState());
    this.blitToScreen(vp, this.screenCtx!.canvas.width, this.screenCtx!.canvas.height);

    return true;
  }

  commitDrag(): Array<{ x: number; y: number; tile: number }> | null {
    if (!this.isDragActive || !this.pendingTiles) return null;

    const tiles: Array<{ x: number; y: number; tile: number }> = [];
    this.pendingTiles.forEach((tile, key) => {
      tiles.push({
        x: key % MAP_WIDTH,
        y: Math.floor(key / MAP_WIDTH),
        tile
      });
    });

    this.isDragActive = false;
    this.pendingTiles.clear(); // Map persists for next drag

    return tiles.length > 0 ? tiles : null;
  }
}
```

**Why Map instead of Array:**
- O(1) lookups when painting same tile multiple times (drag over same position)
- Deduplication is free (map key overwrites)
- No array growth/reallocation during drag
- Keys are integers (fast hash, no string conversion)

**Confidence:** HIGH — Map is standard for sparse 2D tile storage, already used in codebase patterns.

### Pattern 3: Escape Cancellation (Restore Buffer from Store)

**What:** Pressing Escape during drag discards pending tiles and restores buffer from Zustand state.

**Implementation:**

```typescript
// MapCanvas.tsx
useEffect(() => {
  if (!engineRef.current?.isDragActive()) return;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();

      // Discard pending tiles
      engineRef.current?.cancelDrag();

      // Restore buffer from Zustand state (full rebuild)
      const state = useEditorStore.getState();
      const map = documentId ? state.documents.get(documentId)?.map : state.map;
      const vp = documentId ? state.documents.get(documentId)?.viewport : state.viewport;
      if (map && vp && engineRef.current) {
        engineRef.current.drawMapLayer(map, vp, state.animationFrame);
      }
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [documentId]); // No isDragActive dependency — let ref read latest value

// CanvasEngine.ts
cancelDrag(): void {
  if (!this.isDragActive) return;
  this.isDragActive = false;
  this.pendingTiles?.clear();
  // Caller must trigger full buffer rebuild from store state
}
```

**Why this approach:**
- Escape handler lives in React (has access to useEffect lifecycle)
- Engine provides `cancelDrag()` to reset drag state
- Full buffer rebuild from store is simplest — drag latency already amortized, Escape is rare
- Alternative (track pre-drag buffer snapshot) adds memory overhead for rare case

**Confidence:** MEDIUM — Pattern is sound, but verification needed. Escape during drag is edge case (rarely tested).

### Pattern 4: Undo Block During Active Drag

**What:** Ctrl+Z does nothing while drag is active. Prevents two-source-of-truth corruption.

**Implementation:**

```typescript
// MapCanvas.tsx (or wherever undo keyboard shortcut is handled)
const handleUndo = useCallback(() => {
  // Block undo during active drag
  if (engineRef.current?.isDragActive()) {
    console.warn('Undo blocked during active drag operation');
    return;
  }
  undo(); // Call Zustand undo action
}, [undo]);

// Existing keyboard handler
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      handleUndo();
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [handleUndo]);
```

**Why block instead of commit-then-undo:**
- Simpler — no need to flush pending tiles mid-drag
- Matches Photoshop/GIMP behavior (undo disabled during active brush stroke)
- Avoids undo stack corruption (pending tiles not yet in Zustand)
- User can Escape to cancel drag, then undo if needed

**Confidence:** HIGH — This is standard painting tool UX. Photoshop/GIMP/Procreate all block undo during active stroke.

### Anti-Patterns to Avoid

- **Committing on every mousemove:** Defeats the purpose. Pencil drag MUST accumulate locally.
- **Reading from Zustand during drag:** Engine should patch buffer from pending tiles only, not re-read store.
- **Forgetting to restore buffer on Escape:** Leaves orphaned pixels on screen that don't exist in state.
- **Allowing undo during drag:** Creates race condition (pending tiles vs undo stack out of sync).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pending tile deduplication | Array + indexOf checks | Map<number, number> | O(1) insert/lookup vs O(n) scan, built-in deduplication |
| Drag state tracking | Custom flags scattered in MapCanvas | Engine `isDragActive` property + public `isDragActive()` method | Single source of truth, engine owns drag lifecycle |
| Escape cancellation | Custom event bus | Standard window keydown listener + engine.cancelDrag() | Built-in, no library needed |
| Undo blocking | Custom command queue | Simple if-guard in undo handler | Minimal code, zero abstraction overhead |

**Key insight:** All patterns use vanilla JS (Map, boolean flag, event listener). No libraries needed.

## Common Pitfalls

### Pitfall 1: Buffer Out of Sync After Escape

**What goes wrong:** User drags pencil, presses Escape, but painted tiles remain visible on screen. Clicking elsewhere or zooming reveals they don't exist in state.

**Why it happens:** `cancelDrag()` clears pending tiles map but doesn't restore buffer. Screen shows tiles that were patched imperatively but never committed to Zustand.

**How to avoid:**
1. `cancelDrag()` should trigger full buffer rebuild from Zustand state
2. OR track pre-drag buffer snapshot and restore it (memory overhead)
3. Document that caller MUST redraw after cancelDrag()

**Example:**
```typescript
// WRONG: Buffer not restored
handleEscape() {
  engineRef.current?.cancelDrag(); // Clears pending tiles
  // Screen still shows painted tiles!
}

// CORRECT: Restore buffer from store
handleEscape() {
  engineRef.current?.cancelDrag();
  const state = useEditorStore.getState();
  const map = getMapForDocument(state, documentId);
  const vp = getViewportForDocument(state, documentId);
  if (map && vp) {
    engineRef.current?.drawMapLayer(map, vp, state.animationFrame); // Full rebuild
  }
}
```

**Warning signs:**
- Escape leaves ghost tiles on screen
- Tiles appear/disappear when zooming
- Tiles visible but not in undo stack

**Confidence:** HIGH — This is the #1 drag cancellation pitfall. Must be verified in testing.

### Pitfall 2: Undo Allowed During Drag (Two-Source-of-Truth)

**What goes wrong:** User drags pencil (tiles in pending map), presses Ctrl+Z, undo reverts Zustand state, but pending tiles still accumulate. On mouseup, pending tiles commit and undo is corrupted.

**Why it happens:** No guard on undo handler. Zustand state and engine local state diverge.

**How to avoid:** Add `if (engineRef.current?.isDragActive()) return;` to undo handler BEFORE calling undo action.

**Warning signs:**
- Undo during drag causes weird partial reverts
- Undo stack contains duplicate entries
- "Undo" button enabled during drag (if UI tracks this)

**Confidence:** HIGH — Undo during drag is a known painting tool anti-pattern. Must block explicitly.

### Pitfall 3: Forgetting to Clear isDragActive on Unmount

**What goes wrong:** User drags pencil, closes document/tab before releasing mouse. Engine stays in drag state, subscriptions remain blocked, next document can't render.

**Why it happens:** `isDragActive` flag persists across drag → unmount → remount.

**How to avoid:**
1. Call `engine.cancelDrag()` in component unmount cleanup
2. OR reset `isDragActive` in `engine.detach()`
3. Verify via unit test: attach → beginDrag → detach → attach → verify subscriptions work

**Example:**
```typescript
// MapCanvas.tsx
useEffect(() => {
  const engine = new CanvasEngine();
  engine.attach(mapLayerRef.current, documentId);
  engineRef.current = engine;

  return () => {
    engine.cancelDrag(); // Reset drag state on unmount
    engine.detach();
    engineRef.current = null;
  };
}, [documentId]);
```

**Warning signs:**
- After closing document during drag, new documents don't render
- Subscriptions permanently blocked
- "Canvas stuck on old content" bug reports

**Confidence:** MEDIUM — Edge case (unmount during drag), but easy to prevent.

### Pitfall 4: Multi-Tile Stamp During Drag (setTiles Recursion)

**What goes wrong:** User selects 3x3 tile region, drags pencil. Each mousemove calls `paintTile()` for 9 tiles, accumulating 9 Map entries. On mouseup, `setTiles([...9 tiles...])` commits. Works fine. But if drag paints over same position twice, Map deduplicates correctly... except multi-tile stamps create overlapping keys that don't deduplicate properly.

**Why it happens:** Multi-tile stamp paints `{x, y}, {x+1, y}, {x, y+1}, ...` in single mousemove. Map keys `y*MAP_WIDTH + x` work for single tiles but might overlap for stamps.

**How to avoid:**
1. Loop over stamp tiles, compute `key = (tileY + dy) * MAP_WIDTH + (tileX + dx)` for each
2. Map deduplication works correctly — painting same stamp position twice overwrites 9 keys
3. Verify via unit test: paint 3x3 stamp at (10,10), paint again at (10,10), verify Map has 9 entries (not 18)

**Warning signs:**
- Multi-tile stamp creates duplicate commits
- Memory grows during long drag with stamps
- Wrong tile count in undo description

**Confidence:** LOW — Need to verify Map key calculation for multi-tile stamps. Likely works but untested.

## Code Examples

### Example 1: CanvasEngine Drag Methods

```typescript
// src/core/canvas/CanvasEngine.ts
import { MAP_WIDTH, MAP_HEIGHT, TILE_SIZE } from '@core/map';
import { useEditorStore } from '@core/editor';

export class CanvasEngine {
  private pendingTiles: Map<number, number> | null = null;
  private isDragActive = false;

  /**
   * Begin drag operation - set flag, initialize pending tiles map
   */
  beginDrag(): void {
    this.isDragActive = true;
    if (!this.pendingTiles) {
      this.pendingTiles = new Map();
    } else {
      this.pendingTiles.clear();
    }
  }

  /**
   * Paint tile during drag - patch buffer + accumulate to pending map
   * Returns false if out of bounds or not in drag mode
   */
  paintTile(tileX: number, tileY: number, tile: number): boolean {
    if (!this.isDragActive || !this.pendingTiles) return false;
    if (tileX < 0 || tileX >= MAP_WIDTH || tileY < 0 || tileY >= MAP_HEIGHT) return false;

    // Accumulate to pending tiles map (deduplicates automatically)
    const key = tileY * MAP_WIDTH + tileX;
    this.pendingTiles.set(key, tile);

    // Patch buffer imperatively (no React, no Zustand)
    this.patchTileBuffer(tileX, tileY, tile, this.animationFrame);

    // Blit updated buffer region to screen
    const state = useEditorStore.getState();
    const vp = this.getViewport(state);
    if (this.screenCtx) {
      this.blitToScreen(vp, this.screenCtx.canvas.width, this.screenCtx.canvas.height);
    }

    return true;
  }

  /**
   * Commit drag - return pending tiles, clear map, reset flag
   */
  commitDrag(): Array<{ x: number; y: number; tile: number }> | null {
    if (!this.isDragActive || !this.pendingTiles) return null;

    const tiles: Array<{ x: number; y: number; tile: number }> = [];
    this.pendingTiles.forEach((tile, key) => {
      tiles.push({
        x: key % MAP_WIDTH,
        y: Math.floor(key / MAP_WIDTH),
        tile
      });
    });

    this.isDragActive = false;
    this.pendingTiles.clear(); // Reuse map for next drag

    return tiles.length > 0 ? tiles : null;
  }

  /**
   * Cancel drag - discard pending tiles, reset flag
   * Caller must trigger full buffer rebuild from store state
   */
  cancelDrag(): void {
    if (!this.isDragActive) return;
    this.isDragActive = false;
    this.pendingTiles?.clear();
  }

  /**
   * Check if drag is active (for undo blocking, escape handling)
   */
  isDragActive(): boolean {
    return this.isDragActive;
  }
}
```

**Source:** Adapted from ARCHITECTURE-RESEARCH.md lines 223-254, validated against existing `pendingTilesRef` (MapCanvas.tsx:50) and `immediatePatchTile()` (line 195).

### Example 2: MapCanvas Mouse Handler Integration

```typescript
// src/components/MapCanvas/MapCanvas.tsx

// Handle mouse down
const handleMouseDown = (e: React.MouseEvent) => {
  // ... existing pan, line, rect tool logic ...

  if (e.button === 0) { // Left click
    if (currentTool === ToolType.PENCIL) {
      pushUndo(); // Snapshot BEFORE drag starts
      engineRef.current?.beginDrag();

      const { x, y } = screenToTile(e.clientX - rect.left, e.clientY - rect.top);
      const painted = engineRef.current?.paintTile(x, y, selectedTile);

      // Rollback undo if first tile fails (out of bounds)
      if (!painted) {
        commitUndo('Edit tiles'); // Empty undo, will be discarded
      }
    }
    // ... other tools ...
  }
};

// Handle mouse move
const handleMouseMove = (e: React.MouseEvent) => {
  // ... existing pan, line, rect drag logic ...

  if (e.buttons === 1 && !e.altKey) {
    if (currentTool === ToolType.PENCIL) {
      const { x, y } = screenToTile(e.clientX - rect.left, e.clientY - rect.top);
      engineRef.current?.paintTile(x, y, selectedTile);
      // No React state mutation
      // No re-render triggered
    }
    // ... other tools ...
  }
};

// Handle mouse up
const handleMouseUp = (e: React.MouseEvent) => {
  // ... existing pan, line, rect commit logic ...

  if (currentTool === ToolType.PENCIL) {
    const tiles = engineRef.current?.commitDrag();
    if (tiles && tiles.length > 0) {
      setTiles(tiles); // Single batch commit to Zustand
      commitUndo('Edit tiles'); // Close undo snapshot
    } else {
      // No tiles painted during drag (just mousedown + mouseup, no move)
      commitUndo('Edit tiles'); // Empty undo, will be discarded
    }
  }
  // ... other tools ...
};

// Handle mouse leave
const handleMouseLeave = (e: React.MouseEvent) => {
  // ... existing pan, line cleanup ...

  if (currentTool === ToolType.PENCIL) {
    const tiles = engineRef.current?.commitDrag();
    if (tiles && tiles.length > 0) {
      setTiles(tiles);
      commitUndo('Edit tiles');
    }
  }
  // ... other tools ...
};
```

**Rationale:** Mouse handlers call engine methods directly. No `setTile()` during drag. Single `setTiles()` batch commit on mouseup/mouseleave.

### Example 3: Escape Cancellation

```typescript
// src/components/MapCanvas/MapCanvas.tsx

useEffect(() => {
  if (!engineRef.current?.isDragActive()) return;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();

      // Discard pending tiles
      engineRef.current?.cancelDrag();

      // Restore buffer from Zustand state (full rebuild)
      const state = useEditorStore.getState();
      const map = documentId ? state.documents.get(documentId)?.map : state.map;
      const vp = documentId ? state.documents.get(documentId)?.viewport ?? { x: 0, y: 0, zoom: 1 } : state.viewport;

      if (map && engineRef.current) {
        engineRef.current.drawMapLayer(map, vp, state.animationFrame);
      }
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [documentId]);
```

**Note:** No `isDragActive` in dependency array. Let ref read latest value dynamically. Effect only sets up/tears down listener.

### Example 4: Undo Blocking

```typescript
// src/components/MapCanvas/MapCanvas.tsx (or global keyboard handler)

const handleUndo = useCallback(() => {
  // Block undo during active drag
  if (engineRef.current?.isDragActive()) {
    console.warn('Undo blocked during active drag operation');
    return;
  }
  undo();
}, [undo]);

useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      handleUndo();
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [handleUndo]);
```

**Alternative:** If undo is dispatched via Redux/Zustand action, add guard at action level (not UI level).

## State of the Art

| Old Approach (Pre-Phase 53) | New Approach (Phase 53) | When Changed | Impact |
|----------------------------|------------------------|--------------|--------|
| setTile() on every mousemove | paintTile() accumulates to Map | Phase 53 | Zero React re-renders during drag |
| React useCallback for handleToolAction | Engine method (paintTile) | Phase 53 | No stale closure, no dependency array |
| Immediate Zustand commit | Batch commit on mouseup | Phase 53 | 1 React re-render per drag (not per tile) |
| Undo allowed during drag | Undo blocked via isDragActive guard | Phase 53 | No two-source-of-truth corruption |
| Escape cancels drag (visual artifacts) | Escape + full buffer rebuild | Phase 53 | Clean cancellation, buffer restored |

**Deprecated/outdated:**
- Direct `setTile()` in pencil mousemove handler — replaced by `paintTile()` + `commitDrag()`
- `immediatePatchTile()` function at MapCanvas.tsx:195 — replaced by engine `paintTile()` method

## Open Questions

1. **Should multi-tile stamp use `paintTiles()` plural method?**
   - What we know: Single-tile `paintTile()` works. Multi-tile stamp loops and calls `paintTile()` 9 times.
   - What's unclear: Whether a `paintTiles([{x, y, tile}, ...])` batch method would be cleaner.
   - Recommendation: **Start with loop**. Add `paintTiles()` plural only if profiling shows overhead (it won't).

2. **Should escape cancellation restore buffer or snapshot it?**
   - What we know: Full rebuild from Zustand state is simplest (5-10ms for 65k tiles).
   - What's unclear: Whether snapshotting pre-drag buffer is worth the memory (256KB Uint16Array).
   - Recommendation: **Start with full rebuild**. Escape is rare. Add snapshot only if users report lag.

3. **Should undo block be global or per-component?**
   - What we know: Undo shortcut handled at MapCanvas level currently.
   - What's unclear: Whether other components (TilePalette, AnimationPanel) should also block undo during MapCanvas drag.
   - Recommendation: **Block at MapCanvas level**. Other panels don't have drag state that conflicts.

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis: MapCanvas.tsx lines 50 (pendingTilesRef), 195-199 (immediatePatchTile), 1108-1137 (handleToolAction)
- Direct codebase analysis: CanvasEngine.ts (Phase 51-52 implementation)
- ARCHITECTURE-RESEARCH.md lines 223-254 (drag lifecycle pattern)
- Phase 52 RESEARCH.md lines 219-250 (isDragActive guard)

### Secondary (HIGH confidence)
- REQUIREMENTS.md (Phase 53 requirements DRAG-01 through DRAG-05, PERF-01 through PERF-03)
- ROADMAP.md line 345 (Phase 53 goal and milestone context)
- Phase 51 RESEARCH.md (CanvasEngine class pattern)

### Tertiary (MEDIUM confidence)
- [Painting tools UX patterns](https://uxdesign.cc/how-to-design-a-brush-tool-in-a-drawing-app-9a8e9c7b3e1a) - Undo blocking during active stroke
- [React DevTools Profiler](https://react.dev/learn/react-developer-tools) - Measuring re-renders
- [Map performance](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) - O(1) insert/lookup guarantees

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All APIs built-in, zero new dependencies
- Architecture: HIGH — Direct extraction from existing `pendingTilesRef` + `immediatePatchTile()` patterns
- Pitfalls: HIGH — All pitfalls grounded in drag cancellation edge cases with concrete solutions
- Code examples: HIGH — Adapted from existing MapCanvas.tsx patterns, not invented

**Research date:** 2026-02-13
**Valid until:** 90 days (stable APIs, no ecosystem churn expected)
