# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-02-04)

**Core value:** The map editing experience should feel intuitive and professional
**Current focus:** v1.6 Phase 18+ remaining, v1.7 planned

## Current Position

Phase: 21 of 26 (Zustand Store Optimization)
Plan: 1 of 1 in current phase
Status: Plan complete — Phase 21 in progress
Last activity: 2026-02-05 — Completed plan 21-01 (granular selector migration)

Progress: [█████████████████░░░░░░░░░] 65% (17 of 26 phases complete, 21-01 done)

## Progress

| Phase | Name | Milestone | Status | Completed |
|-------|------|-----------|--------|-----------|
| 1 | Bug Fixes | v1.0 | Complete | 2026-02-01 |
| 2 | Layout and Toolbar | v1.0 | Complete | 2026-02-01 |
| 3 | Tabbed Bottom Panel | v1.0 | Complete | 2026-02-01 |
| 4 | CSS Variable Consolidation | v1.1 | Complete | 2026-02-02 |
| 5 | Classic Scrollbars | v1.1 | Complete | 2026-02-02 |
| 6 | Collapsible Panels | v1.1 | Complete | 2026-02-02 |
| 7 | SEdit Layout Foundation | v1.2 | Complete | 2026-02-02 |
| 8 | Minimap | v1.2 | Complete | 2026-02-02 |
| 9 | Panel Redesign | v1.2 | Complete | 2026-02-02 |
| 10 | Map Settings Dialog | v1.2 | Complete | 2026-02-02 |
| 11 | Panel Layout Fix | v1.3 | Complete | 2026-02-03 |
| 12 | Theme Foundation | v1.4 | Complete | 2026-02-04 |
| 13 | Application Chrome | v1.4 | Complete | 2026-02-04 |
| 14 | Toolbar Activation | v1.5 | Complete | 2026-02-04 |
| 15 | Conveyor Tool | v1.5 | Complete | 2026-02-04 |
| 16 | Marquee Selection Foundation | v1.6 | Complete | 2026-02-05 |
| 17 | Clipboard Operations | v1.6 | Complete | 2026-02-05 |
| 18 | Floating Paste Preview | v1.6 | Not started | — |
| 19 | Mirror/Rotate Transforms | v1.6 | Not started | — |
| 20 | Animation Panel Redesign | v1.6 | Not started | — |
| 21 | Zustand Store Optimization | v1.7 | In progress | 2026-02-05 |
| 22 | Canvas Rendering Optimization | v1.7 | Not started | — |
| 23 | Minimap Performance | v1.7 | Not started | — |
| 24 | Batch State Operations | v1.7 | Not started | — |
| 25 | Undo System Optimization | v1.7 | Not started | — |
| 26 | Portability Layer | v1.7 | Not started | — |

v1.0-v1.5: SHIPPED
v1.6: IN PROGRESS
v1.7: PLANNED

## Milestones

| Version | Name | Status | Shipped |
|---------|------|--------|---------|
| v1.0 | UI Overhaul | ARCHIVED | 2026-02-01 |
| v1.1 | Canvas & Polish | ARCHIVED | 2026-02-02 |
| v1.2 | SEdit-Style Layout | ARCHIVED | 2026-02-02 |
| v1.3 | Layout Fix | ARCHIVED | 2026-02-04 |
| v1.4 | Win98 Theme Overhaul | ARCHIVED | 2026-02-04 |
| v1.5 | Functional Tools | ARCHIVED | 2026-02-04 |
| v1.6 | SELECT & Animation Panel | ACTIVE | — |
| v1.7 | Performance & Portability | PLANNED | — |

## Performance Metrics

**Velocity:**
- Total plans completed: 42 (across v1.0-v1.6 in-progress)
- Total phases: 17 complete, 9 pending
- Average: 8.4 plans per day (42 plans over 5 days)

**Recent Trend:**
- v1.5 (2026-02-04): 3 plans (same-day ship with v1.4)
- v1.4 (2026-02-04): 10 plans
- v1.3 (2026-02-04): 1 plan
- Trend: Accelerating (shipped 3 milestones in 1 day)

## Accumulated Context

### Decisions

See PROJECT.md Key Decisions table for full list.

Recent decisions:

**Phase 21 (Zustand Optimization):**
- Plan 01: Use useShallow for 4+ fields, individual selectors for 1-3 fields
- Plan 01: Isolate animationFrame subscriptions to animation components only
- Plan 01: Removed canUndo/canRedo methods (inline selectors more explicit)

**v1.6 decisions:**
- Phase 17: Copy preserves full 16-bit tile values (animation flags, game objects)
- Phase 17: Selection persists after cut and delete (immediate re-copy/paste workflow)
- Phase 17: Pasted region becomes active selection (enables paste-transform workflow)
- Phase 17: Clipboard persists across tool switches (not reset on setMap/newMap)
- Phase 16: Selection stored as tile coordinates (not pixels) for zoom accuracy
- Phase 16: Marching ants use existing animationFrame counter (zero overhead)
- Phase 16: Only create committed selection if user drags (not single click)
- Phase 15: Escape cancels all drag/line operations (applies to SELECT tool)
- Phase 15: 70% opacity live preview (pattern for floating paste preview)
- Phase 14: S/H/J shortcuts for SPAWN/SWITCH/BRIDGE (W/B taken by WALL/PENCIL)

### Pending Todos

From .planning/todos/pending/:

1. Win98 panel interiors, scrollbars, dialog controls (deferred from v1.4)
2. Tool behavior verification at all zoom levels

### Blockers/Concerns

**Phase 16 (Marquee Selection):**
- RESOLVED: Coordinate accuracy achieved by storing tile coordinates (integers) not pixels
- RESOLVED: Marching ants performance excellent - uses existing animationFrame counter, no additional RAF loop

**Phase 19 (Transforms):**
- Rotation/mirror lookup tables not extracted from SEdit - rotTbl[512] and mirTbl[512] for content-aware transforms
- Rotation feature decision pending - tile corruption risk with directional tiles (conveyors, bridges)

## Session Continuity

Last session: 2026-02-05
Stopped at: Completed plan 21-01 (granular selector migration)
Resume file: None
Next: Plan 21-02 (ToolBar and MapCanvas migration)

---
*State initialized: 2026-02-01*
*Last updated: 2026-02-05 -- Completed phase 21 plan 01: Migrated 8 components to granular Zustand selectors, eliminated ~33 re-renders/sec from non-animation components*
