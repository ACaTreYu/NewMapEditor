# Requirements: AC Map Editor

**Defined:** 2026-02-02
**Core Value:** Professional map editing experience with intuitive layout that maximizes canvas space

## v1.2 Requirements

Requirements for SEdit-style layout and comprehensive Map Settings dialog.

### Layout

- [ ] **LAYOUT-01**: Map canvas fills maximum available space
- [ ] **LAYOUT-02**: Map canvas displays in bordered window frame (SEdit style)
- [ ] **LAYOUT-03**: Gray background visible around map window frame
- [ ] **LAYOUT-04**: Bottom tiles panel is ~20% height by default
- [ ] **LAYOUT-05**: Dragging tiles panel up reveals more tileset, down reveals more canvas

### Minimap

- [ ] **MINI-01**: Minimap displays in top-right corner
- [ ] **MINI-02**: Minimap shows entire 256x256 map scaled down
- [ ] **MINI-03**: Minimap shows viewport indicator (rectangle showing visible area)
- [ ] **MINI-04**: Clicking minimap navigates to that location

### Animations Panel

- [ ] **ANIM-01**: Animations panel on left side (fixed width)
- [ ] **ANIM-02**: Animation previews are smaller (fit more on screen like SEdit)
- [ ] **ANIM-03**: Hex labels display without leading zero (D5, E2, not 0D5, 0E2)
- [ ] **ANIM-04**: Animations panel is scrollable vertical list

### Tiles Panel

- [ ] **TILE-01**: Full tileset image visible without internal vertical scrolling
- [ ] **TILE-02**: Tileset stretches/fits to panel width
- [ ] **TILE-03**: Panel resizable via drag divider

### Map Settings Dialog

- [ ] **SET-01**: "Map Settings" button in toolbar opens popup dialog
- [ ] **SET-02**: Dialog has Map section (name, description fields)
- [ ] **SET-03**: Dialog has Dynamic Settings section with sliders (Laser Damage, Special Damage, Recharge Rate)
- [ ] **SET-04**: Dialog has Game Objective radio buttons (Frag/Flag/Switch)
- [ ] **SET-05**: Dialog has Weapons Available checkboxes (Bouncies/Missiles/Bombs)
- [ ] **SET-06**: Dialog has Miscellaneous section (Max Players, Holding Time, Teams, Powerups)
- [ ] **SET-07**: "Advanced" button reveals all 40+ settings from AC_Setting_Info_25.txt
- [ ] **SET-08**: Each advanced setting has slider (1 granularity) + text input
- [ ] **SET-09**: Each advanced setting displays range and default value
- [ ] **SET-10**: Set/Cancel buttons to apply or discard changes

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
| LAYOUT-01 | Phase 7 | Pending |
| LAYOUT-02 | Phase 7 | Pending |
| LAYOUT-03 | Phase 7 | Pending |
| LAYOUT-04 | Phase 7 | Pending |
| LAYOUT-05 | Phase 7 | Pending |
| MINI-01 | Phase 8 | Pending |
| MINI-02 | Phase 8 | Pending |
| MINI-03 | Phase 8 | Pending |
| MINI-04 | Phase 8 | Pending |
| ANIM-01 | Phase 9 | Pending |
| ANIM-02 | Phase 9 | Pending |
| ANIM-03 | Phase 9 | Pending |
| ANIM-04 | Phase 9 | Pending |
| TILE-01 | Phase 9 | Pending |
| TILE-02 | Phase 9 | Pending |
| TILE-03 | Phase 9 | Pending |
| SET-01 | Phase 10 | Pending |
| SET-02 | Phase 10 | Pending |
| SET-03 | Phase 10 | Pending |
| SET-04 | Phase 10 | Pending |
| SET-05 | Phase 10 | Pending |
| SET-06 | Phase 10 | Pending |
| SET-07 | Phase 10 | Pending |
| SET-08 | Phase 10 | Pending |
| SET-09 | Phase 10 | Pending |
| SET-10 | Phase 10 | Pending |

**Coverage:**
- v1.2 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0

---
*Requirements defined: 2026-02-02*
*Last updated: 2026-02-02 - phase assignments complete (100% coverage)*
