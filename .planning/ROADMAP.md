# Roadmap: AC Map Editor v1.4 Win98 Theme Overhaul

## Overview

Transform the entire application from a dark/light themed editor into a pixel-accurate Windows 98 grey aesthetic. Starting with a centralized CSS variable system and global cleanup, then systematically reskinning application chrome, panel interiors, scrollbars, and dialog controls. Every element in the application will use authentic Win98 beveled borders, system colors, and instant state changes by the end of this milestone.

## Milestones

- v1.0 MVP: Phases 1-3 (shipped 2026-02-01)
- v1.1 Canvas & Polish: Phases 4-6 (shipped 2026-02-02)
- v1.2 SEdit-Style Layout: Phases 7-10 (shipped 2026-02-02)
- v1.3 Layout Fix: Phase 11 (shipped 2026-02-04)
- **v1.4 Win98 Theme Overhaul: Phases 12-16 (in progress)**

## Phases

- [x] **Phase 12: Theme Foundation** - Win98 CSS variable system, remove dark/light toggle, purge modern CSS artifacts
- [ ] **Phase 13: Application Chrome** - Win98-styled toolbar, status bar, resize handles, title bar gradients
- [ ] **Phase 14: Panel Interiors** - Win98 beveled panel borders, tab controls, group boxes
- [ ] **Phase 15: Scrollbars** - Win98 3D scrollbars with arrow buttons, raised thumb, 16px width
- [ ] **Phase 16: Dialog Controls & Polish** - Win98 form controls, property sheet dialog, disabled/focus states

## Phase Details

### Phase 12: Theme Foundation
**Goal**: Establish the Win98 visual foundation so the entire app renders in grey with correct bevels, and all modern CSS artifacts are eliminated
**Depends on**: Phase 11
**Requirements**: THEME-01, THEME-02, THEME-03, THEME-04, THEME-05, THEME-06, THEME-07
**Success Criteria** (what must be TRUE):
  1. Application launches with uniform Win98 grey (#c0c0c0) background across all surfaces -- no dark theme remnants visible
  2. No rounded corners visible anywhere in the application (all elements have sharp 90-degree corners)
  3. Controls respond instantly to interactions with no visible transition animations
  4. Text renders in MS Sans Serif / Arial at 11px throughout the application
  5. Theme toggle cycles Win98 color schemes (Standard, High Contrast, Desert) -- no dark/light mode exists
**Plans**: 5 plans
Plans:
  - [ ] 12-01-PLAN.md -- Win98 CSS foundation (variables, bevels, typography, schemes, fonts)
  - [ ] 12-02-PLAN.md -- Repurpose theme toggle from dark/light to Win98 color schemes
  - [ ] 12-03-PLAN.md -- Overhaul App.css with Win98 imports and purge modern artifacts
  - [ ] 12-04-PLAN.md -- Purge modern CSS from all component files
  - [ ] 12-05-PLAN.md -- Visual verification checkpoint

### Phase 13: Application Chrome
**Goal**: The application frame looks like a Win98 program -- toolbar buttons behave with flat/raised/sunken states, status bar shows sunken fields, panel dividers look like raised handles
**Depends on**: Phase 12
**Requirements**: CHROME-01, CHROME-02, CHROME-03, CHROME-04
**Success Criteria** (what must be TRUE):
  1. Toolbar buttons appear flat at rest, raise on hover, and sink when pressed or toggled active
  2. Status bar displays information in shallow sunken rectangular fields
  3. Panel divider handles appear as raised bars that look grabbable
  4. Inner window frame title bar shows blue-to-dark-blue gradient when active
**Plans**: 3 plans
Plans:
  - [ ] 13-01-PLAN.md -- XP Classic toolbar buttons + status bar sunken fields
  - [ ] 13-02-PLAN.md -- XP Classic panel dividers + title bar active/inactive states
  - [ ] 13-03-PLAN.md -- Visual verification checkpoint

### Phase 14: Panel Interiors
**Goal**: All panel content areas use authentic Win98 visual patterns -- raised outer frames, sunken content wells, proper tab controls, and etched group dividers
**Depends on**: Phase 12
**Requirements**: PANEL-01, PANEL-02, PANEL-03
**Success Criteria** (what must be TRUE):
  1. Panels (tile palette, animation panel, minimap) have raised outer borders with sunken inner content areas
  2. Tab controls show raised tabs where the active tab visually merges with the content area below it (flush-merge illusion)
  3. Logical groupings within panels use etched (grooved) border lines with text labels
**Plans**: TBD

### Phase 15: Scrollbars
**Goal**: All scrollbars in the application match the Win98 standard -- 16px wide, 3D beveled, with classic arrow buttons
**Depends on**: Phase 12
**Requirements**: SCROLL-01, SCROLL-02, SCROLL-03
**Success Criteria** (what must be TRUE):
  1. Scrollbar thumbs appear as raised 3D rectangles on a solid grey track
  2. Scrollbar arrow buttons display classic triangle glyphs with proper pressed/normal bevel states
  3. Scrollbars are 16px wide, matching the Win98 system standard
**Plans**: TBD

### Phase 16: Dialog Controls & Polish
**Goal**: Every interactive form control in the application looks and behaves like its Win98 counterpart, with the Map Settings dialog presented as a proper Win98 property sheet
**Depends on**: Phase 12, Phase 14
**Requirements**: CTRL-01, CTRL-02, CTRL-03, CTRL-04, CTRL-05, CTRL-06, CTRL-07, CTRL-08, CTRL-09, CTRL-10
**Success Criteria** (what must be TRUE):
  1. Push buttons appear raised with no hover color change, sinking when pressed; default button has an extra dark border
  2. Text inputs and dropdowns display with sunken field borders (the classic "carved into the surface" look)
  3. Checkboxes show as sunken squares with checkmark glyphs; radio buttons show as sunken circles with dot indicators
  4. Sliders display a sunken channel with a raised thumb control
  5. Disabled controls show embossed text (grey with white shadow) instead of opacity reduction; focused controls show a 1px dotted inner border
**Plans**: TBD

## Progress

**Execution Order:** 12 -> 13 -> 14 -> 15 -> 16
(Phases 13, 14, 15 can execute in any order after 12; Phase 16 depends on 12 and 14)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 12. Theme Foundation | v1.4 | 5/5 | Complete | 2026-02-04 |
| 13. Application Chrome | v1.4 | 0/3 | Not started | - |
| 14. Panel Interiors | v1.4 | 0/TBD | Not started | - |
| 15. Scrollbars | v1.4 | 0/TBD | Not started | - |
| 16. Dialog Controls & Polish | v1.4 | 0/TBD | Not started | - |

## Coverage

| Requirement | Phase | Verified |
|-------------|-------|----------|
| THEME-01 | 12 | - |
| THEME-02 | 12 | - |
| THEME-03 | 12 | - |
| THEME-04 | 12 | - |
| THEME-05 | 12 | - |
| THEME-06 | 12 | - |
| THEME-07 | 12 | - |
| CHROME-01 | 13 | - |
| CHROME-02 | 13 | - |
| CHROME-03 | 13 | - |
| CHROME-04 | 13 | - |
| PANEL-01 | 14 | - |
| PANEL-02 | 14 | - |
| PANEL-03 | 14 | - |
| SCROLL-01 | 15 | - |
| SCROLL-02 | 15 | - |
| SCROLL-03 | 15 | - |
| CTRL-01 | 16 | - |
| CTRL-02 | 16 | - |
| CTRL-03 | 16 | - |
| CTRL-04 | 16 | - |
| CTRL-05 | 16 | - |
| CTRL-06 | 16 | - |
| CTRL-07 | 16 | - |
| CTRL-08 | 16 | - |
| CTRL-09 | 16 | - |
| CTRL-10 | 16 | - |

**Total: 27/27 requirements mapped**

---
*Roadmap created: 2026-02-04*
*Last updated: 2026-02-04*
