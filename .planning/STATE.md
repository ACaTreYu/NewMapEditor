# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-12)

**Core value:** The map editing experience should feel intuitive and professional — tools work correctly, the layout maximizes the editing canvas, and workflows match what users expect from image editors.

**Current focus:** v2.8 Canvas Engine — Defining requirements

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-02-12 — Milestone v2.8 started

## Performance Metrics

**Velocity:**
- Total plans completed: 81
- Average duration: ~41 min per plan
- Total execution time: ~57 hours across 16 milestones

**By Milestone:**

| Milestone | Phases | Plans | Duration |
|-----------|--------|-------|----------|
| v1.0 MVP | 1-3 | 5 | 2 days |
| v1.1 Canvas & Polish | 4-6 | 3 | 1 day |
| v1.2 SEdit-Style Layout | 7-10 | 9 | 1 day |
| v1.3 Layout Fix | 11 | 1 | 3 days |
| v1.4 Win98 Theme | 12-13 | 10 | 2 days |
| v1.5 Functional Tools | 14-15 | 3 | 1 day |
| v1.6 SELECT & Animation | 16-20 | 5 | 4 days |
| v1.7 Performance | 21-26 | 9 | 4 days |
| v2.0 Modern Minimalist | 27-32 | 9 | 2 days |
| v2.1 MDI Editor | 33-36 | 6 | 1 day |
| v2.2 Transparency | 37 | 3 | 1 day |
| v2.3 Minimap | 38 | 1 | 1 day |
| v2.4 Window Controls | 39-40 | 2 | 1 day |
| v2.5 Transform Tools | 41-43 | 4 | 2 days |
| v2.6 Viewport Fixes | 44-46 | 3 | 1 day |
| v2.7 Rendering & Nav | 47-49 | 4 | 1 day |

**Recent Trend:**
- Last 5 milestones: 1-2 days each (quick mode optimized)
- Stable velocity with targeted milestones

## Accumulated Context

### Decisions

Recent decisions affecting current work (full log in PROJECT.md Key Decisions table):

- **v2.7 lesson**: ImageBitmap atlas approach FAILED — 4000 createImageBitmap calls froze the app for minutes
- **v2.7 lesson**: alpha:false FAILED — broke tile transparency for marginal compositor benefit
- **v2.7 success**: Off-screen 4096x4096 buffer with incremental tile patching — viewport ops are fast
- **v2.7 bottleneck**: Pencil drawing still choppy because every setTile() triggers Zustand → React re-render → useCallback recreation → useEffect → 65K tile diff → buffer blit
- **v2.7 insight**: React's render cycle (5-15ms overhead) is the primary bottleneck for 60fps interactive editing
- **v2.7 insight**: Real image editors decouple canvas rendering from the UI framework entirely

### Pending Todos

None.

### Blockers/Concerns

**Key technical challenge:**
- MapCanvas.tsx has all tool behavior in React mouse handlers that go through Zustand state
- Decoupling canvas rendering from React requires rethinking how tools interact with the canvas
- Must preserve existing tool behavior (pencil, wall, line, fill, select, paste, game objects)
- Must preserve undo/redo (delta-based, snapshot-commit pattern)

## Session Continuity

Last session: 2026-02-12
Stopped at: Starting v2.8 milestone — defining requirements
Resume file: —

---
*Last updated: 2026-02-12 after starting v2.8 milestone*
