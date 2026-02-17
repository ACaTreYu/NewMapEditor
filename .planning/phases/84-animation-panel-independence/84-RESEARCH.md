# Phase 84: Animation Panel Independence - Research

**Researched:** 2026-02-17
**Domain:** Canvas rendering, animation loops, React conditional rendering
**Confidence:** HIGH

## Summary

Phase 84 fixes a UI coupling issue where animated tiles on the map canvas stop rendering when the user collapses the right sidebar (which contains the AnimationPanel). The root cause is that AnimationPanel owns the animation loop (requestAnimationFrame), and when React conditionally unmounts the component (`{!rightSidebarCollapsed && <AnimationPanel />}`), the RAF loop is cleaned up and `advanceAnimationFrame()` stops being called.

The architecture is already well-designed: AnimationPanel.tsx (lines 90-109) has a conditional RAF loop that checks Page Visibility API and `hasVisibleAnimatedTiles()`. CanvasEngine.ts (lines 505-518) subscribes to `animationFrame` changes in Zustand and calls `patchAnimatedTiles()` to render animated tiles on the map buffer. The problem is merely ownership — the RAF loop lives in AnimationPanel instead of a component that's always mounted.

The fix is simple: move the animation loop to a component that's always mounted (App.tsx or create a dedicated hook), while keeping the AnimationPanel subscription to `animationFrame` for rendering previews. No new dependencies needed — just architectural reorganization.

**Primary recommendation:** Extract animation loop from AnimationPanel.tsx into `src/hooks/useAnimationTimer.ts` custom hook, call it from App.tsx (always mounted), let AnimationPanel continue subscribing to `animationFrame` for preview rendering. Preserve existing Page Visibility API and `hasVisibleAnimatedTiles()` logic.

## Current Architecture

### Animation System (Phase 37, Phase 44)

**Three components coordinate animation:**

1. **AnimationPanel.tsx** (lines 90-109): Owns RAF loop
   - `requestAnimationFrame` with 150ms frame duration
   - Checks `document.hidden` (Page Visibility API) to pause when tab backgrounded
   - Checks `hasVisibleAnimatedTiles()` to pause when no animated tiles visible
   - Calls `advanceAnimationFrame()` to increment Zustand counter

2. **Zustand globalSlice.ts** (line 31, 137): Animation frame counter
   - `animationFrame: number` — global counter (0-255 wrapping)
   - `advanceAnimationFrame: () => void` — increment action

3. **CanvasEngine.ts** (lines 505-518): Subscribes to `animationFrame` changes
   - Subscription 3: `state.animationFrame !== prevState.animationFrame`
   - Calls `patchAnimatedTiles()` which renders animated tiles on buffer
   - Only patches visible animated tiles (viewport culling)
   - Blits dirty rect to screen

**This architecture is CORRECT.** The problem is AnimationPanel ownership — when the component unmounts, the RAF loop stops.

### Panel Visibility State

**App.tsx controls right sidebar visibility:**

- Line 24: `const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);`
- Line 381-384: Collapse toggle button
- Line 389-397: Conditional rendering — `{!rightSidebarCollapsed && <AnimationPanel />}`

**When user collapses sidebar:**
1. `setRightSidebarCollapsed(true)` called
2. React unmounts `<AnimationPanel />` component
3. AnimationPanel's `useEffect` cleanup cancels RAF loop (line 107)
4. `advanceAnimationFrame()` stops being called
5. CanvasEngine's subscription never fires (no state change)
6. Map canvas animated tiles freeze on last frame

### Page Visibility API (Already Implemented)

AnimationPanel.tsx lines 69-80:

```typescript
const [isPaused, setIsPaused] = useState(false);

useEffect(() => {
  const handleVisibilityChange = () => {
    setIsPaused(document.hidden);
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}, []);
```

Lines 95-100 check `!isPausedRef.current` before advancing frame. This logic MUST be preserved in the moved animation loop.

## Standard Stack

### Core (NO NEW DEPENDENCIES)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **Existing React Hooks** | 18.x | Custom hook for animation timer | `useEffect` cleanup pattern for RAF lifecycle |
| **Existing Zustand** | 5.0.3 | Animation frame counter | Already wired, just change who calls `advanceAnimationFrame()` |
| **Existing Page Visibility API** | Browser built-in | Pause when tab hidden | Already implemented in AnimationPanel, move to hook |

### No Installation Required

```bash
# This phase requires ZERO new dependencies
# Fix is extracting existing RAF loop into a custom hook
```

## Architecture Patterns

### Pattern 1: Custom Hook for Global RAF Loop

**What:** Extract animation loop into `src/hooks/useAnimationTimer.ts`, call from App.tsx (always mounted)

**When to use:** When animation logic needs to run regardless of UI panel visibility

**Example:**
```typescript
// Source: Existing AnimationPanel.tsx lines 90-109 + React custom hooks pattern
// https://react.dev/learn/reusing-logic-with-custom-hooks

// src/hooks/useAnimationTimer.ts
import { useEffect, useRef } from 'react';
import { useEditorStore } from '@core/editor';

const FRAME_DURATION = 150; // ms per frame

export function useAnimationTimer() {
  const advanceAnimationFrame = useEditorStore((state) => state.advanceAnimationFrame);
  const documents = useEditorStore((state) => state.documents);

  const lastFrameTimeRef = useRef(0);
  const isPausedRef = useRef(false);

  // Cached check for visible animated tiles (from AnimationPanel.tsx lines 39-66)
  const hasVisibleAnimatedRef = useRef(false);

  useEffect(() => {
    // Compute hasVisibleAnimated when documents change
    const MAP_SIZE = 256;
    const TS = 16;
    let found = false;

    for (const [, doc] of documents) {
      if (!doc.map) continue;
      const { viewport } = doc;
      const tilePixels = TS * viewport.zoom;
      const tilesX = Math.ceil(1920 / tilePixels) + 1;
      const tilesY = Math.ceil(1080 / tilePixels) + 1;
      const startX = Math.max(0, Math.floor(viewport.x));
      const startY = Math.max(0, Math.floor(viewport.y));
      const endX = Math.min(MAP_SIZE, Math.floor(viewport.x) + tilesX);
      const endY = Math.min(MAP_SIZE, Math.floor(viewport.y) + tilesY);

      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          if (doc.map.tiles[y * MAP_SIZE + x] & 0x8000) {
            found = true;
            break;
          }
        }
        if (found) break;
      }
      if (found) break;
    }

    hasVisibleAnimatedRef.current = found;
  }, [documents]);

  // Page Visibility API
  useEffect(() => {
    const handleVisibilityChange = () => {
      isPausedRef.current = document.hidden;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // RAF loop
  useEffect(() => {
    let animationId: number;

    const animate = (timestamp: DOMHighResTimeStamp) => {
      if (!isPausedRef.current && hasVisibleAnimatedRef.current) {
        if (timestamp - lastFrameTimeRef.current >= FRAME_DURATION) {
          advanceAnimationFrame();
          lastFrameTimeRef.current = timestamp;
        }
      }
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [advanceAnimationFrame]);
}

// App.tsx usage
import { useAnimationTimer } from '@/hooks/useAnimationTimer';

export const App: React.FC = () => {
  useAnimationTimer(); // Always runs regardless of panel visibility
  // ... rest of App
};
```

### Pattern 2: AnimationPanel Subscribes to animationFrame (No Loop Ownership)

**What:** AnimationPanel continues to subscribe to `animationFrame` for rendering previews, but no longer owns the RAF loop

**When to use:** When a component needs to react to a global animation counter but shouldn't control it

**Example:**
```typescript
// AnimationPanel.tsx (after refactor)
export const AnimationPanel: React.FC<Props> = ({ tilesetImage }) => {
  // Subscribe to animation frame (NOT owning the loop)
  const animationFrame = useEditorStore((state) => state.animationFrame);

  // NO RAF loop here — moved to useAnimationTimer hook

  // Still uses animationFrame for rendering previews (lines 184-230)
  useEffect(() => {
    if (staticDrawnRef.current) {
      updateAnimatedPreviews(); // Uses animationFrame for current frame
    }
  }, [updateAnimatedPreviews]);

  // ... rest of component
};
```

### Pattern 3: Preserve Page Visibility API Integration

**What:** Keep existing `document.hidden` check to pause animations in background tabs

**Why:** Browser best practice — RAF doesn't auto-pause when tab is hidden in all scenarios (iframe, cross-origin contexts)

**Example:**
```typescript
// Already implemented in AnimationPanel.tsx lines 69-80, just move to hook
useEffect(() => {
  const handleVisibilityChange = () => {
    isPausedRef.current = document.hidden;
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}, []);

// Use isPausedRef in RAF loop
const animate = (timestamp: DOMHighResTimeStamp) => {
  if (!isPausedRef.current && hasVisibleAnimatedRef.current) {
    // Only advance when tab visible AND animated tiles in viewport
    advanceAnimationFrame();
  }
  animationId = requestAnimationFrame(animate);
};
```

### Anti-Patterns to Avoid

- **Moving RAF to Workspace.tsx** — Workspace is per-document, can be unmounted when closing all docs. App.tsx is the correct owner.
- **Creating separate animation state in AnimationPanel** — Would desync from CanvasEngine. Keep single source of truth in Zustand.
- **Removing Page Visibility API** — Performance regression. Keep pause-when-hidden logic.
- **Duplicating hasVisibleAnimatedTiles** — Phase 44 already fixed this calculation. Copy it verbatim, don't rewrite.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Animation loop lifecycle | Custom start/stop logic | React useEffect cleanup | RAF cleanup handled by return function, guaranteed by React |
| Visibility detection | window.focus/blur listeners | Page Visibility API | Handles edge cases (minimized window, screen lock, OS tab switching) |
| Visible tile calculation | Custom viewport math | Copy from AnimationPanel.tsx lines 39-66 | Phase 44 fixed coordinate bugs, proven correct at all zoom levels |

## Common Pitfalls

### Pitfall 1: Moving RAF to Conditionally Mounted Component

**What goes wrong:** Moving RAF loop to Workspace or other per-document component causes animation to stop when switching documents or closing all docs

**Why it happens:** Developer thinks "animation is tied to map canvas" so puts it in Workspace. But Workspace unmounts when all documents are closed.

**How to avoid:** Put RAF loop in App.tsx or a custom hook called from App.tsx. App is always mounted for the lifetime of the application.

**Warning signs:** Animations stop when closing last document and opening a new one; animations freeze when switching between documents

### Pitfall 2: Breaking Page Visibility API Integration

**What goes wrong:** Moving RAF loop without preserving `document.hidden` check causes animations to run in background tabs, wasting CPU

**Why it happens:** Developer copies RAF loop but forgets the visibility pause logic (AnimationPanel.tsx lines 69-80, 95-100)

**How to avoid:** Copy the entire visibility setup — state, listener, ref, check in RAF loop. Test by switching tabs and verifying CPU usage drops to near-zero.

**Warning signs:** High CPU usage when map editor tab is in background; battery drain on laptops; DevTools shows RAF firing when tab hidden

### Pitfall 3: Rewriting hasVisibleAnimatedTiles Logic

**What goes wrong:** Developer rewrites viewport tile calculation from memory, reintroduces coordinate bugs fixed in Phase 44

**Why it happens:** Phase 44 research documented viewport coordinate confusion (pixels vs tiles). Logic looks simple but has subtle edge cases.

**How to avoid:** Copy `hasVisibleAnimatedTiles` logic verbatim from AnimationPanel.tsx lines 39-66. Reference Phase 44 research for why the math is correct.

**Warning signs:** Animations work at 0.25x zoom but not 1x zoom; animations stop when viewport panned near map edges

**Reference:** `.planning/phases/44-animation-visibility-fix/44-RESEARCH.md` lines 9-49

### Pitfall 4: Not Cleaning Up RAF on Unmount

**What goes wrong:** Moving RAF to App.tsx but forgetting cleanup causes RAF to continue firing after app is "closed" (in Electron, when window is hidden but process still running)

**Why it happens:** Developer adds RAF in useEffect but forgets return function

**How to avoid:** Always return cleanup function from useEffect that calls `cancelAnimationFrame(animationId)`

**Warning signs:** DevTools shows RAF continuing to fire after window.close(); memory leak in long-running Electron process

### Pitfall 5: Desyncing AnimationPanel Preview from Global Counter

**What goes wrong:** AnimationPanel creates local animation state instead of subscribing to global `animationFrame`, causing previews to animate at different speed than map canvas

**Why it happens:** Developer thinks "AnimationPanel should be independent" and creates separate RAF loop for previews

**How to avoid:** AnimationPanel subscribes to `animationFrame` from Zustand (line 30). It renders based on global counter, doesn't own the loop.

**Warning signs:** Animation previews in panel animate faster/slower than map canvas; previews and map tiles show different frames of same animation

## Code Examples

Verified patterns from existing codebase:

### Example 1: Current AnimationPanel RAF Loop (To Be Extracted)

```typescript
// Source: AnimationPanel.tsx lines 90-109
useEffect(() => {
  let animationId: number;

  const animate = (timestamp: DOMHighResTimeStamp) => {
    // hasVisibleAnimatedRef is a cached boolean (recomputed on state change, not every frame)
    if (!isPausedRef.current && hasVisibleAnimatedRef.current) {
      if (timestamp - lastFrameTimeRef.current >= FRAME_DURATION) {
        advanceAnimationFrame();
        lastFrameTimeRef.current = timestamp;
      }
    }
    animationId = requestAnimationFrame(animate);
  };

  animationId = requestAnimationFrame(animate);

  return () => {
    cancelAnimationFrame(animationId);
  };
}, [advanceAnimationFrame]);
```

**Why it works:**
- Refs (`isPausedRef`, `hasVisibleAnimatedRef`, `lastFrameTimeRef`) prevent closure stale values
- Cleanup function guaranteed by React
- Delta time accumulation prevents frame skipping at low FPS

### Example 2: hasVisibleAnimatedTiles Cached Computation

```typescript
// Source: AnimationPanel.tsx lines 39-66 (Phase 44 fixed coordinate bug)
const hasVisibleAnimated = useMemo((): boolean => {
  const MAP_SIZE = 256;
  const TS = 16;

  for (const [, doc] of documents) {
    if (!doc.map) continue;

    const { viewport } = doc;
    const tilePixels = TS * viewport.zoom;
    const tilesX = Math.ceil(1920 / tilePixels) + 1;
    const tilesY = Math.ceil(1080 / tilePixels) + 1;

    const startX = Math.max(0, Math.floor(viewport.x));
    const startY = Math.max(0, Math.floor(viewport.y));
    const endX = Math.min(MAP_SIZE, Math.floor(viewport.x) + tilesX);
    const endY = Math.min(MAP_SIZE, Math.floor(viewport.y) + tilesY);

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        if (doc.map.tiles[y * MAP_SIZE + x] & ANIMATED_FLAG) {
          return true;
        }
      }
    }
  }

  return false;
}, [documents]);
```

**Why useMemo:**
- Computation checks all open documents (potentially 8 docs × 1000+ tiles = 8000 checks)
- RAF runs every 16ms, computation only needed when documents change (viewport, tiles, open/close)
- Prevents O(n²) from running 60fps when result hasn't changed

### Example 3: CanvasEngine Animation Subscription

```typescript
// Source: CanvasEngine.ts lines 505-518
const unsubAnimation = useEditorStore.subscribe((state, prevState) => {
  if (state.animationFrame !== prevState.animationFrame) {
    this.animationFrame = state.animationFrame;
    if (!this.tilesetImage || !this.screenCtx) return;
    const map = this.getMap(state);
    const vp = this.getViewport(state);
    if (!map) return;
    const canvasWidth = this.screenCtx.canvas.width;
    const canvasHeight = this.screenCtx.canvas.height;
    this.patchAnimatedTiles(map, vp, state.animationFrame, canvasWidth, canvasHeight);
  }
});
this.unsubscribers.push(unsubAnimation);
```

**Why it's decoupled:**
- CanvasEngine doesn't know WHO increments `animationFrame` (AnimationPanel, future hook, doesn't matter)
- Subscription fires whenever counter changes, renders animated tiles on map buffer
- Works regardless of panel visibility — as long as SOMEONE calls `advanceAnimationFrame()`

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Animation loop in rendering component | Animation loop in always-mounted component (App) | React best practices (2015+) | Loop survives component unmount, prevents animation freeze |
| Local animation state per component | Single global animation counter (Zustand) | Phase 22 (2026-02-05) | Fixed double-tick bug (two RAF loops), single source of truth |
| Always-running RAF | Conditional RAF with visibility check | Phase 37 (2026-02-09) | Pauses when tab hidden or no animated tiles visible |
| Pixel-based viewport math | Tile-based viewport math | Phase 44 (2026-02-11) | Fixed animations only working at 0.25x zoom |

**Deprecated/outdated:**
- **Per-component RAF timers** — Replaced by single timer in Phase 22
- **Pixel-to-tile conversion in hasVisibleAnimatedTiles** — Fixed in Phase 44

## Open Questions

1. **Should useAnimationTimer be a hook or a component?**
   - What we know: Custom hooks are reusable, testable, conventional for non-visual logic
   - What's unclear: Could wrap in `<AnimationTimer />` component instead of hook
   - Recommendation: Use custom hook pattern (`useAnimationTimer`). More idiomatic React 18, easier to test, clearer dependencies.

2. **Should AnimationPanel still import hasVisibleAnimatedTiles logic?**
   - What we know: Logic is duplicated in AnimationPanel (for RAF condition) and will move to hook
   - What's unclear: Should it be extracted to a shared utility, or duplicated?
   - Recommendation: Keep duplicated initially (both hook and AnimationPanel compute it). Extract to utility if third consumer appears. Avoid premature abstraction.

3. **Should animation loop pause when NO documents are open?**
   - What we know: `hasVisibleAnimatedTiles` returns false when `documents.size === 0`
   - What's unclear: Is this the desired behavior, or should we explicitly check document count?
   - Recommendation: Current behavior is correct — zero documents means zero visible animated tiles. No explicit check needed.

## Verification Checklist

Phase 84 success criteria mapped to verification steps:

1. **"User collapses animation panel and sees animated tiles continue animating on map canvas"**
   - Place animated tile at (128, 128) at 1x zoom
   - Click sidebar collapse button (line 381-384 in App.tsx)
   - Verify AnimationPanel component unmounts
   - Verify `animationFrame` counter continues incrementing in DevTools
   - Verify animated tile on map canvas cycles through frames

2. **"User opens map with animated tiles, collapses sidebar, and animations render correctly"**
   - Open a map containing animated tiles (e.g., conveyor belts)
   - Collapse sidebar immediately (before animations start)
   - Verify animations render on map canvas
   - Verify `hasVisibleAnimatedTiles()` returns true
   - Verify `advanceAnimationFrame()` is called every 150ms

3. **"Animation frame counter increments only when browser tab is visible (Page Visibility API)"**
   - Place animated tile at (128, 128)
   - Switch to different browser tab
   - Verify `document.hidden === true`
   - Verify `animationFrame` counter stops incrementing (check DevTools Zustand panel)
   - Switch back to map editor tab
   - Verify `animationFrame` resumes incrementing

## Sources

### Primary (HIGH confidence)

- **AnimationPanel.tsx** - `src/components/AnimationPanel/AnimationPanel.tsx:39-109` - Current RAF loop, Page Visibility, hasVisibleAnimatedTiles
- **CanvasEngine.ts** - `src/core/canvas/CanvasEngine.ts:505-518` - Animation frame subscription, patchAnimatedTiles
- **globalSlice.ts** - `src/core/editor/slices/globalSlice.ts:31,137` - animationFrame counter, advanceAnimationFrame action
- **App.tsx** - `src/App.tsx:24,389-397` - Panel visibility state, conditional rendering
- **Phase 22 Summary** - `.planning/phases/22-canvas-rendering-optimization/22-02-SUMMARY.md:56` - Removed duplicate RAF loops
- **Phase 37 Research** - `.planning/phases/37-render-state-performance/37-RESEARCH.md:75-123` - Conditional animation loop pattern
- **Phase 44 Research** - `.planning/phases/44-animation-visibility-fix/44-RESEARCH.md:9-49` - Viewport coordinate system, hasVisibleAnimatedTiles bug fix
- **React Custom Hooks** - [https://react.dev/learn/reusing-logic-with-custom-hooks](https://react.dev/learn/reusing-logic-with-custom-hooks) - Custom hook pattern
- **Page Visibility API** - [https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API) - Browser API for tab visibility

### Secondary (MEDIUM confidence)

- **React useEffect cleanup** - [https://react.dev/reference/react/useEffect#cleaning-up](https://react.dev/reference/react/useEffect#cleaning-up) - RAF lifecycle pattern

### Tertiary (LOW confidence)

None - all findings based on direct codebase inspection and existing project documentation.

## Metadata

**Confidence breakdown:**
- Root cause: HIGH - Direct code inspection confirms AnimationPanel conditional unmount stops RAF
- Fix approach: HIGH - Proven pattern exists (custom hooks for global timers), Phase 22/37 architecture is sound
- Page Visibility API: HIGH - Already implemented, just needs to be moved with RAF loop
- hasVisibleAnimatedTiles: HIGH - Phase 44 fixed calculation, copy verbatim

**Research date:** 2026-02-17
**Valid until:** 60 days (stable domain - React hooks and RAF patterns won't change)

---

*Phase: 84-animation-panel-independence*
*Researched: 2026-02-17*
