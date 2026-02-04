# Phase 15: Conveyor Tool - Context

**Gathered:** 2026-02-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement the CONVEYOR tool: toolbar button with direction selector dropdown, drag-to-define rectangle placement, and 4-tile repeating pattern fill matching SEdit behavior. Also retrofit all game object tools with variants (SPAWN, BUNKER, etc.) to use the same dropdown pattern. Conveyors are team-neutral, animated, and appear in the animations panel.

</domain>

<decisions>
## Implementation Decisions

### Tool dropdown UX (all variant tools)
- Clicking a tool button with variants (SPAWN, BUNKER, CONVEYOR, etc.) opens a visual dropdown showing the available variants
- Selecting a variant closes the dropdown and activates the tool with that variant immediately
- This dropdown pattern applies to ALL game object tools that have variants, not just CONVEYOR
- Keyboard shortcut C activates the CONVEYOR tool

### Drag interaction
- Click-drag to define rectangle: click start corner, drag to opposite corner, release to fill
- Any drag direction works (start point and end point define opposite corners regardless of direction)
- Live tile preview while dragging: show actual conveyor tile pattern filling the rectangle as you drag
- Rectangle clamped to map bounds when dragging near edges
- No maximum size limit (up to full 256x256 map)
- Escape key cancels placement mid-drag
- Conveyors are team-neutral (no team selector interaction)
- Placement overwrites existing game objects (allow overlap)

### Undo support
- Placing a conveyor is a single undo operation: Ctrl+Z removes the entire rectangle at once

### Conveyor appearance
- Tiles appear as their tileset graphics with no special overlay or direction arrows
- Conveyor tiles are animated (showing belt movement)
- Conveyor tiles visible in the animations panel
- Tile pattern communicates direction on its own
- Eraser tool can remove conveyor tiles like any other game object

### Claude's Discretion
- Dropdown visual style: tile graphics vs text+icon (match existing GameObjectToolPanel patterns)
- Undersized drag handling (rectangle smaller than 2x2 minimum)
- Tiling approach for seamless pattern repeat
- Edge tile behavior when rectangle isn't a multiple of pattern size
- Tile ID source (hardcoded constants vs data-driven)
- Whether conveyor replaces base tile or overlays the tile layer (follow SEdit behavior)
- Pattern filling algorithm details

</decisions>

<specifics>
## Specific Ideas

- "When you use a tool that has options or styles, it should show you in a visual dropdown from the tool button, so you click bunker tool, then you can choose left or right. Like in SEdit when you pick spawn tool... it drops down from the tool button and shows you the spawn types you can choose visually"
- Direction selector shows Left-Right vs Up-Down conveyor directions
- SEdit source code is the reference for exact tile patterns and conveyor behavior

</specifics>

<deferred>
## Deferred Ideas

- BRIDGE and BUNKER tools retrofit to use drag-to-define rectangles (currently click-to-place 3x3 stamps) — future phase

</deferred>

---

*Phase: 15-conveyor-tool*
*Context gathered: 2026-02-04*
