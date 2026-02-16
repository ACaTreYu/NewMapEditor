---
phase: 75-tool-icon-polish
plan: 01
subsystem: ui/toolbar
tags: [icons, ui-polish, game-objects]
dependency_graph:
  requires: []
  provides: ["Semantically distinct tool icons for bunker and conveyor"]
  affects: ["ToolBar.tsx"]
tech_stack:
  added: []
  patterns: ["Icon substitution via react-icons/lu"]
key_files:
  created: []
  modified:
    - path: "src/components/ToolBar/ToolBar.tsx"
      role: "Updated icon imports and toolIcons record"
      changes: "Replaced LuShield → LuCastle, LuArrowRight → LuBriefcaseConveyorBelt"
decisions: []
metrics:
  duration: "66 seconds"
  completed: "2026-02-16T07:02:55Z"
---

# Phase 75 Plan 01: Tool Icon Polish Summary

**One-liner:** Replaced generic shield/arrow icons with semantically appropriate LuCastle and LuBriefcaseConveyorBelt icons for bunker and conveyor tools.

## Overview

Upgraded the visual language of game object tools by replacing placeholder icons with semantically meaningful alternatives. Bunker now displays a castle/fortress icon (LuCastle) instead of a generic shield (LuShield), and conveyor displays a conveyor belt icon (LuBriefcaseConveyorBelt) instead of a right arrow (LuArrowRight).

This change follows the pattern established in Phase 71 (Wall Tool Icons) where wall tools received visually distinct icons. The icon improvements make the toolbar more intuitive and reduce cognitive load for users selecting game object tools.

## Tasks Completed

### Task 1: Replace bunker and conveyor icon imports and toolIcons entries
- **Commit:** `4476f72`
- **Files:** `src/components/ToolBar/ToolBar.tsx`
- **Changes:**
  - Updated import statement (line 19): `LuShield` → `LuCastle`, `LuArrowRight` → `LuBriefcaseConveyorBelt`
  - Updated toolIcons record entry (line 43): `bunker: LuShield` → `bunker: LuCastle`
  - Updated toolIcons record entry (line 46): `conveyor: LuArrowRight` → `conveyor: LuBriefcaseConveyorBelt`
- **Verification:** TypeScript compilation passes with no new errors. Grep confirms old icons removed and new icons present in both import and record.

## Deviations from Plan

None - plan executed exactly as written.

## Technical Implementation

**Icon Substitution Pattern:**
The ToolBar component uses a declarative icon mapping system where each tool references an icon name string, which is resolved at render time via the `toolIcons` record. This pattern allowed the icon swap to be completed with a simple two-line change to the record (plus import update).

**Icon Selection Rationale:**
- **LuCastle:** Visually represents fortification/defensive structures, matching bunker semantics
- **LuBriefcaseConveyorBelt:** Explicit conveyor belt imagery, eliminating ambiguity from generic arrow

## Verification Results

All success criteria met:
- ✅ Bunker tool button now renders a castle icon (visually distinct fortress/defensive structure)
- ✅ Conveyor tool button now renders a conveyor belt icon (visually distinct transport mechanism)
- ✅ All tool icons in toolbar are visually unique - no two tools share the same icon appearance
- ✅ No TypeScript compilation errors introduced (pre-existing errors in MapCanvas/CanvasEngine unrelated)

**Grep verification:**
- `LuShield` - 0 matches (fully replaced)
- `LuArrowRight` - 0 matches in tool context (only `LuArrowRightLeft` for bridge tool remains)
- `LuCastle` - 2 matches (import + toolIcons record)
- `LuBriefcaseConveyorBelt` - 2 matches (import + toolIcons record)

## Next Phase Readiness

Phase complete. No blockers for subsequent phases.

## Self-Check: PASSED

**Files created:** None (plan only modified existing files)

**Files modified:**
- ✅ FOUND: src/components/ToolBar/ToolBar.tsx

**Commits:**
- ✅ FOUND: 4476f72 (feat(75-01): replace bunker and conveyor tool icons)
