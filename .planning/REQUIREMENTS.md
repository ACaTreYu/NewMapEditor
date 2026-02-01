# Requirements: AC Map Editor UI Overhaul

**Defined:** 2026-02-01
**Core Value:** Professional editing experience like Photoshop/GIMP with working tools

## v1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Bug Fixes

- [ ] **FIX-01**: Pattern fill uses multi-tile selection (tiles/repeats across filled area)
- [ ] **FIX-02**: Animation panel displays correct frame data (not placeholders)
- [ ] **FIX-03**: Animated tiles show proper frames in map preview

### Layout

- [ ] **LAYOUT-01**: Horizontal toolbar positioned below native menu bar
- [ ] **LAYOUT-02**: Map canvas takes full width of window
- [ ] **LAYOUT-03**: Map canvas takes main vertical area (above bottom panel)
- [ ] **LAYOUT-04**: Bottom panel contains tabbed interface
- [ ] **LAYOUT-05**: Resizable divider between canvas and bottom panel
- [ ] **LAYOUT-06**: Divider freely draggable (~10-50% of window height)
- [ ] **LAYOUT-07**: Panel size persists between sessions

### Toolbar

- [ ] **TOOLBAR-01**: Tool icons displayed in horizontal row
- [ ] **TOOLBAR-02**: Tooltips show tool name on hover
- [ ] **TOOLBAR-03**: Active tool has visual indicator (highlight/border)

### Tabs

- [ ] **TABS-01**: Tab bar at top of bottom panel
- [ ] **TABS-02**: Tiles tab showing tile palette
- [ ] **TABS-03**: Settings tab showing map settings
- [ ] **TABS-04**: Animations tab showing animation panel
- [ ] **TABS-05**: Active tab has clear visual indicator

## v2 Requirements

Deferred to future milestone. Tracked but not in current roadmap.

### Layout Enhancements

- **LAYOUT-08**: Double-click divider to reset to default size
- **LAYOUT-09**: Min/max constraints on panel sizes (prevent too small/large)

### Toolbar Enhancements

- **TOOLBAR-04**: Keyboard shortcuts shown in tooltips (e.g., "Pencil (P)")

### Advanced Features

- **ADV-01**: Collapsible bottom panel (minimize to tab bar only)
- **ADV-02**: Panel collapse to icons (VS Code activity bar pattern)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Floating/dockable panels | Keeping fixed layout for simplicity |
| Custom in-app menu bar | Staying with native Electron menu |
| V2 map format support | Separate concern, not this milestone |
| Tileset selection UI | Separate concern, not this milestone |
| Dark mode / themes | Not requested, can add later |
| Custom keyboard shortcuts | Not requested, can add later |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FIX-01 | TBD | Pending |
| FIX-02 | TBD | Pending |
| FIX-03 | TBD | Pending |
| LAYOUT-01 | TBD | Pending |
| LAYOUT-02 | TBD | Pending |
| LAYOUT-03 | TBD | Pending |
| LAYOUT-04 | TBD | Pending |
| LAYOUT-05 | TBD | Pending |
| LAYOUT-06 | TBD | Pending |
| LAYOUT-07 | TBD | Pending |
| TOOLBAR-01 | TBD | Pending |
| TOOLBAR-02 | TBD | Pending |
| TOOLBAR-03 | TBD | Pending |
| TABS-01 | TBD | Pending |
| TABS-02 | TBD | Pending |
| TABS-03 | TBD | Pending |
| TABS-04 | TBD | Pending |
| TABS-05 | TBD | Pending |

**Coverage:**
- v1 requirements: 18 total
- Mapped to phases: 0
- Unmapped: 18 (will be mapped during roadmap creation)

---
*Requirements defined: 2026-02-01*
*Last updated: 2026-02-01 after initial definition*
