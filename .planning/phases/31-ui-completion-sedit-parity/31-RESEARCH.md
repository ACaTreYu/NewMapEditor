# Phase 31: UI Completion & SEdit Parity - Research

**Researched:** 2026-02-09
**Domain:** UI modernization (React form controls) + Binary format parity (SubSpace/Continuum map format)
**Confidence:** HIGH

## Summary

Phase 31 addresses two distinct but complementary domains: completing the visual modernization of the Map Settings dialog with modern input controls, and achieving byte-level compatibility with SEdit's map format. The dialog currently uses modern flat styling for sliders and text inputs but has 10 tabs that need consolidation and lacks proper controls for boolean/enum settings. Format parity requires matching SEdit's exact default values and fixing the known "missles" typo in the binary format.

Research reveals SEdit's default values differ from the current editor implementation in several critical fields (laserDamage, specialDamage, rechargeRate, holdingTime, maxSimulPowerups). The binary format uses "misslesEnabled" (misspelled) which should be written correctly despite SEdit's bug. The current dialog structure with 10 tabs (Map, General, Laser, Missile, Bouncy, Grenade, Game, DHT, Flagger, Toggles) can be consolidated into 5-6 semantic groups.

**Primary recommendation:** Consolidate tabs to 4-5 groups (General, Weapons, Game Rules, Flagger, Advanced), add checkbox components for boolean toggles, use dropdown for objective type and team count, fix all default value mismatches, and preserve the "missles" field name in binary I/O for compatibility.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Settings Dialog Layout:**
- Consolidate 10 tabs into fewer groups (Claude picks sensible groupings based on setting relationships)
- Compact/efficient density — settings close together, maximize visible settings without scrolling
- Fixed-size dialog — predictable dimensions, content scrolls within sections if needed
- No description textarea (removed in Phase 30 — settings auto-serialize)

**Input Control Types:**
- **Numeric settings** (damage, speeds, rates): Slider + editable number field side by side (current approach, keep it)
- **Boolean settings** (missiles enabled, fog of war, etc.): Checkboxes — not toggle switches
- **Enum settings** (objective type, team count): Claude decides — dropdown or segmented control based on what fits the modern design

**SEdit Format Parity:**
- Reference source: SEdit source analysis documentation only (no reference map files available)
- Bug handling: Fix obvious SEdit bugs rather than replicating them — write correct bytes
- String encoding: Claude decides pragmatically (ASCII vs UTF-8 for name/description fields)
- Save format version: Claude decides whether to always write V3 or preserve loaded version

**Default Value Alignment:**
- Must match SEdit defaults exactly — zero tolerance for drift across all 53 settings
- Cross-reference AC_Setting_Info_25.txt AND SEdit source code analysis for verification
- Fix any incorrect defaults silently, but produce a logged summary of what changed
- Migration for old maps: Claude decides migration logic for maps saved with potentially wrong defaults

### Claude's Discretion

- Tab grouping logic (how to consolidate 10 tabs into fewer sections)
- Dialog dimensions and internal spacing
- Dropdown vs segmented control for enum inputs
- String encoding strategy (ASCII vs UTF-8)
- Save format version strategy (always V3 vs preserve loaded version)
- Migration approach for maps with old defaults

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

---

## Standard Stack

### Core (Already in Project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 18 | 18.x | UI components | Already used throughout project |
| TypeScript | 5.x | Type safety | Already used throughout project |
| CSS Custom Properties | Native | Design tokens | Already established in variables.css |

### Supporting (No Additional Dependencies Needed)

All required functionality exists in current codebase:
- Modern CSS design tokens: `src/styles/variables.css`
- Dialog component: `MapSettingsDialog.tsx` (needs enhancement)
- Slider + number input: `SettingInput.tsx` (already implemented)
- Binary format parsing: `MapParser.ts` (needs default value fixes)
- Game settings schema: `GameSettings.ts` (needs default value verification)

**Installation:**
```bash
# No new dependencies required
```

---

## Architecture Patterns

### Current Dialog Structure (10 Tabs)

```
Map Settings Dialog (MapSettingsDialog.tsx)
├── Map tab          # name, author (text inputs)
├── General tab      # ShipSpeed, HealthBonus, HealthDecay, RepairRate, TurretHealth
├── Laser tab        # LaserDamage, LaserEnergy, LaserTTL, LaserSpeed
├── Missile tab      # MissileDamage, MissileEnergy, MissileTTL, MissileRecharge, MissileSpeed
├── Bouncy tab       # BouncyDamage, BouncyEnergy, BouncyTTL, BouncyRecharge, BouncySpeed
├── Grenade tab      # NadeDamage, NadeEnergy, ShrapTTL, ShrapSpeed, NadeRecharge, NadeSpeed
├── Game tab         # HoldingTime, ElectionTime, SwitchWin, DominationWin
├── DHT tab          # DHT_players, DHT_time, DHT_deaths, DHT_score, DHT_turrets, DHT_minimum, DHT_maximum
├── Flagger tab      # All F-prefixed variants (11 settings)
└── Toggles tab      # DisableSwitchSound, InvisibleMap, FogOfWar, FlagInPlay, Widescreen (5 booleans)
```

**Current tab count:** 10 tabs (too many, requires horizontal scrolling or very small tab labels)

### Recommended Consolidated Structure (4-5 Tabs)

**Option A: 4 Tabs (Aggressive Consolidation)**
```
├── General          # Map info + general settings + header fields
│   ├── Text: name, author
│   ├── Enum: maxPlayers (1-16), numTeams (1-4), objective (dropdown)
│   ├── Numeric: ShipSpeed, HealthBonus, HealthDecay, RepairRate, TurretHealth
│   └── Boolean: missilesEnabled, bombsEnabled, bounciesEnabled
├── Weapons          # All weapon settings (Laser, Missile, Bouncy, Grenade)
│   ├── Laser: LaserDamage, LaserEnergy, LaserTTL, LaserSpeed
│   ├── Missile: MissileDamage, MissileEnergy, MissileTTL, MissileRecharge, MissileSpeed
│   ├── Bouncy: BouncyDamage, BouncyEnergy, BouncyTTL, BouncyRecharge, BouncySpeed
│   └── Grenade: NadeDamage, NadeEnergy, ShrapTTL, ShrapSpeed, NadeRecharge, NadeSpeed
├── Game Rules       # Game mode settings + DHT
│   ├── HoldingTime, ElectionTime, SwitchWin, DominationWin
│   ├── DHT: DHT_players, DHT_time, DHT_deaths, DHT_score, DHT_turrets, DHT_minimum, DHT_maximum
│   └── Toggles: DisableSwitchSound, InvisibleMap, FogOfWar, FlagInPlay, Widescreen
└── Flagger          # All F-prefixed variants
    ├── FShipSpeed, FHealthBonus, FHealthDecay, FRepairRate
    ├── FLaserDamage, FLaserEnergy
    ├── FMissileDamage, FMissileEnergy
    ├── FBouncyDamage, FBouncyEnergy
    └── FNadeDamage, FNadeEnergy
```

**Option B: 5 Tabs (Balanced)**
```
├── General          # Map info + header fields only
│   ├── Text: name, author
│   ├── Enum: maxPlayers (1-16), numTeams (1-4), objective (dropdown)
│   ├── Numeric: ShipSpeed, HealthBonus, HealthDecay, RepairRate, TurretHealth
│   ├── Boolean: missilesEnabled, bombsEnabled, bounciesEnabled
│   └── Header: laserDamage, specialDamage, rechargeRate, powerupCount, maxSimulPowerups, switchCount
├── Weapons          # All weapon settings (24 settings)
│   └── [Same as Option A]
├── Game Rules       # Game mode settings (11 settings)
│   └── [Same as Option A, excluding DHT]
├── Flagger          # All F-prefixed variants (11 settings)
│   └── [Same as Option A]
└── Advanced         # DHT + Toggles (12 settings)
    ├── DHT: DHT_players, DHT_time, DHT_deaths, DHT_score, DHT_turrets, DHT_minimum, DHT_maximum
    └── Toggles: DisableSwitchSound, InvisibleMap, FogOfWar, FlagInPlay, Widescreen
```

**Recommendation:** Option B (5 tabs) provides better visual chunking without overwhelming any single tab. The "Weapons" tab has 24 settings but they're organized in 4 clear subgroups. "Advanced" clearly signals less-commonly-used settings.

### Pattern: Checkbox Component

The codebase lacks a checkbox component. Need to create a modern flat checkbox matching the design system.

```typescript
// src/components/MapSettingsDialog/CheckboxInput.tsx
interface CheckboxInputProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
}

export const CheckboxInput: React.FC<CheckboxInputProps> = ({
  label,
  checked,
  onChange,
  description
}) => {
  return (
    <div className="checkbox-input-row">
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="checkbox-input"
        />
        <span className="checkbox-label-text">{label}</span>
      </label>
      {description && <span className="checkbox-description">{description}</span>}
    </div>
  );
};
```

**CSS Styling:**
```css
/* Modern flat checkbox */
.checkbox-input-row {
  display: flex;
  align-items: center;
  margin-bottom: var(--space-1);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--space-0_75);
  cursor: pointer;
  user-select: none;
}

.checkbox-input {
  width: 16px;
  height: 16px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  cursor: pointer;
  appearance: none;
  background: var(--input-bg);
}

.checkbox-input:checked {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
}

.checkbox-input:checked::after {
  content: '✓';
  display: block;
  color: var(--text-on-accent);
  font-size: 12px;
  text-align: center;
  line-height: 14px;
}

.checkbox-input:focus {
  outline: 2px solid var(--input-focus);
  outline-offset: 2px;
}

.checkbox-label-text {
  font-size: var(--font-size-xs);
  color: var(--text-primary);
}
```

### Pattern: Dropdown/Select Component

For objective type (3 options) and team count (4 options), a simple `<select>` element with modern styling is appropriate.

```typescript
// src/components/MapSettingsDialog/SelectInput.tsx
interface SelectOption {
  value: number | string;
  label: string;
}

interface SelectInputProps {
  label: string;
  value: number | string;
  options: SelectOption[];
  onChange: (value: number | string) => void;
}

export const SelectInput: React.FC<SelectInputProps> = ({
  label,
  value,
  options,
  onChange
}) => {
  return (
    <div className="select-input-row">
      <label className="select-label">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="select-input"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};
```

**CSS Styling:**
```css
.select-input-row {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  margin-bottom: var(--space-1);
}

.select-label {
  flex: 0 0 140px;
  font-size: var(--font-size-xs);
  color: var(--text-primary);
}

.select-input {
  padding: var(--space-0_5) var(--space-0_75);
  font-size: var(--font-size-xs);
  color: var(--text-primary);
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.select-input:focus {
  outline: none;
  border-color: var(--input-focus);
  box-shadow: 0 0 0 2px var(--focus-ring);
}
```

### Anti-Patterns to Avoid

- **Toggle switches instead of checkboxes:** User explicitly chose checkboxes for utilitarian feel
- **Too many tabs (current 10):** Requires horizontal scrolling, poor UX
- **Mixing boolean and numeric controls:** Keep clear visual separation
- **Hardcoded colors/spacing:** Use design tokens from variables.css

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form validation | Custom validation logic | Min/max clamping in onChange handlers | Already implemented in SettingInput.tsx, proven pattern |
| Binary serialization | Custom byte packing | Existing MapParser.ts serialize() method | Already handles header byte layout correctly |
| Default value management | Scattered constants | GameSettings.ts GAME_SETTINGS array | Single source of truth, already exists |
| CSS design system | Component-specific styles | variables.css design tokens | Established two-tier system (primitives + semantic) |

**Key insight:** The codebase already has solid foundations. This phase is about refinement (consolidating tabs, adding missing control types, fixing default mismatches) rather than rebuilding core systems.

---

## Common Pitfalls

### Pitfall 1: Default Value Drift

**What goes wrong:** SEdit defaults (from source code) differ from current GameSettings.ts defaults in 6 critical fields:
- `laserDamage`: SEdit=2, Current=1
- `specialDamage`: SEdit=2, Current=1
- `rechargeRate`: SEdit=2, Current=1
- `holdingTime`: SEdit=15, Current=0
- `maxSimulPowerups`: SEdit=12, Current=0
- `powerupCount`: SEdit=(not set in CreateNewMap, uses 0), Current=0

**Why it happens:** The TypeScript port made assumptions without verifying against SEdit source code.

**How to avoid:**
1. Update `createDefaultHeader()` in `src/core/map/types.ts` to match SEdit's CreateNewMap() defaults
2. Do NOT update GAME_SETTINGS defaults in GameSettings.ts (those are AC_Setting_Info_25.txt reference values)
3. Log all changed defaults during implementation

**Warning signs:**
- New maps created in editor don't match SEdit's new map behavior
- Settings show non-default values immediately after "New Map" creation
- Byte-level comparison with SEdit output differs in header fields

### Pitfall 2: The "missles" Typo Bug

**What goes wrong:** SEdit source code uses `misslesEnabled` (misspelled) in the struct definition and binary I/O. This is a known bug but must be preserved for format compatibility.

**Why it happens:** Original SEdit developer typo in main.h:90 propagated throughout codebase.

**How to avoid:**
- Keep TypeScript property as `missilesEnabled` (correct spelling) in MapHeader interface
- Map to/from `missles` ONLY in binary serialization layer (MapParser.ts)
- Add comment documenting the intentional mismatch
- Write correct bytes (0x10 offset) but preserve field name compatibility

**Warning signs:**
- Maps saved by editor can't be loaded by SEdit
- Boolean toggle state lost when round-tripping through SEdit
- Byte offset errors in header parsing

### Pitfall 3: Tab Overflow in Dialog

**What goes wrong:** 10 tabs don't fit horizontally in a 600px dialog width without wrapping or tiny labels.

**Why it happens:** Current SETTING_CATEGORIES array has 10 entries, dialog CSS uses horizontal flex layout.

**How to avoid:**
1. Consolidate SETTING_CATEGORIES to 4-5 semantic groups
2. Update MapSettingsDialog.tsx to iterate over new category structure
3. Update tab rendering to handle sections with subheadings instead of single setting lists

**Warning signs:**
- Tabs wrap to multiple rows
- Tab labels truncated with ellipsis
- Horizontal scrollbar in tab bar
- Last few tabs are invisible

### Pitfall 4: String Encoding Ambiguity

**What goes wrong:** SEdit uses raw char* strings without explicit encoding. Modern JavaScript assumes UTF-8. Edge cases with extended ASCII (0x80-0xFF) may not round-trip correctly.

**Why it happens:** Win32 apps used system ANSI code page, JavaScript uses UTF-8 by default.

**How to avoid:**
- Use TextEncoder/TextDecoder with 'utf-8' explicitly (already done in MapParser.ts)
- Test with map names containing extended characters (é, ñ, ü, etc.)
- Accept UTF-8 as pragmatic choice (SEdit never specified encoding anyway)
- Document encoding decision in MapParser.ts comments

**Warning signs:**
- Map names with accented characters display as garbage after save/load
- Description field truncated at first non-ASCII character
- Byte length mismatch between name string and nameLength field

### Pitfall 5: Mixing Header Fields and Extended Settings

**What goes wrong:** Some settings exist in BOTH the binary header (laserDamage, specialDamage, rechargeRate, etc.) AND the extendedSettings description serialization. Priority/override logic can conflict.

**Why it happens:** Phase 30 added settings serialization, but header fields existed first.

**How to avoid:**
- Header fields are LEGACY, always written for SEdit compatibility
- extendedSettings override header values on load (current behavior is correct)
- On save, write both header fields AND description serialization for maximum compatibility
- Document the dual-storage approach in MapSettingsDialog.tsx

**Warning signs:**
- Settings revert to wrong values after save/load cycle
- SEdit displays different values than editor for same map
- updateMapHeader() loses some setting changes

---

## Code Examples

### Example 1: Checkbox for Boolean Settings

```typescript
// In MapSettingsDialog.tsx, add new section for header boolean fields
<div className="setting-group">
  <h3 className="section-heading">Weapons Enabled</h3>
  <CheckboxInput
    label="Missiles Enabled"
    checked={missilesEnabled}
    onChange={(val) => {
      setMissilesEnabled(val);
      setIsDirty(true);
    }}
  />
  <CheckboxInput
    label="Bombs Enabled"
    checked={bombsEnabled}
    onChange={(val) => {
      setBombsEnabled(val);
      setIsDirty(true);
    }}
  />
  <CheckboxInput
    label="Bouncing Bullets Enabled"
    checked={bounciesEnabled}
    onChange={(val) => {
      setBounciesEnabled(val);
      setIsDirty(true);
    }}
  />
</div>
```

### Example 2: Dropdown for Objective Type

```typescript
// In MapSettingsDialog.tsx, add enum controls
const objectiveOptions: SelectOption[] = [
  { value: ObjectiveType.FRAG, label: 'Deathmatch (Frag)' },
  { value: ObjectiveType.FLAG, label: 'Capture the Flag' },
  { value: ObjectiveType.SWITCH, label: 'Control Switches' }
];

<SelectInput
  label="Game Objective"
  value={objective}
  options={objectiveOptions}
  onChange={(val) => {
    setObjective(Number(val));
    setIsDirty(true);
  }}
/>
```

### Example 3: Fixed Default Values in types.ts

```typescript
// src/core/map/types.ts - createDefaultHeader()
export function createDefaultHeader(): MapHeader {
  return {
    id: MAP_MAGIC,
    dataOffset: 26,
    version: MapVersion.V3_CURRENT,
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    maxPlayers: 16,            // SEdit: 16 ✓
    holdingTime: 15,            // SEdit: 15 (was 0) ← FIX
    numTeams: 2,                // SEdit: 2 ✓
    objective: ObjectiveType.FRAG, // SEdit: 0 ✓
    laserDamage: 2,             // SEdit: 2 (was 1) ← FIX
    specialDamage: 2,           // SEdit: 2 (was 1) ← FIX
    rechargeRate: 2,            // SEdit: 2 (was 1) ← FIX
    missilesEnabled: true,      // SEdit: 1 ✓
    bombsEnabled: true,         // SEdit: 1 ✓
    bounciesEnabled: true,      // SEdit: 1 ✓
    powerupCount: 0,            // SEdit: (not set, remains 0) ✓
    maxSimulPowerups: 12,       // SEdit: 12 (was 0) ← FIX
    switchCount: 0,             // SEdit: (not set, remains 0) ✓
    flagCount: [0, 0, 0, 0],
    flagPoleCount: [0, 0, 0, 0],
    flagPoleData: [new Uint8Array(0), new Uint8Array(0), new Uint8Array(0), new Uint8Array(0)],
    name: 'New Map',            // SEdit: "New Map" (was "Untitled") ← FIX
    description: 'New map',     // SEdit: "New map" (was '') ← FIX
    neutralCount: 0,
    extendedSettings: {}
  };
}
```

### Example 4: Preserving "missles" in Binary I/O

```typescript
// In MapParser.ts serialize() method - offset 0x10
view.setUint8(offset, header.missilesEnabled ? 1 : 0); offset += 1; // Note: binary field is "misslesEnabled" (typo)

// In MapParser.ts parseV3() method - offset 0x10
const missilesEnabled = data.getUint8(offset) !== 0; offset += 1; // Read as "misslesEnabled" but store correctly

// Add comment at top of MapParser.ts:
/**
 * Binary Format Note: SEdit source code uses "misslesEnabled" (misspelled)
 * at offset 0x10. We preserve this in binary I/O for compatibility but use
 * correct spelling "missilesEnabled" in TypeScript types.
 */
```

### Example 5: Consolidated Tab Structure

```typescript
// Update SETTING_CATEGORIES in GameSettings.ts
export const SETTING_CATEGORIES = [
  'General',   // Map info + header fields + general settings
  'Weapons',   // Laser, Missile, Bouncy, Grenade
  'Game Rules', // HoldingTime, ElectionTime, SwitchWin, DominationWin, Toggles
  'Flagger',   // All F-prefixed variants
  'Advanced'   // DHT settings
] as const;

// Add subcategory metadata
export const SETTING_SUBCATEGORIES: Record<string, string[]> = {
  'Weapons': ['Laser', 'Missile', 'Bouncy', 'Grenade'],
  'Game Rules': ['Core', 'Toggles'],
  'Advanced': ['Dynamic Holding Time']
};
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Win98 beveled dialogs | Flat modern dialogs | Phase 27-28 | Map Settings is last dialog to modernize |
| Toggle switches for booleans | Checkboxes (decision) | Phase 31 | Matches utilitarian aesthetic |
| 10 separate tabs | 4-5 consolidated tabs | Phase 31 | Reduces cognitive load, fits in fixed width |
| Hardcoded defaults | SEdit-verified defaults | Phase 31 | Ensures interoperability with AC ecosystem |

**Deprecated/outdated:**
- Win98-style property sheets with 3D borders (replaced by flat modern tabs)
- Slider-only inputs (replaced by slider + number field combo in earlier phases)
- Description textarea for user input (removed in Phase 30, now auto-generated)

---

## SEdit Format Parity Details

### Default Value Comparison Table

| Field | SEdit Default (CreateNewMap) | Current (types.ts) | Status | Source |
|-------|------------------------------|-------------------|--------|--------|
| width | 256 | 256 | ✓ Match | map.cpp:2786 |
| height | 256 | 256 | ✓ Match | map.cpp:2787 |
| name | "New Map" | "Untitled" | ✗ Fix needed | map.cpp:2789 |
| description | "New map" | "" | ✗ Fix needed | map.cpp:2790-2791 |
| missilesEnabled | 1 (true) | true | ✓ Match | map.cpp:2793 |
| bombsEnabled | 1 (true) | true | ✓ Match | map.cpp:2793 |
| bounciesEnabled | 1 (true) | true | ✓ Match | map.cpp:2793 |
| specialDamage | 2 | 1 | ✗ Fix needed | map.cpp:2794 |
| laserDamage | 2 | 1 | ✗ Fix needed | map.cpp:2794 |
| rechargeRate | 2 | 1 | ✗ Fix needed | map.cpp:2794 |
| holdingTime | 15 | 0 | ✗ Fix needed | map.cpp:2795 |
| maxPlayers | 16 | 16 | ✓ Match | map.cpp:2796 |
| numTeams | 2 | 2 | ✓ Match | map.cpp:2797 |
| objective | 0 (FRAG) | 0 (FRAG) | ✓ Match | map.cpp:2798 |
| maxSimulPowerups | 12 | 0 | ✗ Fix needed | map.cpp:2799 |

**Summary:** 6 fields need correction to match SEdit defaults exactly.

### Binary Format Header Field Mapping

Current MapParser.ts writes these fields at exact byte offsets matching SEdit:

| Offset | Size | Field | Type | Current Status |
|--------|------|-------|------|----------------|
| 0x00 | 2 | id (0x4278) | WORD | ✓ Correct |
| 0x02 | 2 | dataOffset | WORD | ✓ Correct (dynamic calculation) |
| 0x04 | 1 | version (3) | BYTE | ✓ Correct |
| 0x05 | 2 | width (256) | WORD | ✓ Correct |
| 0x07 | 2 | height (256) | WORD | ✓ Correct |
| 0x09 | 1 | maxPlayers | BYTE | ✓ Correct |
| 0x0A | 1 | holdingTime | BYTE | ⚠ Value mismatch (fix in types.ts) |
| 0x0B | 1 | numTeams | BYTE | ✓ Correct |
| 0x0C | 1 | objective | BYTE | ✓ Correct |
| 0x0D | 1 | laserDamage | BYTE | ⚠ Value mismatch (fix in types.ts) |
| 0x0E | 1 | specialDamage | BYTE | ⚠ Value mismatch (fix in types.ts) |
| 0x0F | 1 | rechargeRate | BYTE | ⚠ Value mismatch (fix in types.ts) |
| 0x10 | 1 | misslesEnabled | BYTE | ✓ Correct (note typo) |
| 0x11 | 1 | bombsEnabled | BYTE | ✓ Correct |
| 0x12 | 1 | bounciesEnabled | BYTE | ✓ Correct |
| 0x13 | 2 | powerupCount | WORD | ✓ Correct |
| 0x15 | 1 | maxSimulPowerups | BYTE | ⚠ Value mismatch (fix in types.ts) |
| 0x16 | 1 | switchCount | BYTE | ✓ Correct |

**Binary I/O:** MapParser.ts byte layout is correct. Only default value initialization needs fixes.

### String Encoding Decision

**Recommendation: UTF-8**

**Rationale:**
- SEdit never specified encoding explicitly (relied on system ANSI code page)
- JavaScript TextEncoder/TextDecoder default to UTF-8
- UTF-8 is backwards-compatible with ASCII (0x00-0x7F)
- Extended characters (0x80-0xFF) may differ from SEdit's output, but this is acceptable
- Modern tooling should use modern standards
- No requirement to perfectly replicate Win32 code page behavior

**Implementation:** Continue using current `new TextEncoder().encode()` and `new TextDecoder().decode()` without changes.

### Save Format Version Strategy

**Recommendation: Always write V3_CURRENT**

**Rationale:**
- V3 is the current format with full feature support
- V1 (raw) and V2 (legacy) are read-only for backwards compatibility
- No benefit to preserving loaded version on save
- Simplifies serialization logic (no branching)
- Matches SEdit behavior (always saves V3)

**Implementation:** Continue using `view.setUint8(offset, MapVersion.V3_CURRENT)` in serialize() method.

---

## Open Questions

### 1. Dialog Dimensions

**What we know:**
- Current CSS: `max-width: 600px; max-height: 80vh`
- Tabs will consolidate from 10 to 4-5
- Each tab will have 10-25 settings depending on grouping

**What's unclear:**
- Is 600px wide enough for comfortable slider + number input + reset button layout?
- Should dialog expand to 700px to reduce vertical scrolling?

**Recommendation:**
- Increase max-width to 700px for comfortable horizontal layout
- Keep max-height at 80vh for smaller screens
- Add `overflow-y: auto` to tab-content for scrolling within tabs

### 2. Migration Strategy for Old Maps

**What we know:**
- Maps saved with old (incorrect) defaults exist in the wild
- Changing defaults affects "virgin" maps (never had settings explicitly set)
- Maps with settings in description field override defaults (safe)

**What's unclear:**
- Should we auto-migrate header-only maps to new defaults on load?
- Should we warn users if header fields don't match description serialization?

**Recommendation:**
- Load header fields as-is (preserve file exactly)
- Apply extendedSettings override as currently implemented
- Let users manually fix old maps if needed
- Log warning to console if header/description mismatch detected (dev mode only)

### 3. Header Field vs Extended Settings Priority

**What we know:**
- Header has 6 legacy fields: laserDamage, specialDamage, rechargeRate, (and boolean flags)
- extendedSettings can override these with more granular AC settings
- Phase 30 established serialization format

**What's unclear:**
- Should header fields be deprecated and always read from description?
- Should we continue writing both for maximum compatibility?

**Recommendation:**
- Continue dual-write approach (header fields + description serialization)
- On load: header fields populate UI, then extendedSettings override if present
- Ensures compatibility with SEdit (which only reads header) AND AC client (which reads description)

---

## Sources

### Primary (HIGH confidence)

- **SEdit v2.02.00 Source Code** (`E:\AC-SEDIT-SRC-ANALYSIS\SEDIT\SeditSource\sedit_src\`)
  - `map.cpp:2774-2848` - CreateNewMap() function with exact default values
  - `main.h:60-110` - MapInfo structure definition with "missles" typo
  - `frame.cpp:719-805` - Settings dialog UI showing field initialization

- **SEdit Technical Analysis** (`E:\AC-SEDIT-SRC-ANALYSIS\SEDIT\SEdit-SRC-Analysis\SEDIT_Technical_Analysis.md`)
  - Section 3: Map File Format Specification
  - Section 4: Tile Data Encoding
  - Table: Version 3 File Structure byte layout

- **AC Settings Documentation** (`E:\NewMapEditor\AC_Setting_Info_25.txt`)
  - All 53 game setting definitions with ranges and defaults
  - Flagger setting semantics
  - DHT system documentation

- **Current Codebase** (`E:\NewMapEditor\src\`)
  - `core/map/types.ts` - MapHeader interface, createDefaultHeader()
  - `core/map/GameSettings.ts` - GAME_SETTINGS array, SETTING_CATEGORIES
  - `core/map/MapParser.ts` - Binary serialization logic
  - `components/MapSettingsDialog/MapSettingsDialog.tsx` - Current dialog implementation
  - `components/MapSettingsDialog/SettingInput.tsx` - Slider + number input pattern
  - `styles/variables.css` - Design token system

### Secondary (MEDIUM confidence)

- **Project Documentation** (`E:\NewMapEditor\CLAUDE.md`, `E:\NewMapEditor\.planning\REQUIREMENTS.md`)
  - Architecture patterns and constraints
  - Requirement definitions (UI-09, PARITY-01, PARITY-02, PARITY-03)

### Tertiary (LOW confidence)

None - all research grounded in primary sources.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies, using existing React + CSS
- Architecture patterns: HIGH - Tab consolidation is straightforward refactor
- Default values: HIGH - Verified directly from SEdit source code
- Binary format: HIGH - Byte-level analysis from technical documentation
- Pitfalls: HIGH - Based on actual code inspection and SEdit source

**Research date:** 2026-02-09
**Valid until:** 60 days (stable domain - map format hasn't changed since 2002)

**Key files requiring changes:**
1. `src/core/map/types.ts` - Fix 6 default values in createDefaultHeader()
2. `src/core/map/GameSettings.ts` - Update SETTING_CATEGORIES to 4-5 groups
3. `src/components/MapSettingsDialog/MapSettingsDialog.tsx` - Refactor tab structure
4. `src/components/MapSettingsDialog/CheckboxInput.tsx` - NEW component
5. `src/components/MapSettingsDialog/SelectInput.tsx` - NEW component
6. `src/components/MapSettingsDialog/MapSettingsDialog.css` - Add checkbox/select styles
7. `src/core/map/MapParser.ts` - Add "missles" typo comment (no logic change needed)
