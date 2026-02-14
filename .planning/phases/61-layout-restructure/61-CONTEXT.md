# Phase 61: Layout Restructure - Context

**Gathered:** 2026-02-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Constrain tile palette to tileset width (~640px) so it no longer stretches to full app width. Free horizontal space to the right for future use (Phase 62 ruler notepad). No new capabilities — just layout restructuring.

</domain>

<decisions>
## Implementation Decisions

### Freed space appearance
- Freed space and tile palette share the same bottom panel height — unified resize
- Freed space can collapse to zero width at narrow window sizes (tile palette takes priority)
- Bottom panel maintains its current height (no shrinking to fit)

### Width behavior
- Fixed 640px tile palette width (not dynamic based on loaded tileset)
- 640px is content area only — borders/padding are additional
- At window widths narrower than 640px, palette stays 640px with horizontal scroll
- Vertical scroll behavior within tile palette stays unchanged

### Panel separation
- Subtle 1px border line between tile palette and freed space (matching existing panel borders)
- Divider is not resizable — tile palette is always fixed at 640px
- Existing panel headers and labels stay as-is

### Claude's Discretion
- Freed space empty state appearance (before Phase 62 fills it)
- Whether tile palette and freed space are two distinct panels or one panel with internal split — pick what matches existing panel system
- CSS approach for the layout constraint

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The key constraint is 640px fixed width matching the tileset's 40 tiles * 16px layout.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 61-layout-restructure*
*Context gathered: 2026-02-13*
