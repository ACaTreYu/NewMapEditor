# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-02-04)

**Core value:** The map editing experience should feel intuitive and professional
**Current focus:** v1.6 Phase 18+ remaining, v1.7 Phase 22 complete (with known issues)

## Current Position

Phase: 18 of 26 (Tool Investigation & Fixes)
Plan: 1 of 1
Status: Phase complete
Last activity: 2026-02-06 — Completed 18-01-PLAN.md (Floating Paste Preview)

Progress: [████████████████████░░░░░░] 81% (21 of 26 phases complete)

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
| 18 | Tool Investigation & Fixes | v1.6 | Complete | 2026-02-06 |
| 19 | Mirror/Rotate Transforms | v1.6 | Not started | — |
| 20 | Animation Panel Redesign | v1.6 | Complete | 2026-02-06 |
| 21 | Zustand Store Optimization | v1.7 | Complete | 2026-02-05 |
| 22 | Canvas Rendering Optimization | v1.7 | Complete | 2026-02-05 |
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
- Total plans completed: 45 (across v1.0-v1.7 in-progress)
- Total phases: 21 complete, 5 pending
- Average: 9.0 plans per day (45 plans over 5 days)

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
- Plan 02: canUndo/canRedo implemented as reactive selectors (state.undoStack.length > 0) not methods
- Plan 02: ToolBar does NOT subscribe to animationFrame (eliminated ~33 re-renders/sec)
- Plan 02: MapCanvas state/actions split into separate useShallow calls for clarity

**Phase 22 (Canvas Rendering Optimization):**
- 4 stacked canvases: static tiles, animated tiles, overlays, grid
- Static layer draws frame 0 of animated tiles as background
- Grid layer topmost, receives mouse events; other layers pointer-events:none
- Batched grid drawing (1 beginPath + all lines + 1 stroke)
- RAF-debounced resize, showGrid defaults to false
- KNOWN ISSUES: Minimap crash on drag-navigate, animations possibly too fast

**v1.6 decisions:**
- Phase 18: pasteClipboard delegates to startPasting (changed behavior to preview mode)
- Phase 18: Paste preview stored as tile coordinates for zoom accuracy
- Phase 18: 70% opacity paste preview in overlay layer
- Phase 18: Escape and mouse leave cancel paste preview
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

Last session: 2026-02-06
Stopped at: Completed Phase 18 Plan 01 (Floating Paste Preview)
Resume file: None
Next: Phase 19 (Mirror/Rotate Transforms)

## SEdit Visual Parity (2026-02-06, outside GSD phases)
- Animation Panel: Narrow 70px SEdit-style with hex labels, team selector, auto-select on click
- Toolbar: 27 custom SVG icons replacing emoji
- Layout: Minimap moved to right sidebar above Animations
- Fixes: Holding pen walls, gray backgrounds
- Deferred: Minimap visible before map loaded (see todos/pending/minimap-visible-no-map.md)

---
*State initialized: 2026-02-01*
*Last updated: 2026-02-06 -- Completed Phase 18 Plan 01: Floating Paste Preview*
