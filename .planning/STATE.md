# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-12)

**Core value:** The map editing experience should feel intuitive and professional — tools work correctly, the layout maximizes the editing canvas, and workflows match what users expect from image editors.

**Current focus:** v2.8 Canvas Engine — Planning

## Current Position

Milestone: v2.7 complete, v2.8 next
Status: Ready to plan v2.8
Last activity: 2026-02-12 — Closed v2.7, profiled rendering bottleneck
Progress: Ready for new milestone

## Performance Metrics

**Velocity:**
- Total plans completed: 82
- Average duration: ~40 min per plan
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
| v2.7 Rendering & Nav | 47-50 | 4 | 2 days |

**Recent Trend:**
- Last 5 milestones: 1-2 days each (quick mode optimized)
- Stable velocity with targeted milestones

## Accumulated Context

### Decisions

Recent decisions affecting current work (full log in PROJECT.md Key Decisions table):

- **Phase 50 reverted**: Dynamic buffer zone introduced regression, reverted to fixed 4096x4096 buffer
- **v2.7 success**: 2-layer canvas, off-screen buffer with incremental tile patching, pattern grid, scrollbar math
- **v2.7 bottleneck confirmed via profiling**: Canvas drawing is <1ms, but React re-renders 5-10x per mouse move at ~5-10ms each. The main thread is blocked by React overhead, not canvas operations.
- **Partial fixes shipped**: ResizeObserver stable refs, cursor dedup, drawMapLayer early exit, immediate pencil buffer patch, direct viewport subscription. Helped but insufficient — React is still in the hot path.
- **Root cause**: setTile() → Zustand update → React re-render → useCallback recreation → useEffect → drawMapLayer. Even with early exits, the React re-render itself costs 5-10ms and blocks the browser from painting.

### Pending Todos

None.

### Blockers/Concerns

**Key technical challenge for v2.8:**
- Must decouple canvas rendering from React's render cycle entirely
- During drag operations (pencil, pan, selection), accumulate changes locally and render directly to canvas — no Zustand/React in the loop
- Commit to Zustand only on mouseup (one re-render per drag, not one per mouse move)
- Must preserve undo/redo (pushUndo on mousedown, batch commit on mouseup)
- Must preserve all tool behaviors (pencil, wall, line, fill, select, paste, game objects, conveyor)

## Session Continuity

Last session: 2026-02-12
Stopped at: v2.7 closed, ready to plan v2.8 Canvas Engine
Resume file: None

---
*Last updated: 2026-02-12 after closing v2.7*
