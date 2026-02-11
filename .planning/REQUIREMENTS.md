# Requirements: AC Map Editor

**Defined:** 2026-02-10
**Core Value:** The map editing experience should feel intuitive and professional

## v2.4 Requirements

Requirements for MDI Window Controls milestone. Child map windows get full window management.

### Window Controls

- [ ] **CTRL-01**: User can minimize a child window via minimize button in title bar
- [ ] **CTRL-02**: User can maximize a child window via maximize button in title bar
- [ ] **CTRL-03**: User can restore a minimized window by clicking its bar at workspace bottom
- [ ] **CTRL-04**: User can restore a maximized window via restore button (replaces maximize button)
- [ ] **CTRL-05**: User can close a child window via close button (existing — no change)

### Minimize Behavior

- [ ] **MINZ-01**: Minimized window appears as a compact titled bar at bottom of workspace
- [ ] **MINZ-02**: Multiple minimized windows stack horizontally without overlapping
- [ ] **MINZ-03**: Minimized window bar shows document name

### Maximize Behavior

- [ ] **MAXZ-01**: Maximized window fills the entire MDI workspace area
- [ ] **MAXZ-02**: Maximized window hides its title bar for maximum canvas space
- [ ] **MAXZ-03**: Maximized window canvas resizes to fill available space
- [ ] **MAXZ-04**: Double-click title bar toggles maximize/restore

## Future Requirements

None — focused milestone.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Ctrl+Tab window switching | Separate feature, not in this milestone |
| Cascading/tiling minimized windows | Classic MDI stacks horizontally at bottom |
| Window snapping/docking | Keeping classic MDI behavior |
| Taskbar-style minimized windows | Using compact bars at workspace bottom |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CTRL-01 | Phase 39 | Pending |
| CTRL-02 | Phase 40 | Pending |
| CTRL-03 | Phase 39 | Pending |
| CTRL-04 | Phase 40 | Pending |
| CTRL-05 | Phase 39 | Pending |
| MINZ-01 | Phase 39 | Pending |
| MINZ-02 | Phase 39 | Pending |
| MINZ-03 | Phase 39 | Pending |
| MAXZ-01 | Phase 40 | Pending |
| MAXZ-02 | Phase 40 | Pending |
| MAXZ-03 | Phase 40 | Pending |
| MAXZ-04 | Phase 40 | Pending |

**Coverage:**
- v2.4 requirements: 12 total
- Mapped to phases: 12
- Unmapped: 0

✓ 100% requirement coverage

---
*Requirements defined: 2026-02-10*
*Last updated: 2026-02-10 after roadmap creation*
