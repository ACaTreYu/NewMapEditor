# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-20)

**Core value:** The map editing experience should feel intuitive and professional -- tools work correctly, the layout maximizes the editing canvas, and workflows match what users expect from image editors.
**Current focus:** v1.1.3 — Fixes & Polish (Phase 91)

## Current Position

Phase: 91 of 94 (Overlay Z-Order & Minimap Size)
Plan: 0 of 1 in current phase
Status: Ready to plan
Last activity: 2026-02-20 — v1.1.3 roadmap created (phases 91-94)

Progress: [░░░░░░░░░░] 0% — 0/4 phases complete

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

Cleared — full decision log in PROJECT.md Key Decisions table.

### Blockers/Concerns

- Phase 92 (Settings): Do not write code until the live round-trip is traced with debug logging. Three candidate root causes: save without Apply, new map without opening dialog, AC binary description field truncation. Triage first.
- Phase 92 (Grenade/Bouncy preset values): LOW confidence on NadeDamage/NadeRecharge preset scale (SEdit source inaccessible). Safe fallback: reuse SPECIAL_DAMAGE_VALUES. Validate against AC_Setting_Info_25.txt during implementation.
- Phase 93 (Minimap overlap): With minimap enlarged to 160x160, verify at 800x600 window height that minimap bottom and tool panel top do not collide. If collision: stack in a CSS flex column anchored top:8px right:8px.
- Phase 94 (Scope): Move selection is marquee-reposition ONLY (shift selection bounds without moving tiles). Tile-move-with-selection is explicitly deferred to v2+. Document in plan to prevent scope creep.

## Session Continuity

Last session: 2026-02-20
Stopped at: Roadmap created for v1.1.3. Phase 91 is next -- plan with /gsd:plan-phase 91.
Resume file: N/A

---

*State initialized: 2026-02-17 for milestone v1.0.5*
*Last updated: 2026-02-20 -- v1.1.3 roadmap created*
