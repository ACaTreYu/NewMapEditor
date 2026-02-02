# AC Map Editor - UI Overhaul & Bug Fixes

## Current Milestone: v1.2 SEdit-Style Layout

**Goal:** Restructure UI to match SEdit's layout — huge map canvas, minimap top-right, animations panel left, tiles panel bottom, plus comprehensive Map Settings dialog.

**Target features:**
- SEdit-style layout with maximized canvas in bordered window
- Minimap showing full map with viewport indicator
- Left animations panel with compact previews
- Bottom tiles panel showing full tileset
- Map Settings popup with basic + advanced settings (40+ game parameters)

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

### Active

<!-- Current scope for v1.2 -->

**Layout:**
- [ ] Huge map canvas as primary UI focus
- [ ] Map canvas in bordered "window" frame (SEdit style)
- [ ] Minimap in top-right corner with viewport indicator
- [ ] Left animations panel (fixed width, smaller previews, hex labels without leading zero)
- [ ] Bottom tiles panel (~20% height, full tileset visible without internal scroll)

**Map Settings Dialog:**
- [ ] "Map Settings" button in toolbar opens popup dialog
- [ ] Basic settings matching SEdit (name, description, dynamic settings, game objective, weapons, misc)
- [ ] "Advanced" button reveals all 40+ settings from AC_Setting_Info_25.txt
- [ ] Each setting: slider (1 granularity) + text input + range/default display

### Out of Scope

- Floating/dockable panels — keeping fixed layout for simplicity
- Custom in-app menu bar — staying with native Electron menu
- V2 map format support — separate concern
- Tileset selection UI — separate concern
- Custom scrollbar track themes — classic style is sufficient
- Keyboard shortcut remapping — low priority

## Context

**Current State (after v1.1):**
- Shipped v1.1 with ~5,800 additional lines of TypeScript/CSS (cumulative ~8,500)
- Tech stack: Electron 28, React 18, TypeScript, Vite 5, Zustand, react-resizable-panels
- Professional editor layout matching Photoshop/GIMP conventions
- Full dark/light theme support with system preference detection
- Classic Windows-style scrollbar navigation
- Collapsible bottom panel for maximizing canvas space
- All 12 v1.1 requirements satisfied

**Tech Debt:**
- Orphaned RightSidebar component (created in v1.1 but replaced by TabbedBottomPanel)
- Pre-existing TypeScript path alias issues (@components pattern)

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

---
*Last updated: 2026-02-02 after starting v1.2 milestone*
