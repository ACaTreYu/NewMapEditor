---
phase: 55
plan: 01
subsystem: canvas-rendering
tags: [performance, ref-pattern, drag-consistency, edge-cases]
requires:
  - phase-54-decouple-cursor-ui-overlay
provides:
  - ref-based-rect-drag
  - tool-switch-safety
  - unmount-cleanup
affects:
  - MapCanvas.tsx
  - globalSlice.ts
tech-stack:
  added: []
  patterns:
    - "Ref-based rect drag with RAF-debounced redraw"
    - "Tool switch cleanup via currentTool useEffect dependency"
    - "Unmount cleanup for pending drag state and RAF"
key-files:
  created: []
  modified:
    - src/components/MapCanvas/MapCanvas.tsx
    - src/core/editor/slices/globalSlice.ts
key-decisions:
  - decision: "Rect drag converted to ref-based pattern matching selection/line/pencil"
    rationale: "Eliminates last Zustand-based drag causing React re-renders during mousemove"
    impact: "Zero React re-renders during any drag operation in MapCanvas"
  - decision: "Tool switch commits active pencil drag instead of discarding"
    rationale: "Prevents data loss when user switches tools mid-drag"
    impact: "Safer UX, matches save-on-exit patterns"
  - decision: "Wall pencil documented as intentional Zustand exception (TOOL-02)"
    rationale: "Auto-connection requires reading 8 neighbors from map.tiles, can't extract to ref without duplicating entire map"
    impact: "Wall pencil remains on Zustand, but documented as acceptable trade-off"
duration: 28min
completed: 2026-02-13T08:35:45Z
---

# Phase 55 Plan 01: Ref-based rect drag with tool switch/unmount safety

**One-liner:** Ref-based rect drag for bunker/conveyor/wall_rect/bridge/holding_pen with tool switch cleanup and unmount safety

## Performance

**Zero React re-renders during rect drag mousemove:**
- Replaced `setRectDragState()` calls with `rectDragRef.current = {...}` + `requestUiRedraw()`
- Removed rectDragState from Zustand GlobalSlice (interface, state, actions)
- RAF-debounced UI redraw for smooth 60fps cursor updates without React reconciliation

**No Escape listener churn:**
- Removed old rect drag Escape useEffect (listener added/removed on every drag state change)
- Added rect drag cancellation to permanent Escape listener (mounted once for component lifetime)

**Verification:**
- `grep -rn "setRectDragState" src/` returns 0 results
- `grep -rn "rectDragState" src/core/editor/` returns 0 results
- TypeScript compiles with 0 errors (only unused variable warnings)

## Accomplishments

### Task 1: Convert rect drag from Zustand to ref-based pattern
- Added `rectDragRef` declaration (line 57-59)
- Replaced all `rectDragState.active` reads with `rectDragRef.current.active` in:
  - `drawUiLayer` (lines 416, 424-428)
  - `handleMouseDown` (line 891)
  - `handleMouseMove` (lines 961-966)
  - `handleMouseUp` (lines 1039-1045)
  - `handleMouseLeave` (lines 1102-1104)
- Added rect drag to permanent Escape listener (lines 1348-1351)
- Removed old rect drag Escape useEffect (deleted entire block)
- Removed rectDragState from GlobalSlice:
  - Removed from interface (line 27)
  - Removed setRectDragState from actions (line 62)
  - Removed from initial state (line 93)
  - Removed action implementation (lines 185-187)
  - Removed RectDragState import (line 6)
- Removed rectDragState from drawUiLayer deps array (line 562)
- Removed rectDragState from MapCanvas selector (lines 116-124)
- Removed setRectDragState action selector (line 138)

### Task 2: Add edge case safety
- **TOOL-03 (tool switch):** Added useEffect with `[currentTool]` dependency (lines 1292-1311)
  - Cancels rect drag, line preview, selection drag when tool changes
  - Commits active pencil drag (prevents data loss)
- **TOOL-04 (unmount):** Enhanced unmount cleanup effect (lines 1271-1288)
  - Resets all ref-based drag state (rect/line/selection)
  - Cancels pending RAF callbacks
  - Prevents orphaned drags if component unmounts mid-interaction
- **TOOL-02 (wall pencil documentation):** Added inline comments
  - Declaration comment (lines 72-74): explains Zustand exception
  - Mousemove comment (line 977): documents intentional per-move Zustand usage

## Task Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | 885be8c | refactor(55-01): convert rect drag from Zustand to ref-based pattern |
| 2 | 48e1395 | feat(55-01): add edge case safety for ref-based drags |

## Files Created

None.

## Files Modified

**src/components/MapCanvas/MapCanvas.tsx:**
- Added rectDragRef declaration (ref-based state)
- Replaced all rectDragState reads/writes with rectDragRef.current
- Removed rectDragState from Zustand selector
- Removed setRectDragState action usage
- Added rect drag to permanent Escape listener
- Removed old rect drag Escape useEffect
- Added tool switch cleanup effect (TOOL-03)
- Enhanced unmount cleanup effect (TOOL-04)
- Added TOOL-02 inline comments (wall pencil exception)

**src/core/editor/slices/globalSlice.ts:**
- Removed rectDragState from GlobalSlice interface
- Removed setRectDragState from actions interface
- Removed rectDragState from initial state
- Removed setRectDragState action implementation
- Removed RectDragState from imports

## Decisions Made

**1. Rect drag ref pattern matches selection/line/pencil**
- **Context:** Selection and line already use ref-based pattern from Phase 54
- **Decision:** Use identical pattern for rect drag (ref + RAF redraw)
- **Rationale:** Consistency across all drag operations, eliminates last Zustand-based drag
- **Impact:** Zero React re-renders during any drag operation

**2. Tool switch commits pencil drag, cancels others**
- **Context:** User switches tool mid-drag
- **Decision:** Commit pencil tiles to Zustand, discard rect/line/selection previews
- **Rationale:** Pencil tiles are already painted to buffer (user intent clear), previews are transient
- **Impact:** Safer UX, no data loss for pencil drag

**3. Wall pencil documented as intentional exception**
- **Context:** Wall auto-connection requires reading neighbors from map.tiles
- **Decision:** Keep wall pencil on Zustand, add TOOL-02 inline documentation
- **Rationale:** Extracting to ref would require duplicating entire 256x256 tile map
- **Impact:** Wall pencil accepted as trade-off, clearly documented

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. All verifications passed on first attempt.

## Next Phase Readiness

**Phase 55 (all-tool-drag-consistency) COMPLETE:**
- All ref-based drags implemented: pencil (Phase 53), selection/line (Phase 54), rect (Phase 55)
- Tool switch safety implemented (TOOL-03)
- Unmount cleanup implemented (TOOL-04)
- Wall pencil exception documented (TOOL-02)

**v2.8 Canvas Engine milestone COMPLETE:**
- Phase 51: CanvasEngine class extracted
- Phase 52: Engine subscribes to Zustand directly
- Phase 53: Pencil drag decoupled via engine lifecycle
- Phase 54: Cursor/UI overlay decoupled via refs + RAF
- Phase 55: Rect drag consistency + edge case safety

**Ready for next milestone planning.**

## Self-Check: PASSED

**Created files verified:**
- None (expected 0, found 0)

**Modified files verified:**
- ✅ src/components/MapCanvas/MapCanvas.tsx (exists, modified)
- ✅ src/core/editor/slices/globalSlice.ts (exists, modified)

**Commits verified:**
- ✅ 885be8c: refactor(55-01): convert rect drag from Zustand to ref-based pattern
- ✅ 48e1395: feat(55-01): add edge case safety for ref-based drags

**Grep verification:**
- ✅ `rectDragState` removed from GlobalSlice (0 matches in src/core/editor/)
- ✅ `setRectDragState` removed from all files (0 matches in src/)
- ✅ `rectDragRef` present in MapCanvas.tsx (17 matches)
- ✅ TOOL-02 documented (2 matches)
- ✅ TOOL-03 documented (1 match)
- ✅ TOOL-04 documented (1 match)

**TypeScript verification:**
- ✅ `npm run typecheck` passes (only unused variable warnings, no errors)
