# Roadmap: AC Map Editor

## Milestones

- ✅ **v1.0 MVP** - Phases 1-3 (shipped 2026-02-01)
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
- ✅ **v2.9 Measurement & Grid** - Phases 56-60 (shipped 2026-02-13)
- ✅ **v3.0 Panel Layout & Ruler Notes** - Phases 61-63 (shipped 2026-02-14)
- ✅ **v3.1 Rendering Fixes & UX Polish** - Phases 64-67 (shipped 2026-02-14)
- 🚧 **v3.2 Animated Game Objects & Farplane Toggle** - Phases 68-69 (in progress)

## Phases

<details>
<summary>✅ v1.0-v3.1 Phases 1-67 — SHIPPED 2026-02-14</summary>

Collapsed for brevity. See MILESTONES.md for full milestone history.

</details>

### 🚧 v3.2 Animated Game Objects & Farplane Toggle (In Progress)

**Milestone Goal:** Add animated spawn and warp variants to game object tools, fix downward conveyor animation bug, and add farplane color toggle for editing canvas

#### Phase 68: Animated Game Objects

**Goal**: Game object tools support animated spawn and animated warp variants with correct tile placement and animation rendering

**Depends on**: Phase 67 (v3.1 complete)

**Requirements**: ASPAWN-01, ASPAWN-02, ASPAWN-03, AWARP-01, AWARP-02, AWARP-03, AWARP-04

**Success Criteria** (what must be TRUE):
  1. User can select "Animated Spawn" variant from spawn tool dropdown
  2. User can place animated spawn tile that cycles through 6 frames for selected team color (green: 870-875, red: 976-979/1016-1017, blue: 1099-1102/1139-1140, yellow: 1222-1225/1262-1263)
  3. User can select "Animated Warp" variant from warp tool dropdown
  4. User can place animated warp as 3x3 block centered on click position that cycles through 4 frames (top row: 1347-1358, middle row: 1387-1398, bottom row: 1427-1438)

**Plans:** 1 plan

Plans:
- [x] 68-01-PLAN.md — Animated spawn/warp variants: state, placement, toolbar dropdowns, click offsets ✓

#### Phase 69: Conveyor Fix & Farplane Toggle

**Goal**: Downward conveyor animations work correctly and user can toggle farplane color rendering on/off

**Depends on**: Phase 68

**Requirements**: CFIX-01, FARP-01, FARP-02

**Success Criteria** (what must be TRUE):
  1. Downward conveyor tiles animate at the same speed and pattern as other conveyor directions
  2. User can toggle farplane color rendering on/off via UI control (checkbox or toggle button)
  3. Farplane toggle state persists during the editing session across tool switches and viewport changes

**Plans:** 1 plan

Plans:
- [x] 69-01-PLAN.md — Fix downward conveyor animation + farplane toggle with toolbar button ✓

## Progress

**Execution Order:**
Phases execute in numeric order: 68 → 69

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 68. Animated Game Objects | v3.2 | 1/1 | ✓ Complete | 2026-02-15 |
| 69. Conveyor Fix & Farplane Toggle | v3.2 | 1/1 | ✓ Complete | 2026-02-15 |

---
*Last updated: 2026-02-15 — Phase 69 complete*
