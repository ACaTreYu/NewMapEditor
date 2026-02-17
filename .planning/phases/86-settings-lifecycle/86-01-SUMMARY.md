---
phase: 86-settings-lifecycle
plan: "01"
subsystem: map-serialization
tags: [settings, serialization, lifecycle, refactor, typescript]
dependency_graph:
  requires: []
  provides:
    - settingsSerializer module with lifecycle helpers
    - complete settings in description for all map lifecycle events
  affects:
    - src/core/map/settingsSerializer.ts
    - src/core/map/index.ts
    - src/core/map/types.ts
    - src/core/services/MapService.ts
    - src/components/MapSettingsDialog/MapSettingsDialog.tsx
tech_stack:
  added: []
  patterns:
    - Module extraction from component to shared core module
    - Shallow copy before mutation (mapToSave pattern in MapService)
    - Circular import between types.ts and settingsSerializer.ts (TypeScript handles correctly)
key_files:
  created:
    - src/core/map/settingsSerializer.ts
  modified:
    - src/core/map/index.ts
    - src/core/map/types.ts
    - src/core/services/MapService.ts
    - src/components/MapSettingsDialog/MapSettingsDialog.tsx
decisions:
  - "Removed serializeSettings and parseSettings from MapSettingsDialog imports (unused in dialog body - only buildDescription and parseDescription are called directly)"
  - "Circular import types.ts <-> settingsSerializer.ts is safe: only type reference (MapHeader) in one direction, function import used inside function bodies (not module-level) in the other"
metrics:
  duration: ~4 minutes
  completed: 2026-02-17
---

# Phase 86 Plan 01: Settings Lifecycle Summary

**One-liner:** Extracted settings serialization to `settingsSerializer.ts` and wired `initializeDescription`, `mergeDescriptionWithHeader`, and `reserializeDescription` into `createEmptyMap`, `loadMap`, and `saveMap/saveMapAs`.

## What Was Built

### settingsSerializer.ts (new module)

A shared serialization module at `src/core/map/settingsSerializer.ts` containing:

**Extracted from MapSettingsDialog.tsx (4 functions + 3 constants + 1 helper):**
- `LASER_DAMAGE_VALUES`, `SPECIAL_DAMAGE_VALUES`, `RECHARGE_RATE_VALUES` - header index-to-value maps
- `findClosestIndex` - snaps a value to the nearest preset index
- `serializeSettings` - produces `Format=1.1, Key=Value, ...` string
- `parseSettings` - parses description into `{settings, unrecognized}`
- `buildDescription` - assembles full description (SETT-04 fix: unrecognized before Author=)
- `parseDescription` - extracts `{settings, author, unrecognized}` with Author= separated

**New lifecycle helpers (3 functions):**
- `initializeDescription()` - builds a fresh description with all 53 settings at defaults
- `mergeDescriptionWithHeader(description, header)` - merges binary header values + defaults into existing description (SETT-02)
- `reserializeDescription(description, extendedSettings)` - re-serializes from extendedSettings before save (SETT-03)

### Lifecycle hooks wired

**createEmptyMap() in types.ts (SETT-01):**
- Calls `initializeDescription()` so every new map description starts with `Format=1.1, BouncyDamage=48, ...` (all 53 settings)
- Sets `extendedSettings = getDefaultSettings()` so the record is fully populated

**MapService.loadMap() (SETT-02):**
- Calls `mergeDescriptionWithHeader()` after parsing any map version
- Syncs `extendedSettings` from the merged description so the dialog opens with correct values

**MapService.saveMap() and saveMapAs() (SETT-03):**
- Creates a shallow copy (`mapToSave`) with `reserializeDescription()` applied to description
- Passes the copy (not the original) to `mapParser.serialize()` and tile compression

### MapSettingsDialog.tsx refactored

- Removed all local definitions: `serializeSettings`, `parseSettings`, `buildDescription`, `parseDescription`, `LASER_DAMAGE_VALUES`, `SPECIAL_DAMAGE_VALUES`, `RECHARGE_RATE_VALUES`, `findClosestIndex`
- Imports `buildDescription`, `parseDescription`, `LASER_DAMAGE_VALUES`, `SPECIAL_DAMAGE_VALUES`, `RECHARGE_RATE_VALUES`, `findClosestIndex` from `@core/map`
- No behavior change to the dialog itself

## Verification Results

| Check | Result |
|-------|--------|
| `npm run typecheck` | PASS (zero errors) |
| settingsSerializer.ts exports 11 items | PASS |
| buildDescription puts Author= last (SETT-04) | PASS |
| createEmptyMap calls initializeDescription (SETT-01) | PASS |
| createEmptyMap sets extendedSettings (SETT-01) | PASS |
| loadMap calls mergeDescriptionWithHeader (SETT-02) | PASS |
| loadMap syncs extendedSettings (SETT-02) | PASS |
| saveMap calls reserializeDescription on shallow copy (SETT-03) | PASS |
| saveMapAs calls reserializeDescription on shallow copy (SETT-03) | PASS |
| MapSettingsDialog has zero locally-defined serialization functions | PASS |
| No circular dependency TypeScript errors | PASS |

## Commits

| Hash | Description |
|------|-------------|
| 169227d | feat(86-01): extract settingsSerializer.ts and update MapSettingsDialog imports |
| f5f85b7 | feat(86-01): wire settings lifecycle hooks into createEmptyMap, loadMap, and saveMap |

## Deviations from Plan

**1. [Rule 2 - Missing critical functionality] Removed unused imports from MapSettingsDialog**

- **Found during:** Task 1 typecheck
- **Issue:** TypeScript `noUnusedLocals` flagged `GAME_SETTINGS`, `serializeSettings`, and `parseSettings` as unused imports. The plan said to import them "for completeness" but the dialog doesn't call them directly.
- **Fix:** Removed `GAME_SETTINGS`, `serializeSettings`, and `parseSettings` from the dialog import. The dialog only uses `buildDescription`, `parseDescription`, and the constants/helpers.
- **Files modified:** `src/components/MapSettingsDialog/MapSettingsDialog.tsx`
- **Commit:** 169227d

All other tasks executed exactly as planned.

## Self-Check: PASSED

Files verified:
- FOUND: src/core/map/settingsSerializer.ts
- FOUND: src/core/map/index.ts
- FOUND: src/core/map/types.ts
- FOUND: src/core/services/MapService.ts
- FOUND: src/components/MapSettingsDialog/MapSettingsDialog.tsx

Commits verified:
- FOUND: 169227d (feat(86-01): extract settingsSerializer.ts...)
- FOUND: f5f85b7 (feat(86-01): wire settings lifecycle hooks...)
