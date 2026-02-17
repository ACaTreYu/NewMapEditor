---
phase: 82
plan: 01
subsystem: core/settings
tags: [settings, compliance, bug-fix, data-integrity]
dependency_graph:
  requires: [AC_Setting_Info_25.txt]
  provides: [corrected-defaults, settings-count-constant]
  affects: [GameSettings.ts, MapSettingsDialog.tsx]
tech_stack:
  added: [SETTINGS_COUNT constant]
  patterns: [AC reference compliance, defensive array operations]
key_files:
  created: []
  modified:
    - src/core/map/GameSettings.ts
    - src/components/MapSettingsDialog/MapSettingsDialog.tsx
decisions:
  - id: SFMT-SETTINGS-COUNT
    title: Confirmed 53 settings (not 54)
    context: Requirements doc mentioned 54 settings, but actual count is 53
    decision: HoldingTime is a header field (not extended setting), accounting for the common miscount to 54
    rationale: AC_Setting_Info_25.txt explicitly lists HoldingTime separately as a header field
    alternatives: []
    outcome: Added SETTINGS_COUNT export with detailed breakdown comment
metrics:
  duration: ~10 minutes
  tasks_completed: 2/2
  files_modified: 2
  lines_changed: 38
  commits: 2
completed: 2026-02-17
---

# Phase 82 Plan 01: Settings Format Compliance & Bug Fixes Summary

**One-liner:** Fixed 4 settings defaults to match AC reference (RepairRate=2, FRepairRate=2, ElectionTime=50, DominationWin=9999999) and added SETTINGS_COUNT constant documenting 53 settings.

## Overview

This plan corrected critical default value discrepancies between the editor's GameSettings.ts and the authoritative AC_Setting_Info_25.txt reference document. All settings now match the AC game engine's expected defaults, ensuring new maps have correct behavior out of the box.

## Tasks Completed

### Task 1: Validate and fix GameSettings.ts against AC reference

**Status:** Complete
**Commit:** 00c992e

**Changes:**
- Fixed RepairRate default: 0 → 2 (AC reference specifies default 2)
- Fixed FRepairRate default: 0 → 2 (matches RepairRate default)
- Fixed ElectionTime default: 14 → 50 (AC reference specifies default 50)
- Fixed DominationWin default: 100 → 9999999 (AC reference specifies default 9999999)
- Added SETTINGS_COUNT export constant (value: 53)
- Added comprehensive comment documenting the 53 settings breakdown:
  - 25 non-flagger weapon/game settings
  - 12 flagger (F-prefixed) settings
  - 7 DHT settings
  - 4 game rule settings
  - 5 toggle settings
- Clarified that HoldingTime is a header field, not an extended setting (common source of confusion)

**Verification:**
- All ranges verified against AC_Setting_Info_25.txt (all correct)
- Count verified: 53 settings (grep count of object literals)
- TypeScript compilation passed

### Task 2: Fix serialization ordering and Author/unrecognized handling

**Status:** Complete
**Commit:** a54fb7d

**Changes:**
- Updated ElectionTime inline defaults in MapSettingsDialog.tsx: 14 → 50 (3 locations: setting object, value fallback, onReset handler)
- Updated DominationWin inline defaults in MapSettingsDialog.tsx: 100 → 9999999 (3 locations: setting object, value fallback, onReset handler)
- Added defensive copy before .sort() operations to prevent mutation of filtered arrays:
  - `const sortedNonFlagger = [...nonFlaggerSettings].sort(...)`
  - `const sortedFlagger = [...flaggerSettings].sort(...)`

**Verification:**
- Serialization order confirmed: non-flagger (sorted) → Format=1.1 → flagger (sorted) → Author → unrecognized
- TypeScript compilation passed
- Inline defaults now match GameSettings.ts defaults

## Deviations from Plan

None - plan executed exactly as written.

## Key Outcomes

1. **Settings defaults compliance:** All 53 settings now match AC_Setting_Info_25.txt reference
2. **Documentation clarity:** SETTINGS_COUNT constant with detailed breakdown prevents future confusion
3. **UI consistency:** MapSettingsDialog inline defaults match GameSettings.ts
4. **Code safety:** Defensive array copying prevents potential mutation bugs

## Testing Notes

**Manual verification performed:**
- grep count confirms 53 settings in GAME_SETTINGS array
- TypeScript compilation passes with no errors
- Serialization format matches SFMT-02 specification (verified in Task 2)

**Pre-v1.0.4 compatibility:**
- Maps without Format=1.1 continue to load correctly (parseSettings filters out Format=X.X patterns from unrecognized)

## Technical Details

### Default Value Corrections

| Setting       | Old Default | New Default | AC Reference |
| ------------- | ----------- | ----------- | ------------ |
| RepairRate    | 0           | 2           | Page 1       |
| FRepairRate   | 0           | 2           | Page 1       |
| ElectionTime  | 14          | 50          | Page 1       |
| DominationWin | 100         | 9999999     | Page 1       |

### Settings Count Breakdown

```typescript
// 53 total settings
export const SETTINGS_COUNT = GAME_SETTINGS.length;

// Breakdown:
// - 25 non-flagger weapon/game settings
// - 12 flagger (F-prefixed) settings
// - 7 DHT settings
// - 4 game rule settings
// - 5 toggle settings
//
// Note: HoldingTime is a header field, not an extended setting
```

### Serialization Order (SFMT-02 Compliance)

```
BouncyDamage=48, BouncyEnergy=12, ..., Widescreen=0, Format=1.1, FBouncyDamage=48, ..., Author=..., [unrecognized]
```

1. Non-flagger settings (alphabetically sorted)
2. Format=1.1 (required for turret support)
3. Flagger settings (alphabetically sorted)
4. Author=... (if present)
5. Unrecognized Key=Value pairs (preserved for backward compatibility)

## Files Modified

### src/core/map/GameSettings.ts
- Lines 69, 299, 319, 512: Changed default values (4 settings)
- Lines 570-586: Added SETTINGS_COUNT export and documentation comment

### src/components/MapSettingsDialog/MapSettingsDialog.tsx
- Lines 21-22: Added defensive array copy before .sort()
- Lines 425-428: Updated ElectionTime inline defaults (3 values)
- Lines 441-444: Updated DominationWin inline defaults (3 values)

## Impact Assessment

**Immediate:**
- New maps created in v1.0.4+ will have correct AC-compliant defaults
- Existing maps are unaffected (values stored in map files, not defaults)

**Long-term:**
- SETTINGS_COUNT constant provides single source of truth for settings count
- Defensive array operations prevent potential future mutation bugs
- Documentation clarifies HoldingTime header field vs. extended settings distinction

## Next Steps

This plan completes the settings format compliance fixes for phase 82. Next plan (82-02) will handle additional settings bugs if any remain in the backlog.

## Self-Check: PASSED

**Created files:**
- NONE

**Modified files:**
- FOUND: src/core/map/GameSettings.ts
- FOUND: src/components/MapSettingsDialog/MapSettingsDialog.tsx

**Commits:**
- FOUND: 00c992e (Task 1)
- FOUND: a54fb7d (Task 2)

All tasks completed successfully, all files modified as expected, and all commits verified.
