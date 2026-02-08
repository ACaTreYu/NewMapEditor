# Roadmap: AC Map Editor

## Milestones

- ✅ **v1.0 UI Overhaul** - Phases 1-3 (shipped 2026-02-01)
- ✅ **v1.1 Canvas & Polish** - Phases 4-6 (shipped 2026-02-02)
- ✅ **v1.2 SEdit-Style Layout** - Phases 7-10 (shipped 2026-02-02)
- ✅ **v1.3 Layout Fix** - Phase 11 (shipped 2026-02-04)
- ✅ **v1.4 Win98 Theme Overhaul** - Phases 12-13 (shipped 2026-02-04)
- ✅ **v1.5 Functional Tools** - Phases 14-15 (shipped 2026-02-04)
- ✅ **v1.6 SELECT & Animation Panel** - Phases 16-20 (shipped 2026-02-08)
- 📋 **v1.7 Performance & Portability** - Phases 21-26 (planned)

## Phases

<details>
<summary>✅ v1.0 UI Overhaul (Phases 1-3) - SHIPPED 2026-02-01</summary>

### Phase 1: Fill & Animation Foundation
**Goal**: Fix pattern fill and animation loading bugs
**Plans**: 2 plans

Plans:
- [x] 01-01: Pattern fill with multi-tile support
- [x] 01-02: Animation loading from Gfx.dll with validation

### Phase 2: Theme System
**Goal**: Build CSS custom properties theme foundation
**Plans**: 1 plan

Plans:
- [x] 02-01: CSS variable architecture with dark/light mode

### Phase 3: Horizontal Layout
**Goal**: Deliver horizontal toolbar with tabbed bottom panel
**Plans**: 2 plans

Plans:
- [x] 03-01: Horizontal toolbar with icon+label pattern
- [x] 03-02: Tabbed bottom panel with persistence

</details>

<details>
<summary>✅ v1.1 Canvas & Polish (Phases 4-6) - SHIPPED 2026-02-02</summary>

### Phase 4: CSS Consistency
**Goal**: Unified CSS variable usage across components
**Plans**: 1 plan

Plans:
- [x] 04-01: CSS variable audit and standardization

### Phase 5: Classic Scrollbars
**Goal**: Windows 95/98 style scrollbars with arrow buttons
**Plans**: 1 plan

Plans:
- [x] 05-01: Classic scrollbar component with continuous scroll

### Phase 6: Collapsible Panel
**Goal**: Maximize canvas with collapsible bottom panel
**Plans**: 1 plan

Plans:
- [x] 06-01: Panel collapse with double-click divider toggle

</details>

<details>
<summary>✅ v1.2 SEdit-Style Layout (Phases 7-10) - SHIPPED 2026-02-02</summary>

### Phase 7: Window Frame
**Goal**: Win95/98 aesthetic with gray workspace
**Plans**: 1 plan

Plans:
- [x] 07-01: Window frame and workspace background

### Phase 8: Minimap & Panels
**Goal**: Top-right minimap with SEdit panel arrangement
**Plans**: 2 plans

Plans:
- [x] 08-01: Minimap repositioning and click-to-navigate
- [x] 08-02: Left animations panel, bottom tiles panel

### Phase 9: Icon Toolbar
**Goal**: Icon-only toolbar maximizing canvas space
**Plans**: 1 plan

Plans:
- [x] 09-01: Photoshop/GIMP-style icon toolbar

### Phase 10: Map Settings
**Goal**: Comprehensive game settings dialog
**Plans**: 5 plans

Plans:
- [x] 10-01: Map Settings dialog architecture (53 settings, 10 tabs)
- [x] 10-02: General/Game/Combat tabs
- [x] 10-03: Weapons/Powerups tabs
- [x] 10-04: Advanced/Custom tabs
- [x] 10-05: Dirty flag and unsaved changes confirmation

</details>

<details>
<summary>✅ v1.3 Layout Fix (Phase 11) - SHIPPED 2026-02-04</summary>

### Phase 11: Canvas Maximization
**Goal**: Fix flexbox sizing, move animations right, maximize canvas
**Plans**: 1 plan

Plans:
- [x] 11-01: Flexbox min-height fix and panel repositioning

</details>

<details>
<summary>✅ v1.4 Win98 Theme Overhaul (Phases 12-13) - SHIPPED 2026-02-04</summary>

### Phase 12: Win98 Foundation
**Goal**: Pixel-accurate Win98 CSS variable system
**Plans**: 6 plans

Plans:
- [x] 12-01: Win98 CSS primitives and semantic tokens
- [x] 12-02: Color scheme standardization
- [x] 12-03: Remove dark/light toggle (commit to Win98 grey)
- [x] 12-04: Purge modern CSS from all components
- [x] 12-05: Toolbar button Win98 states
- [x] 12-06: Status bar and title bar Win98 styling

### Phase 13: Win98 Application Chrome
**Goal**: Complete Win98 application aesthetic
**Plans**: 4 plans

Plans:
- [x] 13-01: Win98 toolbar with beveled edges
- [x] 13-02: Win98 status bar with resize grip
- [x] 13-03: Win98 title bars with gradients
- [x] 13-04: Win98 panel dividers and borders

</details>

<details>
<summary>✅ v1.5 Functional Tools (Phases 14-15) - SHIPPED 2026-02-04</summary>

### Phase 14: Game Object Tools
**Goal**: Expose SPAWN/SWITCH/BRIDGE via toolbar with variant dropdowns
**Plans**: 1 plan

Plans:
- [x] 14-01: SPAWN/SWITCH/BRIDGE toolbar buttons with S/H/J shortcuts

### Phase 15: Conveyor Tool
**Goal**: Implement CONVEYOR tool with directional pattern fill
**Plans**: 2 plans

Plans:
- [x] 15-01: CONVEYOR tool button and variant dropdowns
- [x] 15-02: Directional pattern fill with live preview and escape cancellation

</details>

### ✅ v1.6 SELECT & Animation Panel (Shipped 2026-02-08)

**Milestone Goal:** Add SELECT tool with full SEdit parity (marquee selection, copy/paste/cut/delete, mirror H/V, rotate 90°, floating paste preview) and redesign Animation Panel to match SEdit's vertical hex-numbered list with Tile/Anim mode toggle.

#### Phase 16: Marquee Selection Foundation
**Goal**: Users can select rectangular regions with marching ants visual feedback
**Depends on**: Phase 15
**Requirements**: SEL-01, SEL-02, SEL-03, SEL-04
**Success Criteria** (what must be TRUE):
  1. User can drag on map canvas to define rectangular selection
  2. Active selection displays animated marching ants border
  3. User can cancel selection with Escape key
  4. Selection coordinates remain accurate at all zoom levels (0.25x-4x)
  5. Selection state persists across tool switches
**Plans**: 1 plan

Plans:
- [x] 16-01-PLAN.md -- SELECT tool drag handling + marching ants rendering + Escape cancellation

#### Phase 17: Clipboard Operations
**Goal**: Users can copy, cut, paste, and delete selected tiles
**Depends on**: Phase 16
**Requirements**: CLIP-01, CLIP-02, CLIP-04
**Success Criteria** (what must be TRUE):
  1. User can copy selected tiles to clipboard with Ctrl+C
  2. User can cut selected tiles to clipboard with Ctrl+X (copy + clear)
  3. User can delete selection with Delete key (fill with DEFAULT_TILE 280)
  4. Pasted tiles appear at current cursor location
  5. All clipboard operations integrate with undo/redo system
**Plans**: 1 plan

Plans:
- [x] 17-01-PLAN.md -- Clipboard state + actions in EditorState + keyboard shortcuts in ToolBar

#### Phase 18: Floating Paste Preview
**Goal**: Implement floating paste preview for precise clipboard placement with visual feedback
**Depends on**: Phase 17
**Requirements**: CLIP-03, CLIP-05, CLIP-06
**Success Criteria** (what must be TRUE):
  1. User can paste clipboard as floating preview with Ctrl+V
  2. Floating paste preview renders semi-transparently (70% opacity) and follows cursor
  3. User can commit floating paste with left click
  4. User can cancel floating paste with Escape key
  5. Paste preview works correctly at all zoom levels (0.25x-4x)
**Plans**: 1 plan

Plans:
- [x] 18-01-PLAN.md -- Paste preview state + rendering + interactions

#### Phase 19: Mirror/Rotate Transforms
**Goal**: Users can transform clipboard contents with mirror H/V and rotate 90°
**Depends on**: Phase 17
**Requirements**: XFRM-01, XFRM-02, XFRM-03, XFRM-04
**Success Criteria** (what must be TRUE):
  1. User can mirror clipboard contents horizontally
  2. User can mirror clipboard contents vertically
  3. User can rotate clipboard contents 90 degrees clockwise
  4. All transforms preserve animation flags and frame offsets (bits 8-14)
  5. Transforms use SEdit keyboard shortcuts
**Plans**: 1 plan

Plans:
- [x] 19-01-PLAN.md -- Transform actions (mirrorH/V, rotate90) + Ctrl+H/J/R keyboard shortcuts

#### Phase 20: Animation Panel Redesign ✓
**Goal**: Animation panel matches SEdit's vertical hex-numbered list with Tile/Anim mode toggle
**Depends on**: Nothing (independent work, can be parallelized)
**Requirements**: ANIM-01, ANIM-02, ANIM-03
**Success Criteria** (what must be TRUE):
  1. ✓ Animation panel displays 00-FF hex-numbered vertical list
  2. ✓ Tile/Anim radio toggle switches between placing static tile vs animated tile
  3. ✓ Offset field controls animation frame offset (0-127)
  4. ✓ Panel layout matches SEdit reference exactly
**Plans**: 1 plan (completed outside GSD as SEdit Visual Parity work)

Plans:
- [x] 20-01: SEdit Visual Parity (narrow 70px panel, hex labels, team selector, auto-select) — commit b57d8c6

### 📋 v1.7 Performance & Portability (Planned)

**Milestone Goal:** Optimize rendering pipeline, state management, and memory usage. Extract Electron dependencies behind adapter interfaces for portability into the AC web application.

#### Phase 21: Zustand Store Optimization
**Goal**: Eliminate unnecessary re-renders by adding selectors and fixing store subscription patterns
**Depends on**: Nothing (can start anytime)
**Requirements**: PERF-01, PERF-02, PERF-03
**Success Criteria** (what must be TRUE):
  1. Every component uses granular selectors (no bare `useEditorStore()` destructuring)
  2. animationFrame changes only re-render components that display animated tiles
  3. canUndo/canRedo update reactively when undo/redo stack changes
  4. Tool switches don't re-render unrelated components (StatusBar, Minimap, etc.)
**Plans**: 2 plans

Plans:
- [x] 21-01-PLAN.md -- Remove canUndo/canRedo methods + migrate 8 simple components to useShallow selectors
- [x] 21-02-PLAN.md -- Migrate ToolBar (reactive canUndo/canRedo) + MapCanvas to granular selectors

#### Phase 22: Canvas Rendering Optimization
**Goal**: Reduce MapCanvas draw calls via layered rendering, batched grid, and debounced resize. Fix phantom grid lines bug.
**Depends on**: Phase 21 (selectors prevent double-triggering during refactor)
**Requirements**: PERF-04, PERF-05, PERF-06
**Success Criteria** (what must be TRUE):
  1. Static tile layer only redraws when map data or viewport changes
  2. Animation layer only redraws animated tiles on animationFrame tick
  3. Grid lines drawn with 2 batched strokes (not 60 individual calls)
  4. Canvas resize is debounced via requestAnimationFrame
**Plans**: 2 plans

Plans:
- [x] 22-01-PLAN.md -- 4-layer canvas architecture + pixel-perfect rendering + batched grid + RAF resize (known issues: minimap crash, animation speed)
- [x] 22-02-PLAN.md -- Gap closure: fix minimap crash on drag-navigate + fix animation double-tick speed

#### Phase 23: Minimap Performance
**Goal**: Replace per-draw DOM canvas creation with pre-computed tile color lookup table
**Depends on**: Nothing (independent)
**Requirements**: PERF-07
**Success Criteria** (what must be TRUE):
  1. Tile color lookup table computed once from tileset image at load time
  2. Minimap draw creates zero temporary canvas elements
  3. Minimap renders correctly at all zoom levels
**Plans**: 1 plan

Plans:
- [x] 23-01-PLAN.md — Average-color cache + special tile overrides + debounced redraw

#### Phase 24: Batch State Operations
**Goal**: Batch tile mutations into single state updates to prevent render cascades
**Depends on**: Phase 21 (store refactor should happen first)
**Requirements**: PERF-08, PERF-09
**Success Criteria** (what must be TRUE):
  1. Wall line drawing triggers single state update for entire line (not per-tile)
  2. Map tile mutations use consistent pattern (no in-place mutate + spread)
  3. Drag operations batch intermediate tile changes
**Plans**: 1 plan

Plans:
- [x] 24-01-PLAN.md — WallSystem.placeWallBatch + batched wall line/rect/pencil operations

#### Phase 25: Undo System Optimization
**Goal**: Switch from full tile array copies to delta-based undo for reduced memory usage
**Depends on**: Phase 24 (batch operations affect undo boundaries)
**Requirements**: PERF-10, PERF-11
**Success Criteria** (what must be TRUE):
  1. Undo entries store only changed tiles (position + old value), not full 128KB arrays
  2. Redo stack has bounded size matching undo stack (maxUndoLevels)
  3. All existing undo/redo behavior preserved (user-facing no change)
**Plans**: 1 plan

Plans:
- [ ] 25-01-PLAN.md — Delta-based undo/redo with TileDelta entries + bounded redo stack + commitUndo pattern

#### Phase 26: Portability Layer
**Goal**: Extract Electron dependencies behind adapter interfaces for web portability
**Depends on**: Nothing (independent)
**Requirements**: PORT-01, PORT-02, PORT-03
**Success Criteria** (what must be TRUE):
  1. FileService adapter interface in src/core/ with Electron and browser implementations
  2. Map decompression logic extracted from App.tsx into MapParser/service
  3. No direct `window.electronAPI` calls in src/components/ or src/core/
  4. App.tsx works with either Electron or browser file adapter
**Plans**: TBD

Plans:
- [ ] 26-01: TBD during planning

## Progress

**Execution Order:**
Phases execute in numeric order. Phase 20 can run in parallel with 16-19.
Phases 21, 23, 26 can run in parallel (no dependencies on each other).

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Fill & Animation Foundation | v1.0 | 2/2 | Complete | 2026-02-01 |
| 2. Theme System | v1.0 | 1/1 | Complete | 2026-02-01 |
| 3. Horizontal Layout | v1.0 | 2/2 | Complete | 2026-02-01 |
| 4. CSS Consistency | v1.1 | 1/1 | Complete | 2026-02-02 |
| 5. Classic Scrollbars | v1.1 | 1/1 | Complete | 2026-02-02 |
| 6. Collapsible Panel | v1.1 | 1/1 | Complete | 2026-02-02 |
| 7. Window Frame | v1.2 | 1/1 | Complete | 2026-02-02 |
| 8. Minimap & Panels | v1.2 | 2/2 | Complete | 2026-02-02 |
| 9. Icon Toolbar | v1.2 | 1/1 | Complete | 2026-02-02 |
| 10. Map Settings | v1.2 | 5/5 | Complete | 2026-02-02 |
| 11. Canvas Maximization | v1.3 | 1/1 | Complete | 2026-02-04 |
| 12. Win98 Foundation | v1.4 | 6/6 | Complete | 2026-02-04 |
| 13. Win98 Application Chrome | v1.4 | 4/4 | Complete | 2026-02-04 |
| 14. Game Object Tools | v1.5 | 1/1 | Complete | 2026-02-04 |
| 15. Conveyor Tool | v1.5 | 2/2 | Complete | 2026-02-04 |
| 16. Marquee Selection Foundation | v1.6 | 1/1 | Complete | 2026-02-05 |
| 17. Clipboard Operations | v1.6 | 1/1 | Complete | 2026-02-05 |
| 18. Floating Paste Preview | v1.6 | 1/1 | Complete | 2026-02-06 |
| 19. Mirror/Rotate Transforms | v1.6 | 1/1 | Complete | 2026-02-08 |
| 20. Animation Panel Redesign | v1.6 | 1/1 | Complete | 2026-02-06 |
| 21. Zustand Store Optimization | v1.7 | 2/2 | Complete | 2026-02-05 |
| 22. Canvas Rendering Optimization | v1.7 | 2/2 | Complete | 2026-02-05 |
| 23. Minimap Performance | v1.7 | 1/1 | Complete | 2026-02-08 |
| 24. Batch State Operations | v1.7 | 1/1 | Complete | 2026-02-08 |
| 25. Undo System Optimization | v1.7 | 0/1 | Not started | - |
| 26. Portability Layer | v1.7 | 0/? | Not started | - |
