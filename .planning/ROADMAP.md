# Roadmap: AC Map Editor UI Overhaul

## Overview

This roadmap delivers a professional editor UI (horizontal toolbar, maximized canvas, tabbed bottom panel) while fixing critical bugs in the fill tool and animation system. Phases are ordered to fix core functionality first, then restructure layout, then add tabbed interface.

- **Phases:** 3
- **Requirements:** 18 mapped
- **Depth:** quick

---

## Phase 1: Bug Fixes

**Goal:** Core tools work correctly before UI restructuring begins.

**Requirements:**
- **FIX-01:** Pattern fill uses multi-tile selection (tiles/repeats across filled area)
- **FIX-02:** Animation panel displays correct frame data (not placeholders)
- **FIX-03:** Animated tiles show proper frames in map preview

**Success Criteria:**
1. User can select a 2x2 tile region in palette, use fill tool, and see pattern tile correctly across entire filled area
2. Animation panel displays actual frame data from loaded animation file (not hardcoded sequence)
3. Animated tiles on map cycle through correct frames at consistent speed

**Dependencies:** None

**Plans:** 2 plans

Plans:
- [x] 01-01-PLAN.md - Pattern fill with multi-tile selection support
- [x] 01-02-PLAN.md - Animation loading from Gfx.dll and timestamp-based rendering

---

## Phase 2: Layout and Toolbar

**Goal:** Editor uses professional layout with horizontal toolbar and resizable panels.

**Requirements:**
- **LAYOUT-01:** Horizontal toolbar positioned below native menu bar
- **LAYOUT-02:** Map canvas takes full width of window
- **LAYOUT-03:** Map canvas takes main vertical area (above bottom panel)
- **LAYOUT-04:** Bottom panel contains tabbed interface
- **LAYOUT-05:** Resizable divider between canvas and bottom panel
- **LAYOUT-06:** Divider freely draggable (~10-50% of window height)
- **LAYOUT-07:** Panel size persists between sessions
- **TOOLBAR-01:** Tool icons displayed in horizontal row
- **TOOLBAR-02:** Tooltips show tool name on hover
- **TOOLBAR-03:** Active tool has visual indicator (highlight/border)

**Success Criteria:**
1. User sees toolbar immediately below menu bar with tool icons in a horizontal row
2. Map canvas fills available width and dominates vertical space
3. User can drag divider between canvas and bottom panel, resize persists after app restart
4. Hovering tool icons shows tooltip with tool name; active tool is visually distinct

**Dependencies:** Phase 1

**Plans:** 2 plans

Plans:
- [ ] 02-01-PLAN.md - Theme system and toolbar redesign with icon + label pattern
- [ ] 02-02-PLAN.md - Resizable panel layout with react-resizable-panels

---

## Phase 3: Tabbed Bottom Panel

**Goal:** Bottom panel organizes tools into accessible tabs matching VS Code/Chrome convention.

**Requirements:**
- **TABS-01:** Tab bar at top of bottom panel
- **TABS-02:** Tiles tab showing tile palette
- **TABS-03:** Settings tab showing map settings
- **TABS-04:** Animations tab showing animation panel
- **TABS-05:** Active tab has clear visual indicator

**Success Criteria:**
1. User sees tab bar at top of bottom panel with Tiles, Settings, Animations tabs
2. Clicking each tab displays corresponding content (tile palette, map settings, animation panel)
3. Active tab is visually distinct; tabs are keyboard navigable (arrow keys)

**Dependencies:** Phase 2

---

## Progress

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 1 | Bug Fixes | 3 | Complete |
| 2 | Layout and Toolbar | 10 | Pending |
| 3 | Tabbed Bottom Panel | 5 | Pending |

**Total:** 18 requirements across 3 phases

---
*Roadmap created: 2026-02-01*
