# Requirements: AC Map Editor v1.0.4

**Defined:** 2026-02-17
**Core Value:** The map editing experience should feel intuitive and professional — tools work correctly, the layout maximizes the editing canvas, and workflows match what users expect from image editors.

## v1 Requirements

Requirements for milestone v1.0.4 Settings Overhaul & Image Trace.

### Settings Format

- [ ] **SFMT-01**: User's saved maps always include `Format=1.1,` at the beginning of the extended settings list in the description field
- [ ] **SFMT-02**: Settings serialization follows correct ordering: non-flagger → Format=1.1 → flagger → Author → unrecognized pairs
- [ ] **SFMT-03**: Maps saved without Format=1.1 (pre-v1.0.4) still load correctly with optional format detection

### Settings Bugs

- [ ] **SBUG-01**: User can load any map and see sliders update to match the dropdown values (Very Low through Very High)
- [ ] **SBUG-02**: User can adjust Special Damage without it incorrectly changing the Laser Damage slider
- [ ] **SBUG-03**: All 54 game settings are validated against SEdit source and AC_Setting_Info_25.txt for correct defaults, ranges, and behavior
- [ ] **SBUG-04**: User can load a map and see correct values across all game settings tabs (General, Combat, Weapons, Powerups, Game Rules)

### File Operations

- [ ] **FILE-01**: User can select File > Save As from the menu to save a map under a different filename
- [ ] **FILE-02**: After Save As, subsequent File > Save writes to the new filename (not the original)
- [ ] **FILE-03**: Window title updates to reflect the new filename after Save As

### Animation

- [ ] **ANIM-01**: User sees animated tiles rendering on the map canvas even when the animations panel is hidden/collapsed

### Image Trace

- [ ] **IMGT-01**: User can import an image file (PNG, JPG, BMP, WebP, SVG, GIF) via the menu
- [ ] **IMGT-02**: Imported image appears as an MDI child window on top of the editing canvas
- [ ] **IMGT-03**: User can adjust the opacity of the trace image window (0-100%)
- [ ] **IMGT-04**: User can move and resize the trace image window
- [ ] **IMGT-05**: Trace image window stays always on top of other child windows
- [ ] **IMGT-06**: User can edit the map through the trace image (click-through — mouse events pass to canvas below)

## Future Requirements

Deferred to subsequent milestones.

### Settings Enhancements

- **SENH-01**: Settings preview showing calculated values as user adjusts sliders (e.g., "LaserDamage: 27 (Normal)")
- **SENH-02**: Save As with auto-rename suggesting incremental filenames (map_v1, map_v2)
- **SENH-03**: Tooltips with recommended values for common game scenarios

### Image Trace Enhancements

- **IMGE-01**: Workspace persistence for trace image (save overlay state alongside map)
- **IMGE-02**: Image size limit warning for large images (>2048px) with optional scale-down

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Autosave | SubSpace maps are small (~50KB), explicit save expected in desktop editors, risks corrupting working copies |
| Multiple image overlays | Adds layer panel complexity, single overlay covers 95% of tracing use cases |
| Cloud storage | AC is a desktop game with local map files, no user benefit |
| Settings wizard | Would obscure relationships between 54 settings, keep tabbed dialog |
| Image overlay export/save to map | Overlay is editor-only reference, not part of map format |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SFMT-01 | Phase 82 | Complete |
| SFMT-02 | Phase 82 | Complete |
| SFMT-03 | Phase 82 | Complete |
| SBUG-01 | Phase 82 | Complete |
| SBUG-02 | Phase 82 | Complete |
| SBUG-03 | Phase 82 | Complete |
| SBUG-04 | Phase 82 | Complete |
| FILE-01 | Phase 83 | Complete |
| FILE-02 | Phase 83 | Complete |
| FILE-03 | Phase 83 | Complete |
| ANIM-01 | Phase 84 | Complete |
| IMGT-01 | Phase 85 | Pending |
| IMGT-02 | Phase 85 | Pending |
| IMGT-03 | Phase 85 | Pending |
| IMGT-04 | Phase 85 | Pending |
| IMGT-05 | Phase 85 | Pending |
| IMGT-06 | Phase 85 | Pending |

**Coverage:**
- v1 requirements: 17 total
- Mapped to phases: 17 (100% coverage)
- Unmapped: 0

---
*Requirements defined: 2026-02-17*
*Traceability updated: 2026-02-17 after roadmap creation*
