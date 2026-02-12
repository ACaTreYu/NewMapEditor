# Roadmap: AC Map Editor

## Milestones

- ✅ **v1.0 MVP** - Phases 1-3 (shipped 2026-02-01)
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
- ✅ **v2.3 Minimap Independence** - Phase 38 (shipped 2026-02-10)
- ✅ **v2.4 MDI Window Controls** - Phases 39-40 (shipped 2026-02-10)
- ✅ **v2.5 Selection Transform Tools** - Phases 41-43 (shipped 2026-02-11)
- ✅ **v2.6 Viewport & Animation Fixes** - Phases 44-46 (shipped 2026-02-11)
- 🚧 **v2.7 Rendering & Navigation** - Phases 47-50 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-3) - SHIPPED 2026-02-01</summary>

### Phase 1: Pattern Fill & Animation Loading
**Goal**: Multi-tile pattern fill and animation data loading from Gfx.dll
**Plans**: 5 plans

Plans:
- [x] 01-01: Pattern fill with multi-tile selections
- [x] 01-02: Animation loading with frame validation
- [x] 01-03: CSS custom properties theme system
- [x] 01-04: Horizontal toolbar with icon+label pattern
- [x] 01-05: Vertical resizable panels with persistence

</details>

<details>
<summary>✅ v1.1 Canvas & Polish (Phases 4-6) - SHIPPED 2026-02-02</summary>

### Phase 4: CSS Variable Consistency
**Goal**: Unified CSS variable system across all components
**Plans**: 1 plan

### Phase 5: Classic Scrollbars
**Goal**: Windows-style scrollbars with arrow buttons and continuous scroll
**Plans**: 1 plan

### Phase 6: Collapsible Panel
**Goal**: Bottom panel collapse toggle maximizing canvas space
**Plans**: 1 plan

</details>

<details>
<summary>✅ v1.2 SEdit-Style Layout (Phases 7-10) - SHIPPED 2026-02-02</summary>

### Phase 7: Win95 Window Frame
**Goal**: Win95/98 aesthetic with sunken canvas border and gray workspace
**Plans**: 3 plans

### Phase 8: Minimap Repositioning
**Goal**: Move minimap to top-right corner with click-to-navigate
**Plans**: 1 plan

### Phase 9: SEdit Panel Layout
**Goal**: Left animations panel, bottom tileset, icon-only toolbar
**Plans**: 3 plans

### Phase 10: Map Settings Dialog
**Goal**: Comprehensive settings dialog with 53 game settings across 10 tabs
**Plans**: 2 plans

</details>

<details>
<summary>✅ v1.3 Layout Fix (Phase 11) - SHIPPED 2026-02-04</summary>

### Phase 11: Canvas Dominance
**Goal**: Map canvas fills available space with proper flexbox sizing
**Plans**: 1 plan

</details>

<details>
<summary>✅ v1.4 Win98 Theme Overhaul (Phases 12-13) - SHIPPED 2026-02-04</summary>

### Phase 12: Win98 CSS Variable System
**Goal**: Two-tier CSS variable system with Win98 chrome patterns
**Plans**: 7 plans

### Phase 13: Win98 Component Purge
**Goal**: Remove all modern CSS from components for authentic Win98 look
**Plans**: 3 plans

</details>

<details>
<summary>✅ v1.5 Functional Tools (Phases 14-15) - SHIPPED 2026-02-04</summary>

### Phase 14: Game Object Tools
**Goal**: SPAWN/SWITCH/BRIDGE tools accessible via toolbar with variant dropdowns
**Plans**: 2 plans

### Phase 15: CONVEYOR Tool
**Goal**: Directional pattern fill with live preview and Escape cancellation
**Plans**: 1 plan

</details>

<details>
<summary>✅ v1.6 SELECT & Animation Panel (Phases 16-20) - SHIPPED 2026-02-08</summary>

### Phase 16: SELECT Tool Core
**Goal**: Marquee selection with marching ants and selection persistence
**Plans**: 1 plan

### Phase 17: Clipboard Operations
**Goal**: Copy/cut/paste/delete with keyboard shortcuts and undo integration
**Plans**: 1 plan

### Phase 18: Paste Preview
**Goal**: Floating paste preview at 70% opacity with click-to-commit
**Plans**: 1 plan

### Phase 19: Selection Transforms
**Goal**: Mirror H/V and rotate 90° with Ctrl+H/J/R shortcuts
**Plans**: 1 plan

### Phase 20: Animation Panel Redesign
**Goal**: SEdit-style vertical hex list with Tile/Anim toggle
**Plans**: 1 plan

</details>

<details>
<summary>✅ v1.7 Performance & Portability (Phases 21-26) - SHIPPED 2026-02-08</summary>

### Phase 21: Granular Zustand Selectors
**Goal**: Per-component optimized selectors eliminating re-render cascades
**Plans**: 2 plans

### Phase 22: 4-Layer Canvas Architecture
**Goal**: Independent layer rendering with optimized redraw triggers
**Plans**: 2 plans

### Phase 23: Minimap Optimization
**Goal**: Average-color cache with debounced redraws and zero temp canvas creation
**Plans**: 2 plans

### Phase 24: Batched Wall Operations
**Goal**: Single state update for wall line/rect operations
**Plans**: 1 plan

### Phase 25: Delta-Based Undo
**Goal**: 100x+ memory reduction with snapshot-commit pattern
**Plans**: 1 plan

### Phase 26: Portable Architecture
**Goal**: FileService/MapService adapters removing Electron dependencies from src/core/
**Plans**: 1 plan

</details>

<details>
<summary>✅ v2.0 Modern Minimalist UI (Phases 27-32) - SHIPPED 2026-02-09</summary>

### Phase 27: OKLCH Design Tokens
**Goal**: Two-tier design token system replacing Win98 aesthetic
**Plans**: 2 plans

### Phase 28: Component Modernization
**Goal**: All components use OKLCH tokens with modern minimalist styling
**Plans**: 2 plans

### Phase 29: Settings Serialization
**Goal**: Auto-serialize 53 game settings to description field with Author metadata
**Plans**: 2 plans

### Phase 30: SEdit Format Parity
**Goal**: Correct default values and binary format for exact compatibility
**Plans**: 1 plan

### Phase 31: Consolidated Settings Dialog
**Goal**: 5-tab dialog with category-based organization and scrollable content
**Plans**: 1 plan

### Phase 32: TypeScript Strict Mode
**Goal**: Zero TypeScript errors with strict mode enforcement
**Plans**: 1 plan

</details>

<details>
<summary>✅ v2.1 MDI Editor & Polish (Phases 33-36) - SHIPPED 2026-02-09</summary>

### Phase 33: Per-Document State Architecture
**Goal**: GlobalSlice/DocumentsSlice architecture with isolated undo/redo
**Plans**: 2 plans

### Phase 34: MDI Workspace
**Goal**: react-rnd child windows with drag/resize/tile/cascade arrangement
**Plans**: 2 plans

### Phase 35: Cross-Document Clipboard
**Goal**: Copy/paste between open maps with full 16-bit tile encoding
**Plans**: 1 plan

### Phase 36: Settings Dialog & Status Bar Polish
**Goal**: Scrollable settings tabs and source-aware hover info
**Plans**: 1 plan

</details>

<details>
<summary>✅ v2.2 Transparency & Performance (Phase 37) - SHIPPED 2026-02-09</summary>

### Phase 37: Transparency & Render Optimization
**Goal**: Tile transparency rendering and performance optimizations
**Plans**: 3 plans

Plans:
- [x] 37-01: Tile transparency with farplane color and stamp skipping
- [x] 37-02: Conditional animation loop with Page Visibility API
- [x] 37-03: Granular state sync and selector optimization

</details>

<details>
<summary>✅ v2.3 Minimap Independence (Phase 38) - SHIPPED 2026-02-10</summary>

### Phase 38: Always-Visible Minimap
**Goal**: Minimap renders on startup with checkerboard empty state and sidebar collapse
**Plans**: 1 plan

Plans:
- [x] 38-01: Minimap independence with checkerboard and sidebar collapse

</details>

<details>
<summary>✅ v2.4 MDI Window Controls (Phases 39-40) - SHIPPED 2026-02-10</summary>

### Phase 39: Minimize & Restore
**Goal**: Minimize to compact bars with savedBounds restore pattern
**Plans**: 1 plan

### Phase 40: Maximize & Window Behavior
**Goal**: Maximize fills workspace with hidden title bar and double-click toggle
**Plans**: 1 plan

</details>

<details>
<summary>✅ v2.5 Selection Transform Tools (Phases 41-43) - SHIPPED 2026-02-11</summary>

### Phase 41: In-Place Rotation
**Goal**: Rotate selected tiles 90° CW/CCW with automatic bounds resize
**Plans**: 1 plan

### Phase 42: Adjacent Mirror Copy
**Goal**: Mirror selected tiles in 4 directions with adjacent copy and selection expansion
**Plans**: 1 plan

### Phase 43: Toolbar Restructure & Cleanup
**Goal**: Separate transform buttons, disabled states, dead code removal
**Plans**: 2 plans

</details>

<details>
<summary>✅ v2.6 Viewport & Animation Fixes (Phases 44-46) - SHIPPED 2026-02-11</summary>

### Phase 44: Animation Visibility Fix
**Goal**: Animations render correctly at all zoom levels (0.25x to 4x), not just at extreme zoom-out
**Plans**: 1 plan

### Phase 45: Pan Sensitivity Fix
**Goal**: Pan drag moves map 1:1 with mouse movement at all zoom levels (no over/under-sensitivity)
**Plans**: 1 plan

### Phase 46: Zoom Controls UI
**Goal**: Professional zoom controls in status bar (slider, input, presets, keyboard shortcuts)
**Plans**: 1 plan

</details>

### 🚧 v2.7 Rendering & Navigation (In Progress)

**Milestone Goal:** Smooth real-time rendering during viewport panning, working scrollbar-viewport sync, and canvas optimization for professional-grade performance.

#### Phase 47: UI Cleanup + Scrollbar Math Fix
**Goal**: Remove minimap label and establish correct scrollbar thumb size/position/drag behavior
**Depends on**: Phase 46
**Requirements**: UI-01, SCROLL-01, SCROLL-02, SCROLL-04, SCROLL-05
**Success Criteria** (what must be TRUE):
  1. Minimap empty state shows checkerboard pattern only (no text label)
  2. Scrollbar thumb size accurately reflects viewport-to-map ratio at all zoom levels
  3. Scrollbar thumb position tracks viewport offset using standard formula (offset / maxOffset * scrollableRange)
  4. Scrollbar thumb drag moves viewport with correct sensitivity (accounts for thumb size in delta calculation)
  5. Scrollbars update when viewport changes via zoom wheel, minimap click, or keyboard shortcuts
**Plans**: 1 plan

Plans:
- [x] 47-01: Minimap label removal and scrollbar math overhaul

#### Phase 48: Real-Time Pan Rendering
**Goal**: Hybrid CSS transform + RAF progressive re-render enables smooth tile updates during pan drag
**Depends on**: Phase 47
**Requirements**: PAN-01, PAN-02, PAN-03, SCROLL-03
**Success Criteria** (what must be TRUE):
  1. Pan drag shows immediate visual feedback via CSS transform (no waiting for canvas re-render)
  2. Tiles re-render progressively during drag via RAF-debounced canvas updates (not just on mouse release)
  3. Viewport state commits to Zustand only on mouse release (avoiding React overhead during drag)
  4. Scrollbars update in real-time during pan drag as viewport progressively changes
**Plans**: 1 plan

Plans:
- [x] 48-01: RAF progressive render, parameterized draw functions, scrollbar sync, snap-back prevention

#### Phase 49: Canvas Optimization
**Goal**: Compositor hints, GPU-ready tile data, layer consolidation, and pattern-based grid rendering
**Depends on**: Phase 48
**Requirements**: PERF-01, PERF-02, PERF-03, PERF-04
**Success Criteria** (what must be TRUE):
  1. Static canvas layer uses alpha:false for compositor optimization
  2. Tileset pre-sliced into ImageBitmap array at load time for GPU-ready rendering
  3. Canvas architecture consolidated from 4 layers to 2 (map layer + UI overlay layer)
  4. Grid rendered via createPattern() fill instead of drawing individual line segments
**Plans**: 1 plan

Plans:
- [x] 49-01: ImageBitmap tile atlas, layer consolidation (4→2), alpha:false, pattern grid

#### Phase 50: Buffer Zone Over-Rendering
**Goal**: Pre-render 3-4 tiles beyond viewport edges so tiles slide into view during pan
**Depends on**: Phase 49
**Requirements**: BUF-01, BUF-02
**Success Criteria** (what must be TRUE):
  1. Visible tile range expanded by 3-4 tiles in each direction beyond viewport edges
  2. Pre-rendered buffer tiles slide into view during pan, reducing re-render frequency
**Plans**: TBD

Plans:
- [ ] 50-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 47 → 48 → 49 → 50

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-43 | v1.0-v2.5 | 75/75 | Complete | 2026-02-11 |
| 44-46 | v2.6 | 3/3 | Complete | 2026-02-11 |
| 47. UI Cleanup + Scrollbar Math | v2.7 | 1/1 | Complete | 2026-02-12 |
| 48. Real-Time Pan Rendering | v2.7 | 1/1 | Complete | 2026-02-12 |
| 49. Canvas Optimization | v2.7 | 1/1 | Complete | 2026-02-12 |
| 50. Buffer Zone | v2.7 | 0/? | Not started | - |

---
*Last updated: 2026-02-12 after Phase 49 execution*
