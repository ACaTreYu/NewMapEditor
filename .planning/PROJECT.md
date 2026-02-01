# AC Map Editor - UI Overhaul & Bug Fixes

## What This Is

An Electron/React tile map editor for Armor Critical (SubSpace/Continuum format). Features a professional UI with horizontal toolbar, resizable tabbed bottom panel, and working tools including pattern fill and animation preview.

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

### Active

<!-- Candidates for next milestone -->

- [ ] CSS variable consistency across all components
- [ ] Keyboard shortcuts shown in tooltips
- [ ] Double-click divider to reset panel size
- [ ] Collapsible bottom panel (minimize to tab bar only)

### Out of Scope

- Floating/dockable panels — keeping fixed layout for simplicity
- Custom in-app menu bar — staying with native Electron menu
- V2 map format support — separate concern
- Tileset selection UI — separate concern

## Context

**Current State (after v1.0):**
- Shipped v1.0 with ~2,750 lines of TypeScript/CSS changes
- Tech stack: Electron 28, React 18, TypeScript, Vite 5, Zustand, react-resizable-panels
- Professional editor layout matching Photoshop/GIMP conventions
- All 18 v1 requirements satisfied

**Tech Debt:**
- Four CSS files use hardcoded colors instead of CSS variables (AnimationPanel.css, MapSettingsPanel.css, MapCanvas.css, StatusBar.css)
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

---
*Last updated: 2026-02-01 after v1.0 milestone*
