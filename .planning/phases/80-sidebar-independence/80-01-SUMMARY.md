---
phase: 80-sidebar-independence
plan: 01
subsystem: ui-layout
tags: [layout, minimap, sidebar, toolbar, ux]
dependency_graph:
  requires: []
  provides: [minimap-overlay, sidebar-collapse-via-toolbar]
  affects: [app-layout, toolbar-controls]
tech_stack:
  added: []
  patterns: [absolute-positioning, conditional-rendering]
key_files:
  created: []
  modified:
    - src/App.tsx
    - src/App.css
    - src/components/ToolBar/ToolBar.tsx
decisions: []
metrics:
  duration: 106s
  completed: 2026-02-16T19:36:19Z
  task_commits: 2
---

# Phase 80 Plan 01: Minimap Overlay & Sidebar Toggle Summary

**One-liner:** Decoupled minimap from animations panel with fixed top-right overlay positioning and added toolbar toggle for independent sidebar collapse.

## Overview

Restructured the main application layout to maximize canvas editing area by:
1. Moving minimap to an absolute-positioned overlay in the top-right corner of the canvas area
2. Making the entire right sidebar (animations panel + game object tool panel) collapsible via a toolbar toggle button
3. Ensuring minimap stays visible regardless of sidebar collapse state

This change allows users to hide the animations panel when not needed, expanding the canvas horizontally, while maintaining minimap navigation at all times.

## Tasks Completed

### Task 1: Restructure layout — minimap overlay + collapsible sidebar
**Commit:** 071b233

**Changes:**
- Wrapped existing `PanelGroup` in new `canvas-area-wrapper` div with `position: relative`
- Moved `Minimap` component from `right-sidebar-container` to new `minimap-overlay` div with absolute positioning (`top: 4px; right: 4px; z-index: 100`)
- Removed old `sidebar-collapse-toggle` button (vertical strip between canvas and sidebar)
- Changed `right-sidebar-container` from conditionally showing children to being fully conditionally rendered based on `rightSidebarCollapsed` state
- Added `rightSidebarCollapsed` and `onToggleSidebar` props to `ToolBar` component
- Added CSS for `.canvas-area-wrapper` (flex container with relative positioning) and `.minimap-overlay` (absolute overlay)
- Removed CSS for `.sidebar-collapse-toggle` and all its variants (90-129 lines removed)

**Files modified:**
- `src/App.tsx` — Layout restructuring
- `src/App.css` — New overlay styles, removed old toggle styles

### Task 2: Add sidebar toggle button to toolbar
**Commit:** 48f988f

**Changes:**
- Added icon imports: `LuPanelRightOpen` (shown when collapsed → "click to open") and `LuPanelRightClose` (shown when expanded → "click to close")
- Updated `Props` interface with two new props: `rightSidebarCollapsed: boolean` and `onToggleSidebar: () => void`
- Destructured new props in component function signature
- Added sidebar toggle button after Map Settings button, before `toolbar-spacer`
- Button shows `active` class when sidebar is visible (not collapsed)
- Icon switches between open/close variants to indicate the action that will happen on click
- Title tooltip updates dynamically: "Show Animations Panel" when collapsed, "Hide Animations Panel" when expanded

**Files modified:**
- `src/components/ToolBar/ToolBar.tsx` — Toggle button implementation

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

**TypeScript compilation:** ✅ Passes with zero errors
**Layout structure:** ✅ Minimap renders in absolute-positioned overlay inside canvas-area-wrapper
**Conditional rendering:** ✅ Entire right-sidebar-container unmounts when collapsed (no empty container)
**Props wiring:** ✅ rightSidebarCollapsed and onToggleSidebar flow from App.tsx to ToolBar.tsx correctly
**Button state:** ✅ Active class applied when sidebar visible, icon changes based on state

## Next Phase Readiness

**Blockers:** None

**Dependencies satisfied:**
- SIDE-01: Minimap always visible in top-right corner overlay ✅
- SIDE-02: Animations panel collapses/expands via toolbar toggle ✅
- SIDE-03: Canvas expands when animations panel collapsed ✅
- SIDE-04: Expanded state preserves current stacked layout ✅
- SIDE-05: Game object tool panel follows animations panel collapse state ✅

**Integration notes:**
- Minimap overlay uses `z-index: 100` to stay above canvas but below dialogs
- Canvas area wrapper uses `overflow: hidden` to prevent minimap from affecting layout dimensions
- Sidebar collapse state is managed in App.tsx component state (not persisted across sessions)
- No changes to minimap or animations panel components themselves — purely layout restructuring

## Self-Check

Verifying all claimed artifacts exist:

**Files modified:**
- ✅ src/App.tsx — exists and contains minimap-overlay
- ✅ src/App.css — exists and contains minimap-overlay and canvas-area-wrapper styles
- ✅ src/components/ToolBar/ToolBar.tsx — exists and contains LuPanelRightOpen/LuPanelRightClose

**Commits:**
- ✅ 071b233 — feat(80-01): restructure layout with minimap overlay and collapsible sidebar
- ✅ 48f988f — feat(80-01): add sidebar toggle button to toolbar

**Key patterns verified:**
- ✅ rightSidebarCollapsed prop flows from App.tsx to ToolBar.tsx
- ✅ onToggleSidebar callback wired correctly
- ✅ minimap-overlay className applied in App.tsx
- ✅ Minimap component rendered inside minimap-overlay div

## Self-Check: PASSED
