# Requirements: AC Map Editor v1.5

**Defined:** 2026-02-04
**Core Value:** Tools work correctly and match SEdit behavior — every SEdit tool accessible and functional

## v1.5 Requirements

Requirements for Functional Tools milestone. Each maps to roadmap phases.

### Tool Activation

- [x] **TOOL-01**: SPAWN tool accessible via toolbar button with icon and keyboard shortcut
- [x] **TOOL-02**: SWITCH tool accessible via toolbar button with icon and keyboard shortcut
- [x] **TOOL-03**: BRIDGE tool accessible via toolbar button with icon and keyboard shortcut

### Conveyor Tool

- [x] **CONV-01**: CONVEYOR tool accessible via toolbar button with icon and keyboard shortcut
- [x] **CONV-02**: User can select conveyor direction (left-right vs up-down) via tool panel
- [x] **CONV-03**: User can drag a rectangle on the map to place conveyor tiles (2x2 minimum)
- [x] **CONV-04**: Conveyor tiles fill with correct 4-tile repeating pattern based on direction

## Previous Milestone Requirements (v1.4)

### Theme Foundation (Complete)

- [x] **THEME-01**: Win98 CSS variable system with 10 system colors and 4 bevel box-shadow patterns as reusable custom properties
- [x] **THEME-02**: Dark/light theme toggle removed entirely (delete useTheme hook, remove toggle UI, remove theme classes)
- [x] **THEME-03**: All border-radius values eliminated across all components (25+ instances)
- [x] **THEME-04**: Ghost CSS variables fixed (--border-color, --accent-color used in 18+ locations but never defined)
- [x] **THEME-05**: Win98 system font applied (MS Sans Serif / Arial at 11px, no font smoothing)
- [x] **THEME-06**: All CSS transitions removed from controls (Win98 had instant state changes)
- [x] **THEME-07**: All box-shadow blur effects and transparency/opacity on controls removed

### Application Chrome (Complete)

- [x] **CHROME-01**: Win98 toolbar buttons (flat appearance, raised on hover, sunken on press)
- [x] **CHROME-02**: Win98 status bar with shallow sunken field sections
- [x] **CHROME-03**: Win98 resize handles styled as raised bars on panel dividers
- [x] **CHROME-04**: Win98 title bar gradients on inner window frame (active blue, inactive grey)

## Future Requirements

Deferred to later milestones. Tracked but not in current roadmap.

### Win98 Visual Polish (deferred from v1.4)

- **PANEL-01**: Win98 beveled panel borders (raised outer frame, sunken inner content)
- **PANEL-02**: Win98 tab controls (raised tabs, sunken content area)
- **PANEL-03**: Win98 group box styling with etched borders
- **SCROLL-01**: Win98 3D scrollbar appearance (raised thumb, solid grey track)
- **SCROLL-02**: Win98 arrow buttons with proper pressed/normal states
- **SCROLL-03**: 16px scrollbar width matching Win98 standard
- **CTRL-01** through **CTRL-10**: Win98 dialog controls (buttons, inputs, checkboxes, etc.)

### Tool Behavior Verification (future)

- **VERIFY-01**: Pencil drag-to-paint behavior matches SEdit
- **VERIFY-02**: Coordinate accuracy at all zoom levels (0.25x-4x)
- **VERIFY-03**: Wall constrain mode (shift-key axis locking)
- **VERIFY-04**: Line tool algorithm comparison (Bresenham vs SEdit polynomial)

### SELECT Tool (future)

- **SEL-01**: Marquee selection with drag rectangle
- **SEL-02**: Copy/paste/delete operations
- **SEL-03**: Mirror/rotate transforms

### Animation Panel Redesign (future)

- **ANIM-01**: Numbered vertical list (00-FF) with scrolling
- **ANIM-02**: Tile/Anim radio button selection
- **ANIM-03**: Offset field for animation frame offset

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| SELECT tool | Significant work, deferred to future milestone |
| Tool behavior verification | Tools work well enough, prioritizing missing functionality |
| Wall constrain mode | Nice-to-have, not core to tool parity |
| Line algorithm change | Bresenham is acceptable, polynomial is marginal improvement |
| Multiple conveyor/bridge styles | custom.dat supports variants, but first type is sufficient |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TOOL-01 | 14 | Complete |
| TOOL-02 | 14 | Complete |
| TOOL-03 | 14 | Complete |
| CONV-01 | 15 | Complete |
| CONV-02 | 15 | Complete |
| CONV-03 | 15 | Complete |
| CONV-04 | 15 | Complete |

**Coverage:**
- v1.5 requirements: 7 total
- Mapped to phases: 7
- Unmapped: 0

**100% coverage achieved**

---
*Requirements defined: 2026-02-04*
*Last updated: 2026-02-04 -- All v1.5 requirements complete (Phase 14 + Phase 15)*
