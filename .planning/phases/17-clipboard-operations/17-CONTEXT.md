# Phase 17: Clipboard Operations - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can copy, cut, paste, and delete selected tiles using standard keyboard shortcuts. Requires an active marquee selection (Phase 16). Floating paste preview is Phase 18; mirror/rotate transforms are Phase 19.

</domain>

<decisions>
## Implementation Decisions

### Paste placement
- Paste places tiles at their **original position** (where they were copied from), not at cursor
- Tiles that fall outside the 256x256 map boundary are silently discarded — no error, no prevention
- After paste, the pasted region becomes the **active selection** (marching ants around it)
- Clipboard persists — user can paste unlimited times until overwritten by a new copy/cut

### Delete behavior
- Delete key and cut both fill cleared area with **DEFAULT_TILE (280)**
- **Instant change only** — no flash, highlight, or animation on delete/cut
- **Selection persists** after delete — marching ants stay around the cleared region
- Cut (Ctrl+X) also keeps selection after copying + clearing (consistent with delete)

### Clipboard data model
- Copy/cut **require an active selection** — no single-tile copy from cursor position
- Clipboard includes **game objects** (spawns, switches, bridges) within the selected area
- Clipboard **persists across tool switches** — copy with SELECT, switch to WALL, switch back, paste still works
- **Claude's Discretion:** Whether to copy full 16-bit tile values (preserving animation flags/offsets) or tile IDs only

### Keyboard shortcuts
- **Both** standard Windows AND SEdit-specific shortcuts supported as aliases
  - Ctrl+C = copy, Ctrl+X = cut, Ctrl+V = paste, Delete = delete selection
  - SEdit shortcuts added as aliases (research needed to identify them)
- Shortcuts work with **any active tool** — if there's a selection, Ctrl+C/X/V work regardless of current tool
- Ctrl+V pastes **in place immediately** — does NOT auto-switch to SELECT tool
- **No Ctrl+A** — no select-all shortcut

### Claude's Discretion
- Full 16-bit tile value preservation vs tile ID only in clipboard
- Exact SEdit shortcut mappings (needs research)
- Undo/redo integration approach
- Status bar feedback messages for clipboard operations

</decisions>

<specifics>
## Specific Ideas

- Paste at original position matches SEdit behavior — familiar to existing users
- Selection persistence after delete/cut enables iterative workflows (delete, then paste something new into same region)
- Game objects in clipboard enables full region duplication including spawns/switches/bridges

</specifics>

<deferred>
## Deferred Ideas

- **Panel styling fix:** Make imgTiles panel background transparent (not blue), fix animation panel width to full blue bg width, remove blue backgrounds — UI polish task
- Floating paste preview with semi-transparent cursor follow — Phase 18
- Mirror/rotate transforms on clipboard contents — Phase 19

</deferred>

---

*Phase: 17-clipboard-operations*
*Context gathered: 2026-02-05*
