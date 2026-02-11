# Phase 43: Integration & Cleanup - Context

**Gathered:** 2026-02-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Transform operations integrate with undo/redo and replace old clipboard-based shortcuts. This phase also restructures the toolbar layout and removes dead code. Does NOT add new capabilities like Move Selection.

</domain>

<decisions>
## Implementation Decisions

### Old Code Cleanup
- Full purge of old clipboard transform functions (mirrorClipboardHorizontal, mirrorClipboardVertical, rotateClipboard) — remove entirely if unused
- Remove old Ctrl+H, Ctrl+J, Ctrl+R keyboard bindings
- Remove all associated dead code — no commented-out remnants, no keeping "just in case"
- Remove Eraser tool entirely — delete ToolType.ERASER, all eraser logic, eraser icon, cleanup all references
- Remove 180° and -180° rotation options — remove from toolbar AND delete algorithm code if only used by those options

### Rotate Button UI Restructure
- Replace single Rotate dropdown button with TWO separate rotate buttons: CW and CCW
- Each button has a directional circular arrow icon indicating rotation direction
- No dropdown needed — each button executes its rotation immediately on click
- Icon style: simple/pragmatic (toolbar icons will be overhauled in a future milestone)
- Mirror button keeps its 4-item dropdown (Right/Left/Up/Down) unchanged

### Toolbar Ordering
- **Non-game tools first:** Select, Pencil, Fill, Picker | Rotate CW, Rotate CCW, Mirror | Cut, Copy, Paste
- **Game tools after:** Line, Rect | Wall, W.Draw, W.Rect | Flag, Pole, Warp, Spawn, Switch | Bunker, H.Pen, Bridge, Conveyor
- **End section:** Grid | Settings
- Cut/Copy/Paste get new toolbar buttons (existing shortcuts Ctrl+C/X/V remain)
- Line and Rect placed at the beginning of the game tools section

### Keyboard Shortcuts
- No new shortcuts for rotate or mirror — toolbar-only
- Remove ALL single-letter tool shortcuts (V, B, G, L, R, W, E, I, F, P, T, S, H, J, K, N, C, Q, A)
- Keep all Ctrl+ shortcuts: Ctrl+N (new), Ctrl+O (open), Ctrl+S (save), Ctrl+Z (undo), Ctrl+Y/Ctrl+Shift+Z (redo), Ctrl+C (copy), Ctrl+X (cut), Ctrl+V (paste), Ctrl+D / Delete (delete selection)

### Claude's Discretion
- Rotate button icon design (simple unicode or drawn arrows — whatever fits current toolbar)
- Cut/Copy/Paste toolbar button icon style
- Exact disabled state visual treatment for rotate/mirror when no selection exists
- Whether to add separator between Cut/Copy/Paste and the rotate/mirror group

</decisions>

<specifics>
## Specific Ideas

- Toolbar icons will be overhauled in a future milestone, so don't over-invest in icon quality now
- Two rotate buttons should visually indicate direction (clockwise vs counter-clockwise circular arrows)
- Button order within non-game group: Select, Pencil, Fill, Picker, then transforms, then clipboard

</specifics>

<deferred>
## Deferred Ideas

- Move Selection tool (drag to reposition selected tiles) — future phase/milestone
- Toolbar icon overhaul — future milestone

</deferred>

---

*Phase: 43-integration-cleanup*
*Context gathered: 2026-02-11*
