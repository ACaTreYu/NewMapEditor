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
- 🚧 **v3.5 Warp Expansion & Cleanup** - Phases 77-78 (in progress)

## Phases

<details>
<summary>✅ v1.0-v3.4 (Phases 1-76) - SHIPPED</summary>

See MILESTONES.md for full details of completed milestones.

</details>

### 🚧 v3.5 Warp Expansion & Cleanup (In Progress)

**Milestone Goal:** Make all 6 warp types fully functional with routing, add visual warp type previews to dropdown, and clean up dead code, hardcoded CSS values, and code duplication.

#### Phase 77: Warp Tool Expansion
**Goal**: All 6 warp types (F6-FA, 9E) encode routing and appear in dropdown with tile previews
**Depends on**: Phase 76
**Requirements**: WARP-03, WARP-04, WARP-05, WARP-06
**Success Criteria** (what must be TRUE):
  1. User can select any of 6 warp types (F6, F7, F8, F9, FA, 9E) from warp tool dropdown
  2. Each warp type shows tile image preview in dropdown list
  3. Placed warps of all 6 types encode src/dest routing in offset byte
  4. Picker tool extracts routing from all 6 warp types and syncs to Source/Dest dropdowns
**Plans**: 2 plans

Plans:
- [ ] 77-01-PLAN.md -- Core logic: parameterize encodeWarpTile, replace warpVariant with warpType, extend picker to all 6 types
- [ ] 77-02-PLAN.md -- UI: warp tile preview generation, 6-type dropdown, CSS styling

#### Phase 78: Cleanup & Code Quality
**Goal**: Codebase cleaned of dead code, hardcoded values replaced with design tokens, duplicate utilities extracted
**Depends on**: Phase 77
**Requirements**: CLEAN-01, CLEAN-02, CLEAN-03, CSS-01, CSS-02, CSS-03, CODE-01
**Success Criteria** (what must be TRUE):
  1. No dead code files remain (AnimationDefinitions.old.ts deleted, stale phase directories removed)
  2. TypeScript compiler shows zero unused variable warnings
  3. Title bar gradient and all hardcoded hex/rgba values use CSS design tokens
  4. Red error text uses --color-error token consistently
  5. Duplicate centering math uses shared utility function
**Plans**: TBD

Plans:
- [ ] 78-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 77 → 78

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 77. Warp Tool Expansion | v3.5 | 0/2 | Not started | - |
| 78. Cleanup & Code Quality | v3.5 | 0/? | Not started | - |

---
*Last updated: 2026-02-16 after v3.5 roadmap creation*
