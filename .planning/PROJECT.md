# AC Map Editor

## What This Is

An Electron/React tile map editor for Armor Critical (SubSpace/Continuum format). Modern minimalist UI with light neutral palette, OKLCH design tokens, 8px grid spacing, flat design, and subtle shadows. SEdit-style layout with maximized canvas, icon toolbar, and resizable panels. Complete tool parity with SEdit including all game object tools, SELECT tool with clipboard operations (copy/cut/paste/delete), floating paste preview, and in-place selection transforms (rotate CW/CCW, mirror in 4 directions). Auto-serializes all 54 game settings to description field for portability. CanvasEngine-driven rendering with off-screen 4096x4096 buffer, Zustand subscriptions bypassing React's render cycle, ref-based drag state with RAF-debounced UI overlay, and zero React re-renders during any drag operation. MDI multi-document editor with per-document state, cross-document clipboard, and child window management. Tile transparency with correct farplane color rendering. Professional zoom controls (slider, input, presets, keyboard shortcuts) with cursor-anchored panning. Ruler tool with 4 measurement modes (line with angle, rectangle, path with segment angles, radius), pinnable measurements with notepad log, and visibility toggle. Tile palette constrained to tileset width with ruler notepad panel in freed space. Portable architecture (FileService adapter pattern for web deployment). Zero TypeScript errors with strict mode.

## Core Value

The map editing experience should feel intuitive and professional — tools work correctly, the layout maximizes the editing canvas, and workflows match what users expect from image editors.

## Requirements

### Validated

<!-- Shipped and confirmed working across v1.0-v2.0 -->

- ✓ File I/O for SubSpace/Continuum map format (v3) — existing
- ✓ Tile palette with multi-tile selection — existing
- ✓ Canvas rendering with zoom/pan/scroll — existing
- ✓ Basic tools (pencil, eraser, wall, line, rect, picker) — existing
- ✓ Map settings panel — existing
- ✓ Undo/redo (50 levels, delta-based) — existing + v1.7
- ✓ Zustand state management — existing
- ✓ Pattern fill with multi-tile selection — v1.0
- ✓ Animation loading from Gfx.dll with frame validation — v1.0
- ✓ Horizontal toolbar with icon+label pattern — v1.0
- ✓ Full-width canvas with resizable bottom panel — v1.0
- ✓ Tabbed bottom panel (Tiles/Animations/Settings) — v1.0
- ✓ CSS custom properties theme system — v1.0
- ✓ Panel size persistence — v1.0
- ✓ CSS variable consistency across all components — v1.1
- ✓ Classic scrollbars with arrow buttons — v1.1
- ✓ Scrollbar track click page jumping — v1.1
- ✓ Continuous scroll on arrow hold — v1.1
- ✓ Collapsible bottom panel (20% default) — v1.1
- ✓ Double-click divider to toggle collapse — v1.1
- ✓ Win95/98 window frame around canvas — v1.2
- ✓ Gray workspace background — v1.2
- ✓ Minimap in top-right corner — v1.2
- ✓ SEdit-style panel layout — v1.2
- ✓ Icon-only toolbar maximizing canvas space — v1.2
- ✓ Comprehensive Map Settings dialog (53 settings, 5 tabs) — v1.2 + v2.0
- ✓ Dirty flag with unsaved changes confirmation — v1.2
- ✓ Map canvas fills available window space (dominant element) — v1.3
- ✓ Layout matches SEdit proportions — v1.3
- ✓ Win98 CSS variable system and theme foundation — v1.4 (replaced by modern tokens in v2.0)
- ✓ Win98 application chrome (toolbar, status bar, title bars, dividers) — v1.4 (modernized in v2.0)
- ✓ SPAWN/SWITCH/BRIDGE tools accessible via toolbar buttons — v1.5
- ✓ CONVEYOR tool with directional pattern fill and live preview — v1.5
- ✓ Variant dropdowns for all game object tools — v1.5
- ✓ Escape key cancellation for drag/line operations — v1.5
- ✓ SELECT tool with marquee selection and marching ants — v1.6
- ✓ Copy/cut/paste/delete with keyboard shortcuts — v1.6
- ✓ Floating paste preview (70% opacity, click to commit) — v1.6
- ✓ Mirror H/V and rotate 90° transforms (Ctrl+H/J/R) — v1.6
- ✓ SEdit-style animation panel (00-FF hex list, Tile/Anim toggle) — v1.6
- ✓ Granular Zustand selectors (no full-store destructuring) — v1.7
- ✓ 4-layer canvas rendering (static, animated, overlays, grid) — v1.7
- ✓ Minimap average-color cache (zero temp canvas creation) — v1.7
- ✓ Batched wall operations (single state update per operation) — v1.7
- ✓ Delta-based undo/redo (100x+ memory reduction) — v1.7
- ✓ FileService adapter interface for web portability — v1.7
- ✓ MapService extraction (zero direct Electron deps in core) — v1.7
- ✓ Modern minimalist UI with OKLCH design tokens and 8px grid — v2.0
- ✓ Two-tier design token system (primitives + semantic aliases) — v2.0
- ✓ All components use modern CSS design tokens (no hardcoded values) — v2.0
- ✓ Author metadata field in Map Settings — v2.0
- ✓ Auto-serialize 53 game settings to description field — v2.0
- ✓ SEdit-exact default values and binary format parity — v2.0
- ✓ Zero TypeScript errors with strict mode — v2.0
- ✓ Map Settings dialog tabs have scrollbars for full content access — v2.1
- ✓ Status bar shows tile ID and coordinates on hover (tileset and map canvas) — v2.1
- ✓ Multiple maps open as child windows in the workspace (MDI) — v2.1
- ✓ Active window drives minimap, settings, and tool operations — v2.1
- ✓ Clipboard operations work across map documents (pick, copy/paste) — v2.1
- ✓ Per-document undo/redo, dirty flags, selection state — v2.1
- ✓ Tile/cascade window arrangement — v2.1

- ✓ Tile transparency: canvas shows farplane color for transparent pixels — v2.2
- ✓ Multi-tile stamp skips empty tiles during placement — v2.2
- ✓ Conditional animation loop with Page Visibility API — v2.2
- ✓ Granular per-field state sync in 22 wrapper actions — v2.2
- ✓ Split MapCanvas mega-selector into 3 focused groups — v2.2
- ✓ Deferred minimap computation via requestIdleCallback — v2.2
- ✓ Minimap always visible, independent of animation panel — v2.3
- ✓ Minimap renders on startup with checkerboard empty state — v2.3
- ✓ Empty map areas show checkerboard pattern (transparency indicator) — v2.3
- ✓ Sidebar collapse toggle for full-canvas editing mode — v2.3

- ✓ Minimize button with CSS-drawn icon, minimized windows as 160px compact bars at workspace top — v2.4
- ✓ Maximize button fills entire workspace, title bar hidden for max canvas space — v2.4
- ✓ Restore from minimized or maximized to previous size/position via savedBounds — v2.4
- ✓ Double-click title bar toggles maximize/restore — v2.4
- ✓ Close button turns red on hover, minimize/maximize get subtle neutral highlight — v2.4

- ✓ In-place rotation of selected map tiles (90° CW and CCW) with automatic bounds resize — v2.5
- ✓ Adjacent mirror-copy of selected tiles in 4 directions (Right, Left, Up, Down) — v2.5
- ✓ Restructured toolbar with separate rotate CW/CCW buttons, mirror dropdown, clipboard buttons — v2.5
- ✓ Disabled states for transform/clipboard buttons when no selection or clipboard data — v2.5
- ✓ Old clipboard-based Ctrl+H/J/R transforms removed, replaced by in-place selection transforms — v2.5

- ✓ Tile animations render correctly at all zoom levels (0.25x to 4x) — v2.6
- ✓ Pan drag sensitivity is correct (1:1 cursor-anchored movement at all zoom levels) — v2.6
- ✓ Zoom level can be set via manual numeric input — v2.6
- ✓ Zoom level can be set via slider control — v2.6
- ✓ Zoom preset buttons (25%, 50%, 100%, 200%, 400%) — v2.6
- ✓ Keyboard zoom shortcuts (Ctrl+0 reset, Ctrl+=/- in/out) — v2.6
- ✓ Rendering/animation pipeline optimized for smooth performance — v2.6

- ✓ Minimap empty state shows checkerboard only (no label) — v2.7
- ✓ Scrollbar thumb position/size correctly reflects viewport state at all zoom levels — v2.7
- ✓ Scrollbars update in real-time during pan drag, zoom, and minimap navigation — v2.7
- ✓ Scrollbar drag moves viewport with correct sensitivity — v2.7
- ✓ Tiles render progressively during pan drag via RAF-debounced re-render — v2.7
- ✓ 4-layer canvas consolidated to 2 layers (map + UI overlay) — v2.7
- ✓ Grid rendered via createPattern fill instead of individual line segments — v2.7
- ✓ Off-screen 4096x4096 map buffer with incremental tile patching — v2.7

- ✓ CanvasEngine class encapsulates all rendering (buffer, tile rendering, viewport blitting) — v2.8
- ✓ Engine subscribes directly to Zustand for viewport/map/animation — bypasses React render cycle — v2.8
- ✓ Pencil drag accumulates tiles in ref, patches buffer imperatively, single batch commit on mouseup — v2.8
- ✓ All transient UI state (cursor, line, selection, paste preview) tracked via refs with RAF-debounced redraw — v2.8
- ✓ Zero React re-renders during any drag operation (pencil, rect, selection, line) — v2.8
- ✓ Undo blocked during active drag to prevent two-source-of-truth corruption — v2.8
- ✓ Tool switch and unmount safety for all ref-based drags — v2.8

- ✓ Ruler tool with line distance mode (Manhattan + Euclidean in tiles) — v2.9
- ✓ Ruler rectangle area mode (W×H + tile count) — v2.9
- ✓ Ruler multi-point path mode (click waypoints → cumulative path length) — v2.9
- ✓ Ruler radius mode (center + drag → radius in tiles, circle area) — v2.9
- ✓ Ruler measurements can be pinned to persist (P key), Escape clears all — v2.9
- ✓ Selection tile count and dimensions shown in status bar — v2.9
- ✓ Floating dimension label positioned outside selection border — v2.9
- ✓ Grid opacity slider (transparent ↔ opaque) — v2.9
- ✓ Grid line weight control (thin ↔ thick) — v2.9
- ✓ Grid line color picker — v2.9
- ✓ Center on Selection command (Ctrl+E) pans viewport to center selection — v2.9

- ✓ Tile palette panel constrained to tileset width (~640px) — v3.0
- ✓ Ruler notepad panel with editable measurement log and annotations — v3.0
- ✓ Ruler angle display for line/path measurements — v3.0
- ✓ Measurement visibility toggle (hide/show pinned measurements on canvas) — v3.0
- ✓ Mode-specific setting promotion to General tab per game mode — v3.0 (ad-hoc)
- ✓ DeathMatchWin setting (1-999) with 54 total auto-serialized settings — v3.0 (ad-hoc)
- ✓ Hover tooltips on all settings labels — v3.0 (ad-hoc)
- ✓ Animated spawn variants (single tile per team, 4 team colors) — v3.2
- ✓ Animated warp variants (3x3 block with BigWarp tiles 0x9A-0xA2) — v3.2
- ✓ Downward and right conveyor animation encoding fix — v3.2
- ✓ Farplane background toggle with actual imgFarplane image rendering — v3.2
- ✓ Warp encoding always uses 0xFA (the only functional warp animation) — v3.2
- ✓ Status bar animated tile display in SEdit format (Anim: XX Offset: Y) — v3.2
- ✓ Animation offset input (0-127) in Animations panel with GlobalSlice persistence — v3.3
- ✓ Placed animated tiles encode current offset value via makeAnimatedTile() — v3.3
- ✓ Picker tool captures offset from existing animated tiles and syncs to panel — v3.3
- ✓ Picker decodes warp routing (dest*10+src) into Source/Dest dropdowns — v3.3
- ✓ Offset input validation with visual error feedback for out-of-range values — v3.3

### Active

## Current Milestone: v3.4 Tool Polish & Warm UI

**Goal:** Expand wall tool to support all 15 wall types, add 9E warp routing, extend animation offset to all tiles, add multi-tile tool previews, improve tool icons, and warm up the UI color palette.

**Target features:**
- All 15 wall types accessible via dropdown variants with visual wall segment previews
- 9E warp tile encodes routing (src/dest) like FA
- Animation offset control extended to all animated tile types
- Multi-tile placement previews for game object tools (warp 3x3, bunker 4x4, etc.)
- Improved tool icons for bunker, conveyor, and wall tools
- Warmer UI color palette (shift OKLCH neutrals from cool blue-grey to warm cream)

### Out of Scope

- Floating/dockable panels — keeping fixed layout for simplicity
- Custom in-app menu bar — staying with native Electron menu
- V2 map format support — separate concern
- Tileset selection UI — separate concern
- Keyboard shortcut remapping — low priority
- Content-aware transform tables (rotTbl/mirTbl) — geometric transforms sufficient for now
- System clipboard integration — internal clipboard preserves tile encoding
- Session persistence for ruler notepad — measurement log is per-session
- Custom measurement scales — deferred to future milestone

## Context

**Current State (after v3.3):**
- 23 milestones shipped in 16 days (v1.0-v3.3)
- 70 phases, 104 plans executed
- CanvasEngine-driven rendering: standalone class owns buffer, Zustand subscriptions, and all draw operations
- Zero React re-renders during any drag operation (pencil, rect, selection, line)
- Ref-based transient state with RAF-debounced UI overlay for 60fps interactions
- Full MDI editor with per-document state, cross-document clipboard, child window management
- Modern minimalist UI with complete SEdit tool parity and format compatibility
- In-place selection transforms: rotate CW/CCW, mirror in 4 directions with adjacent copy
- Professional zoom controls: slider, numeric input, presets, keyboard shortcuts
- 2-layer canvas with off-screen 4096x4096 buffer and incremental tile patching
- Ruler tool with 4 measurement modes (line+angle, rectangle, path+angles, radius) and pin/clear support
- Ruler notepad panel with measurement log, inline labels, deletion, clipboard export
- Measurement visibility toggle (hide/show pinned measurements on canvas)
- Tile palette constrained to 640px tileset width, freed space hosts notepad
- Selection info: status bar dimensions + floating canvas label
- Grid customization: opacity, weight, color controls with localStorage persistence
- Center on Selection (Ctrl+E) via View menu and keyboard shortcut
- Mode-specific setting promotion (FRAG/FLAG/ASSASSIN/DOMINATION/SWITCH) with hover tooltips
- Portable architecture: FileService/MapService adapters, src/core/ has zero Electron deps
- Animated game object variants: spawn (single tile per team), warp (3x3 block), conveyor (animated encoding)
- Farplane toggle: renders actual imgFarplane image, cached per-frame for performance
- Animation offset control: user-editable 0-127 offset with picker sync and warp routing decode
- All 54 game settings auto-serialize to description field
- Zero TypeScript errors with strict mode
- Tech stack: Electron 28, React 18, TypeScript, Vite 5, Zustand, Canvas API, react-rnd
- Codebase: ~16,500+ LOC TypeScript/CSS

**Tech Debt:**
- Content-aware transforms not implemented (directional tiles may rotate incorrectly)
- Phase 20 completed outside GSD tracking (no SUMMARY.md)
- Title bar gradient still uses hardcoded hex colors (intentional for linear-gradient)
- Three stale empty phase directories (16-marquee-selection, 18-tool-investigation-fixes, 20-animation-panel-redesign)
- SUB-02 dirty flags declared but not actively used (RAF debouncing serves equivalent purpose)
- Unused variable warnings (TS6133) for cursorTileRef, immediatePatchTile leftovers from refactoring
- Wall pencil stays on Zustand during drag (auto-connection requires neighbor reads — documented exception)
- Duplicate centering math in App.tsx and ToolBar.tsx (could extract to utility)

**Reference:**
- SEdit source analysis: `E:\AC-SEDIT-SRC-ANALYSIS\SEDIT\SEdit-SRC-Analysis\SEDIT_Technical_Analysis.md`

## Constraints

- **Tech stack**: Must use existing Electron/React/Zustand stack
- **Portability**: src/core/ must remain free of Electron dependencies
- **Map format**: 256x256 fixed grid, 16x16px tiles, existing format unchanged

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Tabs at top of bottom panel | Matches Chrome/VS Code convention users know | ✓ Good |
| Icons + tooltips (no labels in toolbar) | Keeps toolbar compact, tooltips provide discoverability | ✓ Good |
| Native menu bar | Less custom code, OS-native feel | ✓ Good |
| react-resizable-panels library | Lightweight, good API, localStorage persistence built-in | ✓ Good |
| Filter frame indices 0-3999 | Valid tileset range, rejects Gfx.dll garbage data | ✓ Good |
| Two-tier CSS variables | Separates primitives from semantic tokens for flexibility | ✓ Good |
| Hand-write CSS (no 98.css dep) | More control, no dependency, use 98.css as reference only | ✓ Good |
| SEdit source as tool behavior reference | Tools must match SEdit's actual implementation | ✓ Good |
| S/H/J shortcuts for SPAWN/SWITCH/BRIDGE | W and B already taken by WALL and PENCIL | ✓ Good |
| Escape cancels all drag/line operations | Consistent cancellation across all tools | ✓ Good |
| 70% opacity live preview | Semi-transparent for see-through during placement | ✓ Good |
| Selection as tile coordinates (not pixels) | Zoom-accurate at all levels (0.25x-4x) | ✓ Good |
| Marching ants via existing animationFrame | Zero overhead, reuses Zustand counter | ✓ Good |
| Ctrl+R for rotate (overrides Electron reload) | Matches SEdit shortcuts exactly | ✓ Good |
| Copy preserves full 16-bit tile values | Animation flags, game objects all preserved | ✓ Good |
| Selection persists after cut/delete | Enables immediate re-copy/paste workflow | ✓ Good |
| useShallow for 4+ fields, individual for 1-3 | Optimal Zustand selector granularity | ✓ Good |
| 4 stacked canvases for layer independence | Each layer redraws independently | ✓ Good |
| Average all 256 pixels per tile for minimap | Accurate color representation vs center-pixel sampling | ✓ Good |
| Three-phase wall batching algorithm | Deduplicates placements + neighbor updates | ✓ Good |
| Delta-based undo with snapshot-commit pattern | 100x+ memory reduction, minimal caller changes | ✓ Good |
| FileService Result types (not exceptions) | Explicit error handling, portable pattern | ✓ Good |
| MapService constructor injection | Testable, adapter-swappable file I/O | ✓ Good |
| OKLCH primitives + semantic aliases (v2.0) | Perceptual uniformity, cool-toned neutrals | ✓ Good |
| Modern minimalist replaces Win98 (v2.0) | Cleaner professional look, single visual identity | ✓ Good |
| Category-based flagger filtering (v2.0) | Avoids FogOfWar/FlagInPlay false positives | ✓ Good |
| Three-layer merge for settings (v2.0) | defaults < description < extendedSettings priority | ✓ Good |
| Checkboxes for boolean settings (v2.0) | User preference for clarity over toggles | ✓ Good |
| 5-tab consolidated dialog (v2.0) | Simpler than 10 tabs, subcategory grouping | ✓ Good |
| SEdit default parity, 7 fields corrected (v2.0) | Exact format compatibility for new maps | ✓ Good |
| Documents in Map<DocumentId, DocumentState> (v2.1) | O(1) access, clean multi-doc architecture | ✓ Good |
| MAX_OPEN_DOCUMENTS = 8 (v2.1) | Prevents canvas context exhaustion | ✓ Good |
| Custom MDI with react-rnd (v2.1) | Simpler than FlexLayout, fewer MapCanvas conflicts | ✓ Good |
| Clipboard in GlobalSlice (v2.1) | Enables cross-document copy/paste naturally | ✓ Good |
| Per-document paste preview isolation (v2.1) | Prevents paste preview leak across windows | ✓ Good |
| dragHandleClassName for title bar only (v2.1) | Prevents MapCanvas mouse event conflicts | ✓ Good |
| Source-aware hover labels (v2.1) | X/Y for map, Col/Row for tileset — contextual clarity | ✓ Good |
| Checkerboard inline in imageData (v2.3) | Avoids putImageData compositing issue | ✓ Good |
| Locked sidebar with collapse toggle (v2.3) | Fixed width prevents layout jank, toggle for full canvas | ✓ Good |
| requestIdleCallback.bind(window) (v2.3) | Stable ref avoids idle callback cancellation loop | ✓ Good |
| In-place rotation pattern (v2.5) | Extract → rotate → clear → write → update bounds for selection transforms | ✓ Good |
| Adjacent copy pattern for mirror (v2.5) | Original stays, mirrored copy placed adjacent, selection expands | ✓ Good |
| Transpose+reverse for 90° rotation (v2.5) | Mathematically correct and efficient algorithm | ✓ Good |
| Removed 180°/-180° rotation (v2.5) | Redundant — use 90° twice instead, simpler API | ✓ Good |
| Split ROTATE into separate CW/CCW buttons (v2.5) | Faster access than dropdown for common operations | ✓ Good |
| Removed all single-letter shortcuts (v2.5) | Clean slate — Ctrl+ shortcuts preserved, tools via toolbar only | ✓ Good |
| Action buttons don't change tool mode (v2.5) | Rotate/mirror execute immediately without affecting current tool | ✓ Good |
| viewport.x/y are tile coordinates (v2.6) | Never divide by TILE_SIZE*zoom in hasVisibleAnimatedTiles() | ✓ Good |
| Cursor-anchored panning (v2.6) | dragAnchor stores tile coordinates, viewport recalculated each move | ✓ Good |
| All zoom controls sync through setViewport (v2.6) | Single source of truth for zoom state across slider/input/presets/keyboard | ✓ Good |
| Preset navigation for Ctrl+=/- (v2.6) | Jumps to next/previous preset, falls back to +/-0.25 | ✓ Good |

| Off-screen 4096x4096 map buffer (v2.7) | Single drawImage blit for viewport, incremental tile patching | ✓ Good |
| Dropped ImageBitmap atlas (v2.7) | 4000 createImageBitmap calls froze the app — direct drawImage from tileset works fine | ✓ Good |
| Dropped alpha:false (v2.7) | Broke tile transparency, marginal compositor benefit not worth it | ✓ Good |
| 2-layer canvas (v2.7) | Map layer + UI overlay — fewer DOM elements, simpler code | ✓ Good |
| Pattern-based grid rendering (v2.7) | O(1) createPattern fill vs O(N) line strokes | ✓ Good |
| CanvasEngine class pattern (v2.8) | Encapsulates buffer, rendering, subscriptions — imperative canvas ops bypass React | ✓ Good |
| Manual reference equality in subscriptions (v2.8) | Simpler than subscribeWithSelector middleware, works with immutable state | ✓ Good |
| Instance field documentId in engine (v2.8) | Avoids stale closure pitfall in long-lived Zustand subscriptions | ✓ Good |
| isDragActive guard on map subscription (v2.8) | Prevents engine from overwriting pending tiles during drag | ✓ Good |
| Map<number,number> reused across drags (v2.8) | Clear instead of recreate for better GC | ✓ Good |
| Module-level activeEngine singleton (v2.8) | Enables isAnyDragActive() cross-component checks without prop drilling | ✓ Good |
| RAF-debounced requestUiRedraw (v2.8) | Coalesces multiple ref mutations per frame (cursor + preview) | ✓ Good |
| Tool switch commits pencil, cancels others (v2.8) | Preserves painted tiles (user intent clear), discards transient previews | ✓ Good |
| Wall pencil stays on Zustand during drag (v2.8) | Auto-connection reads 8 neighbors — documented TOOL-02 exception | ✓ Good |
| Permanent Escape listener (v2.8) | Single listener for all drag cancellation, no add/remove churn | ✓ Good |
| Composite cache key for grid pattern (v2.9) | Zoom + opacity + weight + color invalidates pattern only when inputs change | ✓ Good |
| Ref-based transient state for ruler (v2.9) | Same pattern as line/rect tools, zero React re-renders during measurement | ✓ Good |
| Inclusive tile counting for rectangle (v2.9) | +1 to width/height matches user expectation for area measurement | ✓ Good |
| Click-to-add for path waypoints (v2.9) | Natural interaction for multi-point measurement, double-click to finalize | ✓ Good |
| P key pins, Escape clears all (v2.9) | Simple two-key UX for pin/clear lifecycle | ✓ Good |
| Mode selector only when ruler active (v2.9) | Contextual UI reduces status bar clutter for non-ruler tools | ✓ Good |
| Ctrl+E for center-on-selection (v2.9) | Free shortcut, mnemonic, no conflict with existing bindings | ✓ Good |
| Click-click AND drag for ruler (v2.9) | Both interaction modes supported — drag-release or click-move-click | ✓ Good |
| Content-only 640px tile palette width (v3.0) | Matches tileset image width exactly, borders/padding additional | ✓ Good |
| Fixed split, no resize handle (v3.0) | Freed space for notepad content, not user adjustment | ✓ Good |
| Extract formatMeasurement utility (v3.0) | Shared logic between notepad and overlays — single source of truth | ✓ Good |
| Individual Zustand selectors for notepad (v3.0) | Render optimization — prevents unnecessary re-renders | ✓ Good |
| Hover-reveal delete buttons (v3.0) | Clean minimalist UI — actions visible only when relevant | ✓ Good |
| Standard math angle convention (v3.0) | 0° = right, 90° = up — consistent with mathematical standard | ✓ Good |
| PATH mode segment count not angles (v3.0) | Avoids verbosity — user sees count, individual angles in overlay | ✓ Good |
| Eye icon visibility toggle (v3.0) | Follows design tool convention for show/hide | ✓ Good |
| Hidden measurements retain notepad (v3.0) | Full edit/delete/copy even when hidden from canvas | ✓ Good |
| Animated spawn = single tile, not 3x3 (v3.2) | Static spawn is 3x3 cross, animated is single tile — separate click offset logic | ✓ Good |
| Warp always 0xFA (v3.2) | Only animation 0xFA functions as in-game warp, other WARP_STYLES don't route | ✓ Good |
| Cache showFarplane per-frame (v3.2) | Avoids getState() per tile (65536 calls) — cache at drawMapLayer start | ✓ Good |
| Farplane from actual image (v3.2) | drawFarplaneTile() renders from imgFarplane HTMLImageElement, not solid black | ✓ Good |
| Full buffer rebuild on toggle (v3.2) | Clear prevTiles forces full redraw when showFarplane changes — simple and correct | ✓ Good |
| Type 1/Type 2 variant labels (v3.2) | Both spawn and warp variants are animated, avoid misleading "Static"/"Animated" names | ✓ Good |
| Offset in GlobalSlice not local state (v3.3) | Enables picker sync, persists across component unmount, consistent with selectedTile pattern | ✓ Good |
| Warp routing separate from animation offset (v3.3) | Warp uses warpSrc/warpDest from gameObjectToolState, not animationOffsetInput — prevents collision | ✓ Good |
| Same offset for all 9 warp pattern tiles (v3.3) | Simpler UX, matches SEdit behavior for animated warp block | ✓ Good |
| Error state local to AnimationPanel (v3.3) | Visual error indicator is component-local; store always clamps to valid range at setter level | ✓ Good |

**Pending Ideas (for future milestones):**
- Offset increment/decrement hotkeys (OFST-04)
- Batch offset adjustment for selected region (OFST-05)
- Per-tile offset editing post-placement (OFST-06)
- Custom measurement scales (RULER-07)
- OffscreenCanvas + Web Worker rendering (if further perf needed)
- Chunked pre-rendering for larger map support

---
*Last updated: 2026-02-15 after v3.4 milestone started*
