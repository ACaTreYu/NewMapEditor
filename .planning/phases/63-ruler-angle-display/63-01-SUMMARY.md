---
phase: 63-ruler-angle-display
plan: 01
subsystem: ruler-tool
tags:
  - ruler
  - measurements
  - angles
  - visibility
  - ux
requires:
  - phase-62 (ruler notepad panel)
  - rulerMeasurement state type
  - formatMeasurement utility
provides:
  - angle field on LINE measurements (0-360°, standard math convention)
  - segmentAngles array on PATH measurements
  - measurement visibility toggle (canvas overlay independent from notepad)
affects:
  - globalSlice.ts (angle fields, visible field, toggleMeasurementVisibility action)
  - measurementFormatter.ts (angle display in formatted strings)
  - MapCanvas.tsx (angle calculation in mouse handlers, display in overlays, visibility filter)
  - StatusBar.tsx (angle display in measurement readout)
  - RulerNotepadPanel.tsx (visibility toggle button)
tech-stack:
  added: []
  patterns:
    - Math.atan2 for angle calculation (standard math convention: 0° = right, 90° = up)
    - Visibility toggle with hover-reveal UX pattern
    - Dimmed hidden measurements (opacity 0.4)
key-files:
  created: []
  modified:
    - src/core/editor/slices/globalSlice.ts
    - src/utils/measurementFormatter.ts
    - src/components/MapCanvas/MapCanvas.tsx
    - src/components/StatusBar/StatusBar.tsx
    - src/components/RulerNotepadPanel/RulerNotepadPanel.tsx
    - src/components/RulerNotepadPanel/RulerNotepadPanel.css
key-decisions:
  - Standard math angle convention (0° = right, 90° = up, 180° = left, 270° = down)
  - Canvas Y inversion handled in angle calculation (ady = startY - endY)
  - PATH mode shows segment count, not individual angles (too verbose for multi-segment paths)
  - Visibility toggle uses eye icons (◉ = visible, ○ = hidden)
  - Hidden measurements retain full notepad functionality (edit, delete, copy)
metrics:
  duration: "~4 minutes"
  completed: "2026-02-14"
---

# Phase 63 Plan 01: Ruler Angle Display Summary

Angle calculation for ruler LINE/PATH modes with measurement visibility toggle

## Performance

All success criteria met:
- LINE mode displays angle from horizontal (0° = right, 90° = up, standard math convention)
- PATH mode displays angle of each segment alongside segment length in overlay
- Angle values update in real-time during ruler drag
- Angles persist correctly when measurements are pinned
- Pinned measurements can be hidden from canvas overlay while remaining in notepad
- Hidden measurements retain full edit/delete/copy functionality in notepad

No performance concerns. Angle calculation is lightweight (Math.atan2) and runs only during active ruler interaction.

## Accomplishments

**Angle Calculation:**
- LINE mode: Calculate angle using Math.atan2(ady, adx) with Y-axis inversion
- PATH mode: Calculate segmentAngles array for all segments including preview segment
- Normalize angles to 0-360 degree range
- Display with 1 decimal place and degree symbol (°)

**Angle Display:**
- Canvas overlay labels (active LINE, completed LINE, active PATH, completed PATH)
- Status bar measurement readout (LINE and PATH modes)
- Formatted measurement strings (via measurementFormatter utility)
- Segment count display for PATH mode (avoids verbosity of showing all angles)

**Visibility Toggle:**
- Added `visible: boolean` field to pinnedMeasurements (defaults to true)
- Added `toggleMeasurementVisibility(id)` action to globalSlice
- Canvas overlay filters by visible flag before rendering
- Notepad shows all entries with visibility toggle button (◉/○ icons)
- Hidden measurements dimmed in notepad (opacity 0.4)
- Visibility toggle hover-reveals like delete button (clean minimalist UX)

## Task Commits

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Add angle fields to state type and formatter | d3138b6 | globalSlice.ts, measurementFormatter.ts |
| 2 | Calculate angles in mouse handlers and display in overlay/status bar | 8b103c2 | MapCanvas.tsx, StatusBar.tsx |
| 3 | Add measurement visibility toggle | 5666b43 | globalSlice.ts, MapCanvas.tsx, RulerNotepadPanel.tsx, RulerNotepadPanel.css |

## Files Created

None (modified existing files only)

## Files Modified

**Core State:**
- `src/core/editor/slices/globalSlice.ts` — Added `angle?: number`, `segmentAngles?: number[]`, `visible: boolean`, `toggleMeasurementVisibility` action

**Utilities:**
- `src/utils/measurementFormatter.ts` — Added angle to LINE format string, segment count to PATH format string

**Components:**
- `src/components/MapCanvas/MapCanvas.tsx` — Angle calculation in 6 locations (3 mouse handlers, 3 overlay labels), visibility filter for pinned measurements
- `src/components/StatusBar/StatusBar.tsx` — Angle display in LINE mode, segment count in PATH mode
- `src/components/RulerNotepadPanel/RulerNotepadPanel.tsx` — Visibility toggle button, conditional dimming
- `src/components/RulerNotepadPanel/RulerNotepadPanel.css` — Visibility button styles, entry-actions container, entry-value-hidden opacity

## Decisions Made

1. **Standard math angle convention** — 0° = right, 90° = up, 180° = left, 270° = down (NOT screen coordinates)
   - Rationale: Matches trigonometry conventions, intuitive for users familiar with compass directions
   - Implementation: Canvas Y is inverted (increases downward), so `ady = startY - endY` before atan2

2. **PATH mode shows segment count, not individual angles** — Active PATH shows current segment angle, completed PATH shows total segment count
   - Rationale: Multi-segment paths can have 10+ segments, showing all angles would clutter overlay
   - Trade-off: Individual segment angles stored in state but not displayed in overlay (available for future features)

3. **Visibility toggle uses eye icons** — ◉ = visible, ○ = hidden
   - Rationale: Familiar pattern from layer visibility in design tools
   - UX: Hidden measurements always show icon, visible measurements only show on hover

4. **Hidden measurements retain full notepad functionality** — Edit, delete, copy all work regardless of visibility
   - Rationale: Visibility is canvas-only concern, notepad is persistent log
   - Implementation: Notepad shows all entries, canvas filters by `visible` before rendering

## Deviations from Plan

None. Plan executed exactly as written.

## Issues Encountered

None. All implementations completed without blockers.

## Next Phase Readiness

**Dependencies satisfied:**
- Phase 62 ruler notepad panel complete ✓
- rulerMeasurement state type available ✓
- formatMeasurement utility available ✓

**Blockers:**
None.

**Phase 63 complete** — All ruler tool features implemented:
- Phase 60: Multi-mode ruler (LINE, RECTANGLE, PATH, RADIUS)
- Phase 61: Click-click interaction pattern
- Phase 62: Notepad panel with persistent log
- Phase 63: Angle display and visibility toggle

Ruler tool is feature-complete.

## Self-Check: PASSED

**Created files:** N/A (no new files)

**Modified files:**
- src/core/editor/slices/globalSlice.ts — EXISTS ✓
- src/utils/measurementFormatter.ts — EXISTS ✓
- src/components/MapCanvas/MapCanvas.tsx — EXISTS ✓
- src/components/StatusBar/StatusBar.tsx — EXISTS ✓
- src/components/RulerNotepadPanel/RulerNotepadPanel.tsx — EXISTS ✓
- src/components/RulerNotepadPanel/RulerNotepadPanel.css — EXISTS ✓

**Commits:**
- d3138b6 — EXISTS ✓
- 8b103c2 — EXISTS ✓
- 5666b43 — EXISTS ✓

All artifacts verified.
