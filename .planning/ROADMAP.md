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
- ✅ **v2.0 Modern Minimalist UI** - Phases 27-32 (shipped 2026-02-09)
- ✅ **v2.1 MDI Editor & Polish** - Phases 33-36 (shipped 2026-02-09)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-4) - SHIPPED 2026-02-01</summary>

- [x] Phase 1: Foundation (3/3 plans) - completed 2026-02-01
- [x] Phase 2: Basic Tools (2/2 plans) - completed 2026-02-01
- [x] Phase 3: Tile Selection (2/2 plans) - completed 2026-02-01
- [x] Phase 4: Polish (2/2 plans) - completed 2026-02-01

</details>

<details>
<summary>✅ v1.1 Layout Refinement (Phases 5-8) - SHIPPED 2026-02-02</summary>

- [x] Phase 5: Horizontal Toolbar (1/1 plan) - completed 2026-02-02
- [x] Phase 6: Bottom Panel System (2/2 plans) - completed 2026-02-02
- [x] Phase 7: Theme System (1/1 plan) - completed 2026-02-02
- [x] Phase 8: Scrollbar System (2/2 plans) - completed 2026-02-02

</details>

<details>
<summary>✅ v1.2 SEdit Parity (Phases 9-12) - SHIPPED 2026-02-03</summary>

- [x] Phase 9: Panel Collapsibility (1/1 plan) - completed 2026-02-03
- [x] Phase 10: Canvas Framing (1/1 plan) - completed 2026-02-03
- [x] Phase 11: Minimap (1/1 plan) - completed 2026-02-03
- [x] Phase 12: Settings Dialog Expansion (2/2 plans) - completed 2026-02-03

</details>

<details>
<summary>✅ v1.3 Canvas Maximization (Phases 13-14) - SHIPPED 2026-02-04</summary>

- [x] Phase 13: Canvas Dominance (1/1 plan) - completed 2026-02-04
- [x] Phase 14: Panel Size Persistence (1/1 plan) - completed 2026-02-04

</details>

<details>
<summary>✅ v1.4 Win98 Theme Foundation (Phases 15-16) - SHIPPED 2026-02-05</summary>

- [x] Phase 15: Win98 Variable System (1/1 plan) - completed 2026-02-05
- [x] Phase 16: Application Chrome (1/1 plan) - completed 2026-02-05

</details>

<details>
<summary>✅ v1.5 Game Objects (Phases 17-19) - SHIPPED 2026-02-06</summary>

- [x] Phase 17: Object Tools Core (1/1 plan) - completed 2026-02-06
- [x] Phase 18: Conveyor Tool (1/1 plan) - completed 2026-02-06
- [x] Phase 19: Tool Variants (2/2 plans) - completed 2026-02-06

</details>

<details>
<summary>✅ v1.6 Advanced Editing (Phases 20-24) - SHIPPED 2026-02-07</summary>

- [x] Phase 20: SELECT Tool Core (1/1 plan) - completed 2026-02-07
- [x] Phase 21: Clipboard Operations (2/2 plans) - completed 2026-02-07
- [x] Phase 22: Paste Preview (1/1 plan) - completed 2026-02-07
- [x] Phase 23: Transform Operations (1/1 plan) - completed 2026-02-07
- [x] Phase 24: Animation Panel Polish (1/1 plan) - completed 2026-02-07

</details>

<details>
<summary>✅ v1.7 Performance & Portability (Phases 25-26) - SHIPPED 2026-02-08</summary>

- [x] Phase 25: Rendering Optimization (3/3 plans) - completed 2026-02-08
- [x] Phase 26: Architecture Portability (3/3 plans) - completed 2026-02-08

</details>

<details>
<summary>✅ v2.0 Modern Minimalist UI (Phases 27-32) - SHIPPED 2026-02-09</summary>

- [x] Phase 27: CSS Design System (2/2 plans) - completed 2026-02-08
- [x] Phase 28: Core UI Modernization (2/2 plans) - completed 2026-02-08
- [x] Phase 29: Author Metadata (1/1 plan) - completed 2026-02-09
- [x] Phase 30: Settings Serialization (1/1 plan) - completed 2026-02-09
- [x] Phase 31: UI Completion & SEdit Parity (2/2 plans) - completed 2026-02-09
- [x] Phase 32: TypeScript Quality (1/1 plan) - completed 2026-02-09

</details>

<details>
<summary>✅ v2.1 MDI Editor & Polish (Phases 33-36) - SHIPPED 2026-02-09</summary>

**Milestone Goal:** Multiple maps open as child windows with per-document undo/redo, cross-document clipboard, status bar tile hover, and scrollable settings dialog

#### Phase 33: Document State Refactoring ✅
**Goal**: Per-document state isolation with independent undo/redo
**Depends on**: Phase 32
**Requirements**: DOC-01, DOC-02, DOC-03, DOC-04
**Status**: Complete - 2026-02-09
**Plans**: 2/2 plans

Plans:
- [x] 33-01-PLAN.md -- Core document state architecture (types, slices, EditorState refactoring)
- [x] 33-02-PLAN.md -- Component migration and document lifecycle

#### Phase 34: MDI Window Management
**Goal**: Multiple map child windows with drag/resize, arrangement commands, and focus management
**Depends on**: Phase 33
**Requirements**: MDI-01, MDI-02, MDI-03, MDI-04, MDI-05
**Success Criteria** (what must be TRUE):
  1. User can open multiple map files simultaneously as separate windows
  2. User can switch between open map windows by clicking tabs or window areas
  3. User can tile or cascade windows via menu commands
  4. Active window drives minimap display showing active map viewport
  5. Closing a window with unsaved changes prompts user to save
**Plans**: 2 plans

Plans:
- [x] 34-01-PLAN.md -- Window state slice, arrangement algorithms, document limit enforcement
- [x] 34-02-PLAN.md -- Workspace/ChildWindow components, App.tsx rework, Window menu integration

#### Phase 35: Cross-Document Operations ✅
**Goal**: Clipboard and picker work across map documents
**Depends on**: Phase 34
**Requirements**: XDOC-01, XDOC-02
**Status**: Complete - 2026-02-09
**Plans**: 1/1 plans

Plans:
- [x] 35-01-PLAN.md -- Move clipboard to global state for cross-document copy/paste

#### Phase 36: Status Bar & UI Polish ✅
**Goal**: Status bar tile hover info and scrollable settings dialog
**Depends on**: Phase 35
**Requirements**: STAT-01, STAT-02, UI-01
**Status**: Complete - 2026-02-09
**Plans**: 1/1 plans

Plans:
- [x] 36-01-PLAN.md -- Status bar hover info (map + tileset) and scrollable settings dialog

</details>

## Progress

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
| 27. CSS Design System | v2.0 | 2/2 | Complete | 2026-02-08 |
| 28. Core UI Modernization | v2.0 | 2/2 | Complete | 2026-02-08 |
| 29. Author Metadata | v2.0 | 1/1 | Complete | 2026-02-09 |
| 30. Settings Serialization | v2.0 | 1/1 | Complete | 2026-02-09 |
| 31. UI Completion & SEdit Parity | v2.0 | 2/2 | Complete | 2026-02-09 |
| 32. TypeScript Quality | v2.0 | 1/1 | Complete | 2026-02-09 |
| 33. Document State Refactoring | v2.1 | 2/2 | Complete | 2026-02-09 |
| 34. MDI Window Management | v2.1 | 2/2 | Complete | 2026-02-09 |
| 35. Cross-Document Operations | v2.1 | 1/1 | Complete | 2026-02-09 |
| 36. Status Bar & UI Polish | v2.1 | 1/1 | Complete | 2026-02-09 |
