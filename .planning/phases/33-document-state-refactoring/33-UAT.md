---
status: passed
phase: 33-document-state-refactoring
source: [33-01-SUMMARY.md, 33-02-SUMMARY.md]
started: 2026-02-09T17:10:00Z
updated: 2026-02-09T17:10:00Z
---

## Current Test

number: complete
name: All tests finished
awaiting: none

## Tests

### 1. Empty Workspace on Startup
expected: App starts with no map loaded. Canvas area shows placeholder message (e.g. "No document open"). No crash.
result: PASS

### 2. File > New Creates Document
expected: Clicking New (or Ctrl+N) creates a new map document. MapCanvas appears with an editable tile grid. No "discard changes?" prompt even if another document is modified.
result: PASS

### 3. File > Open Creates Document Alongside Existing
expected: Opening a .lvl/.map file creates a new document alongside any already-open documents. No "discard changes?" prompt. The opened map renders correctly.
result: PASS

### 4. Window Title Shows Filename and Dirty State
expected: Title bar shows "Untitled - AC Map Editor" for new maps. After drawing a tile, title changes to "Untitled * - AC Map Editor" (asterisk indicates unsaved changes). After opening a file, title shows the filename (e.g. "mymap.map - AC Map Editor").
result: PASS

### 5. Pencil Tool Draws Tiles
expected: Select pencil tool, click/drag on the map canvas. Tiles are placed correctly at the cursor position using the selected tile from the palette.
result: PASS

### 6. Undo/Redo Works
expected: After drawing tiles, Ctrl+Z undoes the last action. Ctrl+Y (or Ctrl+Shift+Z) redoes it. Toolbar undo/redo buttons enable/disable correctly based on undo history.
result: PASS (fixed: undo/redo needed new map object refs + delta swap bug)

### 7. Fill Tool Works
expected: Select fill tool, click on a region of the map. The flood fill replaces all connected same-colored tiles with the selected tile.
result: PASS

### 8. Select Tool and Clipboard Operations
expected: Select tool creates a marquee selection with marching ants. Ctrl+C copies, Ctrl+X cuts (fills with default tile), Ctrl+V enters paste preview mode. Clicking places the paste.
result: PASS

### 9. Wall Tool Functions
expected: Wall tool places auto-connecting walls. Adjacent walls connect to each other. Eraser properly disconnects and updates neighboring walls.
result: PASS (fixed: placeWallBatch now places walls before calculating connections)

### 10. Minimap Reflects Active Document
expected: Minimap in the right panel shows the current map and viewport rectangle. It updates when you scroll/zoom the map.
result: PASS

### 11. Map Settings Dialog
expected: Clicking the settings gear icon opens the Map Settings dialog. Changes to settings (name, teams, weapons, etc.) apply correctly. Dialog is disabled when no document is open.
result: PASS (note: tab scroll issue is known, tracked as UI-01 in Phase 36)

## Summary

total: 11
passed: 11
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
