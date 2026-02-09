# Requirements: AC Map Editor

**Defined:** 2026-02-09
**Core Value:** The map editing experience should feel intuitive and professional

## v2.1 Requirements

Requirements for MDI Editor & Polish milestone. Each maps to roadmap phases.

### MDI Window Management

- [ ] **MDI-01**: User can open multiple maps simultaneously as child windows in the workspace
- [ ] **MDI-02**: User can move and resize child windows freely within the workspace
- [ ] **MDI-03**: User can arrange windows via tile and cascade commands
- [ ] **MDI-04**: Active (focused) window drives minimap, settings panel, and tool operations
- [ ] **MDI-05**: User is prompted to save unsaved changes when closing a map window

### Per-Document State

- [ ] **DOC-01**: Each open map has its own independent undo/redo history
- [ ] **DOC-02**: Each open map tracks its own dirty flag (unsaved changes indicator)
- [ ] **DOC-03**: Each open map tracks its own file path and displays filename in window title
- [ ] **DOC-04**: Each open map has its own selection state and viewport position

### Cross-Document Operations

- [ ] **XDOC-01**: User can copy/cut tiles from one map and paste them into another map
- [ ] **XDOC-02**: User can use the color picker on one map and draw with the picked tile on another map

### Status Bar

- [ ] **STAT-01**: Status bar shows tile ID and coordinates when hovering over the map canvas
- [ ] **STAT-02**: Status bar shows tile ID and coordinates when hovering over the tileset panel

### UI Polish

- [ ] **UI-01**: Map Settings dialog tabs are scrollable so all settings are accessible

## Future Requirements

Deferred to future milestone. Tracked but not in current roadmap.

### MDI Enhancements

- **MDIX-01**: Quick window switcher via Ctrl+Tab keyboard shortcut
- **MDIX-02**: Cross-window drag-drop tiles between maps
- **MDIX-03**: Smart clipboard tileset mapping when pasting between maps with different tilesets
- **MDIX-04**: Synchronized zoom across all open map windows

### Status Bar Enhancements

- **STATX-01**: Animated tile preview info in status bar on hover
- **STATX-02**: Active map filename displayed in status bar

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Tabbed document interface | Destroys core MDI benefit of viewing multiple maps simultaneously; SEdit uses child windows |
| Cross-map tile linking | Scope creep; niche use case with complex conflict resolution |
| Workspace/project files | Adds file format complexity; not in SEdit; users open individual maps |
| Window split views | Not a multi-document feature; adds rendering overhead |
| Floating tool palettes per window | Wastes screen space; single shared palette is classic MDI pattern |
| Global undo across windows | Conceptually confusing; breaks document isolation |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| MDI-01 | — | Pending |
| MDI-02 | — | Pending |
| MDI-03 | — | Pending |
| MDI-04 | — | Pending |
| MDI-05 | — | Pending |
| DOC-01 | — | Pending |
| DOC-02 | — | Pending |
| DOC-03 | — | Pending |
| DOC-04 | — | Pending |
| XDOC-01 | — | Pending |
| XDOC-02 | — | Pending |
| STAT-01 | — | Pending |
| STAT-02 | — | Pending |
| UI-01 | — | Pending |

**Coverage:**
- v2.1 requirements: 14 total
- Mapped to phases: 0
- Unmapped: 14

---
*Requirements defined: 2026-02-09*
*Last updated: 2026-02-09 after initial definition*
