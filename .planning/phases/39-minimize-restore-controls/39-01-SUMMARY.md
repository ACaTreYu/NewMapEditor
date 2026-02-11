---
phase: 39-minimize-restore-controls
plan: 01
subsystem: window-management
tags: [mdi, state-management, zustand, window-controls]
dependency_graph:
  requires:
    - phase-34-mdi-editor
    - windowSlice
    - windowArrangement
  provides:
    - minimize-maximize-state
    - window-control-actions
    - minimized-window-filtering
  affects:
    - window-arrangement
    - document-close-behavior
tech_stack:
  added: []
  patterns:
    - saved-bounds-pattern
    - auto-activation-logic
    - arrangement-filtering
key_files:
  created: []
  modified:
    - src/core/editor/slices/types.ts
    - src/core/editor/slices/windowSlice.ts
    - src/core/editor/slices/windowArrangement.ts
    - src/core/editor/EditorState.ts
decisions:
  - id: saved-bounds-pattern
    choice: "Store savedBounds in WindowState for both minimize and maximize operations"
    rationale: "Single restore target simplifies state management and handles edge cases (minimize while maximized)"
    alternatives: ["Separate fields for minimize/maximize bounds", "Compute restore position on-demand"]
  - id: auto-activation-strategy
    choice: "Auto-activate next topmost non-minimized window on minimize"
    rationale: "Ensures visible window always has focus, matches desktop OS behavior"
    alternatives: ["Deactivate without auto-activation", "Activate any remaining window"]
  - id: arrangement-filtering
    choice: "Filter minimized windows but un-maximize maximized windows during arrangement"
    rationale: "Minimized windows stay minimized, but arrangement is a workspace reset that restores normal windows"
    alternatives: ["Filter both minimized and maximized", "Arrange all windows regardless of state"]
metrics:
  started: "2026-02-11T02:24:41Z"
  completed: "2026-02-11T02:27:16Z"
  duration: "2.5 minutes"
  tasks_completed: 2
  commits: 2
---

# Phase 39 Plan 01: Window State Management for Minimize/Maximize/Restore Summary

**One-liner:** Extended WindowState with minimize/maximize state fields and four new store actions for window control operations.

## Work Completed

### Task 1: Extend WindowState type and add window control actions

**Files modified:**
- `src/core/editor/slices/types.ts` — Added isMinimized, isMaximized, savedBounds fields to WindowState interface
- `src/core/editor/slices/windowSlice.ts` — Added four new actions and updated createWindowState initialization

**Actions added:**

1. **minimizeWindow(docId)** — Saves current bounds (or savedBounds if maximized), sets isMinimized=true, auto-activates next topmost non-minimized window if this was active
2. **restoreWindow(docId)** — Restores position/size from savedBounds, brings to front, sets as active document
3. **maximizeWindow(docId)** — Saves current bounds, fills workspace (0,0 to workspace dimensions), brings to front, sets as active
4. **unmaximizeWindow(docId)** — Restores position/size from savedBounds, clears maximize state

All actions include z-index normalization when threshold exceeded.

**Commit:** `be58a9d`

### Task 2: Update arrangement functions and close behavior

**Files modified:**
- `src/core/editor/slices/windowArrangement.ts` — Updated all three arrangement functions
- `src/core/editor/EditorState.ts` — Updated closeDocument logic

**Changes:**

1. **Arrangement functions** (cascadeWindows, tileWindowsHorizontal, tileWindowsVertical):
   - Filter minimized windows at start of each function
   - Un-maximize maximized windows by restoring savedBounds before arranging
   - Arrange only normal windows
   - Merge minimized windows back unchanged at end

2. **closeDocument**:
   - Prefer non-minimized windows when auto-activating after close
   - Sort candidates by zIndex to activate highest visible window
   - Fall back to any remaining document if all are minimized

**Commit:** `8fd39d2`

## Deviations from Plan

None — plan executed exactly as written. All tasks completed successfully with zero TypeScript errors.

## Verification

1. TypeScript compilation: **PASSED** (zero errors)
2. WindowState has isMinimized, isMaximized, savedBounds fields: **VERIFIED**
3. WindowSlice declares all four new actions: **VERIFIED**
4. createWindowState initializes new fields correctly: **VERIFIED**
5. Arrangement functions filter minimized/maximize windows: **VERIFIED**
6. closeDocument prefers non-minimized windows: **VERIFIED**

## Self-Check: PASSED

**Created files:** None (all modifications)

**Modified files:**
- FOUND: `src/core/editor/slices/types.ts`
- FOUND: `src/core/editor/slices/windowSlice.ts`
- FOUND: `src/core/editor/slices/windowArrangement.ts`
- FOUND: `src/core/editor/EditorState.ts`

**Commits:**
- FOUND: `be58a9d` (Task 1: window control actions)
- FOUND: `8fd39d2` (Task 2: arrangement and close behavior)

## Next Phase Readiness

**Status:** Ready for phase 39 plan 02 (UI implementation)

**Blockers:** None

**Handoff notes:**
- All state management is in place
- UI components can now call minimizeWindow/restoreWindow/maximizeWindow/unmaximizeWindow
- Window arrangement and close behavior respect minimize/maximize state
- savedBounds pattern handles edge cases (minimize while maximized)

## Impact Summary

**State layer:** Extended with full minimize/maximize/restore support
**Actions:** Four new window control actions
**Arrangement:** Now respects minimize state, un-maximizes during arrangement
**Close behavior:** Prefers visible windows for auto-activation
**Type safety:** All changes fully typed, zero TS errors
