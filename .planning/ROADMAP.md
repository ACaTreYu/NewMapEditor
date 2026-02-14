# Roadmap: AC Map Editor

## Milestones

- v1.0 UI Overhaul - Phases 1-3 (shipped 2026-02-01)
- v1.1 Canvas & Polish - Phases 4-6 (shipped 2026-02-02)
- v1.2 SEdit-Style Layout - Phases 7-10 (shipped 2026-02-02)
- v1.3 Layout Fix - Phase 11 (shipped 2026-02-04)
- v1.4 Win98 Theme Overhaul - Phases 12-13 (shipped 2026-02-04)
- v1.5 Functional Tools - Phases 14-15 (shipped 2026-02-04)
- v1.6 SELECT & Animation Panel - Phases 16-20 (shipped 2026-02-08)
- v1.7 Performance & Portability - Phases 21-26 (shipped 2026-02-08)
- v2.0 Modern Minimalist UI - Phases 27-32 (shipped 2026-02-09)
- v2.1 MDI Editor & Polish - Phases 33-36 (shipped 2026-02-09)
- v2.2 Transparency & Performance - Phase 37 (shipped 2026-02-09)
- v2.3 Minimap Independence - Phase 38 (shipped 2026-02-10)
- v2.4 MDI Window Controls - Phases 39-40 (shipped 2026-02-10)
- v2.5 Selection Transform Tools - Phases 41-43 (shipped 2026-02-11)
- v2.6 Viewport & Animation Fixes - Phases 44-46 (shipped 2026-02-11)
- v2.7 Rendering & Navigation - Phases 47-50 (shipped 2026-02-12)
- v2.8 Canvas Engine - Phases 51-55 (shipped 2026-02-13)
- v2.9 Measurement & Grid - Phases 56-60 (shipped 2026-02-13)
- v3.0 Panel Layout & Ruler Notes - Phases 61-63 (shipped 2026-02-14)

## Phases

<details>
<summary>v1.0-v2.9 (Phases 1-60) - SHIPPED 2026-02-01 to 2026-02-13</summary>

See MILESTONES.md for complete history.

</details>

### ✓ v3.0 Panel Layout & Ruler Notes (Shipped 2026-02-14)

**Milestone Goal:** Restructure bottom panel layout to fit tile palette to tileset width, add ruler notepad panel in freed space, and enhance ruler with angle display.

#### Phase 61: Layout Restructure

**Goal**: Tile palette constrained to tileset width (~640px)
**Depends on**: Phase 60
**Requirements**: LAYOUT-01
**Success Criteria** (what must be TRUE):
  1. Tile palette panel (imgTiles) is constrained to tileset image width (~640px)
  2. Tile palette no longer stretches to full app width
  3. Bottom panel layout has freed horizontal space to the right of tile palette
  4. Layout change does not break existing tile selection or panel resize behavior
**Plans**: 1 plan

Plans:
- [x] 61-01-PLAN.md — Constrain tile palette to 640px with flexbox layout and add freed space section

#### Phase 62: Ruler Notepad Panel

**Goal**: Editable measurement log with annotations in freed horizontal space
**Depends on**: Phase 61
**Requirements**: LAYOUT-02, NOTE-01, NOTE-02, NOTE-03, NOTE-04, NOTE-05
**Success Criteria** (what must be TRUE):
  1. Ruler notepad panel appears in freed horizontal space beside tile palette
  2. Measurement entries auto-log to notepad when user pins them (P key)
  3. Each entry displays measurement type (line/rectangle/path/radius), value, and timestamp
  4. User can add or edit text labels on any measurement entry
  5. User can delete individual entries from the log via click action
  6. User can copy entire measurement list to clipboard as formatted text
**Plans**: 1 plan

Plans:
- [x] 62-01-PLAN.md — Ruler notepad panel with measurement log, inline editing, deletion, and clipboard export

#### Phase 63: Ruler Angle Display & Measurement Visibility

**Goal**: Show angle measurements for line and path modes; decouple measurement visibility from notepad
**Depends on**: Phase 60 (independent of Phase 61-62)
**Requirements**: ANGLE-01, ANGLE-02, VIS-01
**Success Criteria** (what must be TRUE):
  1. Line mode displays angle from horizontal (0° = right, 90° = up, standard math convention)
  2. Path mode displays angle of each segment alongside segment length
  3. Angle values update in real-time during ruler drag
  4. Angles persist correctly when measurements are pinned
  5. Pinned measurements can be hidden from canvas overlay independently of notepad
  6. Hidden measurements remain in notepad with full edit/delete/copy functionality
**Plans**: 1 plan

Plans:
- [x] 63-01-PLAN.md — Add angle calculation/display to LINE and PATH ruler modes + measurement visibility toggle

## Progress

**Execution Order:**
Phases execute in numeric order. Decimal phases (e.g., 2.1, 2.2) are insertions between integers.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-60 | v1.0-v2.9 | All complete | Complete | See MILESTONES.md |
| 61. Layout Restructure | v3.0 | 1/1 | Complete | 2026-02-13 |
| 62. Ruler Notepad Panel | v3.0 | 1/1 | Complete | 2026-02-14 |
| 63. Ruler Angle Display | v3.0 | 1/1 | Complete | 2026-02-14 |

---
*Last updated: 2026-02-14 after Phase 63 complete*
