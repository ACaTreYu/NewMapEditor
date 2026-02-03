# Phase 10: Map Settings Dialog - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Comprehensive popup dialog for editing all map settings. Toolbar button opens modal with tabbed interface for map info, game parameters, weapons, and all 40+ settings from AC_Setting_Info_25.txt. Apply/Close buttons to commit or discard changes.

</domain>

<decisions>
## Implementation Decisions

### Dialog Layout
- Dialog sizes to fit content (grows/shrinks as needed)
- Settings organized in tabs (not scroll or accordion)
- Win95/98 style matching existing panel chrome (3D borders, classic buttons)
- Win95 property sheet tabs — raised selected tab, classic tabbed dialog look

### Settings Organization
- All settings always visible — no hidden "advanced" mode
- Tab grouping at Claude's discretion based on AC_Setting_Info_25.txt structure
- Within each tab, common/frequently-used settings appear at top
- Both per-setting reset icons AND global "Reset All" button

### Input Controls
- Slider + text box for numeric settings (both synced)
- Min/max labels shown at slider ends
- Invalid input: clamp to nearest valid value (no error messages)
- Default value display: Claude's discretion

### Apply/Cancel Behavior
- Changes apply only when "Apply" button clicked
- Closing with unsaved changes shows confirmation dialog
- Button labels: "Apply" and "Close"
- No keyboard shortcuts (mouse-only interaction)

### Claude's Discretion
- Specific tab organization and naming
- Default value display method
- Visual layout density within tabs
- Tab order and which settings go in which tab

</decisions>

<specifics>
## Specific Ideas

- Win95 property sheet tabs — the classic Windows 95/98 tabbed dialog appearance
- Settings source: AC_Setting_Info_25.txt contains all 40+ settings with ranges

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-map-settings-dialog*
*Context gathered: 2026-02-02*
