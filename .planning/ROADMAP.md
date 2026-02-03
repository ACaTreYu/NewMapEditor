# Roadmap: AC Map Editor

## Milestones

- **v1.0 UI Overhaul** - Phases 1-3 (shipped 2026-02-01)
- **v1.1 Canvas & Polish** - Phases 4-6 (shipped 2026-02-02)
- **v1.2 SEdit-Style Layout** - Phases 7-10 (in progress)

## Phases

<details>
<summary>v1.0 UI Overhaul (Phases 1-3) - SHIPPED 2026-02-01</summary>

### Phase 1: Bug Fixes
**Goal**: Fix critical bugs blocking professional use
**Plans**: 2 plans

Plans:
- [x] 01-01: Fix pattern fill crash (null selection handling)
- [x] 01-02: Fix animation data loader (frame validation + deduplication)

### Phase 2: Layout and Toolbar
**Goal**: Implement horizontal toolbar and full-width canvas layout
**Plans**: 2 plans

Plans:
- [x] 02-01: Horizontal toolbar with icon+label pattern
- [x] 02-02: Full-width canvas with resizable bottom panel

### Phase 3: Tabbed Bottom Panel
**Goal**: Organize tools in professional tabbed interface
**Plans**: 2 plans

Plans:
- [x] 03-01: Tab component with Tiles/Animations/Settings
- [x] 03-02: Panel size persistence and keyboard shortcuts

</details>

<details>
<summary>v1.1 Canvas & Polish (Phases 4-6) - SHIPPED 2026-02-02</summary>

### Phase 4: CSS Variable Consolidation
**Goal**: Consistent theme system with two-tier CSS variables
**Plans**: 1 plan

Plans:
- [x] 04-01: Audit and consolidate CSS variables across all components

### Phase 5: Classic Scrollbars
**Goal**: Professional Windows-style scrollbar navigation
**Plans**: 2 plans

Plans:
- [x] 05-01: Custom scrollbar implementation with arrow buttons
- [x] 05-02: Interactive behaviors (track click, continuous scroll)

### Phase 6: Collapsible Panels
**Goal**: Maximize canvas space with collapsible bottom panel
**Plans**: 1 plan

Plans:
- [x] 06-01: Collapsible bottom panel with double-click toggle

</details>

### v1.2 SEdit-Style Layout (In Progress)

**Milestone Goal:** Restructure UI to match SEdit's layout with maximized canvas, minimap, redesigned panels, and comprehensive Map Settings dialog.

#### Phase 7: SEdit Layout Foundation
**Goal**: Restructure UI with huge canvas as primary focus in bordered window frame
**Depends on**: Phase 6
**Requirements**: LAYOUT-01, LAYOUT-02, LAYOUT-03, LAYOUT-04, LAYOUT-05
**Success Criteria** (what must be TRUE):
  1. Map canvas fills maximum available space as the dominant UI element
  2. Map canvas displays within a bordered window frame matching SEdit style
  3. Gray background is visible around the map window frame
  4. Bottom tiles panel defaults to 20% height
  5. Dragging tiles panel divider up reveals more tileset, down reveals more canvas
**Plans**: 1 plan

Plans:
- [x] 07-01-PLAN.md — Win95/98 window frame styling and layout restructure

#### Phase 8: Minimap
**Goal**: Reposition existing minimap from bottom-left to top-right corner
**Depends on**: Phase 7
**Requirements**: MINI-01, MINI-02, MINI-03, MINI-04
**Success Criteria** (what must be TRUE):
  1. Minimap displays in top-right corner of the interface
  2. Minimap shows entire 256x256 map scaled to fit
  3. Minimap renders viewport indicator showing currently visible map area
  4. Clicking anywhere on minimap navigates canvas to that location
**Plans**: 1 plan

Plans:
- [x] 08-01-PLAN.md — Reposition minimap to top-right corner (CSS change)

#### Phase 9: Panel Redesign
**Goal**: Redesign animations panel (left side) and tiles panel (bottom) to match SEdit layout
**Depends on**: Phase 7
**Requirements**: ANIM-01, ANIM-02, ANIM-03, ANIM-04, TILE-01, TILE-02, TILE-03
**Success Criteria** (what must be TRUE):
  1. Animations panel displays on left side with fixed width
  2. Animation previews are smaller (matching SEdit density)
  3. Animation hex labels display without leading zero (D5, not 0D5)
  4. Animations panel scrolls vertically to access all animations
  5. Full tileset image is visible in tiles panel without internal vertical scrolling
  6. Tileset stretches/fits to panel width dynamically
  7. Tiles panel is resizable via drag divider
**Plans**: 4 plans

Plans:
- [x] 09-01-PLAN.md — Nested panel layout with TilesetPanel and Win95 styling
- [x] 09-02-PLAN.md — Animation panel redesign with 16x16 previews
- [x] 09-03-PLAN.md — Compact toolbar and canvas selection preview
- [x] 09-04-PLAN.md — Gap closure: dynamic tileset width and full height display

#### Phase 10: Map Settings Dialog
**Goal**: Comprehensive Map Settings popup with basic and advanced settings
**Depends on**: Phase 7 (could run in parallel with Phases 8-9)
**Requirements**: SET-01, SET-02, SET-03, SET-04, SET-05, SET-06, SET-07, SET-08, SET-09, SET-10
**Success Criteria** (what must be TRUE):
  1. Toolbar contains "Map Settings" button that opens popup dialog
  2. Dialog displays Map section with name and description fields
  3. Dialog displays Dynamic Settings section with sliders for Laser Damage, Special Damage, Recharge Rate
  4. Dialog displays Game Objective radio buttons (Frag/Flag/Switch)
  5. Dialog displays Weapons Available checkboxes (Bouncies/Missiles/Bombs)
  6. Dialog displays Miscellaneous section (Max Players, Holding Time, Teams, Powerups)
  7. "Advanced" button reveals all 40+ settings from AC_Setting_Info_25.txt
  8. Each advanced setting has slider (1 granularity) and text input box
  9. Each advanced setting displays its valid range and default value
  10. Set and Cancel buttons apply or discard changes
**Plans**: TBD

Plans:
- [ ] 10-01: TBD
- [ ] 10-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 7 -> 8 -> 9 -> 10

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Bug Fixes | v1.0 | 2/2 | Complete | 2026-02-01 |
| 2. Layout and Toolbar | v1.0 | 2/2 | Complete | 2026-02-01 |
| 3. Tabbed Bottom Panel | v1.0 | 2/2 | Complete | 2026-02-01 |
| 4. CSS Variable Consolidation | v1.1 | 1/1 | Complete | 2026-02-02 |
| 5. Classic Scrollbars | v1.1 | 2/2 | Complete | 2026-02-02 |
| 6. Collapsible Panels | v1.1 | 1/1 | Complete | 2026-02-02 |
| 7. SEdit Layout Foundation | v1.2 | 1/1 | Complete | 2026-02-02 |
| 8. Minimap | v1.2 | 1/1 | Complete | 2026-02-02 |
| 9. Panel Redesign | v1.2 | 4/4 | Complete | 2026-02-02 |
| 10. Map Settings Dialog | v1.2 | 0/TBD | Not started | - |

---
*Roadmap created: 2026-02-02*
*Last updated: 2026-02-02 - Phase 9 complete (gap closure executed)*
