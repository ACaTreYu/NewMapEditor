# Phase 82: Settings Format Compliance & Bug Fixes - Research

**Researched:** 2026-02-17
**Domain:** Map settings serialization, parsing, UI state synchronization
**Confidence:** HIGH

## Summary

Phase 82 addresses two critical categories of issues: (1) settings format compliance with AC's Format=1.1 requirement for turret customization, and (2) UI state synchronization bugs where dropdowns and sliders don't reflect loaded map values correctly.

The current implementation (MapSettingsDialog.tsx) already injects `Format=1.1` during serialization but places it incorrectly (middle of non-flagger settings instead of after all non-flagger settings). The dialog also fails to reverse-map extended settings back to dropdown indices when loading maps, causing dropdowns to show stale header values while sliders show correct extended setting values.

**Primary recommendation:** Add reverse mapping functions to compute dropdown indices from extended settings on load, reorder Format=1.1 to appear after non-flagger settings, and validate all 54 settings against AC_Setting_Info_25.txt for correctness.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 18 | 18.x | UI framework | Project already uses React for all UI components |
| Zustand | 4.x | State management | Project's chosen state solution, EditorState.ts |
| TypeScript | 5.x | Type safety | All source files are .ts/.tsx, enforced by project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| ESLint | 8.x | Code quality | Already in project, use for validation checks |
| Vite | 5.x | Build tool | Project build system, no changes needed |

**Installation:** No new dependencies required. All work uses existing project stack.

## Architecture Patterns

### Settings Dialog State Management

Current implementation uses React local state with imperative handle pattern:

```typescript
// MapSettingsDialog.tsx pattern
const [localSettings, setLocalSettings] = useState<Record<string, number>>();
const [headerFields, setHeaderFields] = useState({ laserDamage: 2, ... });

useImperativeHandle(ref, () => ({
  open: () => {
    // Load from Zustand store
    const { map } = useEditorStore.getState();
    // Populate local state
    setHeaderFields({ ...map.header });
    setLocalSettings({ ...map.header.extendedSettings });
  }
}));
```

**Why this pattern:** Dialog needs isolated editing state (Apply/OK/Cancel workflow), separate from global Zustand store. Changes only commit to store on Apply/OK.

### Settings Serialization Pattern

Three-part serialization system:

1. **Binary header fields** — Fixed-size fields in map file header (laserDamage 0-4, maxPlayers, etc.)
2. **Extended settings** — 54 numeric settings serialized to description field as Key=Value pairs
3. **Metadata** — Author, Format version, unrecognized pairs preserved for round-trip compatibility

```typescript
// Current serialization order (INCORRECT per requirements)
serializeSettings(settings: Record<string, number>): string {
  const nonFlagger = GAME_SETTINGS.filter(s => s.category !== 'Flagger');
  const flagger = GAME_SETTINGS.filter(s => s.category === 'Flagger');

  // BUG: Format=1.1 inserted in middle of non-flagger settings
  const allPairs = [...nonFlaggerPairs, 'Format=1.1', ...flaggerPairs];
  return allPairs.join(', ');
}
```

**Correct order per AC requirements (SFMT-02):**
1. Non-flagger settings (alphabetically sorted)
2. `Format=1.1,` (enables turret customization)
3. Flagger settings (alphabetically sorted, F-prefixed)
4. `Author=...` (if present)
5. Unrecognized pairs (legacy compatibility)

### Dropdown-to-Slider Mapping Pattern

**Current pattern (one-way, buggy):**

```typescript
// Dropdown onChange updates BOTH headerField AND extended setting
onChange={(val) => {
  setHeaderFields(prev => ({ ...prev, laserDamage: val })); // 0-4
  updateSetting('LaserDamage', LASER_DAMAGE_VALUES[val] ?? 27); // 5,14,27,54,112
}}

// On dialog open: headerFields loaded directly from map.header
setHeaderFields({ laserDamage: map.header.laserDamage }); // STALE if extended settings differ
```

**Problem:** When user loads a map with custom extended settings (e.g., LaserDamage=50), the slider shows 50 correctly, but the dropdown shows headerFields.laserDamage (may be stale value 2). Dropdown and slider are out of sync.

**Correct pattern (bidirectional):**

```typescript
// FORWARD: Dropdown index → Extended setting value
const LASER_DAMAGE_VALUES = [5, 14, 27, 54, 112];
const laserValue = LASER_DAMAGE_VALUES[dropdownIndex];

// REVERSE: Extended setting value → Dropdown index (MISSING CURRENTLY)
function findClosestDropdownIndex(value: number, valueArray: number[]): number {
  // Find closest match or exact match
  let closestIdx = 0;
  let minDiff = Math.abs(value - valueArray[0]);
  for (let i = 1; i < valueArray.length; i++) {
    const diff = Math.abs(value - valueArray[i]);
    if (diff < minDiff) {
      minDiff = diff;
      closestIdx = i;
    }
  }
  return closestIdx;
}

// On dialog open:
const laserDamageValue = merged['LaserDamage'] ?? 27;
const laserDamageIndex = findClosestDropdownIndex(laserDamageValue, LASER_DAMAGE_VALUES);
setHeaderFields({ ...prev, laserDamage: laserDamageIndex });
```

**Why closest match:** User may have manually edited extended settings to non-preset value (e.g., LaserDamage=30). Dropdown should show nearest preset (Normal=27 index 2).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Array sorting | Custom quicksort | Array.prototype.sort() | Native, optimized, already used in codebase |
| String parsing | Regex state machine | String.split(',').map(p => p.trim()) | Current pattern works, simple, readable |
| Value clamping | Custom bounds checker | Math.max(min, Math.min(max, value)) | Already used in SettingInput.tsx line 29 |
| Closest value search | Binary search on unsorted | Linear search with min diff | Value arrays are tiny (5 elements), linear is clearer |

**Key insight:** Settings arrays (LASER_DAMAGE_VALUES, etc.) have only 5 elements. Linear search with O(n) is perfectly fine and more maintainable than binary search.

## Common Pitfalls

### Pitfall 1: Dropdown Stale State on Load

**What goes wrong:** User loads map with extended settings, dialog opens, dropdowns show old header field values (0-4 indices) instead of values derived from extended settings.

**Why it happens:** Dialog's `open()` function copies `map.header.laserDamage` directly into `headerFields` state without checking if extended settings override this value.

**How to avoid:**
1. After loading extended settings, reverse-map to dropdown indices
2. Update headerFields state to reflect extended setting values, not stale header values
3. Ensure dropdown onChange and load logic use same value arrays

**Warning signs:**
- Slider shows one value (e.g., 50) but dropdown shows "Normal" (index 2 = value 27)
- User adjusts dropdown, slider jumps to different value
- Special Damage and Laser Damage cross-contaminate each other's sliders

### Pitfall 2: Special Damage / Laser Damage Crossfire Bug (SBUG-02)

**What goes wrong:** Adjusting Special Damage dropdown changes Laser Damage slider value, or vice versa.

**Why it happens:** Both dropdowns share same headerFields state object. If onChange handlers aren't properly isolated, updating one field can trigger re-renders with stale values that overwrite the other field.

**How to avoid:**
1. Ensure each dropdown onChange uses functional setState: `setHeaderFields(prev => ({ ...prev, specialDamage: val }))`
2. Verify updateSetting calls reference correct extended setting keys (LaserDamage vs MissileDamage)
3. Test that changing one dropdown doesn't trigger onChange for the other

**Warning signs:**
- Changing Special Damage causes Laser Damage slider to move
- Console shows multiple setState calls from single dropdown change
- headerFields has incorrect key name in onChange handler

### Pitfall 3: Format=1.1 Incorrect Placement

**What goes wrong:** Format=1.1 appears in wrong position in description string, causing AC to not recognize format version.

**Why it happens:** Current code inserts Format=1.1 in middle of alphabetically sorted non-flagger settings array.

**How to avoid:**
1. Build non-flagger pairs array completely
2. Build flagger pairs array completely
3. Combine: `[...nonFlaggerPairs, 'Format=1.1', ...flaggerPairs, authorPair, ...unrecognized]`
4. Verify serialization with test case

**Warning signs:**
- Turret customization doesn't work in AC despite settings being present
- Description field has Format=1.1 between BouncyDamage and LaserDamage
- Format=1.1 appears before all non-flagger settings are listed

### Pitfall 4: Settings Count Mismatch

**What goes wrong:** Code assumes 54 settings but GAME_SETTINGS array has different count, causing settings to be skipped or duplicated.

**Why it happens:** Settings added/removed during development without updating documentation or validation.

**How to avoid:**
1. Validate GAME_SETTINGS.length === 54 in unit test or startup assertion
2. Cross-reference AC_Setting_Info_25.txt for complete list
3. Check for duplicate keys in GAME_SETTINGS array
4. Verify each setting has correct category, min, max, default

**Warning signs:**
- grep -c "key:" GameSettings.ts returns value other than 54
- Settings appear duplicated in serialized description
- Some settings never serialize or load correctly

### Pitfall 5: Backward Compatibility Breaking

**What goes wrong:** Pre-v1.0.4 maps (no Format=1.1) fail to load or lose settings on save.

**Why it happens:** Parsing logic expects Format=1.1 to be present, or serialization always adds it without checking if map needs backward compatibility.

**How to avoid:**
1. parseSettings filters out Format= during parsing (already implemented line 71)
2. serializeSettings always injects Format=1.1 (standard for new saves)
3. Old maps without Format=1.1 load correctly because parsing is optional
4. Test with pre-v1.0.4 map file (no Format=1.1 in description)

**Warning signs:**
- Old maps show console errors on load
- Maps saved in old version lose settings after round-trip through v1.0.4
- Format=1.1 appears multiple times in description after multiple saves

## Code Examples

Verified patterns from official sources and current codebase:

### Reverse Mapping: Extended Settings to Dropdown Index

```typescript
// Source: Research-derived pattern based on MapSettingsDialog.tsx existing forward mapping
/**
 * Find closest dropdown index for a given extended setting value.
 * Uses linear search with minimum difference to handle custom values.
 * @param value - Extended setting value (e.g., LaserDamage=50)
 * @param valueArray - Preset value array (e.g., LASER_DAMAGE_VALUES)
 * @returns Index into valueArray (0-4 for damage/recharge dropdowns)
 */
function findClosestIndex(value: number, valueArray: number[]): number {
  let closestIdx = 0;
  let minDiff = Math.abs(value - valueArray[0]);

  for (let i = 1; i < valueArray.length; i++) {
    const diff = Math.abs(value - valueArray[i]);
    if (diff < minDiff) {
      minDiff = diff;
      closestIdx = i;
    }
  }

  return closestIdx;
}

// Usage in dialog open:
const laserDamageValue = merged['LaserDamage'] ?? 27;
const specialDamageValue = merged['MissileDamage'] ?? 102;
const rechargeValue = merged['MissileRecharge'] ?? 945;

setHeaderFields({
  // ... other fields
  laserDamage: findClosestIndex(laserDamageValue, LASER_DAMAGE_VALUES),
  specialDamage: findClosestIndex(specialDamageValue, SPECIAL_DAMAGE_VALUES),
  rechargeRate: findClosestIndex(rechargeValue, RECHARGE_RATE_VALUES),
});
```

### Correct Settings Serialization Order

```typescript
// Source: AC_Setting_Info_25.txt + Armor Critical forums research
/**
 * Serializes game settings with Format=1.1 compliance.
 * Order: non-flagger (sorted) → Format=1.1 → flagger (sorted)
 */
function serializeSettings(settings: Record<string, number>): string {
  const nonFlaggerSettings = GAME_SETTINGS.filter(s => s.category !== 'Flagger');
  const flaggerSettings = GAME_SETTINGS.filter(s => s.category === 'Flagger');

  const sortedNonFlagger = nonFlaggerSettings.sort((a, b) => a.key.localeCompare(b.key));
  const sortedFlagger = flaggerSettings.sort((a, b) => a.key.localeCompare(b.key));

  const nonFlaggerPairs = sortedNonFlagger.map(setting =>
    `${setting.key}=${settings[setting.key] ?? setting.default}`
  );
  const flaggerPairs = sortedFlagger.map(setting =>
    `${setting.key}=${settings[setting.key] ?? setting.default}`
  );

  // CORRECT ORDER: non-flagger → Format=1.1 → flagger
  const allPairs = [...nonFlaggerPairs, 'Format=1.1', ...flaggerPairs];
  return allPairs.join(', ');
}
```

### Settings Validation Against Reference

```typescript
// Source: AC_Setting_Info_25.txt line-by-line verification pattern
/**
 * Validate GAME_SETTINGS array against AC_Setting_Info_25.txt reference.
 * Checks: count, key names, min/max ranges, default values.
 */
function validateGameSettings(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check total count
  if (GAME_SETTINGS.length !== 54) {
    errors.push(`Expected 54 settings, found ${GAME_SETTINGS.length}`);
  }

  // Check for duplicate keys
  const keys = new Set<string>();
  for (const setting of GAME_SETTINGS) {
    if (keys.has(setting.key)) {
      errors.push(`Duplicate key: ${setting.key}`);
    }
    keys.add(setting.key);
  }

  // Validate specific settings against AC_Setting_Info_25.txt
  const validations = [
    { key: 'LaserDamage', min: 0, max: 225, default: 27 },
    { key: 'MissileDamage', min: 0, max: 225, default: 102 },
    { key: 'ShipSpeed', min: 0, max: 200, default: 100 },
    { key: 'TurretHealth', min: 0, max: 224, default: 224 },
    // ... all 54 settings from AC_Setting_Info_25.txt
  ];

  for (const expected of validations) {
    const actual = GAME_SETTINGS.find(s => s.key === expected.key);
    if (!actual) {
      errors.push(`Missing setting: ${expected.key}`);
      continue;
    }
    if (actual.min !== expected.min) {
      errors.push(`${expected.key}: min should be ${expected.min}, got ${actual.min}`);
    }
    if (actual.max !== expected.max) {
      errors.push(`${expected.key}: max should be ${expected.max}, got ${actual.max}`);
    }
    if (actual.default !== expected.default) {
      errors.push(`${expected.key}: default should be ${expected.default}, got ${actual.default}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No format versioning | Format=1.1 enables turret customization | AC update ~2025 | Maps without Format=1.1 can't use turret weapon customization |
| Settings in separate config file | Settings embedded in map description field | SEdit/AC standard | Single-file map distribution, settings travel with map |
| Fixed damage/recharge values | 5-level dropdown (Very Low to Very High) | v1.0.4 milestone design | Easier for users, matches SEdit UI pattern |
| Header fields only | Header fields + extended settings | v1.0.4 milestone | 54 settings vs ~13 header fields, more customization |

**Deprecated/outdated:**
- DHT (old dynamic holding time system): Replaced by DHT_players, DHT_time, DHT_deaths, DHT_score, DHT_turrets. Keep for backward compatibility but don't promote in UI.
- Raw description text: Now parsed as Key=Value pairs, but legacy text preserved in unrecognized array for round-trip compatibility.

## Open Questions

1. **Default value for RepairRate**
   - What we know: AC_Setting_Info_25.txt says "Default is 2"
   - What's unclear: GameSettings.ts has default: 0
   - Recommendation: Verify against AC game behavior, update GameSettings.ts default to 2 if incorrect

2. **ElectionTime default mismatch**
   - What we know: AC_Setting_Info_25.txt says "Default is 50", GameSettings.ts has default: 14
   - What's unclear: Which is correct for current AC version
   - Recommendation: Test in AC game, update GameSettings.ts to match observed behavior

3. **Format=1.1 vs Format=1.0**
   - What we know: Code comments mention Format=1.1 required for turrets
   - What's unclear: Are there other format versions (1.2, 2.0)? What features do they enable?
   - Recommendation: Always use Format=1.1 for now, mark as TODO to research if newer versions exist

4. **Settings order sensitivity**
   - What we know: Flagger settings must come after non-flagger counterparts (per AC_Setting_Info_25.txt)
   - What's unclear: Does AC care about exact order within each group, or just flagger-after-non-flagger?
   - Recommendation: Use alphabetical sort for deterministic output, test with AC to confirm parsing is order-insensitive within groups

## Sources

### Primary (HIGH confidence)
- `E:\NewMapEditor\src\core\map\GameSettings.ts` - Current 54 settings implementation (verified 54 count)
- `E:\NewMapEditor\src\components\MapSettingsDialog\MapSettingsDialog.tsx` - Serialization, parsing, UI state logic
- `E:\NewMapEditor\AC_Setting_Info_25.txt` - Official AC settings reference (ranges, defaults, descriptions)
- `.planning\REQUIREMENTS.md` - v1.0.4 requirements SFMT-01 through SBUG-04

### Secondary (MEDIUM confidence)
- [Armor Critical Customizable Map Settings Forum](https://armor-critical.com/forums/viewtopic.php?p=298) - Format=1.1 requirement, flagger settings ordering
- Current codebase pattern analysis - Dropdown value arrays (LASER_DAMAGE_VALUES etc.), state management patterns

### Tertiary (LOW confidence, marked for validation)
- RepairRate default value discrepancy (AC_Setting_Info_25.txt=2 vs GameSettings.ts=0)
- ElectionTime default value discrepancy (AC_Setting_Info_25.txt=50 vs GameSettings.ts=14)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Project already established, no new dependencies
- Architecture: HIGH - Current patterns well-documented in codebase, clear bugs identified
- Pitfalls: HIGH - Bugs reproduced from code inspection, AC reference documentation confirms Format=1.1 requirement

**Research date:** 2026-02-17
**Valid until:** 2026-03-19 (30 days, stable domain - map format unlikely to change rapidly)
