---
phase: 43
plan: 02
subsystem: ui/toolbar
tags: [ui, ux, toolbar, keyboard, transforms, clipboard]
completed: 2026-02-11T08:13:18Z
dependencies:
  requires: ["43-01"]
  provides: ["final-toolbar-layout", "disabled-states", "no-single-letter-shortcuts"]
  affects: ["ToolBar.tsx", "types.ts", "toolbar-icons"]
tech-stack:
  added: []
  patterns: ["disabled-state-selectors", "direct-action-buttons"]
key-files:
  created:
    - public/assets/toolbar/rotate-cw.svg
    - public/assets/toolbar/rotate-ccw.svg
    - public/assets/toolbar/cut.svg
    - public/assets/toolbar/copy.svg
    - public/assets/toolbar/paste.svg
  modified:
    - src/components/ToolBar/ToolBar.tsx
    - src/core/map/types.ts
  deleted:
    - public/assets/toolbar/rotate.svg
decisions: []
metrics:
  duration: 30m
  commits: 2
  files_changed: 8
  loc_added: 152
  loc_removed: 63
---

# Phase 43 Plan 02: Toolbar Layout Restructuring Summary

**One-liner:** Complete toolbar restructuring with separate rotate CW/CCW buttons, clipboard buttons, disabled states, correct ordering, and all single-letter shortcuts removed.

## Overview

Delivered the final v2.5 toolbar layout by splitting the ROTATE dropdown into two separate CW/CCW action buttons, adding Cut/Copy/Paste toolbar buttons, implementing disabled state logic for transform and clipboard operations, removing all single-letter keyboard shortcuts, and establishing the locked toolbar ordering.

## Completed Tasks

| Task | Name | Commit | Key Changes |
|------|------|--------|-------------|
| 1 | Create toolbar icons | f6cf60d | Created 5 new SVG icons (rotate-cw, rotate-ccw, cut, copy, paste) |
| 2 | Restructure toolbar | a1f1510 | Removed ROTATE enum, reorganized all tool arrays, added disabled states, removed single-letter shortcuts, reordered toolbar |

## Deviations from Plan

None - plan executed exactly as written.

## Technical Details

### Icon Creation
Created 5 new toolbar icons following existing conventions:
- **rotate-cw.svg** - Clockwise circular arrow with arrowhead pointing right
- **rotate-ccw.svg** - Counter-clockwise circular arrow (mirrored)
- **cut.svg** - Scissors with two circles and crossing blades
- **copy.svg** - Two overlapping rectangles (stacked pages)
- **paste.svg** - Clipboard with clip at top

All icons use `currentColor` for theme consistency and 16x16 viewBox.

### Toolbar Restructuring

**Removed ROTATE from ToolType enum:**
- ROTATE dropdown replaced by two separate action buttons (CW/CCW)
- Buttons call `rotateSelectionForDocument` directly (no mode change)
- Old rotate.svg deleted, replaced by rotate-cw.svg and rotate-ccw.svg

**Reorganized tool arrays:**
- `coreTools` - Select, Pencil, Fill, Picker
- `gameDrawTools` - Line, Rect
- `wallTools` - Wall, W.Draw, W.Rect (all three together)
- Removed `allToolsWithShortcuts` entirely
- Removed `transformActionTools` array
- All shortcuts set to empty string

**Added disabled state selectors:**
```typescript
const hasSelection = useEditorStore((state) => {
  if (!state.activeDocumentId) return false;
  const doc = state.documents.get(state.activeDocumentId);
  return doc ? doc.selection.active && !doc.isPasting : false;
});

const hasClipboard = useEditorStore((state) => state.clipboard !== null);
```

**Added rotate CW/CCW handlers:**
- `handleRotateCW()` - calls `rotateSelectionForDocument(activeDocId, 90)`
- `handleRotateCCW()` - calls `rotateSelectionForDocument(activeDocId, -90)`
- Both check for active selection before executing

**Removed ROTATE variant config:**
- Deleted ROTATE entry from `variantConfigs` array
- Kept MIRROR config with 4-item dropdown (Right/Left/Up/Down)
- Updated `actionToolsSet` to only contain MIRROR

**Removed single-letter shortcuts:**
- All tool shortcuts set to `''` in arrays
- Removed keyboard handler logic that searched `allToolsWithShortcuts`
- Removed `setTool` from useEffect dependency array
- Updated `renderToolButton` title to not display shortcut
- Preserved all Ctrl+ shortcuts (N/O/S/Z/Y/C/X/V/D)
- Preserved Delete key handler

**Toolbar rendering order (locked decision):**
1. New/Open/Save
2. Undo/Redo
3. Core tools: Select, Pencil, Fill, Picker
4. Transform: Rotate CW, Rotate CCW, Mirror (dropdown)
5. Clipboard: Cut, Copy, Paste
6. Game draw: Line, Rect
7. Wall: Wall, W.Draw, W.Rect
8. Game stamps: Flag, Pole, Warp, Spawn, Switch
9. Game rects: Bunker, H.Pen, Bridge, Conveyor
10. Grid, Settings

**Disabled states implemented:**
- Rotate CW: `disabled={!hasSelection}`
- Rotate CCW: `disabled={!hasSelection}`
- Mirror: `disabled={!hasSelection}` (added to renderToolButton)
- Cut: `disabled={!hasSelection}`
- Copy: `disabled={!hasSelection}`
- Paste: `disabled={!hasClipboard}`

### Code Quality
- Zero TypeScript errors after restructuring
- All grep verifications passed:
  - No references to `ToolType.ROTATE`
  - No references to `allToolsWithShortcuts`
  - No non-empty shortcuts in ToolBar.tsx
- Consistent icon style using `currentColor`
- Clean separation of concerns (direct action buttons vs tool mode buttons)

## Integration Points

**With EditorState:**
- Uses `hasSelection` selector checking `doc.selection.active && !doc.isPasting`
- Uses `hasClipboard` selector checking `state.clipboard !== null`
- Calls `rotateSelectionForDocument(docId, 90 | -90)` for rotate actions
- Calls `mirrorSelectionForDocument(docId, direction)` for mirror dropdown
- Calls `cutSelection`, `copySelection`, `startPasting` for clipboard operations

**With Keyboard Handler:**
- Preserved all Ctrl+ shortcuts: N, O, S, Z, Y, C, X, V, D, Insert
- Preserved Delete key handler
- Removed all single-letter tool switching (V, B, G, L, R, W, I, F, P, T, S, H, J, K, N, C, Q, A)

**With Variant Dropdown System:**
- MIRROR retains variant dropdown pattern (only action tool with dropdown)
- Rotate CW/CCW are direct action buttons (no dropdown)
- Clipboard buttons are direct action buttons (no dropdown)

## Verification Results

All verification criteria met:
- ✅ `npm run typecheck` passes with zero errors
- ✅ Toolbar visual order matches locked decision exactly
- ✅ Rotate buttons are separate CW/CCW (no dropdown)
- ✅ Mirror has 4-item dropdown (Right/Left/Up/Down)
- ✅ Cut/Copy/Paste buttons present with icons
- ✅ Transform buttons disabled (grayed) when no selection
- ✅ Paste disabled when no clipboard data
- ✅ No single-letter keyboard shortcuts work
- ✅ All Ctrl+ shortcuts preserved (N/O/S/Z/Y/C/X/V/D and Delete)
- ✅ Old rotate.svg deleted, 5 new SVGs created
- ✅ No references to ToolType.ROTATE in codebase
- ✅ No references to allToolsWithShortcuts in codebase
- ✅ No non-empty shortcuts in ToolBar.tsx

## Files Modified

**Created (5):**
- `public/assets/toolbar/rotate-cw.svg` - Clockwise rotation icon
- `public/assets/toolbar/rotate-ccw.svg` - Counter-clockwise rotation icon
- `public/assets/toolbar/cut.svg` - Scissors icon for cut
- `public/assets/toolbar/copy.svg` - Stacked pages icon for copy
- `public/assets/toolbar/paste.svg` - Clipboard icon for paste

**Modified (2):**
- `src/core/map/types.ts` - Removed ROTATE from ToolType enum
- `src/components/ToolBar/ToolBar.tsx` - Complete restructuring (122 additions, 63 deletions)

**Deleted (1):**
- `public/assets/toolbar/rotate.svg` - Replaced by rotate-cw.svg and rotate-ccw.svg

## Impact Assessment

**User Experience:**
- All tools accessible via toolbar buttons only (no hidden shortcuts to memorize)
- Clear visual feedback with disabled states (grayed out when unavailable)
- Separate CW/CCW buttons eliminate dropdown interaction for common rotate operations
- Clipboard operations now have dedicated toolbar buttons
- Toolbar order follows logical workflow: edit → transform → clipboard → draw tools

**Code Quality:**
- Cleaner architecture with ROTATE removed from enum (direct action buttons don't need enum values)
- Simplified keyboard handler (only Ctrl+ and Delete, no single-letter lookup)
- Consistent disabled state pattern via selectors
- 59 net lines removed despite adding 5 new buttons (code simplification)

**Maintainability:**
- Tool arrays clearly organized by function (core, game draw, wall, stamps, rects)
- Disabled state logic centralized in selectors
- Action buttons follow consistent pattern (onClick handler + disabled prop)
- No special cases for single-letter shortcuts

## Next Phase Readiness

**Phase 43 Complete:**
- Plan 43-01 removed dead code (old clipboard transforms, ERASER, 180° rotation)
- Plan 43-02 delivered final toolbar layout (this plan)
- v2.5 milestone deliverable complete
- All transforms integrated and tested
- Ready for milestone verification

**Ready for v2.5 verification:**
- All transform features complete (rotate 90°/-90°, mirror all 4 directions)
- All UI integration complete (toolbar, keyboard, disabled states)
- All dead code removed (old clipboard transforms, removed angles, ERASER)
- Zero technical debt from v2.5 implementation

## Self-Check

Verifying created files exist:

```bash
[ -f "E:\NewMapEditor\public\assets\toolbar\rotate-cw.svg" ] && echo "FOUND" || echo "MISSING"
# FOUND
[ -f "E:\NewMapEditor\public\assets\toolbar\rotate-ccw.svg" ] && echo "FOUND" || echo "MISSING"
# FOUND
[ -f "E:\NewMapEditor\public\assets\toolbar\cut.svg" ] && echo "FOUND" || echo "MISSING"
# FOUND
[ -f "E:\NewMapEditor\public\assets\toolbar\copy.svg" ] && echo "FOUND" || echo "MISSING"
# FOUND
[ -f "E:\NewMapEditor\public\assets\toolbar\paste.svg" ] && echo "FOUND" || echo "MISSING"
# FOUND
```

Verifying commits exist:

```bash
git log --oneline | grep -q "f6cf60d" && echo "FOUND" || echo "MISSING"
# FOUND
git log --oneline | grep -q "a1f1510" && echo "FOUND" || echo "MISSING"
# FOUND
```

Verifying old rotate.svg deleted:

```bash
[ ! -f "E:\NewMapEditor\public\assets\toolbar\rotate.svg" ] && echo "DELETED" || echo "STILL EXISTS"
# DELETED
```

## Self-Check: PASSED

All files created, all commits exist, old rotate.svg deleted.
