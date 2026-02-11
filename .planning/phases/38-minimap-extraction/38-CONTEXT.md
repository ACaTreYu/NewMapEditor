# Phase 38: Minimap Component Extraction - Context

**Gathered:** 2026-02-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Extract the minimap into an independent, always-visible component. It renders on startup (no map loaded), stays visible when the animation panel is collapsed, and displays a checkerboard pattern for empty map areas. The animation panel width is fixed to match the minimap width.

</domain>

<decisions>
## Implementation Decisions

### Checkerboard style
- Classic gray/white color scheme (light gray #C0C0C0 and white #FFFFFF, Photoshop-style)
- 8x8 pixel blocks per checkerboard square
- Checkerboard is the full background layer; occupied tiles paint over it
- 1px solid border around the minimap

### No-map empty state
- Checkerboard background with centered "Minimap" label
- Label is prominent — normal contrast, clearly readable
- Label disappears when a map is loaded (map content replaces it)

### Independent sizing and placement
- Minimap stays in the right panel area with its own reserved space (NOT an overlay)
- Always visible — does not hide when animation panel collapses
- Animation panel width fixed to match minimap width (consistent right column)
- 1px border provides separation (no drop shadow)

### Claude's Discretion
- Exact minimap pixel dimensions (based on what works with current layout)
- Behavior when last document closes (return to empty state or not)
- Label font size and exact styling within "prominent" constraint

</decisions>

<specifics>
## Specific Ideas

- User mentioned trying 8x8 blocks to see if it helps with app lag — performance is a secondary motivation for the checkerboard block size
- "Should be like it is currently, non-overlay" — preserve the existing spatial relationship where minimap has dedicated space

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 38-minimap-extraction*
*Context gathered: 2026-02-10*
