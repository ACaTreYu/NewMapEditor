---
phase: 101-canvas-background-mode-selector
plan: 01
subsystem: canvas-rendering
tags: [canvas, background, rendering, zustand, persistence]
dependency_graph:
  requires: []
  provides:
    - canvasBackgroundMode and canvasBackgroundColor in GlobalSlice with localStorage persistence
    - drawScreenBackground in CanvasEngine with 5-mode branch (transparent/classic/farplane/color/image)
    - setFarplaneImage and setCustomBgImage engine setters
    - Background rendering in both blitToScreen and blitDirtyRect code paths
  affects:
    - src/core/editor/slices/globalSlice.ts
    - src/core/canvas/CanvasEngine.ts
    - src/components/MapCanvas/MapCanvas.tsx
    - src/components/Workspace/ChildWindow.tsx
tech_stack:
  added: []
  patterns:
    - Zustand subscription for immediate re-blit on background mode/color change
    - localStorage persistence for canvas background preferences
    - drawScreenBackground called between clearRect and drawImage in both blit paths
key_files:
  created: []
  modified:
    - src/core/editor/slices/globalSlice.ts
    - src/core/canvas/CanvasEngine.ts
    - src/components/MapCanvas/MapCanvas.tsx
    - src/components/Workspace/ChildWindow.tsx
key_decisions:
  - Background draws between clearRect and drawImage(buffer) in both blitToScreen and blitDirtyRect to prevent flicker during animation ticks
  - localStorage keys ac-editor-canvas-bg-mode and ac-editor-canvas-bg-color for cross-session persistence
  - farplaneImage and customBgImage are optional props (null-safe) so Plan 02 can wire them later
duration: 172s
completed: 2026-02-26T22:08:52Z
---

# Phase 101 Plan 01: Canvas Background Rendering Infrastructure Summary

Zustand state for 5-mode canvas background (transparent/classic/farplane/color/image) with localStorage persistence, CanvasEngine drawScreenBackground in both blit paths, and farplane/custom image prop wiring through MapCanvas.

## Performance

| Metric | Value |
|--------|-------|
| Duration | 172s (~3 min) |
| Start | 2026-02-26T22:06:00Z |
| End | 2026-02-26T22:08:52Z |
| Tasks | 2/2 |
| Files modified | 4 |

## Accomplishments

1. **GlobalSlice state + persistence**: Added `canvasBackgroundMode` (string, defaults to 'transparent') and `canvasBackgroundColor` (hex string, defaults to '#000000') with `setCanvasBackgroundMode`/`setCanvasBackgroundColor` actions that persist to localStorage on every change and read from localStorage on initialization.

2. **CanvasEngine drawScreenBackground**: Private method with all 5 mode branches:
   - `transparent`: no-op (return)
   - `classic`: fills with #FF00FF
   - `color`: fills with user's chosen hex color
   - `farplane`: draws from farplane image scaled to full map dimensions, scrolling with viewport
   - `image`: draws from custom background image mapped to map screen coordinates

3. **blitToScreen background integration**: Background drawn after `clearRect(0,0,W,H)` and before `drawImage(buffer,...)`, clipped to in-map region. Out-of-map strip fills remain at the end unchanged.

4. **blitDirtyRect background integration**: Background drawn after `clearRect(clipX,clipY,...)` and before `drawImage(buffer,...)`, preventing flash/flicker during animation tick partial redraws.

5. **Zustand subscription**: Subscription 4 in setupSubscriptions triggers immediate blitToScreen when canvasBackgroundMode or canvasBackgroundColor changes.

6. **setFarplaneImage/setCustomBgImage**: Engine setters that trigger re-blit when in the corresponding mode.

7. **MapCanvas prop wiring**: `farplaneImage` and `customBgImage` optional props accepted by MapCanvas and ChildWindow, wired to engine setters via useEffect (same pattern as tilesetImage).

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | GlobalSlice state + CanvasEngine background rendering | 45461a1 | globalSlice.ts, CanvasEngine.ts |
| 2 | Wire farplaneImage and customBgImage props through MapCanvas | d72985c | MapCanvas.tsx, ChildWindow.tsx |

## Files Modified

| File | Changes |
|------|---------|
| src/core/editor/slices/globalSlice.ts | +canvasBackgroundMode, +canvasBackgroundColor state and setters with localStorage |
| src/core/canvas/CanvasEngine.ts | +drawScreenBackground, +setFarplaneImage/setCustomBgImage, bg in blitToScreen/blitDirtyRect, subscription 4 |
| src/components/MapCanvas/MapCanvas.tsx | +farplaneImage/customBgImage props, useEffect wiring to engine |
| src/components/Workspace/ChildWindow.tsx | +farplaneImage/customBgImage props, pass-through to MapCanvas |

## Decisions Made

1. **Background placement in rendering pipeline**: Background is drawn between clearRect and drawImage(buffer) in both blit methods. This ensures background is visible behind transparent tile 280 areas without interfering with the off-screen tile buffer (which would cause incremental-patch holes).

2. **localStorage key naming**: `ac-editor-canvas-bg-mode` and `ac-editor-canvas-bg-color` follow the existing `ac-editor-` prefix convention.

3. **Optional props for images**: farplaneImage and customBgImage are optional props (`?:`) defaulting to undefined/null. The engine setters handle null gracefully. Plan 02 will wire actual image loading from App.tsx.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

Plan 02 (UI dropdown + image loading) can proceed immediately. The rendering infrastructure is complete:
- Changing `canvasBackgroundMode` in Zustand immediately re-renders with the correct fill
- `farplaneImage` and `customBgImage` props are ready to receive loaded images
- All five modes are implemented and tested via typecheck

## Self-Check: PASSED

- All 4 modified files exist on disk
- Commit 45461a1 (Task 1) found in git log
- Commit d72985c (Task 2) found in git log
- TypeScript typecheck passes with zero errors
