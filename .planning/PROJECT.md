# AC Map Editor - UI Overhaul & Bug Fixes

## Current State

**Last shipped:** v1.3 Layout Fix (2026-02-04)
**Next milestone:** TBD — run `/gsd:new-milestone` to plan

**Codebase:** ~7,100 LOC TypeScript/CSS across 52 files
**Tech stack:** Electron 28, React 18, TypeScript, Vite 5, Zustand, react-resizable-panels

---

## What This Is

An Electron/React tile map editor for Armor Critical (SubSpace/Continuum format). Features a professional UI with horizontal toolbar, collapsible tabbed bottom panel, classic Windows-style scrollbars, and full dark/light theme support. Tools include pattern fill with multi-tile selection and animation preview.

## Core Value

The map editing experience should feel intuitive and professional — tools work correctly, the layout maximizes the editing canvas, and workflows match what users expect from image editors.

## Requirements

### Validated

<!-- Shipped and confirmed working -->

- ✓ File I/O for SubSpace/Continuum map format (v3) — existing
- ✓ Tile palette with multi-tile selection — existing
- ✓ Canvas rendering with zoom/pan/scroll — existing
- ✓ Basic tools (pencil, eraser, wall, line, rect, picker) — existing
- ✓ Map settings panel — existing
- ✓ Undo/redo (50 levels) — existing
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
- ✓ Dark and light theme with FOUC prevention — v1.1
- ✓ Win95/98 window frame around canvas — v1.2
- ✓ Gray workspace background — v1.2
- ✓ Minimap in top-right corner — v1.2
- ✓ Left animations panel with 16x16 compact previews — v1.2
- ✓ Bottom tiles panel with full tileset display — v1.2
- ✓ Icon-only toolbar maximizing canvas space — v1.2
- ✓ Comprehensive Map Settings dialog (53 settings, 10 tabs) — v1.2
- ✓ Dirty flag with unsaved changes confirmation — v1.2
- ✓ extendedSettings storage for custom game settings — v1.2
- ✓ Map canvas fills available window space (dominant element) — v1.3
- ✓ Tileset panel adequate height (visible tiles without excessive scrolling) — v1.3
- ✓ Animation panel adequate width (visible previews) — v1.3
- ✓ Panel dividers draggable to resize — v1.3
- ✓ Layout matches SEdit proportions — v1.3

### Active

<!-- Next milestone scope TBD -->

### Out of Scope

- Floating/dockable panels — keeping fixed layout for simplicity
- Custom in-app menu bar — staying with native Electron menu
- V2 map format support — separate concern
- Tileset selection UI — separate concern
- Custom scrollbar track themes — classic style is sufficient
- Keyboard shortcut remapping — low priority

## Context

**Current State (after v1.3):**
- Shipped v1.3 with ~7,100 LOC TypeScript/CSS total
- Tech stack: Electron 28, React 18, TypeScript, Vite 5, Zustand, react-resizable-panels
- SEdit-style layout with maximized canvas in Win95/98 window frame
- Animations panel on right side, tileset panel at bottom
- Map canvas dominates window (63.75% viewport) with freely draggable dividers
- Comprehensive Map Settings dialog (53 game settings)
- Full dark/light theme support with system preference detection

**Tech Debt:**
- Orphaned exports: MapSettingsPanel, TabbedBottomPanel, RightSidebar, AnimationPreview
- Pre-existing TypeScript path alias issues (@components pattern)

**Pending Ideas (from development):**
- Redesign animation panel to match SEdit (numbered vertical list, Tile/Anim radio, offset field)
- Win95/98 theme overhaul (app looks too modern, needs classic grey/beveled styling)
- Other SEdit elements (menu bar details, status bar, MDI windows)

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
| Free resize with memory | Flexibility without complexity of snap points | ✓ Good |
| Dark theme as default | Matches original app aesthetic | ✓ Good |
| CSS hidden for inactive tabs | Preserves scroll position and component state | ✓ Good |
| react-resizable-panels library | Lightweight, good API, localStorage persistence built-in | ✓ Good |
| Filter frame indices 0-3999 | Valid tileset range, rejects Gfx.dll garbage data | ✓ Good |
| Deduplicate consecutive frames | Detects single-frame animations that shouldn't cycle | ✓ Good |
| Two-tier CSS variables | Separates primitives from semantic tokens for flexibility | ✓ Good |
| Class-based theme switching | Allows programmatic control and user preference override | ✓ Good |
| CSS border triangles for glyphs | Theme-aware without SVG complexity | ✓ Good |
| 10px scrollbar width | Maximizes canvas space while remaining usable | ✓ Good |
| No panel size persistence | Predictable 20% initial state on every launch | ✓ Good |
| Instant panel transitions | Responsive feel without animation delay | ✓ Good |
| Animations panel on right side | Matches SEdit reference layout | ✓ Good |
| Flexbox min-height: 0 fix | Root cause for react-resizable-panels shrinking | ✓ Good |
| Canvas fills full panel (no centering) | Maximizes editing area, removes dead space | ✓ Good |
| Fixed 16x16 animation previews | Prevents stretching, maintains pixel accuracy | ✓ Good |

---
*Last updated: 2026-02-04 after v1.3 milestone complete*
