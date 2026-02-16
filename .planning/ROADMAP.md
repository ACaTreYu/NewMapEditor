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
- ✅ **v3.4 Tool Polish & Warm UI** - Phases 71-76 (shipped 2026-02-16)
- ✅ **v3.5 Warp Expansion & Cleanup** - Phases 77-78 (shipped 2026-02-16)
- ✅ **v3.6 Toolbar Icons & Panel Polish** - Phase 79 (shipped 2026-02-16)
- 📋 **v3.7 Sidebar Independence** - Phase 80 (planned)

## Phases

<details>
<summary>✅ v1.0-v3.6 (Phases 1-79) - SHIPPED</summary>

See MILESTONES.md for full details of completed milestones.

</details>

### 📋 v3.7 Sidebar Independence (Planned)

**Milestone Goal:** Decouple minimap from animations panel — minimap stays fixed in corner, animations panel collapses independently via toolbar toggle, canvas expands to fill freed space.

#### Phase 80: Sidebar Independence

**Goal**: User can collapse animations panel to maximize canvas while minimap stays visible in fixed corner

**Depends on**: Phase 79

**Requirements**: SIDE-01, SIDE-02, SIDE-03, SIDE-04, SIDE-05

**Success Criteria** (what must be TRUE):
  1. User can click toolbar button to collapse animations panel to right edge
  2. When animations panel is collapsed, minimap remains visible in top-right corner
  3. When animations panel is collapsed, editing canvas expands horizontally to fill freed space
  4. When animations panel is expanded, current stacked layout preserved with minimap on top
  5. Game object tool panel collapses/expands with animations panel

**Plans:** 1 plan

Plans:
- [ ] 80-01-PLAN.md — Minimap overlay + collapsible sidebar + toolbar toggle

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-79 | v1.0-v3.6 | All | ✅ Complete | See MILESTONES.md |
| 80 | v3.7 | 0/1 | Not started | - |

---
*Last updated: 2026-02-16 after v3.7 roadmap creation*
