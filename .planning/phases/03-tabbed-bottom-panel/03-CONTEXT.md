# Phase 3: Tabbed Bottom Panel - Context

**Gathered:** 2026-02-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Bottom panel organizes tools into accessible tabs (Tiles, Settings, Animations) following VS Code/Chrome tab conventions. Tab bar sits at top of bottom panel. Each tab displays corresponding content. Keyboard navigable.

</domain>

<decisions>
## Implementation Decisions

### Tab visual style
- Underline tabs (active tab has colored underline border)
- Blue accent underline (#3B82F6 or similar)
- Icon + text for each tab (Tiles, Animations, Settings)
- Compact height (28-32px) to maximize content area

### Tab interaction
- Subtle background tint on hover for inactive tabs
- Arrow keys auto-switch active tab (Chrome style)
- No Ctrl+number shortcuts
- Instant switch on click (no animated underline slide)

### Content transitions
- Instant swap (no fade or animation)
- Preserve scroll position when switching away and back
- Keep all tabs mounted (hidden via CSS, not unmounted)

### Default state
- Tiles tab active on app launch
- Tab order: Tiles, Animations, Settings (creative tools together)
- Equal width tabs for balanced look
- Tab group centered in panel width

### Claude's Discretion
- Whether to pause animation previews when Animations tab is hidden (performance consideration)
- Exact icon choices for each tab
- Spacing between icon and label

</decisions>

<specifics>
## Specific Ideas

- VS Code/Chrome tab convention as reference
- Creative tools (Tiles, Animations) grouped before Settings

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-tabbed-bottom-panel*
*Context gathered: 2026-02-01*
