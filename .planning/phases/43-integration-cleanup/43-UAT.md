---
status: complete
phase: 43-integration-cleanup
source: [43-01-SUMMARY.md, 43-02-SUMMARY.md]
started: 2026-02-11T09:00:00Z
updated: 2026-02-11T09:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Toolbar button layout and ordering
expected: Toolbar shows buttons in this order (with separators between groups): New/Open/Save | Undo/Redo | Select, Pencil, Fill, Picker | Rotate CW, Rotate CCW, Mirror | Cut, Copy, Paste | Line, Rect | Wall, W.Draw, W.Rect | Flag, Pole, Warp, Spawn, Switch | Bunker, H.Pen, Bridge, Conveyor | Grid, Settings
result: pass

### 2. Rotate CW/CCW are separate buttons (no dropdown)
expected: Two separate toolbar buttons with circular arrow icons — one clockwise, one counter-clockwise. Clicking either should NOT open a dropdown menu. They should execute immediately (when a selection exists).
result: pass

### 3. Mirror button has 4-item dropdown
expected: Mirror toolbar button shows a dropdown when clicked, listing 4 options: Right, Left, Up, Down
result: pass

### 4. New toolbar icons render correctly
expected: Rotate CW (clockwise arrow), Rotate CCW (counter-clockwise arrow), Cut (scissors), Copy (stacked pages), Paste (clipboard) icons are all visible and recognizable in the toolbar
result: pass

### 5. Disabled states — no selection
expected: With no active selection (just open a map, don't select anything): Rotate CW, Rotate CCW, Mirror, Cut, and Copy buttons should all appear grayed/disabled. Clicking them should do nothing.
result: pass

### 6. Disabled state — Paste when clipboard empty
expected: When nothing has been copied/cut yet (empty clipboard), the Paste button should appear grayed/disabled
result: pass

### 7. Enabled states — with selection
expected: Use SELECT tool to draw a selection rectangle on the map. After selection is made, Rotate CW, Rotate CCW, Mirror, Cut, and Copy buttons should become enabled (no longer grayed)
result: pass

### 8. Rotate CW works in-place
expected: Select a region of tiles, click Rotate CW button. The selected tiles should rotate 90° clockwise in-place on the map. If the selection was rectangular (e.g., 3 wide x 5 tall), the bounds should resize to fit (5 wide x 3 tall).
result: pass

### 9. Rotate CCW works in-place
expected: Select a region of tiles, click Rotate CCW button. The selected tiles should rotate 90° counter-clockwise in-place. Bounds resize as expected.
result: pass

### 10. Undo/Redo works for rotation
expected: After rotating a selection, press Ctrl+Z to undo — tiles should revert to original position and orientation. Press Ctrl+Y to redo — tiles should rotate again.
result: pass

### 11. Single-letter shortcuts removed
expected: Pressing V, B, G, L, R, W, I, F, P, T, S, or any other single letter key should NOT switch the active tool. Tools can only be changed by clicking toolbar buttons.
result: pass

### 12. Ctrl+ shortcuts still work
expected: Ctrl+Z (undo), Ctrl+Y (redo), Ctrl+C (copy), Ctrl+X (cut), Ctrl+V (paste), Ctrl+N (new), Ctrl+O (open), Ctrl+S (save), Delete (delete selection) all still work as before
result: pass

### 13. Eraser tool removed
expected: No Eraser button appears anywhere in the toolbar. The eraser icon is gone.
result: pass

### 14. Ctrl+H/J/R do nothing
expected: Pressing Ctrl+H, Ctrl+J, or Ctrl+R should NOT trigger any mirror/rotate action. These old shortcuts are completely removed.
result: pass

## Summary

total: 14
passed: 14
issues: 0
pending: 0
skipped: 0

## Gaps

[none]

## Notes

- Rotation algorithms were swapped (CW did CCW and vice versa) — fixed during UAT session (commit 1b4695f)
- Mirror selection expansion removed — selection now stays at original bounds after mirror
- Marching ants replaced with static white selection rectangle with black outline
- User noted rotate icons could be clearer — will replace icon images later
- Future enhancement noted: content-aware rotation (directional tiles like bunkers should swap to correct facing tile ID when rotated)
