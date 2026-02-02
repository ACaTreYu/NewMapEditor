# Phase 9: Panel Redesign - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Redesign animations panel (left side) and tiles panel (bottom) to match SEdit layout. Move animations from bottom tabs to dedicated left panel. Remove tabs from bottom panel — tiles only. Match SEdit's visual style and proportions.

**Priority concern:** Canvas is currently too small. This phase should address layout to maximize canvas space.

</domain>

<decisions>
## Implementation Decisions

### Animation Panel Layout
- Position: Left side of app window, always visible
- Width: Resizable via drag divider, default matches SEdit's panel width
- Not collapsible — always visible when app is open
- Title bar: "Animations" with classic blue Win95/98 background
- Title bar controls: Claude's discretion (earlier decision: no collapse since panel is always visible)

### Animation Previews
- Size: 16x16 pixels (actual tile size)
- Layout: Claude's discretion (grid or single column)
- Animation: Always animating (continuous playback)
- Hex labels: Show on hover/selection only, without leading zero (D5, not 0D5)
- Selection highlight: Claude's discretion (visible selection style)
- Frame offset: Popup field appears when animation is selected (inline vs floating at Claude's discretion)
- No search/filter — scroll only to find animations

### Tiles Panel Layout
- Position: Bottom of window
- Width: Match SEdit's layout (research needed for exact span)
- Resizable: Via drag divider (up = more tileset, down = more canvas)
- Title bar: "Tileset" with classic blue Win95/98 background
- Title bar controls: None (just title text)
- Remove tabs — tiles only, no more Tiles/Animations/Settings tabs
- Settings content moves to Map Settings dialog (Phase 10)

### Tileset Display
- Scaling: Match SEdit behavior (research needed)
- Selection style: Keep current selection highlight
- No zoom feature — tileset always shows full view
- Tile info: Show tile index on hover (tooltip)
- Resize behavior: Claude's discretion based on SEdit
- Multi-tile selection: Current drag-to-select works, matches SEdit

### Selection Preview on Canvas
- Selection outline should be visible on canvas when placing tiles
- Style: Match SEdit (research needed for outline style)
- This helps users visually line up multi-tile stamps

### Panel Dimensions
- Minimum window size: 1024x768
- Minimum panel sizes: Enforced (prevent unusably small panels)
- Resize priority: Claude's discretion (likely canvas grows with window)
- Size persistence: No — reset to defaults each session

### Visual Styling
- Full Win95/98 theme throughout app
- Panel dividers: Win95/98 style (beveled/3D borders)
- Resize handles: Claude's discretion (subtle cursor or grip dots)
- Panel title bars: Classic blue background

### Toolbar Changes
- Keep current modern flat buttons (not beveled)
- Make buttons smaller (icon-only, tooltips on hover)
- Photoshop/GIMP-style compact toolbar
- Keep toolbar horizontal at top
- Grid toggle is existing feature, ensure accessible

### Other Layout
- Minimap: Keep in top-right (from Phase 8)

### Claude's Discretion
- Animation panel layout (grid vs column)
- Animation selection highlight style
- Frame offset popup implementation (inline vs floating)
- Resize handle visibility
- Exact panel proportions within constraints
- Window resize behavior (how space is distributed)

</decisions>

<specifics>
## Specific Ideas

- "Make the Map Viewing area big like SEdit" — canvas is currently too small, this is priority
- "Win 95/98 style" dividers — full classic Windows theme
- "Think Photoshop, GIMP" for toolbar — compact icon-only buttons
- Selection outline on canvas for multi-tile placement, "SEdit is this way"
- Match SEdit's exact panel widths and layout proportions

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 09-panel-redesign*
*Context gathered: 2026-02-02*
