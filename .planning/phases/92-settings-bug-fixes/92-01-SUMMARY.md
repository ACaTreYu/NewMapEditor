---
phase: 92-settings-bug-fixes
plan: "01"
subsystem: ui
tags: [settings, weapons, dropdowns, game-modes]

requires:
  - phase: 86-settings-lifecycle
    provides: settingsSerializer.ts extraction, settings round-trip lifecycle
provides:
  - Grenade/Bouncy preset arrays (NADE_DAMAGE_VALUES, NADE_RECHARGE_VALUES, BOUNCY_DAMAGE_VALUES, BOUNCY_RECHARGE_VALUES)
  - Special Damage and Recharge Rate dropdowns sync all weapons + Flagger equivalents
  - TurretAssassin game mode (ObjectiveType = 6)
  - New map defaults (DominationWin=100, ElectionTime=14)
affects: [settings, weapons-tab, game-modes]

tech-stack:
  added: []
  patterns: [unified-weapon-dropdown-sync]

key-files:
  created: []
  modified:
    - src/core/map/settingsSerializer.ts
    - src/components/MapSettingsDialog/MapSettingsDialog.tsx
    - src/core/services/MapService.ts
    - src/core/map/types.ts
    - src/App.tsx

key-decisions:
  - "Special Damage and Recharge Rate dropdowns sync all weapons (missile, grenade, bouncy) — no per-weapon dropdowns"
  - "Damage dropdowns also sync Flagger equivalents (FLaserDamage, FMissileDamage, etc.) — users tweak in Flagger tab"
  - "F*Energy is a different scale from Recharge (0-57 vs 0-100000) — Recharge Rate does NOT sync F*Energy"
  - "SETT-02 was a non-issue — triage confirmed all 53 settings serialize correctly (871 chars). User didn't scroll in SEdit."
  - "TurretAssassin = ObjectiveType 6, no mode-specific settings (kill all enemy turrets mode)"

duration: 25min
completed: 2026-02-20
---

# Phase 92 Plan 01: Settings Dropdowns & Game Mode Summary

**Unified weapon damage/recharge dropdowns, Flagger sync, TurretAssassin game mode, and SETT-02 triage (confirmed non-issue)**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-02-20
- **Completed:** 2026-02-20
- **Tasks:** 1 auto + 1 checkpoint (human verified)
- **Files modified:** 5

## Accomplishments
- Special Damage dropdown now updates MissileDamage, NadeDamage, BouncyDamage + their F-prefixed Flagger equivalents
- Recharge Rate dropdown now updates MissileRecharge, NadeRecharge, BouncyRecharge
- Laser Damage dropdown also syncs FLaserDamage
- Added 4 preset arrays for grenade/bouncy damage/recharge scales
- TurretAssassin game mode (value 6) with (TurretAssassin) map name tag
- New map defaults: DominationWin=100, ElectionTime=14
- SETT-02 triage confirmed all 53 settings serialize correctly — was a user scroll issue in SEdit

## Task Commits

1. **Task 1: Add preset arrays, dropdowns, triage logging** - `ccac653`
2. **Fix: Special Damage/Recharge sync all weapons** - `d386675`
3. **Fix: Damage dropdowns sync Flagger equivalents** - `577977f`
4. **Fix: New map defaults (DominationWin=100, ElectionTime=14)** - `90908b9`
5. **Feat: TurretAssassin game mode** - `5a4eefe`
6. **Fix: Move triage to renderer** - `b1d35a1`
7. **Fix: Remove triage logging (confirmed non-issue)** - `f287808`

## Files Created/Modified
- `src/core/map/settingsSerializer.ts` - Added NADE/BOUNCY preset arrays, updated mergeDescriptionWithHeader
- `src/components/MapSettingsDialog/MapSettingsDialog.tsx` - Unified dropdown sync, TurretAssassin mode
- `src/core/services/MapService.ts` - Triage logs added then removed
- `src/core/map/types.ts` - ObjectiveType.TURRET_ASSASSIN, new map defaults
- `src/App.tsx` - Triage logs added then removed

## Decisions Made
- Unified weapon dropdowns instead of per-weapon (user preference)
- Flagger damage settings sync from dropdowns, but F*Energy left independent (different scale)
- SETT-02 closed as non-issue after triage

## Deviations from Plan

### User-Requested Changes

**1. [Checkpoint feedback] Removed individual Grenade/Bouncy dropdowns**
- Plan called for 4 separate dropdowns; user wanted unified Special Damage/Recharge Rate to control all weapons
- Removed individual dropdowns, updated existing to sync missile + grenade + bouncy

**2. [Checkpoint feedback] Added Flagger damage sync**
- User requested damage dropdowns also update F-prefixed Flagger settings

**3. [Checkpoint feedback] New map defaults**
- DominationWin=100, ElectionTime=14 for new maps only

**4. [Checkpoint feedback] TurretAssassin game mode**
- New ObjectiveType=6 with map name tag

**5. [Checkpoint feedback] SETT-02 triage moved to renderer then removed**
- Original placement in MapService (main process) wasn't visible in DevTools
- After confirming non-issue, all triage logging removed

---

**Total deviations:** 5 user-requested changes
**Impact on plan:** Scope expanded by user feedback during checkpoint. All changes aligned with user intent.

## Issues Encountered
None

## Next Phase Readiness
- Plan 92-02 (Format=1.1 reorder) is now unnecessary — SETT-02 confirmed as non-issue
- Phase 92 complete, ready for phase 93

---
*Phase: 92-settings-bug-fixes*
*Completed: 2026-02-20*
