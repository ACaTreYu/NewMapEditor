# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-20)

**Core value:** The map editing experience should feel intuitive and professional -- tools work correctly, the layout maximizes the editing canvas, and workflows match what users expect from image editors.
**Current focus:** v1.1.3 — Fixes & Polish (Phase 91)

## Current Position

Phase: 91 of 94 (Overlay Z-Order & Minimap Size)
Plan: 1 of 1 in current phase
Status: Phase 91 complete
Last activity: 2026-02-20 — Completed 91-01-PLAN.md (overlay z-order + minimap 160px)

Progress: [█░░░░░░░░░] 25% — 1/4 phases complete

## Performance Metrics

**Velocity:**
- Total plans completed: 129 (126 formal + 3 ad-hoc)
- Total phases completed: 90 (89 formal + 1 ad-hoc)
- Total milestones shipped: 33
- Total execution time: ~90 hours across 33 milestones

**Recent Milestones:**
- v1.1.2-linux (Phases 88-90): Linux port -- .deb package, cross-platform build, website dual-platform downloads
- v1.0.6 (Phase 87): Sidebar removal, overlay layout, 3-theme system
- v1.0.5 (Phase 86): Settings lifecycle fix, settingsSerializer.ts extraction

**Trend:** Stable -- consistent execution pace across recent milestones

## Accumulated Context

### Decisions

| ID | Decision | Phase | Rationale |
|----|----------|-------|-----------|
| D91-01-1 | Z-index 200000 for overlays | 91-01 | Exceeds MDI normalization ceiling (100000); matches toolbar dropdown pattern |
| D91-01-2 | Pixel-first minimap render loop | 91-01 | Correct for any MINIMAP_SIZE; more efficient (25,600 vs 65,536 iterations) |

### Blockers/Concerns

- Phase 92 (Settings): Do not write code until the live round-trip is traced with debug logging. Three candidate root causes: save without Apply, new map without opening dialog, AC binary description field truncation. Triage first.
- Phase 92 (Grenade/Bouncy preset values): LOW confidence on NadeDamage/NadeRecharge preset scale (SEdit source inaccessible). Safe fallback: reuse SPECIAL_DAMAGE_VALUES. Validate against AC_Setting_Info_25.txt during implementation.
- Phase 93 (Minimap overlap): With minimap enlarged to 160x160, verify at 800x600 window height that minimap bottom and tool panel top do not collide. If collision: stack in a CSS flex column anchored top:8px right:8px.
- Phase 94 (Scope): Move selection is marquee-reposition ONLY (shift selection bounds without moving tiles). Tile-move-with-selection is explicitly deferred to v2+. Document in plan to prevent scope creep.

## Session Continuity

Last session: 2026-02-20
Stopped at: Phase 91 complete. Phase 92 is next -- plan with /gsd:plan-phase 92.
Resume file: .planning/phases/91-overlay-z-order-minimap-size/91-01-SUMMARY.md

---

*State initialized: 2026-02-17 for milestone v1.0.5*
*Last updated: 2026-02-20 -- Phase 91 complete (overlay z-order + minimap 160px)*
