# AC Map Editor

## What This Is

An Electron/React tile map editor for Armor Critical (SubSpace/Continuum format). Modern minimalist UI with light neutral palette, OKLCH design tokens, 8px grid spacing, flat design, and subtle shadows. SEdit-style layout with maximized canvas, icon toolbar, and resizable panels. Complete tool parity with SEdit including all game object tools, SELECT tool with clipboard operations (copy/cut/paste/delete), floating paste preview, mirror/rotate transforms, and SEdit keyboard shortcuts. Auto-serializes all 53 game settings to description field for portability. Optimized 4-layer canvas rendering with conditional animation loop, granular state sync, delta-based undo, and portable architecture (FileService adapter pattern for web deployment). MDI multi-document editor with per-document state, cross-document clipboard, and child window management. Tile transparency with correct farplane color rendering. Zero TypeScript errors with strict mode.

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

### Active

<!-- Current milestone: v2.3 Minimap Independence -->

## Current Milestone: v2.3 Minimap Independence

**Goal:** Make the minimap an always-visible, independent component with checkerboard empty-state rendering

**Target features:**
- Minimap decoupled from animation panel — always visible regardless of panel state
- Minimap visible on startup with no map loaded (empty state)
- Checkerboard background for empty/unoccupied areas, tile colors where content exists
- Lightweight rendering (no performance regression)

### Out of Scope

- Floating/dockable panels — keeping fixed layout for simplicity
- Custom in-app menu bar — staying with native Electron menu
- V2 map format support — separate concern
- Tileset selection UI — separate concern
- Keyboard shortcut remapping — low priority
- Content-aware transform tables (rotTbl/mirTbl) — geometric transforms sufficient for now
- System clipboard integration — internal clipboard preserves tile encoding

## Context

**Current State (after v2.2):**
- 11 milestones shipped in 9 days (v1.0-v2.2)
- 37 phases, 68 plans executed
- Full MDI editor with per-document state, cross-document clipboard, child window management
- Modern minimalist UI with complete SEdit tool parity and format compatibility
- Optimized rendering: 4-layer canvas, batched operations, delta undo
- Portable architecture: FileService/MapService adapters, src/core/ has zero Electron deps
- All 53 game settings auto-serialize to description field
- Zero TypeScript errors with strict mode
- Tech stack: Electron 28, React 18, TypeScript, Vite 5, Zustand, Canvas API, react-rnd
- Codebase: ~12,211 LOC TypeScript/CSS

**Tech Debt:**
- Content-aware transforms not implemented (directional tiles may rotate incorrectly)
- Phase 20 completed outside GSD tracking (no SUMMARY.md)
- Title bar gradient still uses hardcoded hex colors (intentional for linear-gradient)
- Three stale empty phase directories (16-marquee-selection, 18-tool-investigation-fixes, 20-animation-panel-redesign)
- Minimap placeholder when no map loaded (addressing in v2.3)

**Reference:**
- SEdit source analysis: `E:\AC-SEDIT-SRC-ANALYSIS\SEDIT\SEdit-SRC-Analysis\SEDIT_Technical_Analysis.md`

**Pending Ideas (for future milestones):**
- Dark mode theme option
- Visual indicator for non-default settings in dialog
- Validation warnings for problematic setting combinations
- Tool behavior verification at all zoom levels (coordinate accuracy)
- Wall constrain mode (shift-key axis locking)
- Quick window switcher (Ctrl+Tab)
- Cross-window drag-drop tiles
- Animated tile preview in status bar

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

---
*Last updated: 2026-02-10 after v2.3 milestone started*
