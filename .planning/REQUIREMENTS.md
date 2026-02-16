# Requirements: AC Map Editor

**Defined:** 2026-02-15
**Core Value:** The map editing experience should feel intuitive and professional — tools work correctly, the layout maximizes the editing canvas, and workflows match what users expect from image editors.

## v3.4 Requirements (Shipped)

All 16 requirements complete. See MILESTONES.md for details.

## v3.5 Requirements

Requirements for v3.5 Warp Expansion & Cleanup milestone.

### Warp Tool

- [x] **WARP-03**: All 6 warp types (F6-FA, 9E) encode src/dest routing in offset byte
- [x] **WARP-04**: Warp tool dropdown lists all 6 warp types as selectable variants
- [x] **WARP-05**: Warp dropdown shows tile image preview for each warp type
- [x] **WARP-06**: Picker tool decodes routing from all 6 warp types (not just FA/9E)

### Dead Code Cleanup

- [x] **CLEAN-01**: AnimationDefinitions.old.ts deleted
- [x] **CLEAN-02**: Stale empty phase directories removed
- [x] **CLEAN-03**: Unused variables removed (immediatePatchTile, dirty flags, unused event params)

### CSS Token Consistency

- [x] **CSS-01**: Title bar gradient uses CSS variables instead of hardcoded hex
- [x] **CSS-02**: `--color-error` token defined in variables.css
- [x] **CSS-03**: Remaining hardcoded hex/rgba values replaced with design tokens

### Code Quality

- N/A **CODE-01**: Duplicate centering math — no instances found in codebase

## Future Requirements

### Animation Enhancements (deferred)

- **OFST-04**: Offset increment/decrement hotkeys
- **OFST-05**: Batch offset adjustment for selected region
- **OFST-06**: Per-tile offset editing post-placement

### Measurement (deferred)

- **RULER-07**: Custom measurement scales

## Out of Scope

| Feature | Reason |
|---------|--------|
| Content-aware transform tables | Geometric transforms sufficient, high complexity |
| Custom keyboard shortcut remapping | Low priority |
| Floating/dockable panels | Fixed layout for simplicity |
| OffscreenCanvas + Web Worker | Only if further perf needed |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| WALL-01 | Phase 71 | ✅ Done |
| WALL-02 | Phase 71 | ✅ Done |
| WALL-03 | Phase 71 | ✅ Done |
| WALL-04 | Phase 71 | ✅ Done |
| WARP-01 | Phase 72 | ✅ Done |
| WARP-02 | Phase 72 | ✅ Done |
| ANIM-01 | Phase 73 | ✅ Done |
| PREV-01 | Phase 74 | ✅ Done |
| PREV-02 | Phase 74 | ✅ Done |
| PREV-03 | Phase 74 | ✅ Done |
| PREV-04 | Phase 74 | ✅ Done |
| ICON-01 | Phase 75 | ✅ Done |
| ICON-02 | Phase 75 | ✅ Done |
| ICON-03 | Phase 71 | ✅ Done |
| UI-01 | Phase 76 | ✅ Done |
| UI-02 | Phase 76 | ✅ Done |
| WARP-03 | Phase 77 | ✅ Done |
| WARP-04 | Phase 77 | ✅ Done |
| WARP-05 | Phase 77 | ✅ Done |
| WARP-06 | Phase 77 | ✅ Done |
| CLEAN-01 | Phase 78 | ✅ Done |
| CLEAN-02 | Phase 78 | ✅ Done |
| CLEAN-03 | Phase 78 | ✅ Done |
| CSS-01 | Phase 78 | ✅ Done |
| CSS-02 | Phase 78 | ✅ Done |
| CSS-03 | Phase 78 | ✅ Done |
| CODE-01 | Phase 78 | N/A |

**Coverage:**
- v3.5 requirements: 11 total
- Mapped to phases: 11/11 (100%)
- Unmapped: 0

---
*Requirements defined: 2026-02-15*
*Last updated: 2026-02-16 after phase 78 completion (v3.5 complete)*
