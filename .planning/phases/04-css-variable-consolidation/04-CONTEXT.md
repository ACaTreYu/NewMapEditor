# Phase 4: CSS Variable Consolidation - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate all hardcoded colors to CSS custom properties and implement both dark and light themes. All UI components (except tile canvas rendering) respond correctly to theme changes. Theme toggle available in toolbar and settings panel.

</domain>

<decisions>
## Implementation Decisions

### Variable Naming
- Documentation: Comment block at top of variables file listing all available vars
- All other naming decisions (semantic vs component, prefix, state patterns, verbosity, categories): Claude's discretion based on codebase patterns and best practices

### Theme Structure
- Support both dark AND light themes in this phase
- Theme switching: Default to system preference, allow manual override
- Theme toggle location: Both toolbar (quick toggle) and settings panel
- Light theme direction: Warm cream (slightly warm off-white, softer on eyes)
- Canvas area: Theme-aware (scrollbars and background follow theme)
- Tile canvas rendering: Stays neutral/fixed (not themed)
- Transition behavior and persistence: Claude's discretion

### Migration Scope
- Canvas drawing stays neutral, canvas chrome (scrollbars, background) is themed
- Inline styles: Claude should investigate during research
- Migration approach (incremental vs all-at-once): Claude's discretion
- Verification: Follow roadmap success criteria

### Color Palette
- Fresh palette: Define new cohesive palette, adjust colors as needed (not just moving existing)
- Accent color, gray shades, semantic colors: Claude's discretion based on UI needs

### Claude's Discretion
- Variable naming convention (semantic vs component, prefix patterns, state naming, verbosity)
- Theme transition animation (instant vs subtle fade)
- Theme persistence approach
- Migration strategy (all-at-once vs component-by-component)
- Gray scale granularity
- Whether to include semantic colors (success/warning/error)
- Accent color choice
- Spacing/sizing variable extraction (if beneficial)

</decisions>

<specifics>
## Specific Ideas

- Light theme should feel "warm cream" - slightly warm off-white, softer on eyes
- Theme toggle in both places: quick access in toolbar, full option in settings
- Tile canvas rendering stays fixed regardless of theme (better for viewing tiles)

</specifics>

<deferred>
## Deferred Ideas

- Extended map settings from AC_Setting_Info_25.txt (game engine settings with sliders/textbox) - future phase for expanded Map Settings panel

</deferred>

---

*Phase: 04-css-variable-consolidation*
*Context gathered: 2026-02-02*
