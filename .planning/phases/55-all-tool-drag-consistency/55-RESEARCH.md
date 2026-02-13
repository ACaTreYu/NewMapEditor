# Phase 55: All-Tool Drag Consistency - Research

**Researched:** 2026-02-13
**Domain:** React performance optimization, ref-based state management, drag interaction patterns
**Confidence:** HIGH

## Summary

Phase 55 applies the ref-based drag pattern (established in Phase 53-54) to all remaining tools that haven't been converted yet. The codebase currently has a mixed state: pencil drag and UI overlays (cursor, line preview, selection drag, paste preview) use refs with RAF-debounced redraws, while rect drag and wall pencil still use Zustand state updates during mousemove.

The research reveals three distinct drag categories requiring different strategies:
1. **Selection drag** — Already ref-based (Phase 54), needs verification only
2. **Rect drag** (bunker, conveyor, wall_rect, etc.) — Currently Zustand-based, good candidate for ref conversion
3. **Wall pencil** — Currently Zustand per-move, but auto-connection requires neighbor reads, so stays on Zustand (documented decision)

Phase 53-54 established the proven pattern: `useRef` for transient state + RAF-debounced `requestUiRedraw()` + commit to Zustand on mouseup. No new architecture invention needed — this is pattern replication with edge case coverage (unmount safety, tool switching, animation tick conflicts).

**Primary recommendation:** Apply ref pattern to rect drag state. Add cleanup effects for unmount/tool-switch safety. Document wall pencil as intentional exception.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 18 | 18.2.0 | UI framework | useRef/useEffect/useState hooks for component state |
| Zustand | 4.5.x | State management | Global store with subscription API for cross-component state |
| TypeScript | 5.3+ | Type safety | Interface-driven development prevents runtime errors |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zustand/react | 4.5.x | React bindings | useShallow for shallow equality checks in selectors |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zustand subscribe | React Context | Context triggers re-renders, defeats ref-based optimization |
| useRef + RAF | Custom signals library | Over-engineered for 2 drag states, increases bundle size |
| Cleanup effects | Global drag manager class | More complex than useEffect cleanup, harder to test |

**Installation:**
No new dependencies needed — Phase 55 uses existing stack from Phase 53-54.

## Architecture Patterns

### Recommended Pattern (From Phase 53-54)

Phase 53-54 established this proven architecture:

```
MapCanvas.tsx structure:
├── Transient state refs (no React re-renders)
│   ├── cursorTileRef: { x: number; y: number }
│   ├── lineStateRef: { active: boolean; startX/Y, endX/Y }
│   ├── selectionDragRef: { active: boolean; startX/Y, endX/Y }
│   └── pastePreviewRef: { x: number; y: number } | null
├── RAF-debounced UI redraw
│   ├── uiDirtyRef: boolean flag
│   ├── uiRafIdRef: RAF handle for cleanup
│   └── requestUiRedraw(): marks dirty + schedules RAF callback
├── Mouse handlers
│   ├── handleMouseDown: initialize ref.current = { active: true, ... }
│   ├── handleMouseMove: mutate ref.current, call requestUiRedraw()
│   └── handleMouseUp: read ref, commit to Zustand, reset ref
└── Cleanup effects
    ├── Escape handler: permanent listener checks refs, resets, redraws
    ├── Unmount cleanup: cancelAnimationFrame(uiRafIdRef.current)
    └── Mouse leave: commit any active drags
```

### Pattern 1: Ref-Based Drag State

**What:** Store drag state in `useRef` instead of `useState`, mutate on mousemove, commit on mouseup

**When to use:** Any drag operation where intermediate states don't need to trigger React re-renders

**Example:**
```typescript
// Phase 54 pattern (selection drag)
const selectionDragRef = useRef<{ active: boolean; startX: number; startY: number; endX: number; endY: number }>({
  active: false, startX: 0, startY: 0, endX: 0, endY: 0
});

// handleMouseDown
selectionDragRef.current = { active: true, startX: x, startY: y, endX: x, endY: y };
requestUiRedraw();

// handleMouseMove
if (selectionDragRef.current.active) {
  const prevSel = selectionDragRef.current;
  if (prevSel.endX !== x || prevSel.endY !== y) {
    selectionDragRef.current = { ...prevSel, endX: x, endY: y };
    requestUiRedraw();
  }
}

// handleMouseUp
if (selectionDragRef.current.active) {
  const { startX, startY, endX, endY } = selectionDragRef.current;
  setSelection({ startX, startY, endX, endY, active: true }); // Commit to Zustand
  selectionDragRef.current = { active: false, startX: 0, startY: 0, endX: 0, endY: 0 };
}
```

### Pattern 2: RAF-Debounced UI Redraw

**What:** Mark UI dirty via flag, schedule single RAF callback to redraw, auto-coalesces multiple calls per frame

**When to use:** Any time transient ref state changes and needs visual update without React re-render

**Example:**
```typescript
// Phase 54 pattern
const uiDirtyRef = useRef(false);
const uiRafIdRef = useRef<number | null>(null);

const requestUiRedraw = useCallback(() => {
  uiDirtyRef.current = true;
  if (uiRafIdRef.current !== null) return; // Already scheduled
  uiRafIdRef.current = requestAnimationFrame(() => {
    uiRafIdRef.current = null;
    if (uiDirtyRef.current) {
      uiDirtyRef.current = false;
      drawUiLayer(); // Direct imperative call
    }
  });
}, [drawUiLayer]);

// Cleanup on unmount
useEffect(() => {
  return () => {
    if (uiRafIdRef.current !== null) {
      cancelAnimationFrame(uiRafIdRef.current);
    }
  };
}, []);
```

### Pattern 3: Unmount Safety (Commit Pending State)

**What:** Cleanup effect that commits or discards pending drag state when component unmounts during active drag

**When to use:** Any drag operation that could be interrupted by navigation, document switch, or tool change

**Example:**
```typescript
// Phase 53 pattern (pencil drag)
useEffect(() => {
  return () => {
    // Commit pending tiles on unmount
    if (engineRef.current?.getIsDragActive()) {
      const tiles = engineRef.current.commitDrag();
      if (tiles && tiles.length > 0) {
        const state = useEditorStore.getState();
        state.setTiles(tiles);
        state.commitUndo('Edit tiles');
      }
    }
  };
}, []);

// For rect drag (Phase 55):
useEffect(() => {
  return () => {
    if (rectDragRef.current.active) {
      // Discard pending rect drag on unmount (don't commit partial rectangle)
      rectDragRef.current = { active: false, startX: 0, startY: 0, endX: 0, endY: 0 };
    }
  };
}, []);
```

### Pattern 4: Tool Switch Commit

**What:** Commit or cancel active drag when user switches tools mid-drag

**When to use:** Any drag operation that should not persist across tool changes

**Example:**
```typescript
// In setTool action (Zustand store):
setTool: (tool) => set((state) => {
  // Commit or cancel any active drags before switching
  if (engineRef.current?.getIsDragActive()) {
    const tiles = engineRef.current.commitDrag();
    if (tiles && tiles.length > 0) {
      state.setTiles(tiles);
      state.commitUndo('Edit tiles');
    }
  }

  return {
    currentTool: tool,
    previousTool: state.currentTool !== ToolType.PICKER ? state.currentTool : state.previousTool
  };
})

// Alternative: Cancel instead of commit
if (rectDragRef.current.active) {
  rectDragRef.current = { active: false, startX: 0, startY: 0, endX: 0, endY: 0 };
}
```

### Pattern 5: Escape Cancellation (Permanent Listener)

**What:** Single permanent keydown listener that checks all ref-based drags and cancels on Escape

**When to use:** Consolidate Escape handling for multiple ref-based states (avoids listener churn)

**Example:**
```typescript
// Phase 54 pattern (merged line + selection drag Escape handlers)
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      // Cancel pencil drag
      if (engineRef.current?.getIsDragActive()) {
        e.preventDefault();
        engineRef.current.cancelDrag();
        // Restore buffer from Zustand state
        const state = useEditorStore.getState();
        const currentMap = documentId
          ? state.documents.get(documentId)?.map ?? null
          : state.map;
        if (currentMap && engineRef.current) {
          engineRef.current.drawMapLayer(currentMap, viewport, state.animationFrame);
        }
      }
      // Cancel line preview
      if (lineStateRef.current.active) {
        e.preventDefault();
        lineStateRef.current = { active: false, startX: 0, startY: 0, endX: 0, endY: 0 };
        requestUiRedraw();
      }
      // Cancel selection drag
      if (selectionDragRef.current.active) {
        e.preventDefault();
        selectionDragRef.current = { active: false, startX: 0, startY: 0, endX: 0, endY: 0 };
        requestUiRedraw();
      }
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [documentId, requestUiRedraw]);
```

### Anti-Patterns to Avoid

- **Two-source-of-truth pollution:** Never read from both ref and Zustand state for same value during drag — causes desync
- **Stale setState calls during mousemove:** Any `setRectDragState({ endX: x, endY: y })` in mousemove handler defeats performance goal
- **Missing deduplication checks:** Always check `if (ref.current.endX !== x || ref.current.endY !== y)` before mutation to avoid spurious redraws
- **Escape handler dependency churn:** Don't use `useEffect(() => { ... }, [rectDragState.active])` — causes listener reconnection on every drag start/end. Use permanent listener that checks ref values instead.
- **RAF cleanup leak:** Always `cancelAnimationFrame(rafIdRef.current)` in cleanup effect to prevent orphaned callbacks

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag state deduplication | Custom equality check | Early return with `if (prevRef.endX !== x \|\| prevRef.endY !== y)` | Built into pattern, avoids library dependency |
| RAF debouncing | Custom scheduler | Browser's `requestAnimationFrame` + dirty flag | Native API, zero overhead, auto-throttles to 60fps |
| Cleanup lifecycle | Manual tracking | React `useEffect` cleanup return | Guaranteed to run on unmount, handles all edge cases |
| Animation frame skip | Custom pending tile tracker | Check `engineRef.current?.getIsDragActive()` in animation subscription | Engine already tracks drag state, no duplication |

**Key insight:** The ref-based drag pattern is simple enough that custom abstractions add complexity without benefit. Direct useRef + RAF + cleanup effects are idiomatic React and easily understood.

## Common Pitfalls

### Pitfall 1: Forgetting to Reset Ref on Mouseup

**What goes wrong:** Ref stays `{ active: true }` after drag ends, blocks future interactions or causes visual glitches

**Why it happens:** Copy-paste from mousedown without adding cleanup in mouseup

**How to avoid:** Always reset ref to initial state after commit: `ref.current = { active: false, startX: 0, startY: 0, endX: 0, endY: 0 }`

**Warning signs:** Tool stops working after first use, console logs show `active: true` when no drag happening

### Pitfall 2: Animation Tick Overwrites Pending Drag Tiles

**What goes wrong:** Animation frame subscription calls `drawMapLayer()`, diffs against Zustand state, overwrites tiles in pending drag

**Why it happens:** Engine's map subscription doesn't check `isDragActive` guard

**How to avoid:** Phase 53 already guards map subscription with `if (this.isDragActive) return;` (line 424 in CanvasEngine.ts)

**Warning signs:** Tiles flicker or disappear during drag, animation frame rate affects drag responsiveness

### Pitfall 3: Missing Unmount Cleanup

**What goes wrong:** User drags rect, switches document before mouseup, pending drag state lost or committed to wrong document

**Why it happens:** No cleanup effect to handle unmount during drag

**How to avoid:** Add unmount cleanup effect that either commits or discards based on tool semantics:
- Pencil: commit pending tiles (user expects their work saved)
- Rect drag: discard (partial rectangle is meaningless)

**Warning signs:** Switching documents during drag causes state corruption, tiles appear in wrong document

### Pitfall 4: Tool Switch During Drag Ignored

**What goes wrong:** User drags rect with bunker tool, presses 'P' for pencil, rect drag continues with pencil tool active

**Why it happens:** `setTool` action doesn't check or reset active drag refs

**How to avoid:** In `setTool` action, check all active drag states and commit/cancel before switching:
```typescript
// Check engineRef.current?.getIsDragActive() and commit
// Check rectDragRef.current.active and cancel
// Check lineStateRef.current.active and cancel
```

**Warning signs:** Tool icon changes but behavior doesn't, visual preview shows wrong tool

### Pitfall 5: Escape Handler Dependency Array Causes Listener Churn

**What goes wrong:** Every drag start/end causes listener removal and re-addition, potential memory leak or missed events

**Why it happens:** Using `useEffect(() => { ... }, [rectDragState.active])` instead of permanent listener

**How to avoid:** Use permanent listener (empty deps array) that checks ref values:
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (rectDragRef.current.active) { /* cancel */ }
      if (lineStateRef.current.active) { /* cancel */ }
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []); // Empty deps — listener stays attached for component lifetime
```

**Warning signs:** Profiler shows listener add/remove every drag, Escape works inconsistently

### Pitfall 6: Reading Zustand State During Ref-Based Drag

**What goes wrong:** Mix ref values and Zustand values for same logical state, causes desync or flicker

**Why it happens:** Leftover code from before ref conversion still reads `rectDragState` from store

**How to avoid:** Audit all code paths — if using `rectDragRef`, never read `useEditorStore(state => state.rectDragState)` during drag. Only write to Zustand on commit.

**Warning signs:** Visual preview doesn't match final result, double-rendering during drag

## Code Examples

Verified patterns from existing codebase:

### Selection Drag (Already Ref-Based — Phase 54)

```typescript
// Source: E:\NewMapEditor\src\components\MapCanvas\MapCanvas.tsx lines 56, 900-901, 963-966, 987-999

// Declaration
const selectionDragRef = useRef<{ active: boolean; startX: number; startY: number; endX: number; endY: number }>({
  active: false, startX: 0, startY: 0, endX: 0, endY: 0
});

// handleMouseDown (SELECT tool)
clearSelection();
selectionDragRef.current = { active: true, startX: x, startY: y, endX: x, endY: y };
requestUiRedraw();

// handleMouseMove
if (selectionDragRef.current.active) {
  const prevSel = selectionDragRef.current;
  if (prevSel.endX !== x || prevSel.endY !== y) {
    selectionDragRef.current = { ...prevSel, endX: x, endY: y };
    requestUiRedraw();
  }
}

// handleMouseUp
if (selectionDragRef.current.active) {
  const minX = Math.min(selectionDragRef.current.startX, selectionDragRef.current.endX);
  const minY = Math.min(selectionDragRef.current.startY, selectionDragRef.current.endY);
  const maxX = Math.max(selectionDragRef.current.startX, selectionDragRef.current.endX);
  const maxY = Math.max(selectionDragRef.current.startY, selectionDragRef.current.endY);

  if (minX !== maxX || minY !== maxY) {
    setSelection({ startX: minX, startY: minY, endX: maxX, endY: maxY, active: true });
  }
  selectionDragRef.current = { active: false, startX: 0, startY: 0, endX: 0, endY: 0 };
  requestUiRedraw();
}
```

### Rect Drag (Currently Zustand-Based — Needs Conversion)

```typescript
// Source: E:\NewMapEditor\src\components\MapCanvas\MapCanvas.tsx lines 116-122, 959-961, 1034-1038

// Current implementation (Zustand-based — Phase 55 will convert this)
const { rectDragState } = useEditorStore(
  useShallow((state) => ({
    rectDragState: state.rectDragState
  }))
);

// handleMouseDown (bunker/conveyor/wall_rect tools)
setRectDragState({ active: true, startX: x, startY: y, endX: x, endY: y });

// handleMouseMove — CAUSES REACT RE-RENDER
if (rectDragState.active) {
  setRectDragState({ endX: x, endY: y }); // setState during mousemove = BAD
}

// handleMouseUp
if (rectDragState.active) {
  pushUndo();
  placeGameObjectRect(rectDragState.startX, rectDragState.startY, rectDragState.endX, rectDragState.endY);
  commitUndo('Place game object');
  setRectDragState({ active: false, startX: 0, startY: 0, endX: 0, endY: 0 });
}
```

**Phase 55 conversion:**
```typescript
// Replace Zustand subscription with ref
const rectDragRef = useRef<{ active: boolean; startX: number; startY: number; endX: number; endY: number }>({
  active: false, startX: 0, startY: 0, endX: 0, endY: 0
});

// handleMouseMove — NO REACT RE-RENDER
if (rectDragRef.current.active) {
  const prevRect = rectDragRef.current;
  if (prevRect.endX !== x || prevRect.endY !== y) {
    rectDragRef.current = { ...prevRect, endX: x, endY: y };
    requestUiRedraw(); // RAF-debounced imperative redraw
  }
}

// handleMouseUp
if (rectDragRef.current.active) {
  pushUndo();
  placeGameObjectRect(rectDragRef.current.startX, rectDragRef.current.startY,
                      rectDragRef.current.endX, rectDragRef.current.endY);
  commitUndo('Place game object');
  rectDragRef.current = { active: false, startX: 0, startY: 0, endX: 0, endY: 0 };
  requestUiRedraw();
}

// drawUiLayer reads from ref (already done in Phase 54)
if (rectDragRef.current.active) {
  const minX = Math.min(rectDragRef.current.startX, rectDragRef.current.endX);
  // ... existing rendering logic
}
```

### Wall Pencil (Stays Zustand-Based — Documented Exception)

```typescript
// Source: E:\NewMapEditor\src\components\MapCanvas\MapCanvas.tsx lines 69-70, 968-972

// Wall pencil uses Zustand per-move because auto-connection reads 8 neighbors
const [isDrawingWallPencil, setIsDrawingWallPencil] = useState(false);
const [lastWallPencilPos, setLastWallPencilPos] = useState({ x: -1, y: -1 });

// handleMouseDown (WALL_PENCIL tool)
pushUndo();
placeWall(x, y); // Calls wallSystem.placeWall which reads neighbors from map
setIsDrawingWallPencil(true);
setLastWallPencilPos({ x, y });

// handleMouseMove
if (isDrawingWallPencil && e.buttons === 1) {
  if (x !== lastWallPencilPos.x || y !== lastWallPencilPos.y) {
    placeWall(x, y); // Must read from Zustand map to auto-connect neighbors
    setLastWallPencilPos({ x, y });
  }
}

// handleMouseUp
if (isDrawingWallPencil) {
  commitUndo('Draw walls');
  setIsDrawingWallPencil(false);
  setLastWallPencilPos({ x: -1, y: -1 });
}
```

**Why wall pencil stays Zustand:** Auto-connection algorithm (wallSystem.placeWall) must read 8 neighbors from map.tiles to determine correct wall sprite. Extracting this to ref-based pattern would require duplicating entire map in ref, defeating performance goal. Documented as intentional exception.

### Unmount Safety Cleanup

```typescript
// Source: Phase 53 pattern (E:\NewMapEditor\src\components\MapCanvas\MapCanvas.tsx lines 1249-1253)

// Pencil drag unmount cleanup (commit pending tiles)
useEffect(() => {
  return () => {
    if (engineRef.current) {
      engineRef.current.detach(); // Calls cancelDrag internally
    }
  };
}, []);

// Rect drag unmount cleanup (discard pending rectangle)
useEffect(() => {
  return () => {
    if (rectDragRef.current.active) {
      rectDragRef.current = { active: false, startX: 0, startY: 0, endX: 0, endY: 0 };
    }
  };
}, []);
```

### Tool Switch Safety

```typescript
// Source: Pattern to add in Phase 55 (globalSlice.ts setTool action)

setTool: (tool) => {
  // Commit or cancel active drags before switching tools
  const state = get();

  // Cancel rect drag if active
  // (Note: This requires exposing rectDragRef to store, or handling in component)
  // Simpler approach: Add tool switch effect in MapCanvas.tsx

  return set({
    currentTool: tool,
    previousTool: state.currentTool !== ToolType.PICKER ? state.currentTool : state.previousTool
  });
}

// Better approach: Handle in MapCanvas component
useEffect(() => {
  // When tool changes, cancel any active drags
  if (rectDragRef.current.active) {
    rectDragRef.current = { active: false, startX: 0, startY: 0, endX: 0, endY: 0 };
    requestUiRedraw();
  }
}, [currentTool]); // Dependency on currentTool
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| useState for drag state | useRef + RAF redraw | Phase 53-54 (2026-02-13) | Zero React re-renders during mousemove |
| useEffect-triggered redraws | Imperative requestUiRedraw() | Phase 54 (2026-02-13) | RAF-debounced, single redraw per frame |
| Per-tool Escape useEffect | Permanent Escape listener | Phase 54 (2026-02-13) | No listener churn, checks all refs |
| Global drag state in Zustand | Per-drag-type refs | Phase 53-54 (2026-02-13) | Drag state doesn't leak across tools |

**Deprecated/outdated:**
- `setCursorTile` state: Removed in Phase 54, replaced with `cursorTileRef`
- `setLineState` state: Removed in Phase 54, replaced with `lineStateRef`
- `setSelectionDrag` state: Removed in Phase 54, replaced with `selectionDragRef`
- Individual Escape handlers per drag type: Merged into permanent listener in Phase 54

**Current best practice (as of Phase 54):**
- All transient UI state (cursor, previews, drag rectangles) in refs
- RAF-debounced imperative redraw via `requestUiRedraw()`
- Permanent Escape listener that checks all ref values
- Commit to Zustand only on mouseup (final state)

## Open Questions

1. **Tool switch during drag: commit or cancel?**
   - What we know: Pencil drag should commit (user expects work saved), rect drag should cancel (partial rect is meaningless)
   - What's unclear: Should tool switch be prevented during drag, or auto-commit/cancel?
   - Recommendation: Auto-cancel for rect drag (matches selection Escape behavior). Document in PLAN.md, test in verification.

2. **Animation tick skip for rect drag?**
   - What we know: Phase 53 skips animation tile patching during pencil drag (TOOL-05 requirement)
   - What's unclear: Does rect drag need same guard? Rect drag only shows preview, doesn't modify map tiles.
   - Recommendation: No guard needed — animation tick operates on map.tiles, rect drag only renders overlay preview. Document as "not applicable" in verification.

3. **Should rectDragState be removed from Zustand entirely?**
   - What we know: Phase 55 converts to `rectDragRef`, no component needs Zustand rectDragState
   - What's unclear: Any IPC handlers or serialization that depends on rectDragState?
   - Recommendation: Audit for `state.rectDragState` usage outside MapCanvas. If zero uses, remove from GlobalSlice. If any uses, deprecate with comment and plan removal in cleanup phase.

4. **Wall pencil exception — document in code or REQUIREMENTS.md?**
   - What we know: Wall pencil stays Zustand-based (TOOL-02 requirement), but no inline comment explains why
   - What's unclear: Future maintainer might try to "optimize" wall pencil to refs
   - Recommendation: Add inline comment above wall pencil handlers: `// Wall pencil uses Zustand per-move because auto-connection reads 8 neighbors (TOOL-02)`

## Sources

### Primary (HIGH confidence)
- E:\NewMapEditor\src\components\MapCanvas\MapCanvas.tsx — Lines 50-57 (ref declarations), 565-575 (requestUiRedraw), 927-966 (mousemove handlers), 987-1106 (mouseup/leave handlers), 1319-1356 (Escape handler)
- E:\NewMapEditor\src\core\canvas\CanvasEngine.ts — Lines 14-18 (isAnyDragActive export), 321-383 (drag lifecycle methods), 424 (isDragActive guard in map subscription)
- E:\NewMapEditor\.planning\phases\53-decouple-pencil-drag\53-VERIFICATION.md — Verified Phase 53 implementation (pencil drag ref pattern)
- E:\NewMapEditor\.planning\phases\54-decouple-cursor-ui-overlay\54-VERIFICATION.md — Verified Phase 54 implementation (UI overlay ref pattern)
- E:\NewMapEditor\.planning\REQUIREMENTS.md — Lines 39-43 (TOOL-01 to TOOL-05 requirements for Phase 55)

### Secondary (MEDIUM confidence)
- React 18 documentation on useRef and useEffect cleanup — Standard patterns, not project-specific
- Zustand subscribe API documentation — Used in CanvasEngine subscriptions

### Tertiary (LOW confidence)
- None — All findings verified against actual codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All libraries already in use, versions verified in package.json
- Architecture: HIGH — Phase 53-54 implementations verified in codebase, pattern proven
- Pitfalls: HIGH — Derived from actual Phase 54 implementation (merged Escape handler, RAF cleanup, etc.)

**Research date:** 2026-02-13
**Valid until:** 60 days (stable React patterns, no fast-moving dependencies)
