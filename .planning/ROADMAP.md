# Roadmap: AC Map Editor

## Milestones

- ✅ **v1.0 MVP** - Phases 1-4 (shipped 2026-02-01)
- ✅ **v1.1 Layout Refinement** - Phases 5-8 (shipped 2026-02-02)
- ✅ **v1.2 SEdit Parity** - Phases 9-12 (shipped 2026-02-03)
- ✅ **v1.3 Canvas Maximization** - Phases 13-14 (shipped 2026-02-04)
- ✅ **v1.4 Win98 Theme Foundation** - Phases 15-16 (shipped 2026-02-05)
- ✅ **v1.5 Game Objects** - Phases 17-19 (shipped 2026-02-06)
- ✅ **v1.6 Advanced Editing** - Phases 20-24 (shipped 2026-02-07)
- ✅ **v1.7 Performance & Portability** - Phases 25-26 (shipped 2026-02-08)
- 🚧 **v2.0 Modern Minimalist UI** - Phases 27-32 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-4) - SHIPPED 2026-02-01</summary>

### Phase 1: Foundation
**Goal**: Working Electron/React editor with basic tile editing
**Plans**: 3 plans

Plans:
- [x] 01-01: Project scaffold with Electron + React + Vite
- [x] 01-02: Map file I/O (load/save SubSpace format)
- [x] 01-03: Canvas rendering with zoom/pan

### Phase 2: Basic Tools
**Goal**: Users can draw and erase tiles
**Plans**: 2 plans

Plans:
- [x] 02-01: Pencil and eraser tools
- [x] 02-02: Wall tool with auto-connection

### Phase 3: Tile Selection
**Goal**: Users can select multiple tiles from palette
**Plans**: 2 plans

Plans:
- [x] 03-01: Multi-tile selection in palette
- [x] 03-02: Pattern fill with multi-tile stamps

### Phase 4: Polish
**Goal**: Professional editing experience
**Plans**: 2 plans

Plans:
- [x] 04-01: Undo/redo system
- [x] 04-02: Map settings dialog

</details>

<details>
<summary>✅ v1.1 Layout Refinement (Phases 5-8) - SHIPPED 2026-02-02</summary>

### Phase 5: Horizontal Toolbar
**Goal**: Icon-focused toolbar maximizes canvas space
**Plans**: 1 plan

Plans:
- [x] 05-01: Horizontal toolbar with icon+label pattern

### Phase 6: Bottom Panel System
**Goal**: Unified resizable bottom panel replaces side-by-side layout
**Plans**: 2 plans

Plans:
- [x] 06-01: Full-width canvas with resizable bottom panel
- [x] 06-02: Tabbed interface (Tiles/Animations/Settings)

### Phase 7: Theme System
**Goal**: Maintainable Win98 aesthetic via CSS custom properties
**Plans**: 1 plan

Plans:
- [x] 07-01: CSS variable system for consistent theming

### Phase 8: Scrollbar System
**Goal**: Classic scrollbars with arrow buttons and page jumping
**Plans**: 2 plans

Plans:
- [x] 08-01: Classic scrollbar appearance and arrow button behavior
- [x] 08-02: Track click page jumping and hold-to-scroll

</details>

<details>
<summary>✅ v1.2 SEdit Parity (Phases 9-12) - SHIPPED 2026-02-03</summary>

### Phase 9: Panel Collapsibility
**Goal**: Users can collapse bottom panel to maximize canvas
**Plans**: 1 plan

Plans:
- [x] 09-01: Collapsible bottom panel (20% default, double-click divider)

### Phase 10: Canvas Framing
**Goal**: Win95/98 window frame distinguishes canvas from workspace
**Plans**: 1 plan

Plans:
- [x] 10-01: Win95/98 window frame around canvas with gray workspace background

### Phase 11: Minimap
**Goal**: Users can navigate via minimap in top-right corner
**Plans**: 1 plan

Plans:
- [x] 11-01: Minimap implementation with viewport indicator

### Phase 12: Settings Dialog Expansion
**Goal**: Complete map settings coverage matching SEdit
**Plans**: 2 plans

Plans:
- [x] 12-01: Comprehensive Map Settings dialog (53 settings, 10 tabs)
- [x] 12-02: Dirty flag with unsaved changes confirmation

</details>

<details>
<summary>✅ v1.3 Canvas Maximization (Phases 13-14) - SHIPPED 2026-02-04</summary>

### Phase 13: Canvas Dominance
**Goal**: Map canvas fills available window space as dominant element
**Plans**: 1 plan

Plans:
- [x] 13-01: Canvas fills available space with SEdit proportions

### Phase 14: Panel Size Persistence
**Goal**: Panel sizes persist across sessions
**Plans**: 1 plan

Plans:
- [x] 14-01: localStorage persistence for panel dimensions

</details>

<details>
<summary>✅ v1.4 Win98 Theme Foundation (Phases 15-16) - SHIPPED 2026-02-05</summary>

### Phase 15: Win98 Variable System
**Goal**: Complete Win98 CSS variable foundation
**Plans**: 1 plan

Plans:
- [x] 15-01: Win98 CSS variable system and theme foundation

### Phase 16: Application Chrome
**Goal**: Win98-styled application chrome (toolbar, status bar, dividers)
**Plans**: 1 plan

Plans:
- [x] 16-01: Win98 application chrome implementation

</details>

<details>
<summary>✅ v1.5 Game Objects (Phases 17-19) - SHIPPED 2026-02-06</summary>

### Phase 17: Object Tools Core
**Goal**: SPAWN/SWITCH/BRIDGE tools accessible via toolbar
**Plans**: 1 plan

Plans:
- [x] 17-01: Game object tool integration

### Phase 18: Conveyor Tool
**Goal**: Directional conveyor placement with live preview
**Plans**: 1 plan

Plans:
- [x] 18-01: CONVEYOR tool with directional pattern fill

### Phase 19: Tool Variants
**Goal**: Variant dropdowns for all game object tools
**Plans**: 2 plans

Plans:
- [x] 19-01: Variant dropdown UI system
- [x] 19-02: Escape key cancellation for drag/line operations

</details>

<details>
<summary>✅ v1.6 Advanced Editing (Phases 20-24) - SHIPPED 2026-02-07</summary>

### Phase 20: SELECT Tool Core
**Goal**: Users can select rectangular regions with marching ants
**Plans**: 1 plan

Plans:
- [x] 20-01: SELECT tool with marquee selection and marching ants

### Phase 21: Clipboard Operations
**Goal**: Copy/cut/paste/delete with keyboard shortcuts
**Plans**: 2 plans

Plans:
- [x] 21-01: Copy/cut/paste implementation
- [x] 21-02: Delete operation with keyboard shortcuts

### Phase 22: Paste Preview
**Goal**: Floating paste preview before commit
**Plans**: 1 plan

Plans:
- [x] 22-01: Floating paste preview (70% opacity, click to commit)

### Phase 23: Transform Operations
**Goal**: Mirror and rotate transforms on selection
**Plans**: 1 plan

Plans:
- [x] 23-01: Mirror H/V and rotate 90 degree transforms (Ctrl+H/J/R)

### Phase 24: Animation Panel Polish
**Goal**: SEdit-style animation panel with hex list
**Plans**: 1 plan

Plans:
- [x] 24-01: SEdit-style animation panel (00-FF hex list, Tile/Anim toggle)

</details>

<details>
<summary>✅ v1.7 Performance & Portability (Phases 25-26) - SHIPPED 2026-02-08</summary>

### Phase 25: Rendering Optimization
**Goal**: Fast rendering with minimal memory overhead
**Plans**: 3 plans

Plans:
- [x] 25-01: Granular Zustand selectors (no full-store destructuring)
- [x] 25-02: 4-layer canvas rendering (static, animated, overlays, grid)
- [x] 25-03: Minimap average-color cache optimization

### Phase 26: Architecture Portability
**Goal**: src/core/ free of Electron dependencies
**Plans**: 3 plans

Plans:
- [x] 26-01: Batched wall operations (single state update per operation)
- [x] 26-02: FileService adapter interface for web portability
- [x] 26-03: Delta-based undo/redo (100x+ memory reduction)

</details>

### 🚧 v2.0 Modern Minimalist UI (In Progress)

**Milestone Goal:** Transform editor from Win98 to modern minimalist aesthetic, add settings-to-description serialization, achieve SEdit format parity, and eliminate all TypeScript errors

#### Phase 27: CSS Design System
**Goal**: Establish modern minimalist design foundation via CSS variables
**Depends on**: Phase 26
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05
**Success Criteria** (what must be TRUE):
  1. Editor displays light neutral color palette (white/light grey backgrounds, dark text)
  2. All spacing follows 8px grid system (components use 8/16/24/32px increments)
  3. UI elements have rounded corners (4-8px border-radius)
  4. Panels and cards display subtle drop shadows for depth
  5. Win98 theme CSS files are removed (no win98-variables.css, win98-schemes.css, win98-bevels.css, win98-typography.css)
**Plans**: TBD

Plans:
- [ ] 27-01: TBD

#### Phase 28: Core UI Modernization
**Goal**: Update highest-visibility components to modern design system
**Depends on**: Phase 27
**Requirements**: UI-06, UI-07, UI-08, UI-10
**Success Criteria** (what must be TRUE):
  1. All core components (MapCanvas, ToolBar, TilePalette, StatusBar) use modern CSS design tokens
  2. Toolbar buttons display flat design with hover/active states (no 3D bevels)
  3. Status bar uses modern flat styling consistent with overall design
  4. Scrollbars display neutral-colored modern styling
**Plans**: TBD

Plans:
- [ ] 28-01: TBD

#### Phase 29: Author Metadata
**Goal**: Users can attribute maps with author name
**Depends on**: Phase 28
**Requirements**: META-01, META-02, META-03
**Success Criteria** (what must be TRUE):
  1. User can enter author name in Map Settings dialog (dedicated text field)
  2. Author name persists to map file on save (serialized to description field as "Author=name")
  3. Author name displays in Map Settings when loading map (parsed from description field)
**Plans**: TBD

Plans:
- [ ] 29-01: TBD

#### Phase 30: Settings Serialization
**Goal**: Map settings persist to description field for portability
**Depends on**: Phase 29
**Requirements**: SERIAL-01, SERIAL-02, SERIAL-03, SERIAL-04, SERIAL-05, SERIAL-06
**Success Criteria** (what must be TRUE):
  1. On save, non-default map settings auto-serialize to description field in Key=Value format
  2. Serialized settings appear in correct order (non-flagger before flagger, alphabetical within category)
  3. On load, settings parse from description field and apply to map settings
  4. Description box is hidden from user interface (auto-generated, not editable)
  5. Legacy maps without settings in description load correctly with default values
**Plans**: TBD

Plans:
- [ ] 30-01: TBD

#### Phase 31: UI Completion & SEdit Parity
**Goal**: Complete visual modernization and achieve exact SEdit format compatibility
**Depends on**: Phase 30
**Requirements**: UI-09, PARITY-01, PARITY-02, PARITY-03
**Success Criteria** (what must be TRUE):
  1. Map Settings dialog uses modern input styling (clean inputs, consistent spacing)
  2. Map parsing produces identical results to SEdit for valid map files
  3. Map header writing matches SEdit byte layout (minus known SEdit bugs)
  4. Default setting values match SEdit defaults exactly
**Plans**: TBD

Plans:
- [ ] 31-01: TBD

#### Phase 32: TypeScript Quality
**Goal**: Zero TypeScript errors with strict type checking
**Depends on**: None (independent work, can run in parallel)
**Requirements**: TS-01, TS-02
**Success Criteria** (what must be TRUE):
  1. Running `npm run typecheck` produces zero TypeScript errors
  2. All pre-existing TypeScript errors in MapParser.ts, WallSystem.ts, and App.tsx are resolved
**Plans**: TBD

Plans:
- [ ] 32-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order. Phase 32 (TypeScript Quality) can run in parallel with Phases 27-31.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 3/3 | Complete | 2026-02-01 |
| 2. Basic Tools | v1.0 | 2/2 | Complete | 2026-02-01 |
| 3. Tile Selection | v1.0 | 2/2 | Complete | 2026-02-01 |
| 4. Polish | v1.0 | 2/2 | Complete | 2026-02-01 |
| 5. Horizontal Toolbar | v1.1 | 1/1 | Complete | 2026-02-02 |
| 6. Bottom Panel System | v1.1 | 2/2 | Complete | 2026-02-02 |
| 7. Theme System | v1.1 | 1/1 | Complete | 2026-02-02 |
| 8. Scrollbar System | v1.1 | 2/2 | Complete | 2026-02-02 |
| 9. Panel Collapsibility | v1.2 | 1/1 | Complete | 2026-02-03 |
| 10. Canvas Framing | v1.2 | 1/1 | Complete | 2026-02-03 |
| 11. Minimap | v1.2 | 1/1 | Complete | 2026-02-03 |
| 12. Settings Dialog Expansion | v1.2 | 2/2 | Complete | 2026-02-03 |
| 13. Canvas Dominance | v1.3 | 1/1 | Complete | 2026-02-04 |
| 14. Panel Size Persistence | v1.3 | 1/1 | Complete | 2026-02-04 |
| 15. Win98 Variable System | v1.4 | 1/1 | Complete | 2026-02-05 |
| 16. Application Chrome | v1.4 | 1/1 | Complete | 2026-02-05 |
| 17. Object Tools Core | v1.5 | 1/1 | Complete | 2026-02-06 |
| 18. Conveyor Tool | v1.5 | 1/1 | Complete | 2026-02-06 |
| 19. Tool Variants | v1.5 | 2/2 | Complete | 2026-02-06 |
| 20. SELECT Tool Core | v1.6 | 1/1 | Complete | 2026-02-07 |
| 21. Clipboard Operations | v1.6 | 2/2 | Complete | 2026-02-07 |
| 22. Paste Preview | v1.6 | 1/1 | Complete | 2026-02-07 |
| 23. Transform Operations | v1.6 | 1/1 | Complete | 2026-02-07 |
| 24. Animation Panel Polish | v1.6 | 1/1 | Complete | 2026-02-07 |
| 25. Rendering Optimization | v1.7 | 3/3 | Complete | 2026-02-08 |
| 26. Architecture Portability | v1.7 | 3/3 | Complete | 2026-02-08 |
| 27. CSS Design System | v2.0 | 0/1 | Not started | - |
| 28. Core UI Modernization | v2.0 | 0/1 | Not started | - |
| 29. Author Metadata | v2.0 | 0/1 | Not started | - |
| 30. Settings Serialization | v2.0 | 0/1 | Not started | - |
| 31. UI Completion & SEdit Parity | v2.0 | 0/1 | Not started | - |
| 32. TypeScript Quality | v2.0 | 0/1 | Not started | - |
