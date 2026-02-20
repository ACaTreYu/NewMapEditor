# Requirements: AC Map Editor

**Defined:** 2026-02-20
**Core Value:** The map editing experience should feel intuitive and professional — tools work correctly, the layout maximizes the editing canvas, and workflows match what users expect from image editors.

## v1.1.4 Requirements

Requirements for v1.1.4 Animated Tool Icons & Update Audit milestone. Each maps to roadmap phases.

### Toolbar Icons

- [ ] **ICON-01**: Flag tool icon rendered from user-specified tileset tile(s)
- [ ] **ICON-02**: Pole tool icon rendered from user-specified tileset tile(s)
- [ ] **ICON-03**: Warp tool icon rendered from user-specified tileset tile(s)
- [ ] **ICON-04**: Spawn tool icon updated to user-specified tileset tile(s)
- [ ] **ICON-05**: Switch tool icon rendered from user-specified tileset tile(s)
- [ ] **ICON-06**: Conveyor tool icon rendered from user-specified tileset tile(s)
- [ ] **ICON-07**: Game object tool icons animate when hovered
- [ ] **ICON-08**: Game object tool icons animate when selected/active

### Theme Adaptation

- [ ] **THEME-01**: Bunker tool icon displays inverted PNG (black→white, preserve transparency) in Dark and Terminal themes

### Update Audit

- [ ] **UPDT-01**: Windows auto-updater correctly configured (latest.yml on GitHub Releases, download and install flow verified)
- [ ] **UPDT-02**: Linux auto-updater correctly configured (latest-linux.yml on GitHub Releases, DebUpdater flow verified)
- [ ] **UPDT-03**: autoInstallOnAppQuit disabled on Linux to prevent surprise pkexec prompt on normal quit

## Previous Requirements (v1.1.3 — Complete)

- [x] **OVRL-01**: Minimap and game object tool panel remain visible above maximized MDI windows
- [x] **OVRL-02**: Minimap size increases from 128x128 to 160x160 pixels
- [x] **CNVS-01**: Outside-map area renders with a distinct theme-relative color so map edges are visible during editing
- [x] **SLCT-01**: User can drag an existing selection marquee border to reposition it without affecting underlying tiles
- [x] **SETT-01**: Grenade and Bouncy special damage/recharge dropdowns correctly update their corresponding slider values
- [x] **SETT-02**: All game settings appear in the description field when map is opened in SEdit (confirmed non-issue)

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
| Linux auto-update UX polish (pkexec fallback dialog, quit-first sequencing) | Deferred — basic flow works, polish in future milestone |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ICON-01 | — | Pending |
| ICON-02 | — | Pending |
| ICON-03 | — | Pending |
| ICON-04 | — | Pending |
| ICON-05 | — | Pending |
| ICON-06 | — | Pending |
| ICON-07 | — | Pending |
| ICON-08 | — | Pending |
| THEME-01 | — | Pending |
| UPDT-01 | — | Pending |
| UPDT-02 | — | Pending |
| UPDT-03 | — | Pending |

**Coverage:**
- v1.1.4 requirements: 12 total
- Mapped to phases: 0
- Unmapped: 12

---
*Requirements defined: 2026-02-20*
*Last updated: 2026-02-20 after initial definition*
