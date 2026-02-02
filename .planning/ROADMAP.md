# Roadmap: AC Map Editor v1.1

## Milestones

- v1.0 UI Overhaul - Phases 1-3 (shipped 2026-02-01)
- v1.1 Canvas & Polish - Phases 4-6 (in progress)

## Overview

v1.1 maximizes the map editing canvas through better navigation controls and UI polish. CSS variable consolidation establishes theming consistency, classic scrollbars provide familiar Windows-style navigation, and collapsible panels give users control over their workspace.

## Phases

**Phase Numbering:**
- Continues from v1.0 (Phases 1-3 shipped)
- Integer phases (4, 5, 6): Planned v1.1 work
- Decimal phases (4.1, 4.2): Urgent insertions if needed

- [x] **Phase 4: CSS Variable Consolidation** - Migrate remaining hardcoded colors to CSS variables
- [ ] **Phase 5: Classic Scrollbars** - Arrow buttons and track click behavior for scrollbars
- [ ] **Phase 6: Collapsible Panels** - Smaller default size and collapse-to-tab-bar capability

## Phase Details

<details>
<summary>v1.0 UI Overhaul (Phases 1-3) - SHIPPED 2026-02-01</summary>

### Phase 1: Bug Fixes
**Goal**: Fix pattern fill tool and animation loading
**Plans**: 2 plans (complete)

Plans:
- [x] 01-01: Pattern fill tool fixes
- [x] 01-02: Animation loading fixes

### Phase 2: Layout and Toolbar
**Goal**: Professional editor layout with horizontal toolbar
**Plans**: 2 plans (complete)

Plans:
- [x] 02-01: Horizontal toolbar implementation
- [x] 02-02: Full-width canvas layout

### Phase 3: Tabbed Bottom Panel
**Goal**: Tabbed interface for tiles, animations, and settings
**Plans**: 1 plan (complete)

Plans:
- [x] 03-01: Tabbed bottom panel implementation

</details>

### v1.1 Canvas & Polish (In Progress)

**Milestone Goal:** Maximize map editing canvas space with professional navigation and consistent theming

#### Phase 4: CSS Variable Consolidation
**Goal**: All component styles use CSS custom properties for consistent theming
**Depends on**: Phase 3 (v1.0 baseline)
**Requirements**: POL-01, POL-02, POL-03, POL-04
**Success Criteria** (what must be TRUE):
  1. AnimationPanel switches colors correctly when theme changes
  2. MapSettingsPanel switches colors correctly when theme changes
  3. MapCanvas scrollbar area switches colors correctly when theme changes
  4. StatusBar switches colors correctly when theme changes
  5. No hardcoded hex colors remain in any CSS file
**Plans**: 1 plan

Plans:
- [x] 04-01-PLAN.md - CSS variable migration and dual-theme system

#### Phase 5: Classic Scrollbars
**Goal**: Scrollbars behave like classic Windows controls with arrow buttons
**Depends on**: Phase 4
**Requirements**: NAV-01, NAV-02, NAV-03, NAV-04
**Success Criteria** (what must be TRUE):
  1. User sees arrow buttons at each end of both scrollbars
  2. User clicks arrow button once and viewport moves by one tile (16px)
  3. User holds arrow button and viewport scrolls continuously
  4. User clicks scrollbar track (not thumb) and viewport jumps one page
**Plans**: TBD

Plans:
- [ ] 05-01: Scrollbar arrow buttons and behavior

#### Phase 6: Collapsible Panels
**Goal**: Users can maximize canvas space by collapsing the bottom panel
**Depends on**: Phase 5
**Requirements**: PNL-01, PNL-02, PNL-03, PNL-04
**Success Criteria** (what must be TRUE):
  1. Bottom panel opens at 20% height by default (smaller than v1.0)
  2. User can collapse panel to show only the tab bar
  3. Collapsed panel has a visible expand button to restore it
  4. User double-clicks the resize divider and panel resets to 20% default size
**Plans**: TBD

Plans:
- [ ] 06-01: Collapsible panel implementation

## Progress

**Execution Order:**
Phases execute in numeric order: 4 -> 4.x -> 5 -> 5.x -> 6

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Bug Fixes | v1.0 | 2/2 | Complete | 2026-02-01 |
| 2. Layout and Toolbar | v1.0 | 2/2 | Complete | 2026-02-01 |
| 3. Tabbed Bottom Panel | v1.0 | 1/1 | Complete | 2026-02-01 |
| 4. CSS Variable Consolidation | v1.1 | 1/1 | Complete | 2026-02-02 |
| 5. Classic Scrollbars | v1.1 | 0/1 | Not started | - |
| 6. Collapsible Panels | v1.1 | 0/1 | Not started | - |

---
*Roadmap created: 2026-02-02*
*Last updated: 2026-02-02 after Phase 4 completion*
