# Feature Landscape: MDI Editor Features

**Domain:** Tile map editor with multiple document interface
**Researched:** 2026-02-09

## Table Stakes

Features users expect from MDI editors. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|--------------|
| **Multiple map windows** | Core MDI requirement - users expect to open/view multiple maps simultaneously | Medium | Window state management, per-document data isolation |
| **Per-document undo/redo** | Each map needs independent history - mixing stacks destroys workflow | Low | Already exists in EditorState, needs per-document isolation |
| **Active window tracking** | System must know which map receives commands (Edit menu, tools, settings) | Low | Window focus events, active document reference |
| **Window focus sync** | Minimap, settings, status bar must reflect active document | Low | Active window → UI components event flow |
| **Per-document dirty flag** | Users expect asterisk in title when map modified, drives save prompts | Low | Track modification state per document |
| **File path tracking** | Each window shows its filename, drives save vs save-as logic | Low | Per-document metadata |
| **Cross-document copy/paste** | Users expect clipboard to work between maps (not just within one map) | Medium | Clipboard needs document-agnostic tile data format |
| **Window arrangement commands** | Tile/Cascade/Arrange - standard MDI UX since Windows 3.1 | Low | DOM positioning or CSS grid layouts |
| **Close window with unsaved prompt** | Standard safety - "Save changes before closing?" | Low | Dirty flag + dialog integration |
| **Status bar tile hover** | Shows tile coordinates and ID as mouse moves - expected in all tile editors | Low | Mouse move → status bar update (already exists, just needs tile ID) |
| **Settings dialog scrolling** | With 53 settings across 5 tabs, overflow must scroll not clip | Low | CSS overflow + max-height on dialog content |

## Differentiators

Features that set product apart or improve on category norms. Not expected, but valued.

| Feature | Value Proposition | Complexity | Dependencies |
|---------|-------------------|------------|--------------|
| **Animated tile preview in status** | Shows animation frame offset on hover (not just tile ID) - helps with animation placement accuracy | Low | Animation system + status bar integration |
| **Cross-window drag-drop tiles** | Drag tile from one map to another map window to copy - faster than copy/paste | Medium-High | Drag event coordination across BrowserViews/windows |
| **Smart clipboard tileset mapping** | When pasting between maps with different tilesets, intelligently map tile IDs or warn | High | Tileset comparison, ID remapping logic |
| **Synchronized zoom across windows** | Option to lock zoom level across all open maps for consistent editing scale | Low | Broadcast zoom changes to all documents |
| **Quick window switcher** | Ctrl+Tab cycles through open documents like browser tabs | Low | Window list + keyboard shortcut |
| **Minimap click to focus** | Click minimap of inactive window to bring it to front | Low | Minimap → window activation event |
| **Status bar shows map name** | Current map filename in status bar (not just window title) for spatial awareness | Low | Active document → status bar |
| **Recent maps per-window** | Each window remembers its own recent files for "reopen" | Medium | Per-window history tracking |

## Anti-Features

Features to explicitly NOT build at this stage.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Tabbed document interface** | Modern trend but destroys core MDI benefit (see multiple maps simultaneously). SEdit uses child windows, not tabs. | Use classic MDI child windows - allows tile/cascade/side-by-side viewing |
| **Cross-map tile linking** | "Update tile X in all open maps" - scope creep, niche use case, complex conflict resolution | Users can copy/paste manually between maps if needed |
| **Workspace/project files** | Opening a "project" that loads multiple maps - adds file format complexity, not in SEdit | Users open individual maps, OS-level file management |
| **Window split views** | Single map in multiple panes - not a multi-document feature, adds rendering overhead | Focus on multiple separate maps, not multiple views of one map |
| **Floating tool palettes per window** | Separate tile palette per child window - wastes screen space, confusing UX | Single shared tile palette/minimap for all windows (classic MDI) |
| **Collaborative editing** | Real-time multi-user - huge technical lift, security concerns, not in scope | Single-user desktop app as designed |
| **Undo across all windows** | "Global undo" that affects multiple maps - conceptually confusing, breaks document isolation | Per-document undo only (table stakes) |

## Feature Dependencies

```
Window Management → Active Window Tracking → Focus Sync (minimap/settings/status)
                 → Per-Document State → Undo/Redo Isolation
                                     → Dirty Flag
                                     → File Path

Cross-Document Clipboard → Tile Data Format (document-agnostic)
                         → Paste Validation (map bounds, tileset compatibility)

Status Bar Updates → Hover Tracking (already exists)
                  → Tile ID Lookup (new)
                  → Animation Frame Display (optional differentiator)

Settings Dialog Scroll → CSS Overflow Fix
                       → Max-Height on Content Area
```

## MVP Recommendation (v2.1)

**Prioritize Table Stakes Only:**

1. **Window management** (Medium complexity, 2-3 days)
   - Multiple BrowserViews or windows with per-document EditorState instances
   - Active window tracking via focus events
   - Window arrange commands (tile/cascade)

2. **Per-document isolation** (Low complexity, 1 day)
   - Undo/redo already exists, just needs per-document scope
   - Dirty flag per document
   - File path per document

3. **Focus synchronization** (Low complexity, 1 day)
   - Minimap syncs to active document
   - Settings dialog reads/writes active document
   - Status bar shows active document state

4. **Cross-document clipboard** (Medium complexity, 1-2 days)
   - Clipboard already exists with tile data format
   - Ensure paste works regardless of source document
   - Validate paste target bounds

5. **Status bar tile hover** (Low complexity, 0.5 day)
   - Mouse move already tracked in MapCanvas
   - Add tile ID lookup from map data
   - Pass to StatusBar component (already accepts cursorTileId prop)

6. **Settings dialog scrolling** (Low complexity, 0.5 day)
   - Add `max-height` and `overflow-y: auto` to dialog content wrapper
   - Test with all 5 tabs to ensure scrolling works

**Defer Differentiators:**
- Animated tile preview in status (nice-to-have, add later)
- Cross-window drag-drop (high complexity, low ROI for v2.1)
- Smart clipboard tileset mapping (complex edge case)
- All other differentiators (polish phase)

## Complexity Analysis

### Low Complexity (0.5-1 day each)
- Per-document dirty flag
- File path tracking
- Status bar tile hover (props already exist)
- Settings dialog scrolling (CSS fix)
- Window focus sync to UI components
- Close with unsaved prompt

### Medium Complexity (1-3 days each)
- Multiple window architecture (biggest decision: BrowserView vs BrowserWindow)
- Per-document EditorState instances
- Cross-document clipboard validation
- Active window tracking system

### High Complexity (3+ days)
- Cross-window drag-drop tiles
- Smart clipboard tileset mapping
- Recent maps per-window (if persisted)

## Platform Considerations

**Electron MDI Approaches:**

1. **BrowserView** (recommended for this project)
   - Multiple BrowserView instances in one BrowserWindow
   - Positioned within parent window (true MDI)
   - Shared main process, isolated renderer per view
   - Refs: [electron-tabs-sample](https://github.com/dtychshenko/electron-tabs-sample), [Electron BrowserView performance](https://dev.to/thanhlm/electron-multiple-tabs-without-dealing-with-performance-2cma)

2. **Multiple BrowserWindows**
   - Separate top-level windows (SDI-like)
   - Harder to arrange/tile within parent
   - Each window fully isolated
   - Used by GIMP multi-window mode

3. **React tabs + single renderer**
   - Not true MDI - can't see multiple maps simultaneously
   - Performance issues with 3+ tabs (single process)
   - Used by VS Code, but code editors don't need side-by-side tile rendering

**Recommendation:** BrowserView for classic MDI child windows that can be tiled/cascaded within main window frame.

## UX Patterns from Reference Editors

**Photoshop/GIMP:**
- Document windows as named tabs OR floating windows (user preference)
- Tile/cascade commands in Window menu
- Active document drives panels (layers, history, etc.)
- Refs: [Photoshop window arrangement](https://helpx.adobe.com/photoshop/desktop/get-started/learn-the-basics/rearrange-document-windows.html), [GIMP single-window mode](https://docs.gimp.org/2.10/da/gimp-concepts-main-windows.html)

**Tiled Map Editor:**
- Tabbed interface (can only see one map at a time)
- Status bar shows coordinates on hover
- Tile ID display requested by community but shows in animation editor
- Refs: [Tiled status bar coordinates](https://discourse.mapeditor.org/t/how-to-see-the-pixel-location-at-the-bottom-left-of-editor/720), [Tile ID feature request](https://github.com/mapeditor/tiled/issues/15)

**Win32 MDI (SEdit reference):**
- WM_MDIACTIVATE messages for window switching
- DefMDIChildProc for child window behavior
- Menu changes based on active child window
- Refs: [Win32 MDI guide](https://learn.microsoft.com/en-us/windows/win32/winmsg/using-the-multiple-document-interface), [MDI activation](https://github.com/MicrosoftDocs/win32/blob/docs/desktop-src/winmsg/wm-mdiactivate.md)

**Porymap (tile editor):**
- Status bar shows metatile label on hover
- Mouse coordinates in status bar when hovering events tab
- Ref: [Porymap changelog](https://huderlem.github.io/porymap/reference/changelog.html)

## Confidence Assessment

| Feature Category | Confidence | Sources |
|------------------|------------|---------|
| MDI window management | HIGH | Official Win32 MDI docs, Electron BrowserView examples, Photoshop/GIMP UX |
| Per-document state | HIGH | Existing EditorState.ts architecture, standard pattern |
| Status bar hover info | HIGH | Tiled community discussions, Porymap implementation, existing StatusBar.tsx |
| Cross-document clipboard | MEDIUM | Tiled feature request discussions, existing clipboard implementation needs validation |
| Settings dialog scroll | HIGH | MDN CSS overflow docs, Material UI dialog patterns |
| Electron architecture | MEDIUM | Electron docs (official), community examples (GitHub), no Context7 data for Electron |

## Sources

### MDI Patterns
- [Multiple Document Interface - Wikipedia](https://en.wikipedia.org/wiki/Multiple-document_interface)
- [Using the Multiple Document Interface - Win32 apps | Microsoft Learn](https://learn.microsoft.com/en-us/windows/win32/winmsg/using-the-multiple-document-interface)
- [WM_MDIACTIVATE message - Win32 apps | Microsoft Learn](https://learn.microsoft.com/en-us/windows/win32/winmsg/wm-mdiactivate)
- [Photoshop: Rearrange document windows](https://helpx.adobe.com/photoshop/desktop/get-started/learn-the-basics/rearrange-document-windows.html)
- [GIMP: Main Windows documentation](https://docs.gimp.org/2.10/da/gimp-concepts-main-windows.html)
- [GIMP single-window mode article](https://lwn.net/Articles/373164/)

### Electron Architecture
- [Electron multiple tabs without performance issues - DEV](https://dev.to/thanhlm/electron-multiple-tabs-without-dealing-with-performance-2cma)
- [electron-tabs-sample GitHub](https://github.com/dtychshenko/electron-tabs-sample)
- [Electron Process Model documentation](https://www.electronjs.org/docs/latest/tutorial/process-model)
- [electron-tabs npm package](https://www.npmjs.com/package/electron-tabs)

### Tile Editor UX
- [Tiled: Show tile ids in status bar - Issue #15](https://github.com/mapeditor/tiled/issues/15)
- [Tiled: Tile coordinates mapping forum](https://discourse.mapeditor.org/t/tile-coordinates-mapping/1722)
- [Tiled: How to see pixel location - forum](https://discourse.mapeditor.org/t/how-to-see-the-pixel-location-at-the-bottom-left-of-editor/720)
- [Porymap changelog](https://huderlem.github.io/porymap/reference/changelog.html)
- [Tiled: Copy/paste from/to maps - Issue #849](https://github.com/bjorn/tiled/issues/849)
- [Tiled: How to cut and paste tiles - forum](https://discourse.mapeditor.org/t/how-to-cut-and-paste-tiles/408)

### Dialog Scrolling
- [overscroll-behavior - CSS | MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/overscroll-behavior)
- [Material UI Dialog: scroll control guide](https://copyprogramming.com/howto/material-ui-mui-dialog-scrolltop)
- [Scroll-Locked Dialogs – Frontend Masters](https://frontendmasters.com/blog/scroll-locked-dialogs/)
- [Prevent scroll chaining with overscroll-behavior](https://ishadeed.com/article/prevent-scroll-chaining-overscroll-behavior/)
- [Dialog with scrollable content - Headless UI discussion](https://github.com/tailwindlabs/headlessui/discussions/412)

### Status Bar & Active Document
- [VS Code: minimap and editor not in sync - Issue #111499](https://github.com/microsoft/vscode/issues/111499)
- [VS Code: Option to only show minimap in active editor - Issue #143566](https://github.com/microsoft/vscode/issues/143566)
- [VS Code: selecting entry should focus editor - PR #114493](https://github.com/microsoft/vscode/pull/114493)
