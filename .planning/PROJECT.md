# AC Map Editor - UI Overhaul & Bug Fixes

## Current State

**Last shipped:** v1.4 Win98 Theme Overhaul (2026-02-04)
**Current milestone:** v1.5 Functional Tools

**Codebase:** ~7,100 LOC TypeScript/CSS across 52 files
**Tech stack:** Electron 28, React 18, TypeScript, Vite 5, Zustand, react-resizable-panels

---

## What This Is

An Electron/React tile map editor for Armor Critical (SubSpace/Continuum format). Features a pixel-accurate Windows 98 aesthetic with beveled borders, classic grey chrome, and authentic Win98 controls. SEdit-style layout with maximized canvas, icon toolbar, and resizable panels. Tools include pattern fill with multi-tile selection and animation preview.

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

- ✓ Win98 CSS variable system and theme foundation — v1.4
- ✓ Win98 application chrome (toolbar, status bar, title bars, dividers) — v1.4

### Active

<!-- v1.5 Functional Tools -->

- [ ] Re-analyze SEdit source for correct tool behavior
- [ ] Fix all incorrectly-implemented tools to match SEdit
- [ ] Add missing SEdit tools (including conveyor belt)
- [ ] Add team selector for team-colored tile placement

### Out of Scope

- Floating/dockable panels — keeping fixed layout for simplicity
- Custom in-app menu bar — staying with native Electron menu
- V2 map format support — separate concern
- Tileset selection UI — separate concern
- Keyboard shortcut remapping — low priority
- Animation panel redesign — deferred to v1.5 (00-FF numbered list, Tile/Anim radio)

## Context

**Current State (after v1.4):**
- Shipped v1.4 with Win98 theme foundation and application chrome
- Tech stack: Electron 28, React 18, TypeScript, Vite 5, Zustand, react-resizable-panels
- SEdit-style layout with Win98 aesthetic (grey chrome, beveled borders, flat/raised/sunken toolbar)
- Multiple tools exist but some don't match SEdit's actual behavior
- Missing tools from SEdit (conveyor belt, potentially others)
- No team selector functionality

**Tech Debt:**
- Orphaned exports: MapSettingsPanel, TabbedBottomPanel, RightSidebar, AnimationPreview
- Pre-existing TypeScript path alias issues (@components pattern)
- Tools implemented based on assumptions — need SEdit source re-analysis

**Reference:**
- SEdit source analysis: `E:\AC-SEDIT-SRC-ANALYSIS\SEDIT\SEdit-SRC-Analysis\SEDIT_Technical_Analysis.md`

**Pending Ideas (for future milestones):**
- Redesign animation panel to match SEdit (00-FF numbered vertical list, Tile/Anim radio, offset field)
- Win98 panel interiors, scrollbars, dialog controls (deferred from v1.4)
- Other SEdit elements (menu bar details, MDI windows)

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
| Drop dark/light toggle | Win98 had one look — commit to grey aesthetic | ✓ Good |
| Hand-write CSS (no 98.css dep) | More control, no dependency, use 98.css as reference only | ✓ Good |
| Pixel-accurate Win98 fidelity | Exact borders, greys, bevels from 98.css reference | ✓ Good |
| SEdit source as tool behavior reference | Tools must match SEdit's actual implementation | — Pending |

---
*Last updated: 2026-02-04 after v1.5 milestone started*
