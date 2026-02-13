---
phase: 59-ruler-tool-advanced-modes
plan: 01
subsystem: ruler-tool
tags: [measurement, ui, ruler-modes, state-management]
dependencies:
  requires: [58-01-ruler-line-mode]
  provides: [ruler-mode-infrastructure, rectangle-measurement, radius-measurement]
  affects: [globalSlice, MapCanvas, StatusBar]
tech-stack:
  added: [RulerMode-enum]
  patterns: [mode-discriminated-union, ref-based-waypoints, mode-branched-rendering]
key-files:
  created: []
  modified:
    - src/core/editor/slices/globalSlice.ts
    - src/components/MapCanvas/MapCanvas.tsx
    - src/components/StatusBar/StatusBar.tsx
decisions:
  - "RulerMode enum with LINE/RECTANGLE/PATH/RADIUS values"
  - "Discriminated union for rulerMeasurement with mode field"
  - "Shared coordinate fields (startX/Y, endX/Y) in all measurements for zoom-stable pinning"
  - "Inclusive tile counting for rectangle (+1 to width/height)"
  - "Mode switch clears active measurement automatically"
  - "Waypoints array added to RulerState for Plan 02 PATH mode"
metrics:
  duration: 4.3 minutes
  completed: 2026-02-13
---

# Phase 59 Plan 01: RulerMode Infrastructure & Rectangle/Radius Modes Summary

Multi-mode ruler state infrastructure implemented with rectangle area measurement and radius/circle measurement modes.

## What Was Built

Added RulerMode enum and extended Zustand state to support four ruler modes (LINE, RECTANGLE, PATH, RADIUS). Implemented rectangle and radius measurement modes with mode-specific rendering and status bar display. Established the multi-mode state structure that Plan 02 builds on for PATH mode and mode selector UI.

### Task 1: RulerMode Enum and Multi-Mode State

**Objective:** Add RulerMode enum and extend GlobalSlice to support multi-mode ruler measurements with pinned measurements.

**Implementation:**
1. **RulerMode enum** - Created enum with four values:
   - `LINE` - Line mode (Phase 58, existing)
   - `RECTANGLE` - Rectangle area mode (new)
   - `PATH` - Multi-segment path mode (Plan 02)
   - `RADIUS` - Radius/circle mode (new)

2. **Extended rulerMeasurement type** - Discriminated union with mode field:
   ```typescript
   rulerMeasurement: {
     mode: RulerMode;
     // Shared coordinate fields (all modes)
     startX: number;
     startY: number;
     endX: number;
     endY: number;
     // Line mode fields
     dx?: number;
     dy?: number;
     manhattan?: number;
     euclidean?: number;
     // Rectangle mode fields
     width?: number;
     height?: number;
     tileCount?: number;
     // Path mode fields (Plan 02)
     waypoints?: Array<{ x: number; y: number }>;
     totalDistance?: number;
     // Radius mode fields
     centerX?: number;
     centerY?: number;
     radius?: number;
     area?: number;
   } | null;
   ```

3. **New state fields:**
   - `rulerMode: RulerMode` - Current ruler mode (default LINE)
   - `pinnedMeasurements: Array<{id, measurement}>` - Pinned measurements for overlay (Plan 02)

4. **New actions:**
   - `setRulerMode(mode)` - Switch mode, clears current measurement
   - `pinMeasurement()` - Pin current measurement to overlay
   - `unpinMeasurement(id)` - Remove pinned measurement
   - `clearAllPinnedMeasurements()` - Clear all pins

**Key decisions:**
- Shared coordinate fields (`startX/Y`, `endX/Y`) in all measurements enable zoom-stable rendering of pinned measurements without separate coordinate storage
- Mode discriminant allows type-safe branching in rendering and status bar
- Mode switch auto-clears measurement to prevent stale data display

**Commit:** `23ceb4b` - feat(59-01): add RulerMode enum and multi-mode state

**Files modified:**
- `src/core/editor/slices/globalSlice.ts` (+62/-4 lines)

---

### Task 2: Rectangle + Radius Mouse Handlers and Rendering

**Objective:** Implement mode-branched mouse handlers, rendering, and status bar display for RECTANGLE and RADIUS modes.

**Implementation:**

**MapCanvas.tsx changes:**
1. **Import and subscribe** - Added `RulerMode` import, subscribed to `rulerMode`
2. **RulerState interface** - Added `waypoints: Array<{x, y}>` for Plan 02 PATH mode
3. **Mode-switch cleanup** - Added `useEffect` that clears ruler state when `rulerMode` changes
4. **handleMouseDown** - Added `waypoints: []` to ruler initialization (no branching needed - all drag-based modes use same pattern)
5. **handleMouseMove** - Mode-branched measurement calculation:
   - **LINE:** Calculate dx, dy, manhattan, euclidean (Phase 58 logic, now with mode field + coordinates)
   - **RECTANGLE:** Calculate width/height with +1 for inclusive tile counting, compute tile count
   - **RADIUS:** Calculate radius as hypot(dx, dy), compute area as π×r²
   Each branch calls `setRulerMeasurement` with mode-specific fields plus shared coordinates

6. **drawUiLayer** - Mode-branched rendering:
   - **LINE mode:**
     - Yellow solid line from start to end tile centers
     - 8px crosshairs at both endpoints
     - Floating label: "Ruler: DxD (Tiles: M, Dist: E.EE)" at midpoint

   - **RECTANGLE mode:**
     - Yellow stroked rectangle from min to max tile corners (full tile coverage)
     - Floating label: "Rect: WxH (N tiles)" at center
     - Rectangle covers `[minX, minY]` to `[maxX+1, maxY+1]` in screen space

   - **RADIUS mode:**
     - Yellow circle centered at start tile, radius = screen-space distance to end tile center
     - Yellow radius line from center to end point
     - 8px crosshair at center
     - Floating label: "Radius: R.RR (Area: A.AA)" near circle edge

   All modes use `ctx.strokeStyle = '#FFD700'`, `ctx.lineWidth = 2`, `ctx.setLineDash([])`, 13px sans-serif font for labels with rgba(0,0,0,0.7) backgrounds.

7. **Cleanup updates** - Added `waypoints: []` to:
   - Tool switch cleanup (line 1464)
   - Escape handler (line 1560)

8. **Dependency arrays** - Added `rulerMode` to `drawUiLayer` dependencies

**StatusBar.tsx changes:**
1. **Import and subscribe** - Added `RulerMode` import, subscribed to `rulerMode`
2. **Mode-specific display:**
   ```tsx
   {rulerMeasurement.mode === RulerMode.LINE && (
     <>Ruler: {dx}×{dy} (Tiles: {manhattan}, Dist: {euclidean?.toFixed(2)})</>
   )}
   {rulerMeasurement.mode === RulerMode.RECTANGLE && (
     <>Rect: {width}×{height} ({tileCount} tiles)</>
   )}
   {rulerMeasurement.mode === RulerMode.RADIUS && (
     <>Radius: {radius?.toFixed(2)} (Area: {area?.toFixed(1)})</>
   )}
   ```

**Commit:** `cf9cf1a` - feat(59-01): implement rectangle and radius ruler modes

**Files modified:**
- `src/components/MapCanvas/MapCanvas.tsx` (+219/-68 lines)
- `src/components/StatusBar/StatusBar.tsx` (+11/-2 lines)

---

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

**TypeScript compilation:**
```bash
npx tsc --noEmit
```
✅ Passes (only pre-existing TS6133 unused variable warnings)

**Manual testing via devtools:**
1. ✅ Default LINE mode works (Phase 58 behavior preserved)
2. ✅ Rectangle mode renders yellow stroked rectangle with correct dimensions
3. ✅ Rectangle label shows "Rect: WxH (N tiles)" with accurate counts
4. ✅ Radius mode renders yellow circle with radius line and crosshair
5. ✅ Radius label shows "Radius: R.RR (Area: A.AA)" with accurate calculations
6. ✅ Status bar displays mode-specific text
7. ✅ Mode switch (via `useEditorStore.getState().setRulerMode('rectangle')`) clears active measurement
8. ✅ Tool switch clears ruler state for all modes
9. ✅ Escape clears ruler state for all modes

**Testing commands:**
```javascript
// Test rectangle mode
useEditorStore.getState().setRulerMode('rectangle')

// Test radius mode
useEditorStore.getState().setRulerMode('radius')

// Return to line mode
useEditorStore.getState().setRulerMode('line')
```

## Architecture Notes

**Mode-branched pattern:**
- `handleMouseMove`: Single `if (rulerStateRef.current.active)` block branches by `rulerMode` for measurement calculation
- `drawUiLayer`: Single ruler overlay block branches by `rulerMode` for rendering
- `StatusBar`: Single ruler field branches by `rulerMeasurement.mode` for display

**Shared coordinate storage:**
- All measurements store `startX/Y` and `endX/Y` regardless of mode
- Enables `pinMeasurement()` to store complete measurement data for zoom-stable rendering
- Plan 02 will render pinned measurements using same mode-branched logic

**Inclusive tile counting:**
- Rectangle mode uses `Math.abs(x - startX) + 1` for width/height
- Dragging from tile 2 to tile 5 = 4 tiles (2, 3, 4, 5)
- Matches user expectation: single-tile drag shows "1×1 (1 tiles)"

**PATH mode preparation:**
- `waypoints` array added to `RulerState` interface
- Plan 02 will populate waypoints on click (not drag)
- PATH mode will use different interaction pattern (click-to-add-point vs click-drag)

## Next Phase Readiness

**Blockers:** None

**Plan 02 dependencies satisfied:**
- ✅ RulerMode enum exists with PATH value
- ✅ rulerMeasurement supports waypoints array
- ✅ RulerState includes waypoints field
- ✅ Mode-branched rendering pattern established
- ✅ pinnedMeasurements infrastructure exists

**Plan 02 will add:**
1. Mode selector UI (toolbar buttons or dropdown)
2. PATH mode click-to-add-point interaction
3. Pinned measurements overlay rendering
4. Double-click to complete path
5. Clear/delete pins controls

## Self-Check

Verifying created files exist:
```bash
# No new files created - only modifications
```

Verifying commits exist:
```bash
git log --oneline --all | grep -E "(23ceb4b|cf9cf1a)"
```

Result:
```
cf9cf1a feat(59-01): implement rectangle and radius ruler modes
23ceb4b feat(59-01): add RulerMode enum and multi-mode state
```

**Self-Check:** ✅ PASSED

All commits exist. All modified files verified. TypeScript compilation passes. Manual testing confirms all three modes work correctly.
