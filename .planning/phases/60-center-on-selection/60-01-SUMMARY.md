---
phase: 60-center-on-selection
plan: 01
subsystem: viewport-navigation
tags: [viewport, navigation, menu, keyboard-shortcut, grid-04]
requires: [electron-menu, ipc-handlers, keyboard-handlers]
provides: [center-on-selection-command]
affects: [electron/main.ts, src/App.tsx, src/components/ToolBar/ToolBar.tsx]
tech_stack:
  added: []
  patterns: [menu-ipc-pattern, viewport-clamping, selection-centering]
key_files:
  created: []
  modified:
    - electron/main.ts
    - src/App.tsx
    - src/components/ToolBar/ToolBar.tsx
decisions: []
metrics:
  duration_minutes: 1.6
  completed_date: 2026-02-13
---

# Phase 60 Plan 01: Center on Selection Command

**One-liner:** View menu command and Ctrl+E shortcut to center viewport on active selection with bounds clamping

## What Was Built

Added "Center on Selection" command accessible from View menu (Ctrl+E accelerator) and Ctrl+E keyboard shortcut. Command calculates selection midpoint, computes viewport position to center it on screen, and clamps to map bounds.

**New capabilities:**
- View menu in Electron menu bar between Edit and Window menus
- Center on Selection menu item with Ctrl+E accelerator
- IPC handler in App.tsx for 'center-selection' action
- Ctrl+E keyboard shortcut in ToolBar component
- Viewport centering with selection midpoint calculation
- Map bounds clamping to prevent scrolling out of bounds
- No-op behavior when no selection exists (no error, no viewport change)

**Integration points:**
- Electron menu → IPC 'menu-action' → App.tsx handler
- ToolBar keyboard handler → direct Zustand state access
- Both paths use identical centering+clamping logic
- Viewport calculation accounts for toolbar/statusbar (window.innerHeight - 100)

**GRID-04 requirement:** Completes viewport navigation feature set for v2.9 milestone

## Deviations from Plan

None - plan executed exactly as written.

## Verification

**Automated:**
- ✓ TypeScript compilation passes (zero new errors)
- ✓ View menu structure validated in electron/main.ts
- ✓ center-selection case exists in App.tsx switch statement
- ✓ 'e' case exists in ToolBar.tsx Ctrl/Meta switch block
- ✓ Imports for TILE_SIZE, MAP_WIDTH, MAP_HEIGHT present in both files

**Manual verification needed:**
1. View menu appears between Edit and Window in Electron menu bar
2. View > Center on Selection shows Ctrl+E accelerator
3. With selection active: menu click centers viewport on selection
4. With selection active: Ctrl+E centers viewport on selection
5. Without selection: both commands are no-ops (no error, no viewport change)
6. Selection near edge (tile 0,0 or 255,255): viewport clamps, no black area
7. At different zoom levels (0.25x, 1x, 4x): centering works correctly

## Dependencies

**Required:**
- Electron IPC menu-action system (v1.0)
- Zustand editor store with setViewport action (v1.0)
- Multi-document architecture with per-document selection (v2.1)

**Enables:**
- Phase 60-02: v2.9 verification (center-on-selection is one of the verified features)

## Technical Notes

**Centering algorithm:**
```typescript
const selCenterX = (selection.startX + selection.endX) / 2;
const selCenterY = (selection.startY + selection.endY) / 2;
const visibleTilesX = window.innerWidth / (TILE_SIZE * viewport.zoom);
const visibleTilesY = (window.innerHeight - 100) / (TILE_SIZE * viewport.zoom);
const newX = selCenterX - visibleTilesX / 2;
const newY = selCenterY - visibleTilesY / 2;
```

**Bounds clamping:**
```typescript
x: Math.max(0, Math.min(MAP_WIDTH - visibleTilesX, newX))
y: Math.max(0, Math.min(MAP_HEIGHT - visibleTilesY, newY))
```

**No-op guard:**
```typescript
if (!selection.active) break; // Silently do nothing when no selection
```

**Implementation consistency:**
- Both menu handler and keyboard shortcut use identical logic
- Both guard for activeDocumentId and selection.active
- Both call state.setViewport() with clamped coordinates
- No zoom change (viewport.zoom not modified)

**Multi-document aware:**
- Reads selection from active document: `doc.selection`
- Reads viewport from active document: `doc.viewport`
- Guards for missing activeDocumentId before accessing documents map

## Next Phase Readiness

**Blockers:** None

**Ready for:**
- Phase 60-02: v2.9 Verification (center-on-selection ready for testing)

---

## Self-Check: PASSED

**Created files verified:**
- N/A (no new files created)

**Modified files verified:**
- ✓ electron/main.ts exists
- ✓ src/App.tsx exists
- ✓ src/components/ToolBar/ToolBar.tsx exists

**Commits verified:**
- ✓ 9ad2769: feat(60-01): add View menu and IPC handler for center-selection
- ✓ 911c46e: feat(60-01): add Ctrl+E keyboard shortcut for center-selection

**Key patterns verified:**
- ✓ View menu inserted between Edit and Window menus
- ✓ Menu item uses CmdOrCtrl+E accelerator
- ✓ IPC handler uses 'center-selection' action name
- ✓ Both handlers use selection midpoint calculation
- ✓ Both handlers clamp viewport to map bounds
- ✓ Both handlers guard for missing selection with break (no-op)
- ✓ TILE_SIZE, MAP_WIDTH, MAP_HEIGHT imported in both files
- ✓ Viewport calculation accounts for toolbar height (- 100)
- ✓ No zoom change in setViewport calls
