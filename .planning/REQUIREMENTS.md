# Requirements: AC Map Editor

**Defined:** 2026-02-26
**Core Value:** The map editing experience should feel intuitive and professional — tools work correctly, the layout maximizes the editing canvas, and workflows match what users expect from image editors.

## v1.2.3 Requirements

Requirements for v1.2.3 Canvas Backgrounds & Fixes milestone. Each maps to roadmap phases.

### Canvas Background

- [ ] **BG-01**: User can select canvas background mode from toolbar dropdown (5 options)
- [ ] **BG-02**: Transparent mode shows no background behind empty tiles (current default behavior)
- [ ] **BG-03**: SEdit classic mode fills empty tile areas with SEdit's classic background color
- [ ] **BG-04**: Farplane mode renders the current patch's farplane image behind empty tiles
- [ ] **BG-05**: Custom color mode lets user pick any solid color as canvas background
- [ ] **BG-06**: Custom image mode lets user load any image file as canvas background
- [ ] **BG-07**: Background mode persists across sessions via localStorage
- [ ] **BG-08**: Background renders correctly during animation ticks (blitDirtyRect path)

### Patch Selector

- [ ] **PATCH-01**: Desktop builds show bundled patch dropdown in tileset panel (same as web)
- [ ] **PATCH-02**: Patch loading uses IPC-based path resolution for production builds
- [ ] **PATCH-03**: Active patch indicated visually in the dropdown

### Wall Tool Fix

- [ ] **WALL-01**: Wall neighbor updates preserve the neighbor's existing wall type
- [ ] **WALL-02**: Drawing wall type B near existing wall type A does not convert A to B

### Update Check

- [ ] **UPDT-01**: Auto-updater checks once on app startup only (no recurring interval)

## Previous Requirements (v1.1.4 — Complete)

- [x] **ICON-01**: Flag tool icon rendered from tileset tiles
- [x] **ICON-02**: Pole tool icon rendered from tileset tiles
- [x] **ICON-03**: Warp tool icon rendered from tileset tiles
- [x] **ICON-04**: Spawn tool icon rendered from tileset tiles
- [x] **ICON-05**: Switch tool icon rendered from tileset tiles
- [x] **ICON-06**: Conveyor tool icon rendered from tileset tiles
- [x] **ICON-07**: Game object tool icons animate when hovered
- [x] **ICON-08**: Game object tool icons animate when selected/active
- [x] **THEME-01**: Bunker tool icon inverted in Dark and Terminal themes

## Previous Requirements (v1.1.3 — Complete)

- [x] **OVRL-01**: Minimap and game object tool panel remain visible above maximized MDI windows
- [x] **OVRL-02**: Minimap size increases from 128x128 to 160x160 pixels
- [x] **CNVS-01**: Outside-map area renders with a distinct theme-relative color
- [x] **SLCT-01**: User can drag an existing selection marquee border to reposition it
- [x] **SETT-01**: Grenade and Bouncy special damage/recharge dropdowns correctly update sliders
- [x] **SETT-02**: All game settings appear in the description field when map is opened in SEdit

## Future Requirements

Deferred to future milestones. Tracked but not in current roadmap.

### Selection Tools (Advanced)

- **SLCT-02**: Move selected tiles (cut + reposition) as a separate operation from move marquee

### Measurements

- **MEAS-01**: Custom measurement scales for ruler tool
- **MEAS-02**: Offset increment/decrement hotkeys
- **MEAS-03**: Batch offset adjustment for selected region

## Out of Scope

| Feature | Reason |
|---------|--------|
| Floating/dockable panels | Keeping fixed layout for simplicity |
| Custom in-app menu bar | Staying with native Electron menu |
| V2 map format support | Separate concern |
| Content-aware transform tables | Geometric transforms sufficient for now |
| System clipboard integration | Internal clipboard preserves tile encoding |
| Session persistence for ruler notepad | Measurement log is per-session |
| Per-document background mode | Global mode simpler, per-doc adds complexity without clear benefit |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| BG-01 | Phase 101 | Pending |
| BG-02 | Phase 101 | Pending |
| BG-03 | Phase 101 | Pending |
| BG-04 | Phase 101 | Pending |
| BG-05 | Phase 101 | Pending |
| BG-06 | Phase 101 | Pending |
| BG-07 | Phase 101 | Pending |
| BG-08 | Phase 101 | Pending |
| PATCH-01 | Phase 100 | Pending |
| PATCH-02 | Phase 100 | Pending |
| PATCH-03 | Phase 100 | Pending |
| WALL-01 | Phase 99 | Pending |
| WALL-02 | Phase 99 | Pending |
| UPDT-01 | Phase 99 | Pending |

**Coverage:**
- v1.2.3 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0

---
*Requirements defined: 2026-02-26*
*Last updated: 2026-02-26 — traceability filled in after roadmap creation*
