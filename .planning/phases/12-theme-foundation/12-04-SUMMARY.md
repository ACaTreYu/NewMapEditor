---
phase: 12-theme-foundation
plan: 04
subsystem: ui-styling
tags: [css, win98, refactoring, cleanup]

requires:
  - phases: [12-01]
    reason: "Win98 CSS variables and bevel utilities established"

provides:
  - "Zero modern CSS artifacts in all component CSS files"
  - "All ghost variables replaced with valid Win98 semantic variables"
  - "Border-based bevel approach implemented throughout"

affects:
  - phases: [12-05]
    impact: "Clean Win98-compatible CSS foundation for animation and polish"

tech-stack:
  added: []
  patterns:
    - "Border-only bevels (no box-shadow)"
    - "Win98 embossed text for disabled states"
    - "Sharp corners throughout (border-radius: 0 or removed)"

key-files:
  created: []
  modified:
    - path: "src/components/ToolBar/ToolBar.css"
      changes: "Removed border-radius, transition, box-shadow, opacity; replaced ghost variables"
    - path: "src/components/MapCanvas/MapCanvas.css"
      changes: "Removed border-radius and transition from scrollbar thumbs"
    - path: "src/components/MapSettingsDialog/MapSettingsDialog.css"
      changes: "Converted all box-shadow bevels to border-based approach; removed opacity on disabled"
    - path: "src/components/Minimap/Minimap.css"
      changes: "Removed border-radius and box-shadow; added Win98 raised border"
    - path: "src/components/AnimationPanel/AnimationPanel.css"
      changes: "Removed border-radius from buttons and slider thumbs; replaced opacity with embossed text"
    - path: "src/components/AnimationPreview/AnimationPreview.css"
      changes: "Replaced all ghost variables; removed border-radius, filter effects, opacity"
    - path: "src/components/TilePalette/TilePalette.css"
      changes: "Replaced ghost variables; removed border-radius from select elements"
    - path: "src/components/MapSettingsPanel/MapSettingsPanel.css"
      changes: "Removed border-radius from all inputs, sliders, selects, and textareas"
    - path: "src/components/RightSidebar/RightSidebar.css"
      changes: "Replaced ghost variables with valid Win98 semantic variables"
    - path: "src/components/StatusBar/StatusBar.css"
      changes: "Verified (no modern artifacts found)"
    - path: "src/components/TilesetPanel/TilesetPanel.css"
      changes: "Verified (no modern artifacts found)"
    - path: "src/components/TabbedBottomPanel/TabbedBottomPanel.css"
      changes: "Verified (no modern artifacts found)"

key-decisions: []

duration: "5 minutes 20 seconds"
completed: 2026-02-04
---

# Phase 12 Plan 04: Component CSS Purge Summary

Systematically eliminated all modern CSS artifacts from 12 component CSS files and replaced ghost variables with valid Win98 semantic variables.

---

## Performance

- **Duration:** 5 minutes 20 seconds
- **Started:** 2026-02-04T09:46:00Z
- **Completed:** 2026-02-04T09:51:19Z
- **Tasks completed:** 2/2
- **Files modified:** 12 component CSS files

---

## Accomplishments

### Modern CSS Purge

**Removed from ALL component CSS files:**
- ✅ All `border-radius` properties (sharp 90-degree corners throughout)
- ✅ All `transition` and `animation` properties (instant state changes)
- ✅ All `rgba()` color values (solid colors only, except dialog backdrop)
- ✅ All `opacity` on disabled controls (replaced with Win98 embossed text)
- ✅ All `box-shadow` properties (converted to border-based bevels)
- ✅ All `filter` and `backdrop-filter` effects
- ✅ All ghost CSS variables (`--border-color`, `--accent-color`)

### Ghost Variable Replacement

**Replaced throughout codebase:**
- `var(--border-color)` → `var(--border-default)` (maps to --win98-ButtonShadow)
- `var(--accent-color)` → `var(--accent-primary)` (maps to --win98-Highlight)

### Border-Based Bevels

**Converted box-shadow bevels to border approach:**
- MapSettingsDialog: Dialog container, buttons, sliders, inputs
- ToolBar: Active button state
- Minimap: Container border
- All elements now use CSS borders with Win98 color variables

### Disabled State Styling

**Replaced opacity with Win98 embossed text pattern:**
```css
/* Old: opacity: 0.4; */
/* New: */
color: var(--win98-GrayText);
text-shadow: 1px 1px 0 var(--win98-ButtonHighlight);
```

Applied to: ToolBar buttons, AnimationPanel buttons, AnimationPreview buttons, MapSettingsDialog buttons

---

## Task Commits

| Task | Commit | Description | Files |
|------|--------|-------------|-------|
| 1 | a560a3d | Purge modern CSS from high-impact component files | ToolBar, MapCanvas, MapSettingsDialog, Minimap, StatusBar, TilesetPanel (6 files) |
| 2 | 5934929 | Purge modern CSS from remaining component files | AnimationPanel, AnimationPreview, TilePalette, MapSettingsPanel, RightSidebar, TabbedBottomPanel (6 files) |

---

## Files Created

None (refactoring only).

---

## Files Modified

### Component CSS Files (12 files)

**Task 1 - High-impact components:**
1. `src/components/ToolBar/ToolBar.css`
2. `src/components/MapCanvas/MapCanvas.css`
3. `src/components/MapSettingsDialog/MapSettingsDialog.css`
4. `src/components/Minimap/Minimap.css`
5. `src/components/StatusBar/StatusBar.css`
6. `src/components/TilesetPanel/TilesetPanel.css`

**Task 2 - Remaining components:**
7. `src/components/AnimationPanel/AnimationPanel.css`
8. `src/components/AnimationPreview/AnimationPreview.css`
9. `src/components/TilePalette/TilePalette.css`
10. `src/components/MapSettingsPanel/MapSettingsPanel.css`
11. `src/components/RightSidebar/RightSidebar.css`
12. `src/components/TabbedBottomPanel/TabbedBottomPanel.css`

---

## Decisions Made

None required (autonomous execution per plan).

---

## Deviations from Plan

None - plan executed exactly as written.

All transformations applied systematically:
- Modern CSS artifacts removed
- Ghost variables replaced
- Box-shadows converted to border-based bevels
- Opacity replaced with embossed text
- All per plan specifications

---

## Issues Encountered

None.

---

## User Setup Required

None.

---

## Next Phase Readiness

**Phase 12 Theme Foundation status:** Ready for next plan (12-05 - Animation and Polish)

**Blockers:** None

**Quality metrics:**
- ✅ Zero border-radius (except removed entirely)
- ✅ Zero transition/animation properties
- ✅ Zero rgba() (except dialog backdrop - acceptable functional exception)
- ✅ Zero opacity on controls
- ✅ Zero filter effects
- ✅ Zero ghost variables (--border-color, --accent-color)
- ✅ Zero box-shadow properties
- ✅ Zero round elements (border-radius: 50% removed from all slider thumbs)

**Component CSS codebase is now 100% Win98-compatible:**
- Sharp corners everywhere
- Instant state changes
- Solid colors throughout
- Valid CSS variable references only
- Border-based bevels following user requirement

Ready for animation and polish phase.
