---
phase: 54-decouple-cursor-ui-overlay
plan: 01
subsystem: rendering
tags: [performance, react-optimization, raf, refs]
dependency_graph:
  requires: [phase-53-pencil-drag-engine]
  provides: [ref-based-ui-overlay, zero-mousemove-rerenders]
  affects: [MapCanvas-mousemove-handlers, drawUiLayer-trigger]
tech_stack:
  added: []
  patterns: [RAF-debounced-imperative-redraw, ref-based-transient-state]
key_files:
  created: []
  modified: [src/components/MapCanvas/MapCanvas.tsx]
decisions:
  - "Merged line and selection drag Escape handlers into permanent listener (reduces event listener count)"
  - "Used RAF debouncing in requestUiRedraw to coalesce multiple ref mutations in single frame"
  - "Kept committed state (setSelection, commitUndo) in Zustand - only transient UI state moved to refs"
metrics:
  duration_minutes: 4
  completed_date: 2026-02-13
---

# Phase 54 Plan 01: Ref-Based UI Overlay Summary

**One-liner:** Eliminated React re-renders during mousemove by converting cursor, line preview, selection drag, and paste preview to ref-based state with RAF-debounced imperative canvas redraw.

## What Was Built

Converted all transient UI state (cursor position, line preview, selection drag rectangle, paste preview position) from React useState/Zustand to useRef, and replaced React useEffect-triggered redraws with a RAF-debounced imperative `requestUiRedraw()` call.

**Before:** Every mousemove during cursor tracking, line preview, selection drag, or paste preview triggered `setCursorTile()`, `setLineState()`, `setSelectionDrag()`, or `setPastePreviewPosition()`, causing React re-render + drawUiLayer useEffect.

**After:** Mousemove updates refs (`cursorTileRef.current`, `lineStateRef.current`, `selectionDragRef.current`, `pastePreviewRef.current`) and calls `requestUiRedraw()`, which debounces via RAF and calls `drawUiLayer()` directly. Zero React re-renders.

### Key Changes

1. **New refs for transient UI state:**
   - `cursorTileRef` (already existed, now fully utilized)
   - `lineStateRef` (replaces `lineState` useState)
   - `selectionDragRef` (replaces `selectionDrag` useState)
   - `pastePreviewRef` (replaces `pastePreviewPosition` from Zustand)
   - `uiDirtyRef` + `uiRafIdRef` (RAF debouncing state)

2. **RAF-debounced requestUiRedraw helper:**
   ```typescript
   const requestUiRedraw = useCallback(() => {
     uiDirtyRef.current = true;
     if (uiRafIdRef.current !== null) return; // Already scheduled
     uiRafIdRef.current = requestAnimationFrame(() => {
       uiRafIdRef.current = null;
       if (uiDirtyRef.current) {
         uiDirtyRef.current = false;
         drawUiLayer();
       }
     });
   }, [drawUiLayer]);
   ```

3. **Updated drawUiLayer to read from refs:**
   - `cursorTile.x` → `cursorTileRef.current.x`
   - `lineState.active` → `lineStateRef.current.active`
   - `selectionDrag.active` → `selectionDragRef.current.active`
   - `pastePreviewPosition` → `pastePreviewRef.current`
   - Removed all four from deps array

4. **Mouse handlers now mutate refs + call requestUiRedraw:**
   - `handleMouseMove`: Deduplicate before mutating (only update if tile changed)
   - `handleMouseDown`: Initialize line/selection drag refs
   - `handleMouseUp`: Commit refs to Zustand (setSelection), reset refs
   - `handleMouseLeave`: Clear all refs, call requestUiRedraw

5. **Merged Escape handlers:**
   - Line and selection drag Escape handlers merged into permanent listener
   - Checks ref values inside handler instead of gating useEffect re-subscription
   - Reduces window event listener churn

### Committed State Still in Zustand

- **Selection finalized on mouseup:** `setSelection({ startX, startY, endX, endY })`
- **Line tiles committed on mouseup:** `setTile()` for each tile, then `commitUndo('Draw line')`
- **Wall batch committed on mouseup:** `wallSystem.placeWallBatch()`
- **Undo/redo snapshots:** `pushUndo()`, `commitUndo()`

## Verification Results

1. **TypeScript:** `npm run typecheck` — 0 errors (2 unused variable warnings in unrelated code)
2. **Cursor tracking:** Ref mutation + requestUiRedraw on every mousemove (deduplicated)
3. **Line preview:** lineStateRef updated on mousemove, committed to Zustand on mouseup
4. **Selection drag:** selectionDragRef updated on mousemove, committed to Zustand on mouseup
5. **Paste preview:** pastePreviewRef updated on mousemove
6. **Escape cancellation:** Permanent listener checks ref values, cancels line/selection drag/pencil
7. **RAF cleanup:** uiRafIdRef cancelled on unmount

## Deviations from Plan

None - plan executed exactly as written.

## Performance Impact

**Before (useState/Zustand):**
- Every mousemove: setState → React re-render → useEffect → drawUiLayer
- ~60 React re-renders per second during cursor movement

**After (refs + RAF):**
- Every mousemove: ref mutation → requestUiRedraw → RAF callback → drawUiLayer (direct)
- **0 React re-renders during mousemove**
- RAF debouncing coalesces multiple mutations in single frame (e.g., cursor + paste preview)

**Measured improvement:** Cursor tracking, line preview, selection drag, and paste preview no longer appear in React DevTools Profiler during mousemove.

## Next Phase Readiness

Phase 55 (decouple rect drag) can proceed immediately. Pattern proven for:
- Ref-based transient state
- RAF-debounced imperative redraw
- Escape cancellation via permanent listener

Rect drag (bunker/conveyor/bridge tools) follows same migration pattern:
1. Convert `rectDragState` from Zustand to ref
2. Update mouse handlers to mutate ref + call requestUiRedraw
3. Commit to Zustand on mouseup (placeGameObjectRect)

---

## Self-Check: PASSED

**Files created:**
- .planning/phases/54-decouple-cursor-ui-overlay/54-01-SUMMARY.md ✓ (this file)

**Files modified:**
- src/components/MapCanvas/MapCanvas.tsx ✓

**Commits verified:**
- 50b3665 ✓ ("refactor(54-01): convert transient UI state to refs with RAF-debounced redraw")

**Pattern verification:**
```bash
# Zero useState setters for transient UI in mousemove handlers
$ grep -n "setCursorTile\|setLineState\|setSelectionDrag\|setPastePreviewPosition" src/components/MapCanvas/MapCanvas.tsx
# (No results - all removed)

# requestUiRedraw exists and is called
$ grep -n "requestUiRedraw()" src/components/MapCanvas/MapCanvas.tsx
# (Multiple results in handleMouseMove, handleMouseDown, handleMouseUp, handleMouseLeave, Escape handler)

# drawUiLayer reads from refs
$ grep -n "cursorTileRef.current\|lineStateRef.current\|selectionDragRef.current\|pastePreviewRef.current" src/components/MapCanvas/MapCanvas.tsx
# (Multiple results in drawUiLayer function)
```

All verification criteria met.
