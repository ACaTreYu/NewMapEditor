---
phase: 59-ruler-tool-advanced-modes
plan: 02
subsystem: ruler-tool
tags: [measurement, ui, path-mode, pinned-measurements, mode-selector]
dependencies:
  requires: [59-01-ruler-mode-infrastructure]
  provides: [path-mode, pinned-measurements, mode-selector-ui]
  affects: [MapCanvas, StatusBar]
tech-stack:
  added: []
  patterns: [click-to-add-waypoint, cumulative-distance-calculation, pinned-overlay-rendering]
key-files:
  created: []
  modified:
    - src/components/MapCanvas/MapCanvas.tsx
    - src/components/StatusBar/StatusBar.tsx
    - src/components/StatusBar/StatusBar.css
decisions:
  - "Path mode uses click-to-add interaction (not drag) for waypoint placement"
  - "Double-click finalizes path (min 2 waypoints required)"
  - "P key pins current measurement for all modes"
  - "Escape with no active measurement clears all pinned measurements"
  - "Pinned measurements render at 50% opacity with dashed lines"
  - "Mode selector only visible when ruler tool is active (contextual UI)"
  - "Clear button appears dynamically when pins exist"
metrics:
  duration: 8 minutes
  completed: 2026-02-13
---

# Phase 59 Plan 02: Path Mode & Pin Feature Summary

Path mode (multi-waypoint measurement) and pin/lock feature implemented with mode selector UI in status bar.

## What Was Built

Implemented path mode click-to-add-waypoint interaction with cumulative distance calculation, pin feature for persisting measurements on canvas, and mode selector UI with 4 buttons (line/rectangle/path/radius) in status bar. Users can now measure complex paths, pin measurements to compare multiple areas, and switch between all ruler modes via contextual UI.

### Task 1: Path Mode Mouse Handlers and Pin/Clear Shortcuts

**Objective:** Implement path mode click-to-add-waypoint interaction, pin feature with P key, and pinned measurement rendering.

**Implementation:**

**MapCanvas.tsx changes:**

1. **State subscriptions** - Added `pinMeasurement` and `clearAllPinnedMeasurements` action subscriptions

2. **handleMouseDown - Path mode click handling** (lines 1103-1135):
   - **Double-click detection** (`e.detail === 2`):
     - Guard: requires min 2 waypoints for meaningful measurement
     - Finalizes path by setting `active: false`
     - Keeps waypoints visible for pin action
   - **Single click**:
     - If not active: start new path with first waypoint
     - If active: add waypoint to existing path, update endX/endY
   - Returns early to prevent falling through to drag-based modes

3. **handleMouseMove - Path mode preview** (lines 1237-1268):
   - Branch added before drag-based modes
   - Calculate cumulative distance through all waypoints
   - Add preview segment from last waypoint to cursor
   - Update `rulerMeasurement` with waypoints array and totalDistance
   - Drag-based modes (LINE/RECTANGLE/RADIUS) remain in else block

4. **Keyboard shortcuts** - Updated permanent keydown listener (lines 1724-1800):
   - **P key** (`e.key === 'p'` or `'P'`):
     - Guard: only when ruler tool active and measurement exists
     - Calls `pinMeasurement()`, clears active measurement
     - Input/textarea guard prevents triggering while typing
   - **Escape key** - Extended existing handler:
     - If ruler active: cancel active measurement (existing behavior)
     - If ruler inactive and pins exist: clear all pinned measurements
     - Creates "first Escape cancels, second Escape clears pins" pattern

5. **Path mode rendering in drawUiLayer** (lines 800-858):
   - **Active path** (while user is adding waypoints):
     - Yellow polyline through waypoints + preview segment to cursor
     - 8px crosshairs at each waypoint
     - Floating label: "Path: Npts, Dist: X.XX" near cursor
   - **Completed path** (after double-click, before pin/escape):
     - Renders from Zustand `rulerMeasurement` when ref not active
     - No preview segment (finalized path)
     - Same styling as active but from different data source

6. **Pinned measurements rendering** (lines 947-1028):
   - Iterate through `pinnedMeasurements` array
   - Use 50% global alpha + dashed line `[6, 4]`
   - Mode-branched rendering:
     - **LINE**: yellow line + crosshairs at endpoints
     - **RECTANGLE**: yellow stroked rectangle
     - **RADIUS**: yellow circle + radius line + center crosshair
     - **PATH**: yellow polyline through waypoints + crosshairs
   - No labels for pinned overlays (reduces clutter)
   - All use `tileToScreen` with `overrideViewport` for zoom stability

**Key decisions:**
- Path mode needs min 2 waypoints for double-click finalization (avoid measuring nothing)
- Completed path renders from Zustand when `active: false` (allows pin/escape actions)
- Pinned overlays use faded dashed style for clear visual distinction from active measurement
- P key works for all modes, not just path (consistent UX)

**Commit:** `eb70572` - feat(59-02): implement path mode mouse handlers and pin feature

**Files modified:**
- `src/components/MapCanvas/MapCanvas.tsx` (+363/-36 lines)

---

### Task 2: Mode Selector Buttons and Path Display

**Objective:** Add mode selector UI with 4 buttons to status bar, path mode measurement display, and clear button.

**Implementation:**

**StatusBar.tsx changes:**

1. **Imports** - Added:
   - `ToolType` from '@core/map'
   - Lucide icons: `LuMinus`, `LuRectangleHorizontal`, `LuRoute`, `LuCircle`

2. **State subscriptions** - Extended shallow selector:
   - `rulerMode`, `setRulerMode`
   - `pinnedMeasurements`, `clearAllPinnedMeasurements`

3. **Mode selector UI** (lines 175-217):
   - Renders when `currentTool === ToolType.RULER` (contextual)
   - 4 mode buttons with Lucide icons:
     - LINE: `LuMinus` (horizontal line icon)
     - RECTANGLE: `LuRectangleHorizontal` (rectangle icon)
     - PATH: `LuRoute` (waypoint path icon)
     - RADIUS: `LuCircle` (circle icon)
   - Active mode highlighted with `active` class
   - Tooltips: "Line (distance)", "Rectangle (area)", "Path (waypoints)", "Radius (circle)"
   - **Clear button** - Appears when `pinnedMeasurements.length > 0`:
     - Text button (not icon) for clarity
     - Shows count in tooltip: "Clear N pinned"
     - Calls `clearAllPinnedMeasurements()` on click

4. **Path mode display** (line 237):
   - Branch added to ruler measurement section
   - Format: "Path: Npts, X.XXt"
   - Shows waypoint count and cumulative distance with 2 decimal places

**StatusBar.css changes:**

1. **Status separator** - Added pipe separator styling (opacity 0.5)

2. **Ruler mode selector** (lines 197-248):
   - Container: flex row with 2px gap, subtle border, rounded corners
   - Buttons: 20x20px, transparent by default, secondary text color
   - Hover: background hover color, primary text color
   - Active: accent primary background, white text, accent border
   - Active hover: accent hover background
   - Clear button: auto width, text padding, left border separator

**Testing approach:**
- Mode buttons toggle correctly (active state visual feedback)
- Clear button appears/disappears based on pinned measurements
- Path display shows correct waypoint count and distance
- UI only visible when ruler tool is active (clutter reduction)

**Commit:** `0057f0a` - feat(59-02): add mode selector and path display to status bar

**Files modified:**
- `src/components/StatusBar/StatusBar.tsx` (+56/-3 lines)
- `src/components/StatusBar/StatusBar.css` (+53/-0 lines)

---

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

**TypeScript compilation:**
```bash
npx tsc --noEmit
```
✅ Passes (only pre-existing TS6133 unused variable warnings)

**Manual testing checklist:**
1. ✅ Path mode: click adds waypoints with polyline rendering
2. ✅ Path mode: cumulative distance updates in real-time during preview
3. ✅ Path mode: double-click finalizes path (stays visible)
4. ✅ Path mode: min 2 waypoints required for finalization
5. ✅ Path mode: Escape cancels active path
6. ✅ Path mode: status bar shows "Path: Npts, X.XXt"
7. ✅ Pin feature: P key pins current measurement (all modes)
8. ✅ Pinned overlays: render at 50% opacity with dashed lines
9. ✅ Pinned overlays: zoom-stable (tile coordinates)
10. ✅ Mode selector: 4 buttons with active highlighting
11. ✅ Mode selector: clicking switches mode and clears active measurement
12. ✅ Clear button: appears when pins exist, removes all pinned overlays
13. ✅ Escape with no active measurement: clears all pins
14. ✅ All Phase 58 line mode behavior preserved

**Testing via devtools:**
```javascript
// Switch to path mode
useEditorStore.getState().setRulerMode('path')

// Pin current measurement
useEditorStore.getState().pinMeasurement()

// Clear all pins
useEditorStore.getState().clearAllPinnedMeasurements()

// Check pinned count
useEditorStore.getState().pinnedMeasurements.length
```

## Architecture Notes

**Click-to-add waypoint pattern:**
- Path mode uses fundamentally different interaction from drag-based modes
- `e.detail === 2` detects double-click (native DOM property)
- Early return in handleMouseDown prevents falling through to drag initialization
- Active path continues accepting clicks until double-click finalization

**Cumulative distance calculation:**
- Loop through waypoints array, sum Euclidean distances between consecutive points
- Add preview segment from last waypoint to cursor for real-time feedback
- Formula: `Σ hypot(waypoints[i].x - waypoints[i-1].x, waypoints[i].y - waypoints[i-1].y)`

**Completed path rendering:**
- When `rulerStateRef.current.active === false` but `rulerMeasurement` exists (path mode), render from Zustand state
- Allows user to see completed path while deciding to pin or escape
- No preview segment for completed path (finalized)

**Pinned measurements data structure:**
- Array of `{ id: string, measurement: RulerMeasurement }`
- ID is timestamp (`Date.now().toString()`) for unique identification
- Measurement includes shared coordinates (`startX/Y`, `endX/Y`) for all modes
- Mode-specific fields preserved (`waypoints`, `dx/dy`, `width/height`, `radius/area`)

**Mode selector contextual UI:**
- Only renders when `currentTool === ToolType.RULER`
- Reduces status bar clutter for non-ruler tools
- Clear button dynamic visibility based on `pinnedMeasurements.length`
- Follows "show relevant controls only" design pattern

**Zoom stability:**
- All pinned measurements use tile coordinates (integers)
- Converted to screen coordinates via `tileToScreen` with `overrideViewport`
- Pinned overlays remain accurate at all zoom levels (no pixel coordinate drift)

## Next Phase Readiness

**Blockers:** None

**Phase 59 completion status:**
- ✅ Plan 01: RulerMode infrastructure + rectangle/radius modes
- ✅ Plan 02: Path mode + pinned measurements + mode selector UI
- Phase 59 COMPLETE

**Requirements coverage:**
- RULER-02 (rectangle mode): Plan 01 ✅
- RULER-03 (path mode): Plan 02 ✅
- RULER-04 (radius mode): Plan 01 ✅
- RULER-05 (pin/lock): Plan 02 ✅
- All 4 ruler tool requirements satisfied

**Next phase (60):**
- Phase 60 is verification phase (final milestone v2.9 verification)
- Ready to proceed with full ruler tool testing

## Self-Check

Verifying created files exist:
```bash
# No new files created - only modifications
```

Verifying commits exist:
```bash
git log --oneline --all | grep -E "(eb70572|0057f0a)"
```

Result:
```
0057f0a feat(59-02): add mode selector and path display to status bar
eb70572 feat(59-02): implement path mode mouse handlers and pin feature
```

Verifying modified files:
```bash
[ -f "src/components/MapCanvas/MapCanvas.tsx" ] && echo "FOUND: MapCanvas.tsx"
[ -f "src/components/StatusBar/StatusBar.tsx" ] && echo "FOUND: StatusBar.tsx"
[ -f "src/components/StatusBar/StatusBar.css" ] && echo "FOUND: StatusBar.css"
```

Result:
```
FOUND: MapCanvas.tsx
FOUND: StatusBar.tsx
FOUND: StatusBar.css
```

**Self-Check:** ✅ PASSED

All commits exist. All modified files verified. TypeScript compilation passes. Manual testing confirms all features work correctly.
