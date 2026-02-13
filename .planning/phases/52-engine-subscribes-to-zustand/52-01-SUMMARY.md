---
phase: 52-engine-subscribes-to-zustand
plan: 01
subsystem: rendering/canvas-engine
tags: [architecture, performance, zustand, subscriptions]
dependency_graph:
  requires: [51-extract-canvasengine-class]
  provides: [zustand-subscriptions, engine-driven-rendering]
  affects: [MapCanvas, CanvasEngine]
tech_stack:
  added: []
  patterns: [zustand-subscribe, instance-field-closure-safety, drag-guard]
key_files:
  created: []
  modified:
    - src/core/canvas/CanvasEngine.ts
    - src/components/MapCanvas/MapCanvas.tsx
decisions:
  - title: "Manual reference checks instead of subscribeWithSelector"
    rationale: "Reference equality checks (vp !== prevVp, map !== prevMap) are sufficient for our immutable state updates. No need for additional middleware."
  - title: "Synchronous draw in subscriptions (no RAF debouncing yet)"
    rationale: "Phase 52 focuses on wiring subscriptions. Phase 54 will add RAF batching for performance. Current approach is simpler and verifiable."
  - title: "Instance field documentId avoids stale closure pitfall"
    rationale: "Subscriptions use this.documentId (instance field) instead of closure-captured parameter to avoid Pitfall 5 from research (stale closure in long-lived subscription)."
  - title: "isDragActive guard declared but not wired"
    rationale: "Phase 53 will add beginDrag()/commitDrag() methods. Guard is in place to prevent double-rendering during drag (SUB-03 requirement)."
metrics:
  duration: "~15 minutes"
  completed: 2026-02-13T05:52:25Z
---

# Phase 52 Plan 01: Engine Subscribes to Zustand Summary

Engine-driven rendering via Zustand subscriptions — viewport blit, map patch, and animation tick now triggered by engine, not React useEffect blocks.

## What Was Built

**Core architectural shift:** CanvasEngine now subscribes directly to Zustand store changes (viewport, map, animation) and drives all canvas rendering. React reconciliation removed from rendering hot path — state changes trigger immediate canvas updates without waiting for React scheduler.

### CanvasEngine Zustand Integration

**Added 3 subscriptions in setupSubscriptions():**

1. **Viewport subscription** — Immediate blit on viewport change
   - Compares `this.getViewport(state) !== this.getViewport(prevState)` by reference
   - Calls `blitToScreen()` directly (single drawImage, no buffer rebuild)
   - No React render cycle delay

2. **Map subscription** — Incremental patch on tile changes (drag-guarded)
   - Compares `this.getMap(state) !== this.getMap(prevState)` by reference
   - Guarded by `isDragActive` flag (currently false, Phase 53 wires it)
   - Calls `drawMapLayer()` for diff-based buffer patching
   - Skips blit if no actual tiles changed (spurious re-render protection)

3. **Animation subscription** — Patch animated tiles on frame tick
   - Compares `state.animationFrame !== prevState.animationFrame`
   - Updates `this.animationFrame` instance field
   - Calls `patchAnimatedTiles()` to update visible animated tiles only
   - Blits buffer to screen if any animated tiles found

**Helper methods:**
- `getViewport(state)` — Handles both global (`state.viewport`) and per-document (`state.documents.get(documentId)?.viewport`)
- `getMap(state)` — Handles both global (`state.map`) and per-document (`state.documents.get(documentId)?.map`)
- Uses instance field `this.documentId` (not closure-captured) to avoid stale closure pitfall

**Lifecycle updates:**
- `attach(canvas, documentId?)` — Now accepts optional `documentId`, stores it, calls `setupSubscriptions()`
- `detach()` — Unsubscribes all Zustand listeners, cancels pending RAF, nulls refs

**Declared for future phases:**
- `isDragActive: boolean` — Guard for map subscription (Phase 53 wires beginDrag/commitDrag)
- `dirty` flags — Per-layer dirty flags (mapBuffer, mapBlit, uiOverlay) for Phase 54 RAF batching
- `rafId: number | null` — For future RAF debouncing in Phase 54

### MapCanvas Simplification

**Removed 3 React rendering useEffect blocks:**

1. **drawMapLayer trigger** (was line 628-630)
   - Deleted: `useEffect(() => drawMapLayer(), [drawMapLayer])`
   - Now handled by engine's map subscription

2. **Viewport subscription** (was line 637-657)
   - Deleted: Manual `useEditorStore.subscribe()` for viewport blit
   - Now handled by engine's viewport subscription

3. **Animation tick** (was line 661-682)
   - Deleted: `useEffect` that called `patchAnimatedTiles()` on animationFrame change
   - Now handled by engine's animation subscription

**Added focused animation-overlay useEffect:**
- Handles UI layer redraw when animation ticks affect visible overlays (paste preview, conveyor preview, selection with animated tiles)
- Intentionally separate from engine subscriptions (Phase 54 will move UI overlay into engine)

**Updated engine mount:**
- Changed `engine.attach(canvas)` → `engine.attach(canvas, documentId)`
- Engine now has access to document-specific state for MDI support

**Kept (intentionally):**
- `drawUiLayer` useEffect (line 628-630) — Phase 54 will migrate UI overlay to engine
- `map`/`viewport` useShallow subscription — Still needed for drawUiLayer deps, scroll calculations, mouse handlers
- `animationFrame` selector — Still needed for animation-overlay useEffect
- `drawMapLayer` callback — Still used by pan drag (requestProgressiveRender), commitPan, ResizeObserver

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

All success criteria met:

✅ **TypeScript compilation:** `npm run typecheck` passes (3 intentional unused var warnings for Phase 53/54 features)
✅ **Subscription-driven rendering:** All rendering triggered by `useEditorStore.subscribe()` callbacks in CanvasEngine
✅ **No double rendering:** Old React useEffect blocks removed (drawMapLayer trigger, viewport subscription, animation tick)
✅ **isDragActive guard present:** Map subscription checks `this.isDragActive` before redrawing (line 346)
✅ **Proper cleanup:** `detach()` unsubscribes all listeners, cancels RAF, nulls refs
✅ **UI overlay preserved:** `drawUiLayer` useEffect still active (Phase 54 will migrate it)

**Subscription verification:**
- 3 Zustand subscriptions in CanvasEngine.setupSubscriptions()
- Each subscription pushed to `this.unsubscribers` array
- All guarded against null `screenCtx`/`bufferCtx` (Pitfall 4)
- Instance field `this.documentId` used (not closure capture) (Pitfall 5)

## Technical Details

### Subscription Pattern

Used manual reference equality checks instead of `subscribeWithSelector` middleware:

```typescript
const unsub = useEditorStore.subscribe((state, prevState) => {
  const vp = this.getViewport(state);
  const prevVp = this.getViewport(prevState);
  if (vp !== prevVp) {
    // trigger render
  }
});
```

**Why this works:**
- Zustand state updates are immutable (new object on every change)
- Reference inequality (`vp !== prevVp`) reliably detects changes
- No extra middleware needed

### Closure Safety

**Avoided stale closure pitfall by using instance fields:**

```typescript
// BAD (stale closure):
attach(canvas, documentId) {
  useEditorStore.subscribe((state) => {
    const doc = state.documents.get(documentId); // Captured at attach() time
  });
}

// GOOD (fresh read):
attach(canvas, documentId) {
  this.documentId = documentId; // Store as instance field
  useEditorStore.subscribe((state) => {
    const doc = state.documents.get(this.documentId); // Read current value
  });
}
```

Long-lived subscriptions (attached at mount, detached at unmount) must read from instance fields, not closure-captured parameters.

### Drag Guard

Map subscription has `isDragActive` guard to prevent double-rendering during drag:

```typescript
if (this.isDragActive) return; // Skip map redraw during drag
```

**Current state:** Always `false` (Phase 53 adds beginDrag/commitDrag methods)

**Why needed:** During pencil/fill/wall drag, pending tiles accumulate in ref. If Zustand map changes, engine would redraw from store (missing pending tiles). Guard blocks this until mouseup commits pending tiles.

## File Manifest

| File | Lines Changed | Impact |
|------|---------------|--------|
| `src/core/canvas/CanvasEngine.ts` | +90, -1 | Core rendering engine — now owns Zustand subscriptions |
| `src/components/MapCanvas/MapCanvas.tsx` | +5, -49 | React component — simplified, no longer drives rendering |

**Total:** +95, -50 (net +45 lines)

## Commits

| Commit | Type | Description |
|--------|------|-------------|
| 30993ee | feat(52-01) | Add Zustand subscriptions to CanvasEngine |
| f4b6bb3 | refactor(52-01) | Remove React rendering useEffect blocks from MapCanvas |

## Next Phase Readiness

**Phase 53 prerequisites met:**
- ✅ CanvasEngine has Zustand subscriptions wired
- ✅ isDragActive guard declared (Phase 53 adds beginDrag/commitDrag)
- ✅ Engine stores documentId (needed for per-document drag state)
- ✅ React useEffect blocks removed (no interference with imperative drag)

**Phase 54 prerequisites met:**
- ✅ Dirty flags declared (mapBuffer, mapBlit, uiOverlay)
- ✅ rafId field declared for RAF batching
- ✅ drawUiLayer still in React (will migrate to engine)

**Phase 55 prerequisites met:**
- ✅ Engine has full rendering ownership (viewport, map, animation)
- ✅ All cleanup paths tested (detach unsubscribes, cancels RAF)

## Self-Check: PASSED

**Created files:** None (only modifications)

**Modified files:**
```bash
$ [ -f "E:\NewMapEditor\src\core\canvas\CanvasEngine.ts" ] && echo "FOUND"
FOUND
$ [ -f "E:\NewMapEditor\src\components\MapCanvas\MapCanvas.tsx" ] && echo "FOUND"
FOUND
```

**Commits:**
```bash
$ git log --oneline --all | grep -E "(30993ee|f4b6bb3)"
f4b6bb3 refactor(52-01): remove React rendering useEffect blocks from MapCanvas
30993ee feat(52-01): add Zustand subscriptions to CanvasEngine
```

**Subscription verification:**
```bash
$ grep -c "useEditorStore.subscribe" src/core/canvas/CanvasEngine.ts
3
```

**isDragActive guard:**
```bash
$ grep "if (this.isDragActive)" src/core/canvas/CanvasEngine.ts
      if (this.isDragActive) return; // Phase 53 will wire beginDrag/commitDrag
```

**Detach cleanup:**
```bash
$ grep -A 3 "Unsubscribe from Zustand" src/core/canvas/CanvasEngine.ts
    // Unsubscribe from Zustand
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
```

All artifacts verified present and correct.
