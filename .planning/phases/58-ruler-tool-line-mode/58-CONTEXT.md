# Phase 58: Ruler Tool — Line Mode - Context

**Gathered:** 2026-02-13
**Status:** Ready for planning

<domain>
## Phase Boundary

User can measure straight-line distance between two points in tiles using a dedicated ruler tool. Click-drag to measure, with visual overlay and status bar feedback. Advanced modes (rectangle, path, radius) and full pin/lock system are Phase 59.

</domain>

<decisions>
## Implementation Decisions

### Visual feedback
- Solid colored line (not dashed, not dual-stroke)
- Yellow/gold color — high contrast against map tiles, distinct from selection (blue) and grid (white)
- Small crosshair markers at start and end points
- Distance label appears at midpoint of the ruler line
- Label has dark background for readability (same pattern as Phase 57 floating label)

### Activation & workflow
- Dedicated toolbar button (standard tool switching, like other tools in the editor)
- No keyboard shortcut — toolbar only
- Stays in ruler mode after measurement (user switches tools manually to exit)
- Escape cancels current measurement but stays in ruler mode

### Measurement display
- Show both Manhattan (tile-grid) and Euclidean (straight-line) distance
- Euclidean precision: 2 decimal places (e.g., "5.83")
- Format: "Ruler: 5×3 (Tiles: 8, Dist: 5.83)" — dx×dy dimensions, then labeled values
- On-canvas label shows same full info as status bar (no abbreviated version)
- "Tiles" = Manhattan distance (dx + dy), "Dist" = Euclidean distance

### Measurement persistence
- Last measurement stays visible on canvas until next drag or Escape
- Starting a new measurement clears the previous ruler line from canvas
- Status bar retains values until next measurement or tool switch

### Claude's Discretion
- Exact crosshair marker size and style
- Line thickness (should be readable at all zoom levels)
- Label font size and positioning details at midpoint
- Toolbar icon design
- How ruler interacts with existing tool state (e.g., does switching away clear the ruler overlay)

</decisions>

<specifics>
## Specific Ideas

- User envisions a floating measurement notepad/panel that lists previous measurements, where clicking an entry re-shows that ruler line on canvas. This is a compelling UX concept that bridges Phase 58 and 59.
- Format labels should use map-maker-friendly language: "Tiles" and "Dist" rather than technical "Manhattan" and "Euclidean"
- Ruler should follow the ref-based drag pattern established in v2.8 (same as line/rect tools)
- Yellow/gold was chosen specifically to contrast with existing blue selection and white grid overlays

</specifics>

<deferred>
## Deferred Ideas

- **Floating measurement notepad/panel** — Resizable panel listing all previous measurements, click to re-highlight ruler line. Overlaps with RULER-05 (pin/lock). Best suited for Phase 59 as part of advanced modes, or as a separate phase if scope is large.
- **Multiple simultaneous ruler lines** — Showing several measurements at once on canvas. Related to the notepad concept, scoped to Phase 59's pin/lock feature.

</deferred>

---

*Phase: 58-ruler-tool-line-mode*
*Context gathered: 2026-02-13*
