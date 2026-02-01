# AC Map Editor - UI Overhaul & Bug Fixes

## What This Is

An Electron/React tile map editor for Armor Critical (SubSpace/Continuum format). This milestone focuses on redesigning the UI to feel like professional image editors (Photoshop/GIMP) and fixing critical bugs in the fill tool and animation system.

## Core Value

The map editing experience should feel intuitive and professional — tools work correctly, the layout maximizes the editing canvas, and workflows match what users expect from image editors.

## Requirements

### Validated

<!-- Shipped and confirmed working in existing codebase -->

- ✓ File I/O for SubSpace/Continuum map format (v3) — existing
- ✓ Tile palette with multi-tile selection — existing
- ✓ Canvas rendering with zoom/pan/scroll — existing
- ✓ Basic tools (pencil, eraser, wall, line, rect, picker) — existing
- ✓ Map settings panel — existing
- ✓ Undo/redo (50 levels) — existing
- ✓ Zustand state management — existing

### Active

<!-- Current scope for this milestone -->

- [ ] **UI-01**: Horizontal toolbar below menu bar with tool icons and tooltips
- [ ] **UI-02**: Map canvas takes full width, main vertical area
- [ ] **UI-03**: Tabbed bottom panel with Tiles, Settings, Animations tabs
- [ ] **UI-04**: Tabs displayed at top of bottom panel (like Chrome/VS Code)
- [ ] **UI-05**: Draggable divider between canvas and bottom panel
- [ ] **UI-06**: Panel size persists between sessions (localStorage or config)
- [ ] **UI-07**: Divider freely resizable (~10-50% of window height)

- [ ] **FILL-01**: Fill tool supports multi-tile pattern fill
- [ ] **FILL-02**: Pattern repeats/tiles across filled area (like Photoshop pattern fill)
- [ ] **FILL-03**: Fill uses correct tiles from selection (not wrong/random tile)

- [ ] **ANIM-01**: Animation panel displays correct frame data (not placeholders)
- [ ] **ANIM-02**: Animated tiles show proper frames in preview

### Out of Scope

- Floating/dockable panels — keeping fixed layout for simplicity
- Custom in-app menu bar — staying with native Electron menu
- V2 map format support — separate concern, not this milestone
- Tileset selection UI — separate concern, not this milestone

## Context

**Existing codebase:** Functional map editor with basic features working. UI currently has tile palette on left side, needs restructuring to match professional editor conventions.

**Known issues from codebase analysis:**
- Animation data is hardcoded placeholder (AnimationPanel.tsx:164-176)
- Fill tool doesn't properly handle multi-tile selections
- MapCanvas component is large (547 lines) — may need refactoring during UI work

**Technical environment:**
- Electron 28, React 18, TypeScript, Vite 5
- Zustand for state management
- Canvas API for tile rendering
- src/core/ must remain portable (no Electron deps)

## Constraints

- **Tech stack**: Must use existing Electron/React/Zustand stack
- **Portability**: src/core/ must remain free of Electron dependencies
- **Map format**: 256x256 fixed grid, 16x16px tiles, existing format unchanged

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Tabs at top of bottom panel | Matches Chrome/VS Code convention users know | — Pending |
| Icons + tooltips (no labels) | Keeps toolbar compact, tooltips provide discoverability | — Pending |
| Native menu bar | Less custom code, OS-native feel | — Pending |
| Free resize with memory | Flexibility without complexity of snap points | — Pending |

---
*Last updated: 2026-02-01 after initialization*
