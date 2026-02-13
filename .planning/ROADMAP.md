# Roadmap: AC Map Editor

## Milestones

- ✅ **v1.0 UI Overhaul** - Phases 1-3 (shipped 2026-02-01)
- ✅ **v1.1 Canvas & Polish** - Phases 4-6 (shipped 2026-02-02)
- ✅ **v1.2 SEdit-Style Layout** - Phases 7-10 (shipped 2026-02-02)
- ✅ **v1.3 Layout Fix** - Phase 11 (shipped 2026-02-04)
- ✅ **v1.4 Win98 Theme Overhaul** - Phases 12-13 (shipped 2026-02-04)
- ✅ **v1.5 Functional Tools** - Phases 14-15 (shipped 2026-02-04)
- ✅ **v1.6 SELECT & Animation Panel** - Phases 16-20 (shipped 2026-02-08)
- ✅ **v1.7 Performance & Portability** - Phases 21-26 (shipped 2026-02-08)
- ✅ **v2.0 Modern Minimalist UI** - Phases 27-32 (shipped 2026-02-09)
- ✅ **v2.1 MDI Editor & Polish** - Phases 33-36 (shipped 2026-02-09)
- ✅ **v2.2 Transparency & Performance** - Phase 37 (shipped 2026-02-09)
- ✅ **v2.3 Minimap Independence** - Phase 38 (shipped 2026-02-10)
- ✅ **v2.4 MDI Window Controls** - Phases 39-40 (shipped 2026-02-10)
- ✅ **v2.5 Selection Transform Tools** - Phases 41-43 (shipped 2026-02-11)
- ✅ **v2.6 Viewport & Animation Fixes** - Phases 44-46 (shipped 2026-02-11)
- ✅ **v2.7 Rendering & Navigation** - Phases 47-50 (shipped 2026-02-12)
- ✅ **v2.8 Canvas Engine** - Phases 51-55 (shipped 2026-02-13)
- 🚧 **v2.9 Measurement & Grid** - Phases 56-60 (in progress)

## Phases

<details>
<summary>✅ v1.0-v2.8 (Phases 1-55) - SHIPPED 2026-02-01 to 2026-02-13</summary>

See MILESTONES.md for complete history.

</details>

### 🚧 v2.9 Measurement & Grid (In Progress)

**Milestone Goal:** Add ruler measurement tool with 4 modes, polish selection info display, and provide grid customization controls.

#### ✅ Phase 56: Grid Customization (Complete 2026-02-13)
**Goal:** User can customize grid appearance with opacity, line weight, and color controls
**Depends on:** Phase 55 (Canvas Engine)
**Requirements:** GRID-01, GRID-02, GRID-03
**Success Criteria** (what must be TRUE):
  1. ✅ User can adjust grid opacity from 0% (invisible) to 100% (fully opaque) via slider
  2. ✅ User can adjust grid line weight from 1px (thin) to 3px (thick) via slider
  3. ✅ User can choose grid line color via color picker
  4. ✅ Grid settings persist to localStorage and survive application restart
  5. ✅ Grid pattern cache regenerates only when settings change, not on every frame
**Plans:** 2 plans

Plans:
- [x] 56-01-PLAN.md — State + rendering + localStorage persistence (globalSlice, EditorState, MapCanvas)
- [x] 56-02-PLAN.md — Grid settings UI dropdown (ToolBar controls for opacity, weight, color)

**Status:** ✅ Complete (2026-02-13)

#### ✅ Phase 57: Selection Info Enhancement (Complete 2026-02-13)
**Goal:** User can see selection dimensions and tile count in status bar and as floating label
**Depends on:** Phase 56
**Requirements:** SEL-01, SEL-02
**Success Criteria** (what must be TRUE):
  1. ✅ Status bar shows selection dimensions and tile count in format "Sel: 5x3 (15 tiles)"
  2. ✅ Floating dimension label appears outside selection border (top-left corner)
  3. ✅ Label repositions intelligently when selection is near viewport edge (fallback positions)
  4. ✅ Label text is readable at all zoom levels (0.25x-4x)
**Plans:** 1 plan

Plans:
- [x] 57-01-PLAN.md — Status bar tile count + floating canvas dimension label

**Status:** ✅ Complete (2026-02-13)

#### Phase 58: Ruler Tool — Line Mode
**Goal:** User can measure straight-line distance between two points in tiles
**Depends on:** Phase 57
**Requirements:** RULER-01
**Success Criteria** (what must be TRUE):
  1. User can activate Ruler tool from toolbar
  2. User can click-drag to measure distance between two points
  3. Status bar displays Manhattan distance and Euclidean distance in tiles
  4. Ruler line overlay renders on UI layer at all zoom levels
  5. Escape key cancels active ruler measurement
**Plans:** TBD

Plans:
- [ ] 58-01: TBD during planning

#### Phase 59: Ruler Tool — Advanced Modes
**Goal:** User can measure rectangular areas, multi-point paths, and radii
**Depends on:** Phase 58
**Requirements:** RULER-02, RULER-03, RULER-04, RULER-05
**Success Criteria** (what must be TRUE):
  1. User can switch ruler to rectangle mode and drag to measure area (WxH + tile count)
  2. User can switch ruler to path mode and click waypoints to measure cumulative path length
  3. User can switch ruler to radius mode and drag from center point to measure radius
  4. User can pin/lock any measurement so it persists on canvas until manually cleared
  5. Status bar indicates current ruler mode and measurement values
**Plans:** TBD

Plans:
- [ ] 59-01: TBD during planning

#### Phase 60: Center on Selection
**Goal:** User can center viewport on current selection with single command
**Depends on:** Phase 59
**Requirements:** GRID-04
**Success Criteria** (what must be TRUE):
  1. User can trigger "Center on Selection" command from View menu or keyboard shortcut
  2. Viewport smoothly pans to center selection on screen (no zoom change)
  3. Command is disabled when no selection exists
  4. Viewport clamping prevents map from scrolling out of bounds
**Plans:** TBD

Plans:
- [ ] 60-01: TBD during planning

## Progress

**Execution Order:**
Phases execute in numeric order: 56 → 57 → 58 → 59 → 60

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 56. Grid Customization | v2.9 | 2/2 | ✓ Complete | 2026-02-13 |
| 57. Selection Info Enhancement | v2.9 | 1/1 | ✓ Complete | 2026-02-13 |
| 58. Ruler Tool — Line Mode | v2.9 | 0/TBD | Not started | - |
| 59. Ruler Tool — Advanced Modes | v2.9 | 0/TBD | Not started | - |
| 60. Center on Selection | v2.9 | 0/TBD | Not started | - |

---
*Last updated: 2026-02-13 after Phase 57 complete*
