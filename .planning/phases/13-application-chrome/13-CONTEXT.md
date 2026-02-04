# Phase 13: Application Chrome - Context

**Gathered:** 2026-02-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Style the application frame to look like a Windows XP Classic mode program. Toolbar buttons use flat/raised/sunken states, a new status bar displays editing context in sunken fields, panel dividers appear as thin raised bars, and inner title bars show active/inactive focus states. The visual direction is **XP Classic** (not Luna, not Win98) — smoother rendering and slightly updated colors over the Win98 foundation from Phase 12, but no rounded corners or colorful gradients.

</domain>

<decisions>
## Implementation Decisions

### Toolbar button behavior
- Rest state, hover/press transitions, and active/toggled appearance: **Claude's discretion** — pick the most authentic XP Classic toolbar behavior
- Toolbar buttons should display **icons with text labels below** each icon
- Visual separation between button groups: **Claude's discretion** — choose between vertical separators or spacing based on XP Classic conventions

### Status bar layout
- **New component** — status bar does not exist yet, needs to be created from scratch
- Display **full context**: cursor coordinates (X, Y), tile ID under cursor, current zoom level, active tool name, and selection dimensions
- Field arrangement: **Claude's discretion** — pick the most practical layout (mixed fixed/auto recommended)
- Include a **classic diagonal resize grip** in the bottom-right corner
- Fields styled as shallow sunken rectangles (XP Classic bevel depth)

### Panel divider handles
- Grip pattern / visual treatment: **Claude's discretion** — pick the most authentic XP Classic approach
- Width: **thin (4-5px)** — minimize visual weight, maximize content area
- Hover behavior: **cursor change only** — resize cursor arrows on hover, no visual highlight on the divider itself
- All dividers look **the same** regardless of orientation or position in the layout hierarchy

### Title bar styling
- Color and gradient: **Claude's discretion** — pick the most authentic XP Classic look (using existing ActiveCaption CSS variables from Phase 12 scheme system)
- Content display: **Claude's discretion** — pick what's most useful for a map editor
- Window control buttons: **Claude's discretion** — decide based on SEdit reference and single-document editor context
- Active vs inactive: **Active = blue, Inactive = grey** — classic Windows focus tracking behavior showing which panel has focus

### Claude's Discretion
- Toolbar button rest state and state transitions (flat vs outlined, hover effects)
- Toolbar button group separators (etched lines vs spacing)
- Status bar field sizing strategy
- Panel divider grip pattern (dots, ridges, or plain)
- Title bar color/gradient specifics
- Title bar content (document name, app name, dirty indicator)
- Title bar window control buttons (full, close-only, or none)

</decisions>

<specifics>
## Specific Ideas

- Overall visual direction is **XP Classic mode** — not Luna (blue/green/colorful), not raw Win98. XP Classic keeps the grey foundation but has smoother, slightly updated rendering
- The Phase 12 Win98 foundation (grey background, bevels, CSS variables, scheme system) remains intact — this phase layers XP Classic chrome on top
- Toolbar icons with text labels below mirrors how many classic Windows applications presented their toolbars

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 13-application-chrome*
*Context gathered: 2026-02-04*
