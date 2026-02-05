---
phase: 17-clipboard-operations
plan: 01
subsystem: ui
tags: [clipboard, selection, keyboard-shortcuts, zustand, undo-redo]

# Dependency graph
requires:
  - phase: 16-marquee-selection
    provides: Selection state with marching ants visualization
provides:
  - Clipboard operations (copy, cut, paste, delete) for marquee selection
  - Keyboard shortcuts (Ctrl+C/X/V/D, Delete, Ctrl+Insert) for clipboard actions
  - Undo/redo integration for all clipboard operations
  - Persistent selection after cut/delete operations
affects: [18-floating-paste-preview, 19-mirror-rotate-transforms]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Clipboard data stores full 16-bit tile values (preserves animation flags, game objects)
    - Selection persists after cut/delete (user can immediately repaste or copy again)
    - Paste creates new selection around pasted region
    - Global keyboard shortcuts work regardless of active tool

key-files:
  created: []
  modified:
    - src/core/editor/EditorState.ts
    - src/components/ToolBar/ToolBar.tsx

key-decisions:
  - "Copy preserves full 16-bit tile values (animation flags, game object encodings)"
  - "Selection persists after cut and delete (marching ants stay visible)"
  - "Pasted region becomes active selection (enables immediate transforms)"
  - "Clipboard persists across tool switches (not reset on setMap/newMap)"
  - "Paste only checks clipboard !== null, not selection.active (paste works without selection)"
  - "Out-of-bounds tiles silently discarded on paste (user decision)"

patterns-established:
  - "Clipboard operations use get() to compose actions (copySelection from cutSelection, pushUndo, setTiles)"
  - "Keyboard shortcuts in ToolBar global handler (not MapCanvas) so they work with any tool"
  - "Ctrl+D and Ctrl+Insert as SEdit compatibility aliases"

# Metrics
duration: 2min
completed: 2026-02-05
---

# Phase 17 Plan 01: Clipboard Operations Summary

**Copy, cut, paste, delete with Ctrl+C/X/V/D keyboard shortcuts, undo/redo integration, and persistent selection behavior**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-05T00:58:55Z
- **Completed:** 2026-02-05T01:01:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Clipboard state in EditorState with ClipboardData interface (width, height, tiles, originX, originY)
- Four clipboard actions: copySelection, cutSelection, pasteClipboard, deleteSelection
- Keyboard shortcuts: Ctrl+C/X/V/D, Delete, Ctrl+Insert (SEdit aliases)
- All map-modifying clipboard operations integrate with undo/redo via pushUndo
- Selection persists after cut and delete (marching ants stay visible for immediate re-copy/paste)
- Pasted region becomes active selection (enables immediate paste-transform workflow)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add clipboard state and actions to EditorState** - `9e7cc66` (feat)
2. **Task 2: Add clipboard keyboard shortcuts to ToolBar** - `4fea0df` (feat)

## Files Created/Modified
- `src/core/editor/EditorState.ts` - ClipboardData interface, clipboard state, copySelection/cutSelection/pasteClipboard/deleteSelection actions
- `src/components/ToolBar/ToolBar.tsx` - Keyboard shortcuts (Ctrl+C/X/V/D, Delete, Ctrl+Insert) calling clipboard actions

## Decisions Made

**1. Copy preserves full 16-bit tile values**
- Rationale: Preserves animation flags (bit 15) and game object encodings for perfect tile reproduction

**2. Selection persists after cut and delete**
- Rationale: User decision from CONTEXT.md - allows immediate re-copy/paste workflow without reselecting

**3. Pasted region becomes active selection**
- Rationale: Enables paste-transform workflow (paste → mirror/rotate in Phase 19)

**4. Clipboard persists across tool switches**
- Rationale: Not reset on setMap/newMap because it's harmless and gets garbage collected

**5. Out-of-bounds tiles silently discarded on paste**
- Rationale: User decision - graceful handling instead of error messages

**6. Global keyboard shortcuts in ToolBar**
- Rationale: Work regardless of active tool (not MapCanvas) for consistent UX

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation proceeded smoothly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for Phase 18 (Floating Paste Preview):
- Clipboard operations complete and tested
- Paste creates selection around pasted region (groundwork for floating preview)
- 70% opacity pattern from Phase 15 (Conveyor Tool) can be reused for floating paste preview

No blockers or concerns.

---
*Phase: 17-clipboard-operations*
*Completed: 2026-02-05*
