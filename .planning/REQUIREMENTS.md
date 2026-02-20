# Requirements: AC Map Editor

**Defined:** 2026-02-20
**Core Value:** The map editing experience should feel intuitive and professional — tools work correctly, the layout maximizes the editing canvas, and workflows match what users expect from image editors.

## v1.1.3 Requirements

Requirements for v1.1.3 Fixes & Polish milestone. Each maps to roadmap phases.

### UI Overlays

- [x] **OVRL-01**: Minimap and game object tool panel remain visible above maximized MDI windows
- [x] **OVRL-02**: Minimap size increases from 128x128 to 160x160 pixels

### Canvas Rendering

- [x] **CNVS-01**: Outside-map area renders with a distinct theme-relative color so map edges are visible during editing

### Selection Tools

- [x] **SLCT-01**: User can drag an existing selection marquee border to reposition it without affecting underlying tiles

### Settings & Serialization

- [x] **SETT-01**: Grenade and Bouncy special damage/recharge dropdowns correctly update their corresponding slider values
- [x] **SETT-02**: All game settings appear in the description field when map is opened in SEdit (confirmed non-issue — user scroll issue in SEdit)

## Future Requirements

Deferred to future milestones. Tracked but not in current roadmap.

### Theme Customization

- **THEME-01**: Theme-specific toolbar icons — custom icon sets per theme (user will create assets)

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

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| OVRL-01 | Phase 91 | Complete |
| OVRL-02 | Phase 91 | Complete |
| CNVS-01 | Phase 93 | Complete |
| SLCT-01 | Phase 94 | Complete |
| SETT-01 | Phase 92 | Complete |
| SETT-02 | Phase 92 | Complete (non-issue) |

**Coverage:**
- v1.1.3 requirements: 6 total
- Mapped to phases: 6
- Unmapped: 0

---
*Requirements defined: 2026-02-20*
*Last updated: 2026-02-20 after roadmap creation (all 6 requirements mapped)*
