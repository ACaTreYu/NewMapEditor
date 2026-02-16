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
- ✅ **v2.9 Measurement & Grid** - Phases 56-60 (shipped 2026-02-13)
- ✅ **v3.0 Panel Layout & Ruler Notes** - Phases 61-63 (shipped 2026-02-14)
- ✅ **v3.1 Rendering Fixes & UX Polish** - Phases 64-67 (shipped 2026-02-14)
- ✅ **v3.2 Animated Game Objects & Farplane Toggle** - Phases 68-69 (shipped 2026-02-15)
- ✅ **v3.3 Animation Offset Control** - Phase 70 (shipped 2026-02-16)
- 🚧 **v3.4 Tool Polish & Warm UI** - Phases 71-76 (in progress)

## Phases

<details>
<summary>✅ v1.0-v3.3 (Phases 1-70) - SHIPPED</summary>

See MILESTONES.md for full shipped milestone history.

</details>

### 🚧 v3.4 Tool Polish & Warm UI (In Progress)

**Milestone Goal:** Expand wall tool to support all 15 wall types, add 9E warp routing, extend animation offset to all tiles, add multi-tile tool previews, improve tool icons, and warm up the UI color palette.

#### ✅ Phase 71: Wall Type Selection (completed 2026-02-16)
**Goal**: User can select and use all 15 wall types with visual previews in dropdown
**Depends on**: Phase 70
**Requirements**: WALL-01, WALL-02, WALL-03, WALL-04
**Plans**: 1 plan

Plans:
- [x] 71-01-PLAN.md — Wall type variant dropdown with visual tile previews and distinct icons

#### ✅ Phase 72: 9E Warp Routing (completed 2026-02-16)
**Goal**: 9E warp tile encodes src/dest routing identical to FA warp encoding
**Depends on**: Phase 71
**Requirements**: WARP-01, WARP-02
**Success Criteria** (what must be TRUE):
  1. User can place 9E warp tile with routing data (src/dest) encoded in offset
  2. Picker tool extracts routing from 9E tiles and syncs to warp dropdown controls
  3. 3x3 animated warp block center tile (9E) carries routing data when placed
**Plans**: 1 plan

Plans:
- [x] 72-01-PLAN.md — Route warp src/dest to animated warp center tile and extend picker decoding

#### ✅ Phase 73: Animation Offset Extension (completed 2026-02-16)
**Goal**: Animation offset control applies to all animated tile types, not just spawn/warp
**Depends on**: Phase 72
**Requirements**: ANIM-01
**Success Criteria** (what must be TRUE):
  1. User can set animation offset for any animated tile placement (not just spawn/warp)
  2. Placed animated tiles (all types) encode the current offset value
  3. Picker tool extracts offset from any animated tile and syncs to animation panel
**Plans**: 1 plan

Plans:
- [ ] 73-01-PLAN.md — Verify offset encoding works for all animated tile types and mark ANIM-01 complete

#### ✅ Phase 74: Multi-Tile Previews (completed 2026-02-16)
**Goal**: Multi-tile game object tools show semi-transparent preview before placement
**Depends on**: Phase 73
**Requirements**: PREV-01, PREV-02, PREV-03, PREV-04
**Success Criteria** (what must be TRUE):
  1. Warp tool shows all 9 border tiles in semi-transparent preview on hover
  2. Bunker tool shows full 4x4 pattern in preview on hover
  3. Bridge tool shows full strip pattern in preview on hover
  4. Conveyor tool shows full strip pattern in preview on hover (if not already)
**Plans**: 1 plan

Plans:
- [x] 74-01-PLAN.md — Warp 3x3 hover preview + bunker/bridge rect drag tile previews

#### ✅ Phase 75: Tool Icon Polish (completed 2026-02-16)
**Goal**: Game object tools have visually distinct, professional icons
**Depends on**: Phase 74
**Requirements**: ICON-01, ICON-02 (ICON-03 covered in Phase 71)
**Success Criteria** (what must be TRUE):
  1. Bunker tool has a distinct visual icon (not generic shield)
  2. Conveyor tool has a distinct visual icon (not generic arrow)
  3. All tool icons are visually distinct and recognizable
**Plans**: 1 plan

Plans:
- [x] 75-01-PLAN.md — Replace bunker and conveyor icons with LuCastle and LuBriefcaseConveyorBelt

#### ✅ Phase 76: Warm UI Palette (completed 2026-02-16)
**Goal**: UI color palette shifted from cool blue-grey to warm cream tones
**Depends on**: Phase 75
**Requirements**: UI-01, UI-02
**Success Criteria** (what must be TRUE):
  1. OKLCH neutral palette uses warm hue (cream/beige direction) instead of cool blue-grey
  2. All surfaces, backgrounds, text, borders, and hover states reflect the warmer palette
  3. UI feels warmer and more inviting while maintaining contrast and readability
**Plans**: 1 plan

Plans:
- [x] 76-01-PLAN.md — Update neutral OKLCH hue from 280 to 50 for warm cream palette

## Progress

**Execution Order:**
Phases execute in numeric order: 71 → 72 → 73 → 74 → 75 → 76

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 71. Wall Type Selection | 1/1 | ✅ Complete | 2026-02-16 |
| 72. 9E Warp Routing | 1/1 | ✅ Complete | 2026-02-16 |
| 73. Animation Offset Extension | 1/1 | ✅ Complete | 2026-02-16 |
| 74. Multi-Tile Previews | 1/1 | ✅ Complete | 2026-02-16 |
| 75. Tool Icon Polish | 1/1 | ✅ Complete | 2026-02-16 |
| 76. Warm UI Palette | 1/1 | ✅ Complete | 2026-02-16 |

---
*Last updated: 2026-02-16 after Phase 76 completion*
