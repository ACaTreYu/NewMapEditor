# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-02-04)

**Core value:** The map editing experience should feel intuitive and professional
**Current focus:** v1.7 SHIPPED — all milestones complete

## Current Position

Phase: 26 of 26 (Portability Layer)
Plan: 2 of 2
Status: Phase complete
Last activity: 2026-02-08 — Completed 26-02-PLAN.md (Component Migration)

Progress: [███████████████████████████] 100% (26 of 26 phases complete)

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
| 19 | Mirror/Rotate Transforms | v1.6 | Complete | 2026-02-08 |
| 20 | Animation Panel Redesign | v1.6 | Complete | 2026-02-06 |
| 21 | Zustand Store Optimization | v1.7 | Complete | 2026-02-05 |
| 22 | Canvas Rendering Optimization | v1.7 | Complete | 2026-02-05 |
| 23 | Minimap Performance | v1.7 | Complete | 2026-02-08 |
| 24 | Batch State Operations | v1.7 | Complete | 2026-02-08 |
| 25 | Undo System Optimization | v1.7 | Complete | 2026-02-08 |
| 26 | Portability Layer | v1.7 | Complete | 2026-02-08 |

v1.0-v1.7: SHIPPED

## Milestones

| Version | Name | Status | Shipped |
|---------|------|--------|---------|
| v1.0 | UI Overhaul | ARCHIVED | 2026-02-01 |
| v1.1 | Canvas & Polish | ARCHIVED | 2026-02-02 |
| v1.2 | SEdit-Style Layout | ARCHIVED | 2026-02-02 |
| v1.3 | Layout Fix | ARCHIVED | 2026-02-04 |
| v1.4 | Win98 Theme Overhaul | ARCHIVED | 2026-02-04 |
| v1.5 | Functional Tools | ARCHIVED | 2026-02-04 |
| v1.6 | SELECT & Animation Panel | ARCHIVED | 2026-02-08 |
| v1.7 | Performance & Portability | SHIPPED | 2026-02-08 |

## Performance Metrics

**Velocity:**
- Total plans completed: 50 (across v1.0-v1.7)
- Total phases: 26 complete, 0 pending
- Average: 6.25 plans per day (50 plans over 8 days)

**Recent Trend:**
- v1.7 (2026-02-08): 10 plans (6 phases in 4 days)
- v1.6 (2026-02-08): 5 plans
- v1.5 (2026-02-04): 3 plans
- Trend: Consistent high velocity — 7 milestones shipped in 8 days

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

**Phase 23 (Minimap Performance):**
- Three-tier color caching: static tiles (Uint8Array), special overrides (Map), animated tiles (Uint8Array 256 entries)
- Average all 256 pixels per tile (not center pixel) for accurate color representation
- Debounce map tile changes at 150ms to batch rapid paint/fill operations
- Viewport changes immediate (no debounce) for responsive panning/zooming
- Special tile colors: walls (steel blue-gray via wallSystem), powerups (bright gold), empty space (dark blue-black)
- Animated tiles show frame-0 averaged color with gameplay overrides: warps (bright green), flags (team colors), switches (gold), neutral flags (light gray)
- Zero temporary canvas creation during draw loop (only one-time 16x16 temp canvas during cache init)

**Phase 24 (Batch State Operations):**
- Three-phase batching algorithm: collect placements, collect neighbor updates, apply all mutations
- Map<string, number> deduplication with "x,y" string keys for efficient position tracking
- Wall line/rect operations trigger single state update instead of N+ updates (10x-76x improvement)
- Wall pencil unchanged (per-tile placement during drag for immediate visual feedback)
- getConnections reads current map state, so phase 2 neighbor updates naturally account for phase 1 placements

**Phase 25 (Undo System Optimization):**
- Delta-based undo: TileDelta[] stores only changed tiles (position + old/new value) instead of full 128KB Uint16Array copies
- Snapshot-commit pattern: pushUndo() snapshots before operation, commitUndo() computes deltas after
- Memory reduction: 128KB per entry → 12-1200 bytes (100x+ savings for typical operations)
- Bounded redo stack: limited to maxUndoLevels (50) with shift() when exceeded
- Empty operations (no tile changes) produce no undo entry (commitUndo checks deltas.length === 0)
- Drag operations create exactly one undo entry per mousedown-mouseup cycle

**Phase 26 (Portability Layer):**
- Plan 01: FileService uses Result types (success/error) instead of throwing exceptions
- Plan 01: Base64 conversion encapsulated in ElectronFileService adapter
- Plan 01: Platform-agnostic interfaces in src/core/ with zero external dependencies
- Plan 01: Adapter implementations in src/adapters/{platform}/
- Plan 01: React Context providers in src/contexts/
- Plan 01: openDllDialog excluded from interface (never used in codebase)
- Plan 02: MapService extracts all map I/O business logic from components
- Plan 02: MapService uses constructor injection (FileService parameter)
- Plan 02: MapService instantiated in useRef to avoid recreation on re-render
- Plan 02: Result objects returned from MapService match FileService pattern
- Plan 02: ArrayBuffer casts required for Uint16Array.buffer.slice() type safety

**v1.6 decisions:**
- Phase 19: Ctrl+R for rotate (matches SEdit, preventDefault overrides Electron reload)
- Phase 19: Transform actions do not update pastePreviewPosition (paste preview reactively reads clipboard)
- Phase 19: Rotation swaps width/height dimensions for non-square selections
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
- RESOLVED: Basic transforms (mirror H/V, rotate 90° CW) implemented without content-aware lookup tables
- Note: Content-aware transforms (rotTbl[512], mirTbl[512] from SEdit) not implemented - directional tiles like conveyors/bridges may appear incorrect after rotation
- Future enhancement: Add content-aware transforms if needed

## Session Continuity

Last session: 2026-02-08
Stopped at: Phase 26 Plan 02 complete (Component Migration) - FINAL PLAN
Resume file: N/A - All phases complete
Next: v1.7 Performance & Portability milestone COMPLETE

## SEdit Visual Parity (2026-02-06, outside GSD phases)
- Animation Panel: Narrow 70px SEdit-style with hex labels, team selector, auto-select on click
- Toolbar: 27 custom SVG icons replacing emoji
- Layout: Minimap moved to right sidebar above Animations
- Fixes: Holding pen walls, gray backgrounds
- Deferred: Minimap visible before map loaded (see todos/pending/minimap-visible-no-map.md)

---
*State initialized: 2026-02-01*
*Last updated: 2026-02-08 -- Completed Phase 26 Plan 02: Component Migration (FINAL PLAN)*
