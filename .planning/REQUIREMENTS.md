# Requirements: AC Map Editor

**Defined:** 2026-02-02
**Core Value:** Professional map editing experience with intuitive layout that maximizes canvas space

## v1.2 Requirements

Requirements for SEdit-style layout and comprehensive Map Settings dialog.

### Layout

- [x] **LAYOUT-01**: Map canvas fills maximum available space
- [x] **LAYOUT-02**: Map canvas displays in bordered window frame (SEdit style)
- [x] **LAYOUT-03**: Gray background visible around map window frame
- [x] **LAYOUT-04**: Bottom tiles panel is ~20% height by default
- [x] **LAYOUT-05**: Dragging tiles panel up reveals more tileset, down reveals more canvas

### Minimap

- [x] **MINI-01**: Minimap displays in top-right corner
- [x] **MINI-02**: Minimap shows entire 256x256 map scaled down
- [x] **MINI-03**: Minimap shows viewport indicator (rectangle showing visible area)
- [x] **MINI-04**: Clicking minimap navigates to that location

### Animations Panel

- [x] **ANIM-01**: Animations panel on left side (fixed width)
- [x] **ANIM-02**: Animation previews are smaller (fit more on screen like SEdit)
- [x] **ANIM-03**: Hex labels display without leading zero (D5, E2, not 0D5, 0E2)
- [x] **ANIM-04**: Animations panel is scrollable vertical list

### Tiles Panel

- [x] **TILE-01**: Full tileset image visible without internal vertical scrolling
- [x] **TILE-02**: Tileset stretches/fits to panel width
- [x] **TILE-03**: Panel resizable via drag divider

### Map Settings Dialog

- [x] **SET-01**: "Map Settings" button in toolbar opens popup dialog
- [x] **SET-02**: Dialog has Map section (name, description fields)
- [x] **SET-03**: Dialog has Dynamic Settings section with sliders (Laser Damage, Special Damage, Recharge Rate)
- [x] **SET-04**: Dialog has Game Objective radio buttons (Frag/Flag/Switch)
- [x] **SET-05**: Dialog has Weapons Available checkboxes (Bouncies/Missiles/Bombs)
- [x] **SET-06**: Dialog has Miscellaneous section (Max Players, Holding Time, Teams, Powerups)
- [x] **SET-07**: "Advanced" button reveals all 40+ settings from AC_Setting_Info_25.txt
- [x] **SET-08**: Each advanced setting has slider (1 granularity) + text input
- [x] **SET-09**: Each advanced setting displays range and default value
- [x] **SET-10**: Set/Cancel buttons to apply or discard changes

## Out of Scope

| Feature | Reason |
|---------|--------|
| Floating/dockable panels | Keeping fixed layout for simplicity |
| Keyboard shortcut remapping | Low priority, defer to future |
| Custom scrollbar themes | Classic style sufficient |
| Real-time settings preview | Apply on Set button click |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| LAYOUT-01 | Phase 7 | Complete |
| LAYOUT-02 | Phase 7 | Complete |
| LAYOUT-03 | Phase 7 | Complete |
| LAYOUT-04 | Phase 7 | Complete |
| LAYOUT-05 | Phase 7 | Complete |
| MINI-01 | Phase 8 | Complete |
| MINI-02 | Phase 8 | Complete |
| MINI-03 | Phase 8 | Complete |
| MINI-04 | Phase 8 | Complete |
| ANIM-01 | Phase 9 | Complete |
| ANIM-02 | Phase 9 | Complete |
| ANIM-03 | Phase 9 | Complete |
| ANIM-04 | Phase 9 | Complete |
| TILE-01 | Phase 9 | Complete |
| TILE-02 | Phase 9 | Complete |
| TILE-03 | Phase 9 | Complete |
| SET-01 | Phase 10 | Complete |
| SET-02 | Phase 10 | Complete |
| SET-03 | Phase 10 | Complete |
| SET-04 | Phase 10 | Complete |
| SET-05 | Phase 10 | Complete |
| SET-06 | Phase 10 | Complete |
| SET-07 | Phase 10 | Complete |
| SET-08 | Phase 10 | Complete |
| SET-09 | Phase 10 | Complete |
| SET-10 | Phase 10 | Complete |

**Coverage:**
- v1.2 requirements: 20 total
- Complete: 20
- Pending: 0

---
*Requirements defined: 2026-02-02*
*Last updated: 2026-02-02 - v1.2 milestone complete (100% delivered)*
