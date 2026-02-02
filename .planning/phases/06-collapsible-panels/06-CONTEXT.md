# Phase 6: Collapsible Panels - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can maximize canvas space by collapsing the bottom panel. The panel opens at 20% height by default (smaller than v1.0), can collapse to show only the tab bar, has a visible expand button, and double-click on the divider toggles collapse/expand.

</domain>

<decisions>
## Implementation Decisions

### Collapse Interaction
- Both methods available: dedicated button AND drag-to-minimum
- Collapse button placed on the divider (VS Code style)
- Double-click on divider toggles collapse/expand (not just reset to default)
- Dragging up from collapsed state begins expanding the panel
- When expanding via drag, panel height matches cursor position immediately

### Collapsed Appearance
- Show only the tab buttons (Tiles, Animations, Settings) when collapsed
- Clicking any tab when collapsed expands panel and shows that tab's content
- Divider shows resize cursor on hover to indicate draggability

### Transition Feel
- Instant transitions, no animation when collapsing/expanding
- No snap points while dragging — free drag, snap only at collapse threshold
- Minimum expanded height: tab bar + one row of content (~80px)
- No maximum height limit — user can drag panel as tall as they want

### State Persistence
- Always start expanded at 20% height on app launch (no persistence across sessions)
- Custom height does NOT persist across sessions — always reset to 20%
- During a session, panel height persists while switching tabs
- Panel maintains percentage-based height when window is resized
- No keyboard shortcut — mouse/divider interaction is sufficient

### Claude's Discretion
- Collapse threshold (when drag snaps to collapsed)
- Button icon design (chevron direction or consistent icon)
- Visual distinction for collapsed state (if any)

</decisions>

<specifics>
## Specific Ideas

- Collapse button on divider like VS Code
- Tab click while collapsed should feel natural — click tab, see content

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-collapsible-panels*
*Context gathered: 2026-02-02*
