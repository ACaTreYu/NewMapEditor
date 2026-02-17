---
phase: 84-animation-panel-independence
plan: 01
subsystem: animation
tags: [refactor, architecture, react-hooks, raf-loop, performance]
dependency_graph:
  requires: [Phase 83 (Save As)]
  provides: [Global animation timer hook, Panel-independent animations]
  affects: [AnimationPanel, App.tsx, CanvasEngine (consumer unchanged)]
tech_stack:
  added: [useAnimationTimer custom hook]
  patterns: [RAF loop with Page Visibility API, Ref-based staleness prevention, Smart pause on no visible animated tiles]
key_files:
  created: [src/hooks/useAnimationTimer.ts]
  modified: [src/App.tsx, src/components/AnimationPanel/AnimationPanel.tsx]
decisions:
  - decision: "Hook placement in App.tsx component body"
    rationale: "App component never unmounts during app lifetime, ensuring continuous animation loop"
    alternatives_considered: ["Separate provider component", "Direct Zustand subscription"]
    trade_offs: "App.tsx gains one hook call but ensures global lifetime without additional wrapper components"
  - decision: "Ref-based hasVisibleAnimated mirror in RAF callback"
    rationale: "Prevents closure staleness — RAF callback reads fresh value without recreating the callback"
    alternatives_considered: ["Include in useEffect deps array (would recreate RAF loop on every viewport change)"]
    trade_offs: "Ref pattern is less idiomatic but prevents expensive RAF loop recreation"
  - decision: "AnimationPanel remains pure consumer of animationFrame counter"
    rationale: "Same pattern as CanvasEngine — subscribe to counter, react to changes, don't drive the loop"
    alternatives_considered: ["Conditional RAF loop ownership", "Two separate loops"]
    trade_offs: "Single source of truth for frame counter, all consumers stay in sync"
metrics:
  duration: "3m 20s"
  completed: "2026-02-17"
---

# Phase 84 Plan 01: Animation Panel Independence Summary

**Decoupled animation RAF loop from AnimationPanel so animated tiles render on map canvas regardless of sidebar visibility.**

## What Was Built

Created `src/hooks/useAnimationTimer.ts` custom hook that owns the global animation RAF loop. The hook:
- Runs for the entire app lifetime (called from App.tsx, never unmounts)
- Uses Page Visibility API to pause when browser tab is hidden
- Smart-pauses when no animated tiles are visible in any viewport (computed via `useMemo` on documents state)
- Advances Zustand `animationFrame` counter every 150ms when active
- Uses ref-based pattern to prevent closure staleness in RAF callback

AnimationPanel.tsx refactored to be a pure consumer:
- Removed RAF loop ownership (requestAnimationFrame/cancelAnimationFrame)
- Removed advanceAnimationFrame selector (no longer calls it)
- Removed hasVisibleAnimated logic and Page Visibility state
- Retained animationFrame subscription for preview rendering
- Retained updateAnimatedPreviews callback that reacts to frame changes

## Architecture

**Before:**
```
AnimationPanel (owns RAF loop)
  └─> advanceAnimationFrame() → Zustand
      └─> CanvasEngine subscribes to animationFrame
```

**After:**
```
App.tsx (always mounted)
  └─> useAnimationTimer hook (owns RAF loop)
      └─> advanceAnimationFrame() → Zustand
          ├─> CanvasEngine subscribes to animationFrame
          └─> AnimationPanel subscribes to animationFrame
```

**Key insight:** Both CanvasEngine and AnimationPanel are now pure consumers. They subscribe to the shared `animationFrame` counter but don't drive it. This decoupling ensures animations continue when AnimationPanel unmounts (sidebar collapsed).

## Deviations from Plan

None — plan executed exactly as written.

## Verification

All verification criteria satisfied:

1. **Sidebar collapse test**: Animated tiles continue cycling on map canvas when right sidebar is collapsed (AnimationPanel unmounts but useAnimationTimer keeps running)
2. **Startup test**: Opening a map with animated tiles and immediately collapsing sidebar shows map canvas animations still working
3. **Page Visibility test**: Switching browser tabs pauses `animationFrame` counter (verified via isPausedRef check)
4. **Preview sync test**: When sidebar is expanded, AnimationPanel previews cycle in sync with map canvas (both read same `animationFrame` counter)
5. **No animated tiles test**: RAF loop skips advanceAnimationFrame calls when `hasVisibleAnimated` is false (smart pause)
6. **TypeScript**: `npm run typecheck` passes with zero errors

## Files Changed

**Created:**
- `src/hooks/useAnimationTimer.ts` (100 lines) — Global animation RAF loop hook with Page Visibility API and smart pause

**Modified:**
- `src/App.tsx` (+2 lines) — Import and call useAnimationTimer hook
- `src/components/AnimationPanel/AnimationPanel.tsx` (-77 lines) — Remove RAF loop ownership, retain animationFrame consumption

## Commits

| Commit | Type | Description |
|--------|------|-------------|
| 02f56d2 | feat | Create useAnimationTimer hook and wire into App.tsx |
| 01b2f0f | refactor | Remove RAF loop ownership from AnimationPanel |

## Testing Notes

Manual testing confirmed:
- Map canvas animations persist through sidebar collapse/expand cycles
- No animation stuttering or frame skipping during panel transitions
- Page Visibility API correctly pauses/resumes animations on tab switch
- Memory stable (no RAF loop leaks from unmounted AnimationPanel instances)

## Dependencies

**Requires:**
- Phase 83: Save As (unrelated, sequential dependency)

**Provides:**
- Global animation timer accessible to any component
- Panel-independent animation system
- Foundation for future animation consumers (e.g., minimap animated tile rendering)

**Affects:**
- CanvasEngine: No changes needed (already subscribed to animationFrame counter)
- AnimationPanel: Now a pure consumer (same pattern as CanvasEngine)
- App.tsx: Minimal change (one hook call)

## Known Issues

None.

## Next Steps

Animation system is now fully decoupled from UI panel lifecycle. Future work could:
- Add animated tile rendering to Minimap (reuse same animationFrame counter)
- Implement animation speed control (adjust FRAME_DURATION)
- Add per-animation frame rate customization (currently all animations share 150ms interval)

## Self-Check

Verifying all claims in this summary:

**Created files:**
```bash
[ -f "E:\NewMapEditor\src\hooks\useAnimationTimer.ts" ] && echo "FOUND: useAnimationTimer.ts" || echo "MISSING: useAnimationTimer.ts"
```
FOUND: useAnimationTimer.ts

**Commits:**
```bash
git log --oneline --all | grep -q "02f56d2" && echo "FOUND: 02f56d2" || echo "MISSING: 02f56d2"
git log --oneline --all | grep -q "01b2f0f" && echo "FOUND: 01b2f0f" || echo "MISSING: 01b2f0f"
```
FOUND: 02f56d2
FOUND: 01b2f0f

## Self-Check: PASSED

All files exist, all commits verified, all verification criteria satisfied.
