# Roadmap: AC Map Editor

## Milestones

- ✅ **v1.0 UI Overhaul** - Phases 1-3 (shipped 2026-02-01)
- ✅ **v1.1 Canvas & Polish** - Phases 4-6 (shipped 2026-02-02)
- ✅ **v1.2 SEdit-Style Layout** - Phases 7-10 (shipped 2026-02-02)
- ✅ **v1.3 Layout Fix** - Phase 11 (shipped 2026-02-04)
- ✅ **v1.4 Win98 Theme Overhaul** - Phases 12-13 (shipped 2026-02-04)
- ✅ **v1.5 Functional Tools** - Phases 14-15 (shipped 2026-02-04)
- ✅ **v1.6 SELECT & Animation Panel** - Phases 16-20 (shipped 2026-02-08)
- ✅ **v1.7 Performance & Portability** - Phases 21-26 (shipped 2026-02-08)
- ✅ **v2.0 Modern Minimalist UI** - Phases 27-32 (shipped 2026-02-09)
- ✅ **v2.1 MDI Editor & Polish** - Phases 33-36 (shipped 2026-02-09)
- ✅ **v2.2 Transparency & Performance** - Phase 37 (shipped 2026-02-09)
- 🚧 **v2.3 Minimap Independence** - Phase 38 (in progress)

## Phases

<details>
<summary>✅ v1.0 UI Overhaul (Phases 1-3) - SHIPPED 2026-02-01</summary>

### Phase 1: Pattern Fill & Animations
**Goal**: Multi-tile pattern fills and animation data loading
**Plans**: 2 plans

Plans:
- [x] 01-01: Pattern fill with multi-tile selection
- [x] 01-02: Animation loading from Gfx.dll

### Phase 2: Horizontal Toolbar
**Goal**: Professional icon+label toolbar layout
**Plans**: 1 plan

Plans:
- [x] 02-01: Horizontal toolbar with CSS theme system

### Phase 3: Resizable Panels
**Goal**: Vertical panel layout with tabbed bottom panel
**Plans**: 2 plans

Plans:
- [x] 03-01: Vertical panel layout with persistence
- [x] 03-02: Tabbed bottom panel (Tiles/Animations/Settings)

</details>

<details>
<summary>✅ v1.1 Canvas & Polish (Phases 4-6) - SHIPPED 2026-02-02</summary>

### Phase 4: CSS Variable Consistency
**Goal**: Two-tier CSS variable system
**Plans**: 1 plan

Plans:
- [x] 04-01: CSS variable consistency across components

### Phase 5: Classic Scrollbars
**Goal**: Windows-style scrollbars with arrow buttons
**Plans**: 1 plan

Plans:
- [x] 05-01: Classic scrollbars with continuous scroll

### Phase 6: Collapsible Panels
**Goal**: Maximize canvas space with collapsible bottom panel
**Plans**: 1 plan

Plans:
- [x] 06-01: Collapsible bottom panel with double-click toggle

</details>

<details>
<summary>✅ v1.2 SEdit-Style Layout (Phases 7-10) - SHIPPED 2026-02-02</summary>

### Phase 7: Win95 Window Frame
**Goal**: SEdit-style canvas frame
**Plans**: 2 plans

Plans:
- [x] 07-01: Win95 window frame with gray workspace
- [x] 07-02: Minimap repositioned to top-right

### Phase 8: SEdit Panel Layout
**Goal**: Match SEdit panel arrangement
**Plans**: 2 plans

Plans:
- [x] 08-01: Animation panel on left, compact 16x16 previews
- [x] 08-02: Icon-only toolbar

### Phase 9: Map Settings Dialog
**Goal**: Comprehensive game settings dialog
**Plans**: 3 plans

Plans:
- [x] 09-01: Dialog framework with 10 tabs
- [x] 09-02: Settings panels (General, Game, Combat)
- [x] 09-03: Settings panels (Weapons, Powerups)

### Phase 10: Multi-tile Stamp Alignment
**Goal**: Visual feedback for multi-tile selection
**Plans**: 1 plan

Plans:
- [x] 10-01: Dashed selection outline

</details>

<details>
<summary>✅ v1.3 Layout Fix (Phase 11) - SHIPPED 2026-02-04</summary>

### Phase 11: Canvas Dominance
**Goal**: Map canvas fills available window space
**Plans**: 1 plan

Plans:
- [x] 11-01: Fix flexbox layout for proper canvas sizing

</details>

<details>
<summary>✅ v1.4 Win98 Theme Overhaul (Phases 12-13) - SHIPPED 2026-02-04</summary>

### Phase 12: Win98 CSS Variables
**Goal**: Pixel-accurate Win98 aesthetic foundation
**Plans**: 5 plans

Plans:
- [x] 12-01: Win98 CSS variable system
- [x] 12-02: Remove dark/light toggle
- [x] 12-03: Purge modern CSS
- [x] 12-04: Panel interior styles
- [x] 12-05: Win98 scrollbar styles

### Phase 13: Win98 Application Chrome
**Goal**: Win98 toolbar and status bar
**Plans**: 5 plans

Plans:
- [x] 13-01: Win98 toolbar buttons
- [x] 13-02: Win98 status bar
- [x] 13-03: Win98 title bars
- [x] 13-04: Win98 dividers
- [x] 13-05: Final verification

</details>

<details>
<summary>✅ v1.5 Functional Tools (Phases 14-15) - SHIPPED 2026-02-04</summary>

### Phase 14: Game Object Tools
**Goal**: SPAWN/SWITCH/BRIDGE tools via toolbar
**Plans**: 2 plans

Plans:
- [x] 14-01: Expose game object tools in toolbar
- [x] 14-02: Variant dropdowns for all tools

### Phase 15: Conveyor Tool
**Goal**: CONVEYOR tool with directional pattern fill
**Plans**: 1 plan

Plans:
- [x] 15-01: CONVEYOR tool with live preview

</details>

<details>
<summary>✅ v1.6 SELECT & Animation Panel (Phases 16-20) - SHIPPED 2026-02-08</summary>

### Phase 16: Marquee Selection
**Goal**: SELECT tool with marching ants
**Plans**: 1 plan

Plans:
- [x] 16-01: SELECT tool with animated selection rectangle

### Phase 17: Clipboard Operations
**Goal**: Copy/cut/paste/delete with keyboard shortcuts
**Plans**: 1 plan

Plans:
- [x] 17-01: Clipboard operations with undo/redo

### Phase 18: Paste Preview
**Goal**: Floating paste preview with commit
**Plans**: 1 plan

Plans:
- [x] 18-01: Floating paste preview at 70% opacity

### Phase 19: Transform Operations
**Goal**: Mirror H/V and rotate 90°
**Plans**: 1 plan

Plans:
- [x] 19-01: Transform operations with SEdit shortcuts

### Phase 20: Animation Panel Redesign
**Goal**: SEdit-style hex-numbered vertical list
**Plans**: 1 plan

Plans:
- [x] 20-01: Animation panel with 00-FF hex list

</details>

<details>
<summary>✅ v1.7 Performance & Portability (Phases 21-26) - SHIPPED 2026-02-08</summary>

### Phase 21: Granular Selectors
**Goal**: Eliminate unnecessary re-renders
**Plans**: 2 plans

Plans:
- [x] 21-01: Replace full-store destructuring with granular selectors
- [x] 21-02: Verify animation performance with selective subscriptions

### Phase 22: 4-Layer Canvas
**Goal**: Independent layer rendering
**Plans**: 2 plans

Plans:
- [x] 22-01: Split into 4 stacked canvases
- [x] 22-02: Wire independent redraw triggers

### Phase 23: Minimap Optimization
**Goal**: Eliminate temporary canvas creation
**Plans**: 1 plan

Plans:
- [x] 23-01: Average-color cache with debounced redraws

### Phase 24: Batched Wall Operations
**Goal**: Single state update per operation
**Plans**: 1 plan

Plans:
- [x] 24-01: Three-phase batching algorithm

### Phase 25: Delta-Based Undo
**Goal**: 100x+ memory reduction
**Plans**: 2 plans

Plans:
- [x] 25-01: Delta-based undo with snapshot-commit
- [x] 25-02: Migrate all tools to delta pattern

### Phase 26: Portable Architecture
**Goal**: Extract Electron dependencies
**Plans**: 1 plan

Plans:
- [x] 26-01: FileService adapter + MapService extraction

</details>

<details>
<summary>✅ v2.0 Modern Minimalist UI (Phases 27-32) - SHIPPED 2026-02-09</summary>

### Phase 27: OKLCH Design Tokens
**Goal**: Modern minimalist foundation
**Plans**: 2 plans

Plans:
- [x] 27-01: Two-tier OKLCH design token system
- [x] 27-02: Migrate all components to modern tokens

### Phase 28: Author Metadata
**Goal**: Author field in map settings
**Plans**: 1 plan

Plans:
- [x] 28-01: Author metadata with parse/serialize helpers

### Phase 29: Settings Serialization
**Goal**: Auto-serialize game settings to description
**Plans**: 1 plan

Plans:
- [x] 29-01: Category-based serialization for 53 settings

### Phase 30: SEdit Format Parity
**Goal**: Exact default values and binary format
**Plans**: 2 plans

Plans:
- [x] 30-01: Correct 7 default value mismatches
- [x] 30-02: 5-tab consolidated dialog

### Phase 31: Settings Dialog Refinement
**Goal**: Polish settings UX
**Plans**: 1 plan

Plans:
- [x] 31-01: Checkboxes for booleans, range sliders for numeric

### Phase 32: TypeScript Quality
**Goal**: Zero TypeScript errors
**Plans**: 2 plans

Plans:
- [x] 32-01: Resolve 6 pre-existing TypeScript errors
- [x] 32-02: Enable strict mode enforcement

</details>

<details>
<summary>✅ v2.1 MDI Editor & Polish (Phases 33-36) - SHIPPED 2026-02-09</summary>

### Phase 33: Per-Document State
**Goal**: Multi-document state architecture
**Plans**: 1 plan

Plans:
- [x] 33-01: GlobalSlice/DocumentsSlice split with per-doc undo/redo

### Phase 34: MDI Workspace
**Goal**: Child window management
**Plans**: 2 plans

Plans:
- [x] 34-01: react-rnd child windows with drag/resize
- [x] 34-02: Tile and cascade window arrangement

### Phase 35: Cross-Document Clipboard
**Goal**: Copy/paste between maps
**Plans**: 1 plan

Plans:
- [x] 35-01: Clipboard in GlobalSlice with per-doc paste preview

### Phase 36: Status Bar & Settings Polish
**Goal**: Hover info and scrollable settings
**Plans**: 2 plans

Plans:
- [x] 36-01: Source-aware hover labels (X/Y for map, Col/Row for tileset)
- [x] 36-02: Scrollable settings dialog tabs with flexbox

</details>

<details>
<summary>✅ v2.2 Transparency & Performance (Phase 37) - SHIPPED 2026-02-09</summary>

### Phase 37: Render & State Performance
**Goal**: Eliminate idle CPU usage and reduce re-renders
**Requirements**: PERF-01, PERF-02, PERF-03, PERF-04, PERF-05, PERF-06
**Plans**: 3 plans

Plans:
- [x] 37-01: Conditional animation loop + granular state sync
- [x] 37-02: Canvas layer optimization + selector splitting
- [x] 37-03: App.tsx cleanup + Minimap defer + verification

</details>

### 🚧 v2.3 Minimap Independence (In Progress)

**Milestone Goal:** Make the minimap an always-visible, independent component with checkerboard empty-state rendering

#### Phase 38: Minimap Component Extraction
**Goal**: Minimap renders independently with always-visible empty state
**Depends on**: Phase 37
**Requirements**: MMAP-01, MMAP-02, MMAP-03, MMAP-04, MMAP-05
**Success Criteria** (what must be TRUE):
  1. User sees minimap in top-right corner on startup even with no map loaded
  2. Minimap remains visible when animation panel is collapsed or hidden
  3. Empty map areas display a checkerboard pattern (transparency indicator)
  4. Occupied map areas show tile average colors matching previous behavior
  5. Minimap rendering has no measurable performance regression from v2.2
**Plans**: 1 plan

Plans:
- [ ] 38-01-PLAN.md -- Always-visible minimap with checkerboard empty state and sidebar width alignment

## Progress

**Execution Order:**
Phases execute in numeric order.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Pattern Fill & Animations | v1.0 | 2/2 | Complete | 2026-02-01 |
| 2. Horizontal Toolbar | v1.0 | 1/1 | Complete | 2026-02-01 |
| 3. Resizable Panels | v1.0 | 2/2 | Complete | 2026-02-01 |
| 4. CSS Variable Consistency | v1.1 | 1/1 | Complete | 2026-02-02 |
| 5. Classic Scrollbars | v1.1 | 1/1 | Complete | 2026-02-02 |
| 6. Collapsible Panels | v1.1 | 1/1 | Complete | 2026-02-02 |
| 7. Win95 Window Frame | v1.2 | 2/2 | Complete | 2026-02-02 |
| 8. SEdit Panel Layout | v1.2 | 2/2 | Complete | 2026-02-02 |
| 9. Map Settings Dialog | v1.2 | 3/3 | Complete | 2026-02-02 |
| 10. Multi-tile Stamp Alignment | v1.2 | 1/1 | Complete | 2026-02-02 |
| 11. Canvas Dominance | v1.3 | 1/1 | Complete | 2026-02-04 |
| 12. Win98 CSS Variables | v1.4 | 5/5 | Complete | 2026-02-04 |
| 13. Win98 Application Chrome | v1.4 | 5/5 | Complete | 2026-02-04 |
| 14. Game Object Tools | v1.5 | 2/2 | Complete | 2026-02-04 |
| 15. Conveyor Tool | v1.5 | 1/1 | Complete | 2026-02-04 |
| 16. Marquee Selection | v1.6 | 1/1 | Complete | 2026-02-08 |
| 17. Clipboard Operations | v1.6 | 1/1 | Complete | 2026-02-08 |
| 18. Paste Preview | v1.6 | 1/1 | Complete | 2026-02-08 |
| 19. Transform Operations | v1.6 | 1/1 | Complete | 2026-02-08 |
| 20. Animation Panel Redesign | v1.6 | 1/1 | Complete | 2026-02-08 |
| 21. Granular Selectors | v1.7 | 2/2 | Complete | 2026-02-08 |
| 22. 4-Layer Canvas | v1.7 | 2/2 | Complete | 2026-02-08 |
| 23. Minimap Optimization | v1.7 | 1/1 | Complete | 2026-02-08 |
| 24. Batched Wall Operations | v1.7 | 1/1 | Complete | 2026-02-08 |
| 25. Delta-Based Undo | v1.7 | 2/2 | Complete | 2026-02-08 |
| 26. Portable Architecture | v1.7 | 1/1 | Complete | 2026-02-08 |
| 27. OKLCH Design Tokens | v2.0 | 2/2 | Complete | 2026-02-09 |
| 28. Author Metadata | v2.0 | 1/1 | Complete | 2026-02-09 |
| 29. Settings Serialization | v2.0 | 1/1 | Complete | 2026-02-09 |
| 30. SEdit Format Parity | v2.0 | 2/2 | Complete | 2026-02-09 |
| 31. Settings Dialog Refinement | v2.0 | 1/1 | Complete | 2026-02-09 |
| 32. TypeScript Quality | v2.0 | 2/2 | Complete | 2026-02-09 |
| 33. Per-Document State | v2.1 | 1/1 | Complete | 2026-02-09 |
| 34. MDI Workspace | v2.1 | 2/2 | Complete | 2026-02-09 |
| 35. Cross-Document Clipboard | v2.1 | 1/1 | Complete | 2026-02-09 |
| 36. Status Bar & Settings Polish | v2.1 | 2/2 | Complete | 2026-02-09 |
| 37. Render & State Performance | v2.2 | 3/3 | Complete | 2026-02-09 |
| 38. Minimap Component Extraction | v2.3 | 0/1 | Not started | - |
