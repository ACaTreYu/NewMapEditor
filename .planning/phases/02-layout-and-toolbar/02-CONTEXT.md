# Phase 2: Layout and Toolbar - Context

**Gathered:** 2026-02-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Restructure the editor to use a professional layout: horizontal toolbar below menu bar, map canvas taking main area, resizable bottom panel. The bottom panel will hold content (tabs come in Phase 3). This phase delivers the layout structure and toolbar, not tab functionality.

</domain>

<decisions>
## Implementation Decisions

### Toolbar design
- Single row, no grouping — all tools in one continuous row with equal spacing
- Icon + label below — each button shows icon with small text label underneath
- Pressed/sunken state for active tool — 3D effect making button appear pressed in
- Hover state: faint border/outline appears on hover

### Resize behavior
- Thin line divider (subtle) — simple 1-2px line, cursor changes on hover
- No double-click action — only drag works
- Live resize — canvas and panel resize in real-time while dragging
- No snapping — smooth continuous resize, stops only at min/max limits

### Panel proportions
- Default: ~20% of window height for bottom panel
- Maximum: ~60% of window height
- Small window behavior: canvas wins — canvas keeps minimum size, panel shrinks more
- Size persists between sessions (per roadmap requirement)

### Visual styling
- Color scheme: match system preference (follows OS dark/light mode)
- Region separation: thin borders between toolbar, canvas, and panel
- Visual density: compact — minimal padding, tight spacing

### Claude's Discretion
- Toolbar position/attachment details
- Minimum panel size (something usable, not just tabs)
- Exact border colors and spacing values
- Toolbar icon set/source

</decisions>

<specifics>
## Specific Ideas

No specific references — open to standard approaches that feel like professional desktop editors (VS Code, Photoshop-style layouts).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-layout-and-toolbar*
*Context gathered: 2026-02-01*
