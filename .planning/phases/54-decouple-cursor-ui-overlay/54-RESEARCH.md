# Phase 54: Decouple Cursor & UI Overlay - Research

**Researched:** 2026-02-13
**Domain:** Imperative UI overlay rendering for tile map editor
**Confidence:** HIGH

## Summary

Phase 54 removes React state updates for cursor tracking, line preview, selection rectangles, and paste preview position. These are the final sources of React re-renders during mousemove interactions. The pattern mirrors Phase 53 (pencil drag decoupling): store transient UI state in refs, redraw UI layer imperatively via on-demand RAF, commit to Zustand only when state becomes "permanent" (e.g., selection finalized on mouseup).

Currently, setCursorTile() fires on every mousemove (line 922), triggering React re-render + drawUiLayer useEffect. Line preview updates (setLineState) and selection drag updates (setSelectionDrag) have the same problem. These are pure UI concerns that never need to propagate to Zustand until the user commits the action.

**Primary recommendation:** Replace all transient UI state (cursor position, line preview endpoint, selection drag rect, paste preview position) with refs. Add requestUiRedraw() function that marks UI overlay dirty and schedules RAF to redraw canvas. Remove all useState setters from mousemove handlers. Zero React re-renders during any tool's mousemove interaction.

## Standard Stack

### Core (NO NEW DEPENDENCIES)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Existing React 18 | 18.3.1 | useRef hooks for transient UI state | Already used for cursorTileRef, panStartRef, etc. Zero new APIs. |
| Existing Zustand 5 | 5.0.3 | State management for committed actions | Already stores selection, pastePreviewPosition, etc. No changes to store schema. |
| Canvas API | Browser API | Imperative UI overlay rendering | Already renders overlays in drawUiLayer(). No architectural change. |
| requestAnimationFrame | Browser API | On-demand RAF for dirty flag invalidation | Already used for pan progressive render (line 579). Same pattern. |

### Supporting

None. Zero new dependencies required.

## Architecture Patterns

### Pattern 1: Ref-Based Transient UI State

**What:** Store cursor position, line endpoint, selection drag rect, paste preview position in refs instead of React state during active interactions.

**When to use:** For any UI state that:
1. Updates on every mousemove (high frequency)
2. Only affects canvas rendering (not React UI panels)
3. Becomes "permanent" on user action (mouseup, click, Enter)

**Example:**
```typescript
// CURRENT (causes React re-render on every mousemove):
const [cursorTile, setCursorTile] = useState({ x: -1, y: -1 });
const handleMouseMove = (e) => {
  const { x, y } = screenToTile(...);
  setCursorTile({ x, y }); // React re-render!
};

// AFTER (zero React re-renders):
const cursorTileRef = useRef({ x: -1, y: -1 });
const uiDirtyRef = useRef(false);
const rafIdRef = useRef<number | null>(null);

const requestUiRedraw = () => {
  uiDirtyRef.current = true;
  if (rafIdRef.current !== null) return; // Already scheduled
  rafIdRef.current = requestAnimationFrame(() => {
    rafIdRef.current = null;
    if (uiDirtyRef.current) {
      drawUiLayer(); // Imperative redraw
      uiDirtyRef.current = false;
    }
  });
};

const handleMouseMove = (e) => {
  const { x, y } = screenToTile(...);
  cursorTileRef.current = { x, y }; // No React re-render
  requestUiRedraw(); // RAF-debounced canvas redraw
};
```

**Source:** Existing pattern from Phase 53 (pencil drag), adapted for UI-only state.

### Pattern 2: On-Demand RAF for Dirty Flag

**What:** Schedule single RAF callback per frame to redraw UI overlay when dirty flag is set. Multiple mousemove events in one frame coalesce into single redraw.

**When to use:** When multiple high-frequency updates (cursor move, line drag, selection resize) all need to trigger the same redraw function.

**Why:** Browser fires RAF at display refresh rate (~60Hz). If mousemove fires 10x per frame (166Hz mouse), RAF coalesces 10 events into 1 draw per frame. Prevents wasted draws and ensures smooth 60fps rendering.

**Source:** Existing requestProgressiveRender pattern in MapCanvas.tsx line 575.

### Pattern 3: Parameterized Draw Functions

**What:** drawUiLayer() must read from refs instead of closure variables. Pass viewport as parameter if needed, or read via useEditorStore.getState() at draw time.

**When to use:** When imperative draw function is called from RAF callback (outside React render cycle) and needs fresh state.

### Pattern 4: Separate Commit Actions for Finalized State

**What:** Only update Zustand when user commits an action (mouseup finalizes selection, click commits paste). Transient state stays in refs.

**When to use:** Distinguish "dragging" state (ref-based, not persisted) from "committed" state (Zustand, part of document model).

**Source:** Phase 53 pattern (pendingTiles ref → setTiles on mouseup).

### Anti-Patterns to Avoid

- **Double state:** Don't store same value in both ref AND useState. Pick one: ref for transient, state for committed.
- **setState in RAF callback:** Never call setCursorTile() from RAF. Defeats entire purpose of decoupling.
- **Stale closure reads:** Don't capture cursorTile state variable in useCallback deps. Read cursorTileRef.current at draw time.
- **Missing RAF cleanup:** Always cancelAnimationFrame(rafIdRef.current) in useEffect cleanup and component unmount.
- **Forgetting to mark dirty:** Every ref update that affects rendering must call requestUiRedraw().


## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| RAF scheduling with dirty flag | Custom RAF queue/scheduler | Single rafIdRef + uiDirtyRef + requestUiRedraw() helper | Simple, works for our workload. Canvas editors (Excalidraw, tldraw) use identical pattern. |
| Ref state batching | Custom batching system | Browser's RAF automatically batches at 60Hz | RAF already coalesces multiple updates per frame. No library needed. |
| Viewport read in RAF callback | Closure capture with deps | useEditorStore.getState().viewport at draw time | Fresh read, no stale closure risk. Zustand getState() is designed for this. |

**Key insight:** This is the same pattern as Phase 53, but simpler (no Zustand writes during drag, only reads). The imperative bypass infrastructure already exists.

## Common Pitfalls

### Pitfall 1: React Re-Render Overwrites Ref-Based Canvas

**What goes wrong:** Even though cursor is in a ref, React re-renders from unrelated state changes (e.g., tool switch, zoom change) trigger drawUiLayer useEffect, which reads stale cursorTile state instead of cursorTileRef, erasing the ref-based drawing.

**Why it happens:** drawUiLayer is defined as a useCallback with cursorTile in deps (line 572). When React re-renders, it calls the useEffect that calls drawUiLayer(), which reads the useState variable captured in the closure.

**How to avoid:**
1. Remove cursorTile from drawUiLayer deps array
2. Change drawUiLayer to read cursorTileRef.current instead of closure variable
3. Update useEffect deps to NOT include ref-based state (refs never change identity)

**Warning signs:**
- Cursor flickers or jumps position when unrelated state changes
- Canvas shows "old" cursor position after React re-render
- Cursor disappears when changing tools

### Pitfall 2: Missing RAF Cleanup on Unmount

**What goes wrong:** Component unmounts while RAF callback is pending. Callback fires on detached canvas context, throws errors or silently fails.

**Why it happens:** requestAnimationFrame returns ID that must be canceled in cleanup. If cleanup is missing, callback executes after React has detached refs.

**How to avoid:** Always cancel pending RAF in useEffect cleanup.

**Warning signs:**
- Console errors: "Cannot read property 'getContext' of null"
- Canvas operations fail silently after MDI window close
- Memory leaks (RAF callbacks pile up for closed documents)

**Source:** Existing cleanup at MapCanvas.tsx line 1236.

### Pitfall 3: Cursor Deduplication Logic Removed

**What goes wrong:** Removing setCursorTile(prev => ...) deduplication check causes unnecessary redraws even with ref-based state.

**Why it happens:** MapCanvas line 922 has deduplication to prevent React re-render when cursor didn't actually move. With refs, this check must be preserved or every mousemove triggers RAF even when cursor tile hasn't changed.

**How to avoid:** Deduplicate before marking dirty.

**Warning signs:**
- RAF fires on every mousemove even when cursor hasn't moved to new tile
- High CPU usage during slow mouse movement

### Pitfall 4: Line Preview and Selection Drag Not Deduplicated

**What goes wrong:** Similar to Pitfall 3, but for lineState and selectionDrag. Dragging from (10,10) to (10,11) fires hundreds of mousemove events even though only endpoint changed once.

**How to avoid:** Check if tile coordinates changed before marking dirty.

### Pitfall 5: Paste Preview Position Never Committed to Zustand

**What goes wrong:** Paste preview position is ALWAYS transient (never committed), but current code stores it in Zustand (setPastePreviewPosition line 927). This causes React re-renders for ephemeral state.

**Why it happens:** Design confusion: paste preview is pure UI feedback (like cursor), but was implemented as document state.

**How to avoid:** Move pastePreviewPosition to ref-only. Only pasteAt(x, y) writes to Zustand (actual paste operation).

**Warning signs:**
- Pasting mode feels sluggish
- React DevTools shows re-renders during paste preview drag


## Code Examples

Verified patterns from existing codebase:

### RAF-Debounced Redraw

From MapCanvas.tsx line 575-602 (pan progressive render). Adaptation for Phase 54: Replace drawMapLayer(tempViewport) with drawUiLayer(), read cursor/line/selection from refs instead of panDeltaRef.

### Ref-Based Drag State

From MapCanvas.tsx line 50, 56-58 (pan drag refs). Adaptation for Phase 54: Create similar refs for lineStateRef, selectionDragRef, pastePreviewRef.

### Deduplication Check

From MapCanvas.tsx line 922 (cursor deduplication). Adaptation for Phase 54: Move deduplication before ref update to avoid unnecessary RAF calls.

### Escape Cancellation with Ref Reset

From MapCanvas.tsx line 1254-1264 (rect drag Escape). Adaptation for Phase 54: Replace setRectDragState with ref reset + requestUiRedraw().

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| useState for all cursor/overlay state | Refs for transient UI state | Phase 54 (v2.8) | Zero React re-renders during mousemove for any tool |
| useEffect triggers all redraws | On-demand RAF with dirty flag | Phase 54 (v2.8) | Coalesces 10+ mousemove events into 1 draw per frame |
| setCursorTile on every mousemove | cursorTileRef + deduplication | Phase 54 (v2.8) | Eliminates 166Hz React re-renders, reduces to ~10Hz tile change rate |
| pastePreviewPosition in Zustand | pastePreviewRef (ref-only) | Phase 54 (v2.8) | Paste preview mode no longer triggers document state changes |

**Deprecated/outdated:**
- **React state for ephemeral UI feedback:** Replaced by refs. State is for committed document model only.
- **useEffect for all canvas rendering:** Replaced by imperative RAF for transient UI. useEffect only for committed state changes.

## Open Questions

None. All patterns proven in Phase 53 (pencil drag) and existing codebase (pan progressive render, cursor deduplication).

## Sources

### Primary (HIGH confidence)
- MapCanvas.tsx lines 50, 56-58, 575-602, 922, 1236, 1254-1264 - Existing ref patterns, RAF usage, deduplication, cleanup
- CanvasEngine.ts Phase 53 implementation - Ref-based drag state, batch commit pattern
- Phase 53 VERIFICATION.md - Verified pattern that works for high-frequency state updates
- Phase 48 PLAN.md - Progressive render pattern, RAF-debounced viewport updates

### Secondary (HIGH confidence)
- CANVAS-ENGINE-SUMMARY.md - Architecture decisions, on-demand RAF rationale
- PITFALLS.md - Stale closures, transform issues, missing cleanup pitfalls
- VIEWPORT-PITFALLS.md - Coordinate system confusion, zoom-dependent issues

### Tertiary (MEDIUM confidence)
- React 18 useRef docs - Ref mutability, no re-render guarantee
- MDN requestAnimationFrame - RAF coalescing, cleanup requirements

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Zero new dependencies, all APIs already in use
- Architecture: HIGH - Exact same pattern as Phase 53, proven in production
- Pitfalls: HIGH - All from existing codebase analysis, not hypothetical

**Research date:** 2026-02-13
**Valid until:** 2026-03-13 (30 days - stable APIs, no fast-moving dependencies)
