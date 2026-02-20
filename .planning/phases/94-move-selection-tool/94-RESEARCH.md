# Phase 94: Move Selection Tool - Research

**Researched:** 2026-02-20
**Domain:** MapCanvas.tsx mouse handler branching, ref-based transient drag state, Zustand selection state
**Confidence:** HIGH

---

## Summary

Phase 94 adds the ability to drag an existing selection marquee to reposition it without modifying
any tiles. This is a purely UI-layer operation: the marquee border moves with the cursor during
drag, and only on mouseup does Zustand get updated with the new selection coordinates. No tiles
are read or written during the drag.

The implementation fits entirely within the existing MapCanvas.tsx patterns. A new ref
(`selectionMoveRef`) tracks the move-drag state, analogous to how `rectDragRef` and
`selectionDragRef` handle their respective drags. The existing `drawUiLayer` callback already
renders `selection` from Zustand (committed) or `selectionDragRef.current` (transient); a third
branch for `selectionMoveRef.current` fits naturally into the same draw block. The Escape
revert follows the same pattern as other ref-based cancellations in the permanent keydown listener.
Arrow-key nudging runs via a dedicated `useEffect` listening for Arrow keys while `selection.active`
is true; `setSelection` updates Zustand directly (no ref needed — arrow nudge is instant, not a drag).

**Primary recommendation:** Implement move-drag entirely as a ref-based transient operation in
MapCanvas.tsx, mirroring the selectionDragRef pattern. No new Zustand actions needed. Cursor
switching is done imperatively on the canvas DOM element to avoid React re-renders.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 18 / TypeScript | existing | Component lifecycle, hooks | Project foundation |
| Zustand | existing | `selection` state, `setSelection`, `clearSelection` | Project state management |
| Canvas 2D API | native | UI layer rendering (drawUiLayer) | All canvas overlays use this |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `useRef` | React 18 | Transient drag state (no re-render) | All drag operations in this codebase |
| `useEffect` + `window.addEventListener` | React 18 | Arrow key nudging, Escape cancellation | All keyboard interaction in this codebase |
| `requestAnimationFrame` via `requestUiRedraw` | native | Debounced UI layer redraws | Every cursor-move-based redraw |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Ref-based move drag state | React `useState` for move drag | useState causes re-renders on every mousemove — unacceptable perf. Ref-based is the established pattern. |
| Imperative cursor style on canvas DOM | CSS class + `useState` | CSS class requires React re-render; imperative `canvas.style.cursor` is instant, no re-render |
| `setSelection` for live drag updates | Direct Zustand mutation during drag | Zustand triggers re-renders on every tile change during drag; ref-based live preview is established pattern |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended Project Structure

No new files needed. All changes are in:

```
src/components/MapCanvas/
├── MapCanvas.tsx    # New ref, mouse handler branches, draw branch, keyboard handler
└── MapCanvas.css    # New .move-selection CSS cursor class
```

Optionally, if the `isInsideSelection` helper grows complex:

```
src/components/MapCanvas/MapCanvas.tsx   # inline helper function (preferred — keeps it local)
```

---

### Pattern 1: Ref-Based Transient Drag State

**What:** All drag operations store transient state in a `useRef` object to avoid React re-renders.
On mouseup, the final value is committed to Zustand.

**When to use:** Any drag where intermediate state only needs to update the canvas UI layer, not
trigger React component re-renders.

**Example (from selectionDragRef, the direct analogue):**

```typescript
// Source: MapCanvas.tsx line 60-61 (selectionDragRef) and line 1876-1879 (mousedown)
const selectionDragRef = useRef<{ active: boolean; startX: number; startY: number; endX: number; endY: number }>({
  active: false, startX: 0, startY: 0, endX: 0, endY: 0
});

// mousedown:
selectionDragRef.current = { active: true, startX: x, startY: y, endX: x, endY: y };
requestUiRedraw();

// mousemove:
selectionDragRef.current = { ...prevSel, endX: x, endY: y };
requestUiRedraw();

// mouseup:
setSelection({ startX: minX, startY: minY, endX: maxX, endY: maxY, active: true });
selectionDragRef.current = { active: false, startX: 0, startY: 0, endX: 0, endY: 0 };
```

**For move-selection, the analogous ref:**

```typescript
// New ref to add alongside selectionDragRef
const selectionMoveRef = useRef<{
  active: boolean;
  // Original selection position before drag started (for Escape revert)
  origStartX: number; origStartY: number; origEndX: number; origEndY: number;
  // Current dragged position (rendered live, committed on mouseup)
  startX: number; startY: number; endX: number; endY: number;
  // Cursor offset from selection top-left when drag began
  grabOffsetX: number; grabOffsetY: number;
}>({
  active: false,
  origStartX: 0, origStartY: 0, origEndX: 0, origEndY: 0,
  startX: 0, startY: 0, endX: 0, endY: 0,
  grabOffsetX: 0, grabOffsetY: 0
});
```

---

### Pattern 2: Mouse-Handler Branching on ToolType.SELECT

**What:** `handleMouseDown` dispatches on `currentTool` and also on sub-conditions (e.g., is the
cursor inside an active selection?). The move-drag branch intercepts mousedown before the
existing "clear selection + start new drag" branch.

**Current SELECT mousedown (line 1875-1879):**

```typescript
} else if (currentTool === ToolType.SELECT) {
  // Clear any existing selection and start new drag
  clearSelection();
  selectionDragRef.current = { active: true, startX: x, startY: y, endX: x, endY: y };
  requestUiRedraw();
}
```

**New SELECT mousedown (with move branch first):**

```typescript
} else if (currentTool === ToolType.SELECT) {
  if (selection.active && isInsideSelection(x, y, selection)) {
    // Start a move-drag: record original position + grab offset
    const selMinX = Math.min(selection.startX, selection.endX);
    const selMinY = Math.min(selection.startY, selection.endY);
    const selMaxX = Math.max(selection.startX, selection.endX);
    const selMaxY = Math.max(selection.startY, selection.endY);
    selectionMoveRef.current = {
      active: true,
      origStartX: selMinX, origStartY: selMinY, origEndX: selMaxX, origEndY: selMaxY,
      startX: selMinX, startY: selMinY, endX: selMaxX, endY: selMaxY,
      grabOffsetX: x - selMinX, grabOffsetY: y - selMinY
    };
    requestUiRedraw();
  } else {
    // Start new selection drag (existing behavior)
    clearSelection();
    selectionDragRef.current = { active: true, startX: x, startY: y, endX: x, endY: y };
    requestUiRedraw();
  }
}
```

---

### Pattern 3: isInsideSelection Helper

**What:** A pure function that checks whether a tile coordinate falls within an active Selection.
Must handle the fact that `selection.startX/endX` may not be normalized (startX could be > endX
if user dragged right-to-left). The existing draw code normalizes with `Math.min/max` — do the same.

```typescript
// Inline helper (not exported, stays private to MapCanvas)
function isInsideSelection(tileX: number, tileY: number, sel: Selection): boolean {
  const minX = Math.min(sel.startX, sel.endX);
  const minY = Math.min(sel.startY, sel.endY);
  const maxX = Math.max(sel.startX, sel.endX);
  const maxY = Math.max(sel.startY, sel.endY);
  return tileX >= minX && tileX <= maxX && tileY >= minY && tileY <= maxY;
}
```

Note: The Selection interface is already normalized when committed (mouseup normalizes before
calling `setSelection`), so at runtime `selection.startX <= selection.endX` will typically hold.
However, defensive normalization is cheap and prevents bugs if that assumption ever changes.

---

### Pattern 4: Mousemove Update for Move Drag

**What:** In `handleMouseMove`, add a new branch for `selectionMoveRef.current.active`, parallel
to `selectionDragRef.current.active`. Compute new top-left position by subtracting grab offset,
then derive new endX/endY from selection width/height.

```typescript
} else if (selectionMoveRef.current.active) {
  const move = selectionMoveRef.current;
  const w = move.origEndX - move.origStartX;
  const h = move.origEndY - move.origStartY;
  // New top-left = cursor - grab offset, clamped to map bounds
  const newMinX = Math.max(0, Math.min(MAP_WIDTH - 1 - w, x - move.grabOffsetX));
  const newMinY = Math.max(0, Math.min(MAP_HEIGHT - 1 - h, y - move.grabOffsetY));
  if (newMinX !== move.startX || newMinY !== move.startY) {
    selectionMoveRef.current = {
      ...move,
      startX: newMinX, startY: newMinY,
      endX: newMinX + w, endY: newMinY + h
    };
    requestUiRedraw();
  }
}
```

**Ordering matters:** This new branch must be placed BEFORE the `selectionDragRef.current.active`
branch in the `handleMouseMove` if-else chain, or as a parallel elif. Since `selectionMoveRef`
and `selectionDragRef` are mutually exclusive (only one can be active at a time), order does not
technically matter, but placing move-check first is cleaner.

---

### Pattern 5: Mouseup Commit for Move Drag

**What:** In `handleMouseUp`, add a branch that commits the final position to Zustand and resets the ref.

```typescript
if (selectionMoveRef.current.active) {
  const move = selectionMoveRef.current;
  setSelection({ startX: move.startX, startY: move.startY, endX: move.endX, endY: move.endY, active: true });
  selectionMoveRef.current = { active: false, origStartX: 0, origStartY: 0, origEndX: 0, origEndY: 0, startX: 0, startY: 0, endX: 0, endY: 0, grabOffsetX: 0, grabOffsetY: 0 };
  requestUiRedraw();
}
```

---

### Pattern 6: drawUiLayer – Rendering Move Preview

**What:** The existing draw block at line 843-901 renders the active selection. It already handles
two sources: `selectionDragRef.current.active` (transient) or `selection.active` (committed). Add
a third source: `selectionMoveRef.current.active`.

**Current (line 843-848):**

```typescript
const activeSelection = selectionDragRef.current.active
  ? selectionDragRef.current
  : selection.active
    ? selection
    : null;
```

**New:**

```typescript
const activeSelection = selectionMoveRef.current.active
  ? selectionMoveRef.current   // Live move preview (takes priority over committed)
  : selectionDragRef.current.active
    ? selectionDragRef.current
    : selection.active
      ? selection
      : null;
```

Both `selectionMoveRef.current` and `selectionDragRef.current` expose `startX/startY/endX/endY`
fields (the live values, not the originals), so the downstream rendering code that uses those
fields is unchanged.

---

### Pattern 7: Escape Cancellation for Move Drag

**What:** The permanent keydown listener at line 2492 handles Escape for all ref-based drags.
Add a new branch that restores the original selection position from `selectionMoveRef.current`.

```typescript
// Cancel selection move drag (with revert to original position)
if (selectionMoveRef.current.active) {
  e.preventDefault();
  const move = selectionMoveRef.current;
  // Revert Zustand selection to original position
  setSelection({ startX: move.origStartX, startY: move.origStartY, endX: move.origEndX, endY: move.origEndY, active: true });
  selectionMoveRef.current = { active: false, ... };
  requestUiRedraw();
}
```

Note: The existing Escape handler for `selection.active` (line 2464-2476) calls `clearSelection()`.
During a move drag, the selection is in `selectionMoveRef`, not yet in Zustand. The Escape handler
for the move drag must revert to the original, not clear the selection entirely. These two handlers
are independent and do not conflict.

---

### Pattern 8: CSS Cursor for Move Affordance

**What:** When the cursor is inside an active selection and `currentTool === ToolType.SELECT`,
change the canvas cursor to `move`. This provides clear affordance that clicking will move,
not start a new selection.

**Implementation:** Imperative DOM update in `handleMouseMove` (no React re-render):

```typescript
// In handleMouseMove, after computing tile (x, y):
const canvas = uiLayerRef.current;
if (canvas && currentTool === ToolType.SELECT && selection.active && isInsideSelection(x, y, selection)) {
  canvas.style.cursor = 'move';
} else if (canvas && !isDragging) {
  canvas.style.cursor = '';  // Reset to CSS-defined crosshair
}
```

The CSS file currently defines `.map-canvas { cursor: crosshair }` and `.map-canvas.panning { cursor: grabbing }`.
The `move` cursor set imperatively on `style.cursor` takes precedence over the class-level CSS,
so this works without touching the CSS file or className logic.

During an active move drag, the cursor should stay as `move` (or could switch to `grabbing`).
Setting it at the start of the move drag in `handleMouseDown` and resetting in `handleMouseUp`/`handleMouseLeave` covers this.

---

### Pattern 9: Arrow Key Nudging

**What:** While `selection.active` is true and currentTool is SELECT, Arrow keys move the marquee
by 1 tile (or 10 tiles with Shift). This requires a `useEffect` that subscribes to `keydown` and
calls `setSelection`.

**Implementation:** A new `useEffect` that depends on `[selection, currentTool, setSelection]`:

```typescript
useEffect(() => {
  if (!selection.active || currentTool !== ToolType.SELECT) return;

  const handleArrowKey = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    const step = e.shiftKey ? 10 : 1;
    const minX = Math.min(selection.startX, selection.endX);
    const minY = Math.min(selection.startY, selection.endY);
    const maxX = Math.max(selection.startX, selection.endX);
    const maxY = Math.max(selection.startY, selection.endY);
    const w = maxX - minX;
    const h = maxY - minY;

    let dx = 0, dy = 0;
    if (e.key === 'ArrowLeft')  { dx = -step; }
    if (e.key === 'ArrowRight') { dx =  step; }
    if (e.key === 'ArrowUp')    { dy = -step; }
    if (e.key === 'ArrowDown')  { dy =  step; }
    if (dx === 0 && dy === 0) return;

    e.preventDefault();
    const newMinX = Math.max(0, Math.min(MAP_WIDTH - 1 - w, minX + dx));
    const newMinY = Math.max(0, Math.min(MAP_HEIGHT - 1 - h, minY + dy));
    setSelection({ startX: newMinX, startY: newMinY, endX: newMinX + w, endY: newMinY + h, active: true });
  };

  window.addEventListener('keydown', handleArrowKey);
  return () => window.removeEventListener('keydown', handleArrowKey);
}, [selection, currentTool, setSelection]);
```

**Boundary clamping:** `MAP_WIDTH = 256`, `MAP_HEIGHT = 256`. Clamping prevents moving the selection
off-map. The new top-left must be >= 0 and new bottom-right must be < MAP_SIZE.

---

### Pattern 10: handleMouseLeave – Move Drag Cleanup

**What:** `handleMouseLeave` currently cancels transient ref state (line 2161-2207). Add cleanup
for `selectionMoveRef`: leave the selection at its current dragged position (do not revert), or
alternatively cancel it — the planner should decide. Recommendation: commit the current dragged
position on leave (same behavior as mouseup), so the selection ends up where it was last seen.

---

### Anti-Patterns to Avoid

- **Updating Zustand on every mousemove during move drag.** `setSelection` triggers Zustand
  subscribers → React re-renders. Use `selectionMoveRef` for live preview; commit only on mouseup.

- **Using `useState` for move drag active flag.** Would cause React re-renders on mousedown/up.
  Use ref-based flag exclusively.

- **Checking `selection.startX <= cursorX <= selection.endX` without normalizing.** The selection
  object from Zustand is normalized at commit time, but always use `Math.min/max` defensively.

- **Forgetting to cancel the move drag in `handleMouseLeave`.** If the user drags off-canvas, the
  drag must be resolved (commit or revert). The existing pattern for `selectionDragRef` cancels
  on leave; apply the same to `selectionMoveRef`.

- **Arrow keys moving the viewport instead of the selection.** The existing arrow-key scroll
  behavior (if any) must not fire when `selection.active && currentTool === SELECT`. Check for
  conflicts with existing arrow key handlers. There are no existing arrow key handlers in this
  codebase for navigation (arrows are not used for scrolling), so no conflict expected.

- **Scope creep: moving tiles with the selection.** Phase context explicitly documents this as
  deferred to v2+. The implementation must update only selection coordinates, never tile data.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cursor "inside selection" detection | Custom spatial index | Simple tile coordinate comparison (`isInsideSelection` helper) | Selection is a rectangle in integer tile coords; trivial bounds check |
| Live drag rendering | Separate canvas layer | Existing `drawUiLayer` + `requestUiRedraw` | Already established; consistent with all other drag UI |
| Keyboard event management | Custom event bus | `useEffect` + `window.addEventListener` | Established pattern used by 3 other keyboard handlers in this file |

**Key insight:** This feature is almost entirely plumbing — connecting existing pieces (refs, drawUiLayer, Escape handler, setSelection) with new branching logic. Very little new code; mostly insertion at well-defined extension points.

---

## Common Pitfalls

### Pitfall 1: Grab Offset Not Accounting for Normalized Coords

**What goes wrong:** If you compute `grabOffsetX = x - selection.startX`, but `startX > endX`
(rare post-normalization, but possible if the selection was made by dragging right-to-left and
the slice didn't normalize), the grab offset is wrong.

**Why it happens:** Selection commit at mouseup already normalizes (line 2071-2078 of MapCanvas.tsx).
So `selection.startX <= selection.endX` is always true in Zustand. But `selectionDragRef.current`
is NOT normalized during drag. This is irrelevant since move-drag only starts from a committed
`selection.active`, which is always normalized.

**How to avoid:** Use `Math.min(selection.startX, selection.endX)` for the grab offset calculation.
Defensive and correct.

### Pitfall 2: Move Drag Interferes with New Selection Drag

**What goes wrong:** `selectionMoveRef.current.active` and `selectionDragRef.current.active` are
both checked in mousemove. If both get set simultaneously, the UI renders incorrectly.

**Why it happens:** Impossible by design — mousedown only sets one or the other. But must verify
that on mouseup, both are properly reset.

**How to avoid:** Ensure mouseup resets whichever ref is active, and `handleMouseLeave` does the
same. Never set both refs to `active: true` in the same handler.

### Pitfall 3: Arrow Keys Intercepted While Typing in Inputs

**What goes wrong:** Arrow key handler fires when user is typing in an input field inside the
editor (e.g., map name field).

**Why it happens:** `window.addEventListener` catches all keydown events.

**How to avoid:** Guard with `if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;`
— already the established pattern in all existing key handlers in this file.

### Pitfall 4: Cursor Style Not Reset After Move Drag

**What goes wrong:** After completing a move drag, the canvas cursor stays as `move` instead of
reverting to `crosshair`.

**Why it happens:** `canvas.style.cursor = 'move'` was set imperatively in mousemove but never
cleared in mouseup.

**How to avoid:** On mouseup and handleMouseLeave, reset `canvas.style.cursor = ''` to let the
CSS class take over.

### Pitfall 5: Arrow Key `step=10` Moving Selection Off Map

**What goes wrong:** With Shift+Arrow (step=10), the selection can be pushed off the 256x256 boundary.

**Why it happens:** Unclamped arithmetic.

**How to avoid:** Clamp `newMinX` to `[0, MAP_WIDTH - 1 - selectionWidth]` and `newMinY` to
`[0, MAP_HEIGHT - 1 - selectionHeight]`.

---

## Code Examples

Verified patterns from existing codebase:

### Existing Selection Commit Pattern (mouseup, line 2069-2082)

```typescript
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

### Existing drawUiLayer Selection Rendering (line 843-901)

```typescript
const activeSelection = selectionDragRef.current.active
  ? selectionDragRef.current
  : selection.active
    ? selection
    : null;

if (activeSelection) {
  const minX = Math.min(activeSelection.startX, activeSelection.endX);
  const minY = Math.min(activeSelection.startY, activeSelection.endY);
  const maxX = Math.max(activeSelection.startX, activeSelection.endX);
  const maxY = Math.max(activeSelection.startY, activeSelection.endY);
  // ... render marching ants ...
}
```

### Existing Escape Handler for Ref-Based State (line 2492-2550)

```typescript
if (e.key === 'Escape') {
  if (engineRef.current?.getIsDragActive()) { /* cancel pencil drag */ }
  if (lineStateRef.current.active) { /* cancel line */ }
  if (selectionDragRef.current.active) {
    e.preventDefault();
    selectionDragRef.current = { active: false, startX: 0, startY: 0, endX: 0, endY: 0 };
    requestUiRedraw();
  }
  if (rectDragRef.current.active) { /* cancel rect drag */ }
  if (rulerStateRef.current.active) { /* cancel ruler */ }
}
```

### Selection Interface (src/core/editor/slices/types.ts)

```typescript
export interface Selection {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  active: boolean;
}
```

### setSelection Action (EditorState.ts line 320-326)

```typescript
setSelection: (selection) => {
  const id = get().activeDocumentId;
  if (!id) return;
  get().setSelectionForDocument(id, selection);
  const doc = get().documents.get(id);
  if (doc) set({ selection: doc.selection });
},
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single canvas | 3-layer canvas (map, grid, UI overlay) | Phase 88-90 era | UI redraws do not touch tile buffer |
| useState for drag state | useRef for drag state | v2.8 | Zero re-renders during drag |
| Deferred viewport commit | Immediate viewport commit during pan | v2.8 | Smooth panning |

**No deprecated patterns in this domain.**

---

## Open Questions

1. **What happens on `handleMouseLeave` during move drag?**
   - What we know: Current code cancels `selectionDragRef` on leave (resets to inactive,
     does NOT commit). Same would be applied to `selectionMoveRef`.
   - What's unclear: Should move drag commit (keep new position) or revert (restore original)
     on mouse leave? UX convention: photoshop-style editors typically leave the selection where
     it was dragged to. Recommendation: commit on leave (same as mouseup), not revert.
   - **Planner decision needed.**

2. **Should the cursor be `move` or `grab`/`grabbing` during active move drag?**
   - What we know: The panning cursor uses `grabbing` (for panning whole viewport).
     Selection move is a more precise operation.
   - Recommendation: `move` cursor on hover inside selection, `grabbing` while actively
     dragging. This matches OS conventions.
   - **Planner decision needed** (or Claude's discretion to pick `move`/`grab`).

3. **Arrow key conflicts with any existing keyboard handlers?**
   - What we know: Searched codebase — no existing handler uses Arrow keys for navigation or
     any other purpose. Arrow keys are only used in the scroll bar implementation (button elements),
     not via `window.addEventListener`.
   - Conclusion: No conflict. HIGH confidence.

---

## Sources

### Primary (HIGH confidence)

- Direct code reading: `E:\NewMapEditor\src\components\MapCanvas\MapCanvas.tsx` — all handler
  patterns, ref declarations, drawUiLayer, Escape handlers, mousedown/move/up logic
- Direct code reading: `E:\NewMapEditor\src\core\editor\slices\types.ts` — Selection interface
- Direct code reading: `E:\NewMapEditor\src\core\editor\EditorState.ts` — setSelection, clearSelection
- Direct code reading: `E:\NewMapEditor\src\core\editor\slices\documentsSlice.ts` — setSelectionForDocument
- Direct code reading: `E:\NewMapEditor\src\components\MapCanvas\MapCanvas.css` — cursor CSS

### Secondary (MEDIUM confidence)

- Phase description and prior decisions from task context (provided by orchestrator)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are existing project dependencies; verified by reading imports
- Architecture: HIGH — all patterns verified by reading exact line numbers in the actual source files
- Pitfalls: HIGH — derived from reading actual code behavior and established patterns in the file

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (stable codebase; patterns unlikely to change unless MapCanvas is refactored)
