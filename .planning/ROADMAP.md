# Roadmap: AC Map Editor v1.5 Functional Tools

## Overview

Bring the AC Map Editor to full tool parity with SEdit by activating existing but hidden tools and implementing the missing CONVEYOR tool. Research shows 99% of infrastructure is already built — this milestone is about exposing functionality that exists but isn't accessible via the toolbar, plus adding one new tool using proven patterns from BRIDGE/BUNKER implementations.

## Milestones

- v1.0 MVP: Phases 1-3 (shipped 2026-02-01)
- v1.1 Canvas & Polish: Phases 4-6 (shipped 2026-02-02)
- v1.2 SEdit-Style Layout: Phases 7-10 (shipped 2026-02-02)
- v1.3 Layout Fix: Phase 11 (shipped 2026-02-04)
- v1.4 Win98 Theme Overhaul: Phases 12-13 (shipped 2026-02-04)
- **v1.5 Functional Tools: Phases 14-15 (current)**

## Phases

- [x] **Phase 14: Toolbar Activation** - Expose SPAWN, SWITCH, BRIDGE tools via toolbar buttons
- [ ] **Phase 15: Conveyor Tool** - Implement CONVEYOR tool with direction selector and 2x2 minimum

## Phase Details

### Phase 14: Toolbar Activation
**Goal**: Users can access all existing SEdit game object tools through the toolbar
**Depends on**: Phase 13
**Requirements**: TOOL-01, TOOL-02, TOOL-03
**Success Criteria** (what must be TRUE):
  1. SPAWN tool button appears in toolbar with icon and activates tool on click
  2. SWITCH tool button appears in toolbar with icon and activates tool on click
  3. BRIDGE tool button appears in toolbar with icon and activates tool on click
  4. Keyboard shortcuts: S for SPAWN, H for SWITCH (W taken by WALL), J for BRIDGE (B taken by PENCIL)
  5. All three tools function correctly when activated (place game objects on map)
**Plans**: 1 plan

Plans:
- [x] 14-01-PLAN.md -- Register SPAWN, SWITCH, BRIDGE in toolbar arrays with shortcuts S/H/J

### Phase 15: Conveyor Tool
**Goal**: Users can place conveyor belt tiles with directional patterns matching SEdit behavior
**Depends on**: Phase 14
**Requirements**: CONV-01, CONV-02, CONV-03, CONV-04
**Success Criteria** (what must be TRUE):
  1. CONVEYOR tool button appears in toolbar with icon and keyboard shortcut (C)
  2. GameObjectToolPanel shows direction selector (Left-Right vs Up-Down) when CONVEYOR active
  3. User can drag a rectangle on map (2x2 minimum size) to define conveyor area
  4. Conveyor tiles fill rectangle with correct 4-tile repeating pattern based on selected direction
  5. Left-Right conveyor pattern matches SEdit's horizontal conveyor appearance
  6. Up-Down conveyor pattern matches SEdit's vertical conveyor appearance
**Plans**: TBD

Plans:
- [ ] 15-01: TBD

## Progress

**Execution Order:** 14 -> 15

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 14. Toolbar Activation | v1.5 | 1/1 | Complete | 2026-02-04 |
| 15. Conveyor Tool | v1.5 | 0/1 | Not started | - |

## Coverage

| Requirement | Phase | Verified |
|-------------|-------|----------|
| TOOL-01 | 14 | ✓ |
| TOOL-02 | 14 | ✓ |
| TOOL-03 | 14 | ✓ |
| CONV-01 | 15 | - |
| CONV-02 | 15 | - |
| CONV-03 | 15 | - |
| CONV-04 | 15 | - |

**Total: 7/7 requirements mapped (100% coverage)**

---
*Roadmap created: 2026-02-04*
*Last updated: 2026-02-04 -- Phase 14 complete*
