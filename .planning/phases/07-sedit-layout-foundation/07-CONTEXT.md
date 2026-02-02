# Phase 7: SEdit Layout Foundation - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Restructure UI with huge canvas as primary focus in bordered window frame. Gray background visible around the map window frame. Bottom tiles panel defaults to 20% height with resizable divider.

This phase establishes the layout foundation. Multiple map documents (MDI) is a separate future capability.

</domain>

<decisions>
## Implementation Decisions

### Visual Direction
- Win95/98 aesthetic for the whole app, starting with this phase
- All UI elements should follow classic Windows look and feel

### Window Frame Style
- Classic beveled (3D) frame around canvas — raised/sunken edges like Windows 95/98 controls
- Use existing CSS theme variables for colors (--panel-bg, --border-color, etc.)
- Thin border (2-3px thickness)
- Claude's discretion: inset vs outset appearance (whichever matches SEdit best)

### Canvas Sizing Behavior
- Canvas max size determined by map dimensions (256x256 tiles at current zoom)
- No minimum canvas size — user manages window size
- Canvas centered within frame when smaller than available space
- Gray background fills around centered canvas

### Panel Divider Interaction
- Classic raised bar style matching window frame beveled aesthetic
- Free drag (smooth continuous resizing, no snap points)
- Allow collapse — can drag to near-zero to hide tiles panel completely
- Claude's discretion: hover feedback style (based on Win95/98 conventions)

### Claude's Discretion
- Frame inset vs outset appearance
- Divider hover feedback style
- Exact gray shade for background (should work with dark theme)
- Implementation details for centering logic

</decisions>

<specifics>
## Specific Ideas

- "Win95/98 aesthetic for the whole app" — this is the design direction going forward
- Canvas should feel like a viewport into the map, centered when not filling space
- Panel divider should allow complete collapse of tiles panel

</specifics>

<deferred>
## Deferred Ideas

- Multiple maps open simultaneously (MDI) — "maps should be in their own window within that, so you can load more than 1 map and edit fully between the maps you have loaded" — future phase (Phase 11+)

</deferred>

---

*Phase: 07-sedit-layout-foundation*
*Context gathered: 2026-02-02*
