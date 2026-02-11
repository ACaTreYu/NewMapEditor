# Phase 39: Minimize & Restore Controls - Context

**Gathered:** 2026-02-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Child windows get full window management controls: minimize to compact bars, maximize to fill workspace, and restore to previous state. Title bar gets standard window control buttons (minimize, maximize, close).

**Note:** User decided to make maximize fully functional in Phase 39 rather than deferring to Phase 40. This phase effectively covers all v2.4 requirements (CTRL-01 through CTRL-05, MINZ-01 through MINZ-03, MAXZ-01 through MAXZ-04).

</domain>

<decisions>
## Implementation Decisions

### Minimized bar appearance
- Fixed width: 160px per bar
- Height matches child window title bar height (~28-30px)
- Shows document name + restore button + close button (mini title bar style)
- Uses the same styling as child window title bars (colors, font, active/inactive states)

### Bar positioning & stacking
- Bars positioned at the **top** of the workspace, not bottom
- Lower z-index than normal windows — active windows render on top of minimized bars
- Horizontal row, left-to-right ordering
- Wraps to second row if bars overflow workspace width

### Minimize/restore behavior
- **Instant swap** — no animation or transition, window disappears and bar appears immediately
- Restore returns window to **previous position and size**, brought to front (top z-order)
- When a window is minimized, the **next topmost window auto-activates**
- Minimized bars are **draggable** — user can reorder/reposition them within the workspace

### Title bar button layout
- Button order: minimize, maximize, close (Windows classic: _ [] X)
- All three buttons present from Phase 39 — maximize is **fully functional**, not a placeholder
- Icons are **CSS-drawn** (borders, pseudo-elements) — no SVGs or Unicode text
- Hover states: **close button turns red** on hover, minimize/maximize get subtle neutral highlight

### Maximize behavior (pulled forward from Phase 40)
- Maximized window fills entire MDI workspace area
- Maximized window hides title bar for maximum canvas space
- Maximized window canvas resizes to fill available space
- Double-click title bar toggles maximize/restore
- Restore button replaces maximize button when maximized

### Claude's Discretion
- Exact CSS-drawn icon shapes for minimize/maximize/close
- Minimized bar gap/spacing between bars
- How draggable bars snap back to grid when released
- z-index layering values
- How maximize interacts with tile/cascade window arrangement

</decisions>

<specifics>
## Specific Ideas

- Minimized bars at top is unusual for MDI — more like a tab bar of inactive documents behind the active windows
- Close button red hover matches modern Windows convention — familiar pattern
- Draggable bars give flexibility while wrapping keeps them organized

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. Phase 40 maximize work was pulled into Phase 39 by user decision.

</deferred>

---

*Phase: 39-minimize-restore-controls*
*Context gathered: 2026-02-10*
