# Phase 5: Classic Scrollbars - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Scrollbars that behave like classic Windows controls with arrow buttons at each end, one-tile-per-click movement, continuous scroll on hold, and page-jump on track click. This phase adds navigation controls to the existing map canvas scrollbars.

</domain>

<decisions>
## Implementation Decisions

### Arrow button style
- Solid triangles (classic Windows 95/2000 filled triangles)
- Subtle hover highlight before pressing
- Button size and press state: Claude's discretion

### Scroll speed tuning
- Constant speed when holding (no acceleration)
- Fast rate: ~8 tiles per second during continuous scroll
- Initial delay before continuous scrolling: Claude's discretion
- Single click animation (instant vs smooth): Claude's discretion

### Track click behavior
- All track click decisions left to Claude's discretion:
  - Jump one page vs jump to position
  - Repeat behavior when holding
  - Visual feedback on track
  - Page size definition

### Visual integration
- Use OS native scrollbar styling as base where possible
- Arrow buttons (custom) should match editor's CSS variable theme (dark/light)
- Always visible (no auto-hide)
- Thin width (~10px) for more canvas space

### Claude's Discretion
- Arrow button size (within scrollbar width constraints)
- Arrow button press state appearance
- Initial delay timing before continuous scroll starts
- Single click scroll animation
- Track click behavior (page jump vs position jump)
- Track hold repeat behavior
- Track visual feedback
- Page size definition for page jumps

</decisions>

<specifics>
## Specific Ideas

- "Classic Windows" feel for the arrow glyphs (solid triangles, not modern chevrons)
- Fast continuous scroll (~8 tiles/sec) for quick traversal
- Thin scrollbars (~10px) to maximize canvas space while keeping functionality

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-classic-scrollbars*
*Context gathered: 2026-02-02*
