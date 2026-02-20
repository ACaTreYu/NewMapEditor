# Phase 92: Settings Bug Fixes - Research

**Researched:** 2026-02-20
**Domain:** Map settings serialization, UI dropdown/slider synchronization
**Confidence:** HIGH

## Summary

Phase 92 fixes two distinct bugs in the settings subsystem. The first (SETT-01) is that Grenade and Bouncy weapon dropdowns for damage/recharge presets do not exist yet in the Weapons tab — they need to be added with proper slider sync. The second (SETT-02) is that the serialized description field may not contain all 53 settings when viewed in SEdit; the primary suspect is the `Format=1.1` placement at position 0 (before all settings) rather than between non-flagger and flagger groups where AC's parser expects it.

**IMPORTANT prior decision:** Do not write code until the live round-trip is traced with debug logging first. Three candidate root causes for SETT-02 were identified: (1) save without Apply, (2) new map without opening dialog, (3) AC binary description field truncation/parsing. Triage by adding `console.log` instrumentation, then fix. The existing `reserializeDescription` / `initializeDescription` / `mergeDescriptionWithHeader` lifecycle is already wired (Phase 86). The bugs are subtle: either `Format=1.1` placement breaking AC's parser, or `extendedSettings` being empty `{}` at save time in some code path.

**Primary recommendation:** Triage first with debug logging. For SETT-01: add Grenade and Bouncy damage/recharge dropdowns to the Weapons tab header row, using the existing `SPECIAL_DAMAGE_VALUES` array as the preset scale (validated against `AC_Setting_Info_25.txt` — NadeDamage and NadeRecharge are NOT in the binary header, so they have no SEdit-side 0-4 index; the dropdowns are purely a UI convenience).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 18 | 18.x | UI component state | Project stack |
| Zustand | 4.x | Global editor state | Project stack |
| TypeScript | 5.x | Type safety | Enforced project-wide |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `settingsSerializer.ts` | local | Shared serialization/parse logic | Already extracted in Phase 86 |
| `GameSettings.ts` | local | GAME_SETTINGS array and defaults | Source of truth for all 53 settings |

**Installation:** No new dependencies required.

## Architecture Patterns

### Settings Lifecycle (established in Phase 86)

The round-trip is:
1. `createEmptyMap()` → calls `initializeDescription()` → sets `description` + `extendedSettings`
2. `MapService.loadMap()` → calls `mergeDescriptionWithHeader()` then parses into `extendedSettings`
3. `MapSettingsDialog.open()` → reads `map.header.extendedSettings` into local React state
4. `applySettings()` → calls `buildDescription(localSettings, author, ...)` → writes `extendedSettings` AND `description` to Zustand
5. `MapService.saveMap()` → calls `reserializeDescription(description, extendedSettings)` on a shallow copy before serialize

**Identified gap at step 3→4:** If the user saves without ever clicking Apply, `extendedSettings` contains the values from step 2 (correct), and `description` was set in step 2 (also correct). `reserializeDescription` at step 5 then uses `extendedSettings`, which is correct. So the "save without Apply" path is safe IF `extendedSettings` was properly populated at step 2.

**BUT**: If `extendedSettings` is `{}` (empty object) — for example, on a brand-new map where `createEmptyMap()` correctly populates it but something downstream clears it — then `reserializeDescription` falls back to all defaults, which IS correct behavior (`{ ...getDefaultSettings(), ...{} }` = defaults).

### Dropdown → Slider Sync Pattern

For Laser/Missile dropdowns (already working):
```typescript
// Forward: dropdown index (0-4) → extended setting value
onChange={(val) => {
  setHeaderFields(prev => ({ ...prev, laserDamage: val }));
  updateSetting('LaserDamage', LASER_DAMAGE_VALUES[val] ?? 27);
  setIsDirty(true);
}}
// Reverse: on dialog open, compute index from current setting value
laserDamage: findClosestIndex(merged['LaserDamage'] ?? 27, LASER_DAMAGE_VALUES)
```

For Grenade/Bouncy (to be added), the same pattern applies:
- No binary header index field exists for NadeDamage, NadeRecharge, BouncyDamage, BouncyRecharge
- These are pure extended settings, controlled entirely through the description field
- The dropdown is a UI convenience only; there is no binary header field to sync
- On dialog open, compute index from current extended setting value using `findClosestIndex`

### Grenade/Bouncy Preset Value Arrays

**SETT-01 LOW-confidence concern from STATE.md:** Preset scale for NadeDamage/NadeRecharge is uncertain. Research conclusion based on `AC_Setting_Info_25.txt`:
- NadeDamage range: 0-225, normal 21
- NadeRecharge range: 0-100000, normal 1950
- BouncyDamage range: 0-225, normal 48
- BouncyRecharge range: 0-100000, normal 765

Comparing to existing constants:
- `SPECIAL_DAMAGE_VALUES = [20, 51, 102, 153, 204]` — this is missile damage scale (0-225 range, symmetric 5 levels)
- `RECHARGE_RATE_VALUES = [3780, 1890, 945, 473, 236]` — missile recharge (0-100000 range)

For BouncyDamage (range 0-225, default 48): a symmetric 5-level scale would be proportional to SPECIAL_DAMAGE_VALUES. The missile default is 102, bouncy default is 48 — approximately half. A custom scale centered on the default makes more sense:
- `BOUNCY_DAMAGE_VALUES = [12, 24, 48, 96, 192]` — doubling scale centered on default 48 (confidence: MEDIUM)
- OR reuse `SPECIAL_DAMAGE_VALUES` as a uniform preset (confidence: MEDIUM — not perfectly centered on bouncy default)

For BouncyRecharge (range 0-100000, default 765): similar to missile recharge (default 945):
- `BOUNCY_RECHARGE_VALUES = [3060, 1530, 765, 383, 191]` — halving scale centered on default 765 (confidence: MEDIUM)
- OR reuse `RECHARGE_RATE_VALUES` (confidence: MEDIUM — offset from default)

For NadeDamage (range 0-225, default 21):
- A doubling scale: `NADE_DAMAGE_VALUES = [5, 11, 21, 42, 84]` — centered on default 21 (confidence: MEDIUM)
- OR `SPECIAL_DAMAGE_VALUES` — not centered on 21 (confidence: LOW)

For NadeRecharge (range 0-100000, default 1950):
- A halving scale: `NADE_RECHARGE_VALUES = [7800, 3900, 1950, 975, 488]` — centered on default 1950 (confidence: MEDIUM)
- OR `RECHARGE_RATE_VALUES` — not centered on 1950 (confidence: LOW)

**Decision guidance:** STATE.md says "Safe fallback: reuse SPECIAL_DAMAGE_VALUES" for damage and RECHARGE_RATE_VALUES for recharge. This sacrifices accuracy but is lower risk. Custom scales centered on each weapon's default are more correct but require a UX decision (the "Normal" preset must map to the weapon's actual default value).

**Recommended approach:** Define separate constant arrays for each weapon class, centered on their AC defaults. Export them from `settingsSerializer.ts`. Add them to `src/core/map/index.ts` re-exports.

### Format=1.1 Placement: Identified Discrepancy

Looking at the current `settingsSerializer.ts` line 73:
```typescript
const allPairs = ['Format=1.1', ...nonFlaggerPairs, ...flaggerPairs];
```

This puts `Format=1.1` FIRST, before any settings. Phase 82 research and the AC forum source both say the correct order is:
```
non-flagger settings (sorted) → Format=1.1 → flagger settings (sorted)
```

However, Phase 86 (which wrote the current `settingsSerializer.ts`) placed `Format=1.1` first. The current serialized output looks like:
```
Format=1.1, BouncyDamage=48, BouncyEnergy=12, ..., Widescreen=0, FBouncyDamage=48, ...
```

The CORRECT format per AC is:
```
BouncyDamage=48, BouncyEnergy=12, ..., Widescreen=0, Format=1.1, FBouncyDamage=48, ...
```

**Confidence:** MEDIUM — SEdit source is not directly accessible. The AC forum post (referenced in Phase 82 research) specified this ordering. If AC's parser reads settings as comma-delimited key=value pairs regardless of position, then the order may not matter. If AC parses Format= as a version gate that switches parsing mode, position matters critically.

**Triage path:** This is exactly the kind of question that should be answered by the debug trace before coding. The planner should include a triage task that:
1. Saves a map, opens it in SEdit, and records exactly what appears in the description field
2. Identifies whether all 53 keys are present or some are missing
3. If missing, determines at which point in the round-trip they disappear

## Architecture Patterns

### Weapons Tab Dropdown Layout

The existing "Damage & Recharge" section in the Weapons tab has:
```
Laser Damage    [dropdown]
Special Damage  [dropdown]
Recharge Rate   [dropdown]
```

For SETT-01, two options:
1. **Add 4 more rows** (Grenade Damage, Grenade Recharge, Bouncy Damage, Bouncy Recharge) to the same column — makes the section tall but keeps UI consistent
2. **Split into weapon-group columns** (Laser/Missile column, Grenade/Bouncy column) — cleaner layout, shows which preset applies to which weapon clearly

Option 2 is cleaner but requires CSS grid changes. Option 1 is simpler. Given the phase is "Bug Fixes & Polish," option 1 is less risky.

**Key constraint:** `headerFields` state object does NOT need new fields for Grenade/Bouncy presets because there are no binary header fields for them. Instead, use LOCAL React state (`useState`) for the dropdown index, OR compute the index from `localSettings` on every render. Computing from `localSettings` is simpler and avoids stale state issues.

Recommended local state pattern:
```typescript
// No new headerFields needed — compute index from localSettings
const nadePresetIndex = findClosestIndex(localSettings['NadeDamage'] ?? 21, NADE_DAMAGE_VALUES);
// On onChange: just call updateSetting directly
onChange={(val) => {
  updateSetting('NadeDamage', NADE_DAMAGE_VALUES[val] ?? 21);
  setIsDirty(true);
}}
```

However, React `<select>` needs a controlled value. If `localSettings['NadeDamage']` changes, `nadePresetIndex` re-derives correctly. This is simpler than adding explicit state for the dropdown index.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Closest preset index | Custom binary search | `findClosestIndex()` from settingsSerializer | Already exists, O(n) on 5 elements |
| Serialization | New serializer | `buildDescription`, `reserializeDescription` | Already correct lifecycle |
| New parse logic | Custom parser | `parseSettings`, `parseDescription` | Already handles all edge cases |
| Setting validation | Runtime assertions | `getDefaultSettings()` + `GAME_SETTINGS` array | Source of truth established |

## Common Pitfalls

### Pitfall 1: Adding headerFields State for Grenade/Bouncy Dropdowns

**What goes wrong:** Adding `nadePreset: 2` and `bouncyPreset: 2` to the `headerFields` useState object.

**Why it happens:** The existing pattern (Laser/Missile) uses `headerFields` because those map to binary header fields. Grenade/Bouncy are pure extended settings.

**How to avoid:** Do NOT add new `headerFields` entries for Grenade/Bouncy. Either derive the index inline from `localSettings` on each render, or use separate `useState` values for just the two new dropdown indices. The binary header remains unchanged.

**Warning signs:** `headerFields` state object has `nadePreset` or `bouncyPreset` fields — those are not binary header fields and don't belong there.

### Pitfall 2: Format=1.1 Placement Breaking AC Parsing

**What goes wrong:** All 53 settings ARE in the description, but AC only reads up to the first unrecognized token.

**Why it happens:** AC's parser may read `Format=1.1` and use it as a version gate. If the parser sees `Format=1.1` first, it might switch to strict mode and only read the next N settings, or it might ignore everything before the Format= marker.

**How to avoid:** Follow the Phase 82 research ordering: `[...nonFlaggerPairs, 'Format=1.1', ...flaggerPairs]`. Triage first to confirm this is the actual root cause.

**Warning signs:** SEdit shows the Format=1.1 string and some settings after it, but settings before Format= in the description string are missing from SEdit's display.

### Pitfall 3: SEdit Description Box Truncation (Not Our Bug)

**What goes wrong:** SEdit's UI text box only shows 256 characters. If the full 871-byte description IS correctly written to file, but SEdit's UI truncates display, the user sees only the first ~256 characters.

**Why it happens:** SEdit may have a UI limit on its description text box that is separate from the binary format limit. The binary format stores a `uint16` length prefix + arbitrary bytes — no inherent size limit.

**How to avoid:** Test by opening the saved file in a hex editor or text editor to verify the full description is present. If SEdit's UI truncates, the actual bug is elsewhere (e.g., AC's game server might also truncate, or might read the full string from the binary).

**Warning signs:** Hex dump of the saved .map file shows all 53 settings, but SEdit's description box only shows some of them.

### Pitfall 4: extendedSettings Empty on Save

**What goes wrong:** `reserializeDescription` is called with `extendedSettings = {}`. It falls back to all defaults — which IS correct, but only if all defaults match AC's expectations.

**Why it happens:** Some code path clears or never sets `extendedSettings`. Specifically: if `updateMapHeader` is called with only partial fields (e.g., from the old `MapSettingsPanel` component) without including `extendedSettings`, the Zustand merge may leave `extendedSettings` as `{}`.

**How to avoid:** Verify that `loadMap` always populates `extendedSettings` (Phase 86 added this). Verify that `createEmptyMap` always populates it. Check that no component calls `updateMapHeader({})` which could overwrite it with an empty object.

**Warning signs:** Console log of `map.header.extendedSettings` at save time is empty `{}` despite the map having been loaded or created.

### Pitfall 5: Grenade/Bouncy Preset Scale Mismatch

**What goes wrong:** The "Normal" preset in the dropdown sets a value different from AC's default, causing maps to behave unexpectedly.

**Why it happens:** Preset value arrays were defined without centering on each weapon's actual AC default.

**How to avoid:** Ensure the value at index 2 (the "Normal" position) exactly equals AC's stated default from `AC_Setting_Info_25.txt`:
- NadeDamage: default 21 → `NADE_DAMAGE_VALUES[2] === 21`
- NadeRecharge: default 1950 → `NADE_RECHARGE_VALUES[2] === 1950`
- BouncyDamage: default 48 → `BOUNCY_DAMAGE_VALUES[2] === 48`
- BouncyRecharge: default 765 → `BOUNCY_RECHARGE_VALUES[2] === 765`

**Warning signs:** Selecting "Normal" in the Grenade damage dropdown sets NadeDamage to 102 (missile damage) instead of 21.

## Code Examples

### Current Weapons Tab Dropdown Layout (Working Pattern to Extend)

```typescript
// Existing: Laser/Missile dropdowns in the Damage & Recharge column
<SelectInput
  label="Laser Damage"
  value={headerFields.laserDamage}
  options={damageRechargeOptions}
  onChange={(val) => {
    setHeaderFields(prev => ({ ...prev, laserDamage: val }));
    updateSetting('LaserDamage', LASER_DAMAGE_VALUES[val] ?? 27);
    setIsDirty(true);
  }}
/>

// Proposed: Grenade/Bouncy dropdowns (no headerFields involvement)
<SelectInput
  label="Grenade Damage"
  value={findClosestIndex(localSettings['NadeDamage'] ?? 21, NADE_DAMAGE_VALUES)}
  options={damageRechargeOptions}
  onChange={(val) => {
    updateSetting('NadeDamage', NADE_DAMAGE_VALUES[val] ?? 21);
    setIsDirty(true);
  }}
/>
```

### Proposed Preset Value Arrays (to add to settingsSerializer.ts)

```typescript
// NadeDamage: range 0-225, default 21 — doubling scale centered on default
export const NADE_DAMAGE_VALUES = [5, 11, 21, 42, 84];

// NadeRecharge: range 0-100000, default 1950 — halving scale centered on default
export const NADE_RECHARGE_VALUES = [7800, 3900, 1950, 975, 488];

// BouncyDamage: range 0-225, default 48 — doubling scale centered on default
export const BOUNCY_DAMAGE_VALUES = [12, 24, 48, 96, 192];

// BouncyRecharge: range 0-100000, default 765 — halving scale centered on default
export const BOUNCY_RECHARGE_VALUES = [3060, 1530, 765, 383, 191];
```

All four arrays have their index-2 value exactly equal to the AC default from `AC_Setting_Info_25.txt`.

### Debug Triage Logging (for round-trip investigation)

```typescript
// Add to MapService.saveMap(), just before mapParser.serialize()
console.log('[SETT-02 TRIAGE] map.header.extendedSettings keys:', Object.keys(map.header.extendedSettings).length);
console.log('[SETT-02 TRIAGE] reserialize input description length:', map.header.description.length);
const desc = reserializeDescription(map.header.description, map.header.extendedSettings);
console.log('[SETT-02 TRIAGE] reserialized description length:', desc.length);
console.log('[SETT-02 TRIAGE] first 300 chars:', desc.substring(0, 300));
```

### Format=1.1 Ordering Fix (if confirmed as root cause)

Current (potentially wrong):
```typescript
const allPairs = ['Format=1.1', ...nonFlaggerPairs, ...flaggerPairs];
```

Correct per AC:
```typescript
const allPairs = [...nonFlaggerPairs, 'Format=1.1', ...flaggerPairs];
```

## Open Questions

1. **Does Format=1.1 position matter to AC's parser?**
   - What we know: Phase 82 research says non-flagger → Format=1.1 → flagger is correct. Current code puts Format=1.1 first.
   - What's unclear: Whether AC's parser cares about position or just presence
   - Recommendation: This is the primary triage question. Add debug logging, save a map, open in SEdit, compare description field with what was written.

2. **Is SEdit's description box limited to 256 chars (display only)?**
   - What we know: The old `MapSettingsPanel.tsx` has `maxLength={256}` on the description textarea. The binary format has no inherent limit. The full serialized string is ~871 bytes.
   - What's unclear: Whether SEdit reads/displays the full description or truncates at some byte count
   - Recommendation: Open a saved map in a hex editor to confirm full description is present. Then open same map in SEdit and compare.

3. **Are NADE_* and BOUNCY_* preset scales the right design choice?**
   - What we know: The weapons have distinct defaults that don't align with SPECIAL_DAMAGE_VALUES. Reusing SPECIAL_DAMAGE_VALUES would set "Normal" to 102 instead of 21 for grenades.
   - What's unclear: Whether AC players understand or expect these presets to be relative to the weapon's default, or absolute damage values
   - Recommendation: Define weapon-specific scales centered on AC defaults. This is the most correct and least surprising behavior.

4. **Is there a code path that loses extendedSettings between load and save?**
   - What we know: `createEmptyMap()` sets extendedSettings = getDefaultSettings(). `loadMap()` populates it. `applySettings()` updates it. `saveMap()` uses it.
   - What's unclear: Whether any intermediate operation (e.g., undo, document switch) clears it
   - Recommendation: Add a triage log of `Object.keys(map.header.extendedSettings).length` at save time to confirm it has 53 keys.

## Sources

### Primary (HIGH confidence)
- `E:\NewMapEditor\src\core\map\settingsSerializer.ts` — Current serialization implementation, Format=1.1 placement
- `E:\NewMapEditor\src\core\map\GameSettings.ts` — All 53 settings with verified defaults/ranges
- `E:\NewMapEditor\src\components\MapSettingsDialog\MapSettingsDialog.tsx` — Current Weapons tab dropdown code
- `E:\NewMapEditor\src\core\services\MapService.ts` — Save round-trip with reserializeDescription call
- `E:\NewMapEditor\AC_Setting_Info_25.txt` — AC official settings reference (defaults and ranges)

### Secondary (MEDIUM confidence)
- `.planning/phases/82-settings-format-compliance-bug-fixes/82-RESEARCH.md` — Format=1.1 ordering analysis
- `.planning/phases/86-settings-lifecycle/86-01-PLAN.md` — Phase 86 implementation decisions
- `.planning/STATE.md` — Prior decisions and triage-first mandate for this phase

### Tertiary (LOW confidence)
- NADE/BOUNCY preset scale values — derived from AC_Setting_Info_25.txt defaults, but no AC source code confirms the exact scale; validated against format spec only

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — No new dependencies, existing patterns
- Architecture (SETT-01 dropdowns): HIGH — Pattern is established, just need to extend it
- Architecture (SETT-02 root cause): MEDIUM — Format=1.1 position is the primary suspect, but triage required before coding
- Pitfalls: HIGH — Derived from direct code inspection
- Preset value arrays: MEDIUM — Centered on AC defaults but scale is design choice

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (30 days, stable domain)
