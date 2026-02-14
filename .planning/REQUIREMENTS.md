# Requirements: AC Map Editor

**Defined:** 2026-02-14
**Core Value:** The map editing experience should feel intuitive and professional — tools work correctly, the layout maximizes the editing canvas, and workflows match what users expect from image editors.

## v3.1 Requirements

Requirements for v3.1 Rendering Fixes & UX Polish. Each maps to roadmap phases.

### Rendering

- [ ] **REND-01**: Viewport pan and tool drags render tiles smoothly during drag via scrollbar-style viewport updates (not CSS transform + deferred redraw)
- [ ] **REND-02**: Ruler overlay and map layer stay in sync during viewport panning (no drift between layers)
- [ ] **REND-03**: Grid lines always align to tile borders at all zoom levels with integer pixel snapping

### UI Components

- [ ] **UI-01**: Animation panel has a visible scrollbar for navigating the animation list (not wheel-only)
- [ ] **UI-02**: Notepad panel and tile palette panel can be independently sized
- [ ] **UI-03**: Minimap shows viewport indicator rectangle in dev app

### Tools

- [ ] **TOOL-01**: Path ruler mode has a clear way to complete and pin a multi-waypoint measurement
- [ ] **TOOL-02**: Farplane color rendering can be toggled on/off via a button or control

## Future Requirements

None deferred — all items scoped to this milestone.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Custom measurement scales | Deferred to future milestone |
| OffscreenCanvas + Web Worker rendering | Only if further perf needed |
| Content-aware transform tables | Geometric transforms sufficient for now |
| Session persistence for ruler notepad | Measurement log is per-session |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| REND-01 | Phase 64 | Pending |
| REND-02 | Phase 64 | Pending |
| REND-03 | Phase 65 | Pending |
| UI-01 | Phase 66 | Pending |
| UI-02 | Phase 66 | Pending |
| UI-03 | Phase 66 | Pending |
| TOOL-01 | Phase 67 | Pending |
| TOOL-02 | Phase 67 | Pending |

**Coverage:**
- v3.1 requirements: 8 total
- Mapped to phases: 8
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-14*
*Last updated: 2026-02-14 after v3.1 roadmap creation*
