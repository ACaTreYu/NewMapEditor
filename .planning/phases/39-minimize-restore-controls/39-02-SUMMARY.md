---
phase: 39-minimize-restore-controls
plan: 02
subsystem: mdi-workspace
tags: [ui, window-controls, minimize, maximize, css]
dependency_graph:
  requires: ["39-01"]
  provides: ["mdi-window-controls-ui"]
  affects: ["ChildWindow", "Workspace", "MinimizedBar"]
tech_stack:
  added: []
  patterns: ["css-drawn-icons", "manual-drag", "conditional-render"]
key_files:
  created:
    - src/components/Workspace/MinimizedBar.tsx
  modified:
    - src/components/Workspace/ChildWindow.tsx
    - src/components/Workspace/Workspace.tsx
    - src/components/Workspace/Workspace.css
decisions: []
metrics:
  duration_minutes: 4
  completed_date: "2026-02-11"
---

# Phase 39 Plan 02: MDI Window Controls UI

**One-liner:** Complete MDI window management UI with CSS-drawn title bar buttons (minimize/maximize/restore/close), minimized bars at workspace top, maximize fills workspace hiding title bar, double-click title bar toggles maximize.

## What Was Built

Implemented the complete user-facing UI for MDI window controls:

### Title Bar Buttons (Task 1)
- Three CSS-drawn buttons in Windows classic order: minimize (_), maximize ([]), close (X)
- Restore button (overlapped squares) replaces maximize when window is maximized
- All icons use pure CSS pseudo-elements (::before, ::after)
- Close button turns red on hover
- Minimize/maximize/restore get subtle neutral highlight on hover
- Double-click title bar toggles maximize/restore
- Title bar hidden when window is maximized
- Drag and resize disabled when maximized
- Minimized windows return null (don't render as child windows)

### MinimizedBar Component (Task 2)
- New component renders 160px compact bar at workspace top
- Shows document name with restore and close buttons
- Multiple bars stack horizontally with flex-wrap
- Draggable within workspace with manual drag implementation
- Double-click title restores window
- Same active/inactive styling as child window title bars
- z-index 500 (below normal windows at 1000+)
- CSS reuses .window-btn classes for consistent button styling

### Integration
- Workspace component filters minimized documents
- Renders minimized bars in separate container at top
- ChildWindow checks isMinimized and returns null early
- All window state actions integrated (minimize/maximize/unmaximize/restore)

## Deviations from Plan

None - plan executed exactly as written.

## Technical Details

### CSS-Drawn Icons
All button icons use pure CSS (no text characters, no SVG):
- Minimize: horizontal dash (::before with background)
- Maximize: square outline (::before with border)
- Restore: overlapped squares (::before + ::after with borders, positioned)
- Close: X shape (::before + ::after rotated lines)

### Manual Drag Pattern
MinimizedBar uses same manual drag pattern as ChildWindow:
- mousedown captures start position and original offset
- mousemove updates absolute position
- mouseup removes listeners and clears drag state
- Ignores clicks on .window-btn to prevent button interference

### Conditional Rendering
- ChildWindow: early return if `windowState.isMinimized`
- ChildWindow: conditionally render title bar if `!windowState.isMaximized`
- ChildWindow: conditionally render maximize vs restore button based on `windowState.isMaximized`
- Workspace: filter `minimizedDocIds` and render MinimizedBar components

## Verification Results

Type checking passes with zero errors. All requirements met:
- Three title bar buttons visible in correct order
- CSS-drawn icons (no text)
- Close button red hover, other buttons neutral hover
- Double-click title bar toggles maximize
- Maximized window fills workspace, title bar hidden
- Minimized window appears as compact bar at top
- Multiple bars stack horizontally
- Bars are draggable
- All window state transitions work correctly

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 0ca97a7 | Title bar buttons and maximize behavior |
| 2 | 9ef3173 | MinimizedBar component and workspace integration |

## Next Steps

This plan completes the UI layer for MDI window controls. Next up:
- Phase 39 Plan 03 (if exists): Additional polish/testing
- Or Phase 40: Next feature

## Self-Check

Verifying all claimed deliverables exist:

**Created files:**
```bash
[ -f "/e/NewMapEditor/src/components/Workspace/MinimizedBar.tsx" ] && echo "FOUND" || echo "MISSING"
```
FOUND

**Modified files:**
```bash
[ -f "/e/NewMapEditor/src/components/Workspace/ChildWindow.tsx" ] && echo "FOUND" || echo "MISSING"
```
FOUND
```bash
[ -f "/e/NewMapEditor/src/components/Workspace/Workspace.tsx" ] && echo "FOUND" || echo "MISSING"
```
FOUND
```bash
[ -f "/e/NewMapEditor/src/components/Workspace/Workspace.css" ] && echo "FOUND" || echo "MISSING"
```
FOUND

**Commits:**
```bash
git log --oneline --all | grep "0ca97a7" && echo "FOUND: 0ca97a7" || echo "MISSING: 0ca97a7"
```
FOUND: 0ca97a7
```bash
git log --oneline --all | grep "9ef3173" && echo "FOUND: 9ef3173" || echo "MISSING: 9ef3173"
```
FOUND: 9ef3173

## Self-Check: PASSED

All files exist, all commits verified.
