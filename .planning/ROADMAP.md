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
- 🚧 **v3.1 Rendering Fixes & UX Polish** - Phases 64-67 (in progress)

## Phases

<details>
<summary>✅ v1.0-v3.0 Phases 1-63 — SHIPPED 2026-02-14</summary>

Collapsed for brevity. See MILESTONES.md for full milestone history.

</details>

### 🚧 v3.1 Rendering Fixes & UX Polish (In Progress)

**Milestone Goal:** Fix rendering issues (pan lag, grid alignment, layer desync) and improve UX (animation scrollbar, farplane toggle, path pinning, panel sizing, minimap viewport)

#### Phase 64: Viewport Rendering Sync
**Goal**: Viewport panning and ruler overlay rendering stay perfectly synchronized during all drag operations
**Depends on**: Phase 63 (v3.0 complete)
**Requirements**: REND-01, REND-02
**Success Criteria** (what must be TRUE):
  1. Tiles render smoothly during viewport pan drag (no blank regions, no lag-then-snap)
  2. Ruler measurements and map layer move together during pan (no drift between UI overlay and map)
  3. Tool drags (pencil, rect, line, selection) render tiles progressively during drag operation
**Plans**: 1 plan

Plans:
- [x] 64-01-PLAN.md — Eliminate CSS transform pan, switch to immediate viewport updates

#### Phase 65: Grid Pixel Alignment
**Goal**: Grid lines always align perfectly to tile borders at all zoom levels
**Depends on**: Phase 64
**Requirements**: REND-03
**Success Criteria** (what must be TRUE):
  1. Grid lines snap to exact tile borders at all zoom levels (0.25x to 4x)
  2. No pixel drift or sub-pixel gaps between grid and tile edges
  3. Grid remains stable during pan/zoom operations
**Plans**: TBD

Plans:
- [ ] 65-01-PLAN.md: TBD

#### Phase 66: UI Component Polish
**Goal**: UI components (animation panel, notepad/tile sizing, minimap) behave correctly and intuitively
**Depends on**: Phase 65
**Requirements**: UI-01, UI-02, UI-03
**Success Criteria** (what must be TRUE):
  1. Animation panel has visible scrollbar for navigating animation list (not wheel-only)
  2. Notepad panel and tile palette panel can be independently resized
  3. Minimap shows viewport indicator rectangle when running in dev app
**Plans**: TBD

Plans:
- [ ] 66-01-PLAN.md: TBD

#### Phase 67: Tool Enhancements
**Goal**: Path ruler workflow and farplane toggle complete the tool experience
**Depends on**: Phase 66
**Requirements**: TOOL-01, TOOL-02
**Success Criteria** (what must be TRUE):
  1. Path ruler mode has clear UX to complete and pin multi-waypoint measurements (e.g., Enter key or double-click)
  2. Farplane color rendering can be toggled on/off via button or control
  3. Farplane toggle state is visible to user (button state, menu checkmark, or similar)
**Plans**: TBD

Plans:
- [ ] 67-01-PLAN.md: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 64 → 65 → 66 → 67

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 64. Viewport Rendering Sync | v3.1 | 1/1 | ✓ Complete | 2026-02-14 |
| 65. Grid Pixel Alignment | v3.1 | 0/? | Not started | - |
| 66. UI Component Polish | v3.1 | 0/? | Not started | - |
| 67. Tool Enhancements | v3.1 | 0/? | Not started | - |

---
*Last updated: 2026-02-14 — Phase 64 plan created*
