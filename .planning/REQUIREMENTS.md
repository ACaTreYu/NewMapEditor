# Requirements: AC Map Editor v1.4

**Defined:** 2026-02-04
**Core Value:** The map editing experience should feel intuitive and professional -- pixel-accurate Win98 aesthetic across every element

## v1.4 Requirements

Requirements for Win98 Theme Overhaul. Each maps to roadmap phases.

### Theme Foundation

- [ ] **THEME-01**: Win98 CSS variable system with 10 system colors and 4 bevel box-shadow patterns as reusable custom properties
- [ ] **THEME-02**: Dark/light theme toggle removed entirely (delete useTheme hook, remove toggle UI, remove theme classes)
- [ ] **THEME-03**: All border-radius values eliminated across all components (25+ instances)
- [ ] **THEME-04**: Ghost CSS variables fixed (--border-color, --accent-color used in 18+ locations but never defined)
- [ ] **THEME-05**: Win98 system font applied (MS Sans Serif / Arial at 11px, no font smoothing)
- [ ] **THEME-06**: All CSS transitions removed from controls (Win98 had instant state changes)
- [ ] **THEME-07**: All box-shadow blur effects and transparency/opacity on controls removed

### Application Chrome

- [ ] **CHROME-01**: Win98 toolbar buttons (flat appearance, raised on hover, sunken on press)
- [ ] **CHROME-02**: Win98 status bar with shallow sunken field sections
- [ ] **CHROME-03**: Win98 resize handles styled as raised bars on panel dividers
- [ ] **CHROME-04**: Win98 title bar gradients on inner window frame (active blue, inactive grey)

### Panel Styling

- [ ] **PANEL-01**: Win98 beveled panel borders (raised outer frame, sunken inner content)
- [ ] **PANEL-02**: Win98 tab controls (raised tabs with 3px top radius, sunken content area)
- [ ] **PANEL-03**: Win98 group box styling with etched borders

### Scrollbars

- [ ] **SCROLL-01**: Win98 3D scrollbar appearance (raised thumb, solid grey track)
- [ ] **SCROLL-02**: Win98 arrow buttons with proper pressed/normal states and classic arrow glyphs
- [ ] **SCROLL-03**: 16px scrollbar width matching Win98 standard

### Dialog Controls

- [ ] **CTRL-01**: Win98 push buttons (raised border, sunken on press, no hover color change)
- [ ] **CTRL-02**: Win98 text inputs with sunken field border
- [ ] **CTRL-03**: Win98 checkboxes (sunken box with checkmark glyph)
- [ ] **CTRL-04**: Win98 radio buttons (sunken circle with dot indicator)
- [ ] **CTRL-05**: Win98 dropdown selects (sunken field with raised arrow button)
- [ ] **CTRL-06**: Win98 sliders/trackbars (sunken channel with raised thumb)
- [ ] **CTRL-07**: Map Settings dialog styled as Win98 property sheet
- [ ] **CTRL-08**: Default button distinguished with extra dark border
- [ ] **CTRL-09**: Disabled controls use embossed text (grey + white text-shadow, no opacity)
- [ ] **CTRL-10**: Focus rectangles (1px dotted inner border on focused controls)

## Future Requirements

Deferred to later milestones. Tracked but not in current roadmap.

### Animation Panel Redesign (v1.5)

- **ANIM-01**: Numbered vertical list (00-FF) with scrolling
- **ANIM-02**: Tile/Anim radio button selection
- **ANIM-03**: Offset field for animation frame offset
- **ANIM-04**: Color options for animation display
- **ANIM-05**: Settings button for animation configuration

### Additional SEdit Elements (future)

- **SEDIT-01**: SEdit-style menu bar details
- **SEDIT-02**: SEdit-style status bar information
- **SEDIT-03**: MDI window management

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| 98.css as npm dependency | Hand-writing CSS for more control, using 98.css as visual reference only |
| Dithered checkerboard scrollbar track | Added complexity, solid grey track sufficient for Win98 look |
| Custom Electron frameless window | High cost for custom title bar IPC, native frame acceptable |
| Pixel art toolbar icons | Art production work, separate from CSS reskin |
| Menu bar + dropdown menus | HIGH complexity requiring new React components, defer to future milestone |
| Dark/light theme support | Being removed -- single Win98 grey aesthetic |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| THEME-01 | Phase 12 | Pending |
| THEME-02 | Phase 12 | Pending |
| THEME-03 | Phase 12 | Pending |
| THEME-04 | Phase 12 | Pending |
| THEME-05 | Phase 12 | Pending |
| THEME-06 | Phase 12 | Pending |
| THEME-07 | Phase 12 | Pending |
| CHROME-01 | Phase 13 | Pending |
| CHROME-02 | Phase 13 | Pending |
| CHROME-03 | Phase 13 | Pending |
| CHROME-04 | Phase 13 | Pending |
| PANEL-01 | Phase 14 | Pending |
| PANEL-02 | Phase 14 | Pending |
| PANEL-03 | Phase 14 | Pending |
| SCROLL-01 | Phase 15 | Pending |
| SCROLL-02 | Phase 15 | Pending |
| SCROLL-03 | Phase 15 | Pending |
| CTRL-01 | Phase 16 | Pending |
| CTRL-02 | Phase 16 | Pending |
| CTRL-03 | Phase 16 | Pending |
| CTRL-04 | Phase 16 | Pending |
| CTRL-05 | Phase 16 | Pending |
| CTRL-06 | Phase 16 | Pending |
| CTRL-07 | Phase 16 | Pending |
| CTRL-08 | Phase 16 | Pending |
| CTRL-09 | Phase 16 | Pending |
| CTRL-10 | Phase 16 | Pending |

**Coverage:**
- v1.4 requirements: 27 total
- Mapped to phases: 27
- Unmapped: 0

---
*Requirements defined: 2026-02-04*
*Last updated: 2026-02-04 -- phase assignments added*
