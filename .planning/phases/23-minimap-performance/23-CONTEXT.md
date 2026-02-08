# Phase 23: Minimap Performance - Context

**Gathered:** 2026-02-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace per-draw DOM canvas creation with a pre-computed tile color lookup table. The minimap should render the same visual output but without creating temporary canvas elements on every draw call. This is a pure performance optimization — no new minimap features.

</domain>

<decisions>
## Implementation Decisions

### Color Sampling Method
- Use **average pixel color** across all pixels in each 16x16 tile
- Compute lookup table once when tileset image loads
- Table maps tile index → RGB color value

### Special Tile Colors
- **Hardcoded distinct colors** for game-significant tiles (walls, spawns, flags, conveyors, doors)
- These override the averaged tileset color for readability
- Should match SEdit-style visual distinction on the minimap

### Animated Tiles
- Show **static frame 0 color only** — no animation on minimap
- Animated tiles use the averaged color of their first animation frame

### Redraw Timing
- **Debounced** — minimap waits after last tile edit before redrawing (~100-200ms)
- Prevents CPU thrashing during rapid painting/dragging operations

### Claude's Discretion
- Exact debounce interval tuning
- Specific hardcoded color values for special tiles
- Lookup table data structure (flat array, Map, etc.)
- How to handle the viewport rectangle overlay rendering

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for the lookup table and rendering pipeline.

</specifics>

<deferred>
## Deferred Ideas

- **Remove Ctrl+R from rotate 90°** — Ctrl+R should remain as Electron hot reload, not rotate. Rotate gets no replacement shortcut for now. (Bug fix, not Phase 23 scope)

</deferred>

---

*Phase: 23-minimap-performance*
*Context gathered: 2026-02-08*
