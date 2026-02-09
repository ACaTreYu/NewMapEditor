# Phase 30: Settings Serialization - Research

**Researched:** 2026-02-09
**Domain:** String serialization, map file I/O, SubSpace map format extensions
**Confidence:** HIGH

## Summary

Phase 30 implements auto-serialization of all 53 extended game settings to the map's description field using comma-space-delimited Key=Value format. This phase transforms the description field from user-editable text into a machine-managed settings store, enabling map portability across different game clients that read settings from the description field.

The implementation builds directly on Phase 29's Author metadata pattern, extending parseAuthor/serializeAuthor into comprehensive parseSettings/serializeSettings helpers. All 53 settings are always serialized (not just non-defaults), with a critical ordering constraint: non-flagger settings must appear before F-prefixed flagger settings (game client requirement). The description textarea is removed from the Map Settings dialog, and the internal character limit is raised from 256 to ~2000 characters to accommodate full serialization (~1000 chars for 53 settings + author metadata).

**Primary recommendation:** Create parseSettings/serializeSettings helpers that serialize all 53 extendedSettings in stable order (non-flagger alphabetically, then flagger alphabetically), preserve unrecognized Key=Value pairs for forward compatibility, and clamp out-of-range values on parse. Remove description textarea from Map tab JSX, keeping only Name and Author fields visible.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Serialization Scope:**
- Serialize ALL 53 extendedSettings on every save (not just non-default)
- Header-level fields (maxPlayers, numTeams, objective, damage/recharge tiers, weapon toggles) are NOT serialized — they already live in the binary header
- This simplifies the logic (no default-comparison needed) and is future-proof for adding new settings

**Format & Ordering:**
- Delimiter: comma-space (`, `) between Key=Value pairs
- **Hard rule:** All Flagger settings (F-prefixed: FShipSpeed, FLaserDamage, etc.) MUST come after all non-flagger settings — game client requires this ordering
- Non-flagger settings can be in any order (no strict alphabetical requirement)
- Toggles (DisableSwitchSound, InvisibleMap, FogOfWar, FlagInPlay, Widescreen) serialize identically to other settings as Key=Value (e.g. `FogOfWar=1`), positioned before flagger settings

**Description Field Ownership:**
- Description field is fully machine-managed — user never sees or edits it
- Settings own the field; Author= and any future metadata go AFTER the last settings entry, comma-space separated
- Map Settings dialog keeps the Map tab but only shows Name and Author fields; description textarea is removed
- Raise the internal character limit (UI was 256, binary format supports 65K). ~1000 chars needed for all 53 settings + author

**Legacy & Edge Cases:**
- Unrecognized Key=Value pairs are preserved through save round-trips (future-proofing)
- Out-of-range values are clamped to the setting's min/max bounds on load
- Legacy maps without settings in description load with default extendedSettings values — on next save, all 53 settings get serialized

### Claude's Discretion

- Exact internal character limit for description field (something comfortably above ~1000)
- How to handle legacy user-written description text (non Key=Value content) on first save
- Ordering of non-flagger settings (any reasonable stable order)
- Whether to serialize Author= as part of the same system or keep Phase 29's separate serialize/parse helpers

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | Latest | Type safety for parsing/serialization | Project standard |
| React | 18 | UI framework for MapSettingsDialog | Project standard |
| Zustand | 4.x | State management for map header | Project standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None required | N/A | String parsing/serialization | Built-in string methods sufficient |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual parsing | INI/TOML parser | Overkill - format is simple Key=Value pairs |
| Always serialize all | Serialize only non-defaults | User decision: always serialize all (future-proof, simpler logic) |

**Installation:**
No new packages required. All functionality uses existing TypeScript patterns and built-in string methods.

## Architecture Patterns

### Recommended Project Structure
```
src/components/MapSettingsDialog/
├── MapSettingsDialog.tsx       # Remove description textarea, add serialize/parse helpers
src/core/map/
├── GameSettings.ts            # Existing 53 settings definitions
├── types.ts                   # MapHeader.description field
├── MapParser.ts               # Existing serialization/parsing (binary format)
```

### Pattern 1: Settings Serialization with Ordering Constraint
**What:** Serialize all 53 extendedSettings to description field, non-flagger before flagger
**When to use:** On every map save (Apply button in Map Settings, file save)
**Example:**
```typescript
// Build from GAME_SETTINGS array in GameSettings.ts
function serializeSettings(settings: Record<string, number>): string {
  const pairs: string[] = [];

  // Non-flagger settings (alphabetical for determinism)
  const nonFlagger = GAME_SETTINGS
    .filter(s => !s.key.startsWith('F'))
    .sort((a, b) => a.key.localeCompare(b.key));

  for (const setting of nonFlagger) {
    const value = settings[setting.key] ?? setting.default;
    pairs.push(`${setting.key}=${value}`);
  }

  // Flagger settings MUST come after (alphabetical within flagger)
  const flagger = GAME_SETTINGS
    .filter(s => s.key.startsWith('F'))
    .sort((a, b) => a.key.localeCompare(b.key));

  for (const setting of flagger) {
    const value = settings[setting.key] ?? setting.default;
    pairs.push(`${setting.key}=${value}`);
  }

  return pairs.join(', ');
}
```

### Pattern 2: Settings Parsing with Future-Proofing
**What:** Parse Key=Value pairs from description, preserve unrecognized entries, clamp values
**When to use:** On map load, dialog open
**Example:**
```typescript
function parseSettings(description: string): {
  settings: Record<string, number>;
  unrecognized: string[];  // Preserve for round-trip
} {
  const settings: Record<string, number> = {};
  const unrecognized: string[] = [];

  // Split by comma-space, trim each pair
  const pairs = description.split(',').map(p => p.trim()).filter(p => p);

  for (const pair of pairs) {
    const match = pair.match(/^(\w+)=(-?\d+)$/);
    if (!match) {
      unrecognized.push(pair);  // Author=..., future metadata
      continue;
    }

    const [, key, valueStr] = match;
    const value = parseInt(valueStr, 10);

    // Find setting definition for clamping
    const setting = GAME_SETTINGS.find(s => s.key === key);
    if (setting) {
      // Clamp to min/max bounds
      settings[key] = Math.max(setting.min, Math.min(setting.max, value));
    } else {
      // Unrecognized setting - preserve for future compatibility
      unrecognized.push(pair);
    }
  }

  return { settings, unrecognized };
}
```

### Pattern 3: Description Field Management
**What:** Description field stores settings + metadata (Author), fully machine-managed
**When to use:** All map save/load operations
**Example:**
```typescript
// On save: serialize settings + append metadata
function buildDescription(
  settings: Record<string, number>,
  author: string
): string {
  const settingsStr = serializeSettings(settings);
  const authorStr = author.trim() ? `Author=${author.trim()}` : '';

  // Settings first, then metadata
  return [settingsStr, authorStr].filter(s => s).join(', ');
}

// On load: parse settings + metadata separately
function parseDescription(description: string): {
  settings: Record<string, number>;
  author: string;
} {
  const { settings, unrecognized } = parseSettings(description);

  // Author is in unrecognized entries
  const authorPair = unrecognized.find(p => p.startsWith('Author='));
  const author = authorPair ? authorPair.replace(/^Author=/, '').trim() : '';

  return { settings, author };
}
```

### Pattern 4: UI Changes - Remove Description Textarea
**What:** Map tab shows only Name and Author fields, description is hidden
**When to use:** Phase 30 UI updates to MapSettingsDialog
**Example:**
```tsx
// BEFORE (Phase 29):
<div className="setting-group">
  <label className="setting-label">Map Name</label>
  <input type="text" value={mapName} ... />
</div>
<div className="setting-group">
  <label className="setting-label">Author</label>
  <input type="text" value={mapAuthor} ... />
</div>
<div className="setting-group">
  <label className="setting-label">Description</label>
  <textarea value={mapDescription} rows={3} maxLength={256} />
</div>

// AFTER (Phase 30):
<div className="setting-group">
  <label className="setting-label">Map Name</label>
  <input type="text" value={mapName} ... />
</div>
<div className="setting-group">
  <label className="setting-label">Author</label>
  <input type="text" value={mapAuthor} ... />
</div>
{/* Description textarea removed - field is auto-generated */}
```

### Anti-Patterns to Avoid
- **Serializing only non-default settings**: User decision is to serialize all 53 settings (simpler logic, future-proof)
- **Flagger settings before non-flagger**: Game client REQUIRES non-flagger first
- **Lossy parsing**: Must preserve unrecognized Key=Value pairs for forward compatibility
- **No value clamping on parse**: Out-of-range values must be clamped to min/max bounds

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Ordering all 53 settings | Manual key arrays | GAME_SETTINGS.filter + sort | Single source of truth, maintainable |
| Default values | Hardcoded defaults map | GAME_SETTINGS[i].default | Already defined in GameSettings.ts |
| Value validation | Custom range checking | GAME_SETTINGS[i].min/max | Bounds already defined per setting |
| String escaping | Custom escape/unescape | Simple regex parsing | Format doesn't support escaping yet (commas/equals forbidden in values) |

**Key insight:** GAME_SETTINGS array in GameSettings.ts is the single source of truth for all 53 settings (keys, defaults, min/max bounds, categories). Serialization/parsing should iterate this array, not duplicate data.

## Common Pitfalls

### Pitfall 1: Flagger Settings Appearing Before Non-Flagger
**What goes wrong:** Game client fails to parse settings correctly
**Why it happens:** Not enforcing non-flagger → flagger ordering during serialization
**How to avoid:** Always filter GAME_SETTINGS into two groups: `!s.key.startsWith('F')` first, then `s.key.startsWith('F')` second
**Warning signs:** Game client ignores settings, or settings don't apply in-game
**Solution:** See Pattern 1 above - use `.filter()` to separate, serialize non-flagger first

### Pitfall 2: Losing Unrecognized Metadata on Round-Trip Save
**What goes wrong:** Future map format extensions (new settings, metadata fields) get stripped on save
**Why it happens:** Parser only extracts known settings, discards everything else
**How to avoid:** Preserve unrecognized Key=Value pairs in a separate array, re-append on serialize
**Warning signs:** Maps lose data after being edited and saved
**Solution:** See Pattern 2 - track `unrecognized: string[]` during parse, append to output on serialize

### Pitfall 3: Description Field Character Limit Too Small
**What goes wrong:** Serialized settings truncate at 256 chars, losing data
**Why it happens:** Current UI maxLength={256} from Phase 29
**How to avoid:** Raise internal limit to ~2000 chars (binary format supports 65,535 via uint16 length field)
**Warning signs:** Long setting strings get cut off, settings lost on save
**Solution:**
```typescript
// Calculate worst-case size:
// 53 settings * ~20 chars each (key + "=" + value + ", ") = ~1060 chars
// + Author metadata ~50 chars = ~1110 chars
// Use 2000 to be safe
const MAX_DESCRIPTION_LENGTH = 2000;
```

### Pitfall 4: Legacy User-Written Description Text Conflict
**What goes wrong:** Maps with existing user-written descriptions lose that text when settings serialize
**Why it happens:** Description field transitions from user content to machine content
**How to avoid:** On first save after Phase 30, detect non-Key=Value text and either (a) discard with warning, or (b) preserve in separate "Notes" field (out of scope for Phase 30)
**Warning signs:** Users complain about losing map descriptions
**Solution for Phase 30:** Accept the limitation - description field is now machine-managed. Document in release notes.

### Pitfall 5: Author Metadata Ordering Confusion
**What goes wrong:** Author= appears in middle of settings list, or settings appear after author
**Why it happens:** Not carefully managing serialization order (settings → metadata)
**How to avoid:** Always serialize in this order: [non-flagger settings], [flagger settings], [Author=...], [future metadata]
**Warning signs:** Inconsistent description field format across saves
**Solution:**
```typescript
// Build description in strict order
const settingsPart = serializeSettings(extendedSettings);  // All 53 settings
const metadataPart = author.trim() ? `Author=${author.trim()}` : '';
return [settingsPart, metadataPart].filter(s => s).join(', ');
```

## Code Examples

Verified patterns from existing codebase:

### Iterating GAME_SETTINGS Array
```typescript
// From GameSettings.ts - single source of truth for all 53 settings
export const GAME_SETTINGS: GameSetting[] = [
  { key: 'ShipSpeed', label: '...', min: 0, max: 200, default: 100, category: 'General' },
  { key: 'HealthBonus', label: '...', min: 0, max: 224, default: 60, category: 'General' },
  // ... 51 more settings
];

// Serialize all settings in order
function serializeAllSettings(values: Record<string, number>): string {
  const nonFlagger = GAME_SETTINGS.filter(s => !s.key.startsWith('F'));
  const flagger = GAME_SETTINGS.filter(s => s.key.startsWith('F'));

  const pairs = [...nonFlagger, ...flagger].map(setting => {
    const value = values[setting.key] ?? setting.default;
    return `${setting.key}=${value}`;
  });

  return pairs.join(', ');
}
```

### Updating MapHeader (Existing Pattern)
```typescript
// From MapSettingsDialog.tsx handleApply()
const handleApply = () => {
  updateMapHeader({
    name: mapName,
    description: buildDescription(localSettings, mapAuthor),  // NEW: auto-generated
    extendedSettings: localSettings
  });
  setIsDirty(false);
};
```

### Loading Map with Settings Parsing
```typescript
// Add to MapSettingsDialog open() callback
open: () => {
  const { map } = useEditorStore.getState();
  if (map) {
    setMapName(map.header.name);

    // Parse description into settings + metadata
    const { settings, author } = parseDescription(map.header.description);
    setMapAuthor(author);

    // Merge parsed settings with defaults (fallback for missing settings)
    const defaults = getDefaultSettings();
    setLocalSettings({ ...defaults, ...settings, ...map.header.extendedSettings });
  }
  setIsDirty(false);
  dialogRef.current?.showModal();
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual "Key=Value" editing in description textarea | Auto-generated from settings UI | Phase 30 (v2.0) | No user errors, consistent format |
| Serialize only non-default settings | Serialize all 53 settings | Phase 30 (v2.0) | Simpler logic, future-proof for new settings |
| No clamping on parse | Clamp values to min/max bounds | Phase 30 (v2.0) | Prevents invalid setting values |
| Unrecognized settings discarded | Preserve unknown Key=Value pairs | Phase 30 (v2.0) | Forward compatibility with future map formats |

**Deprecated/outdated:**
- User-editable description field - Phase 30 makes it machine-managed
- maxLength={256} for description - Phase 30 raises to ~2000 internally

## Open Questions

1. **Should Author= use the same serialize/parse helpers as settings?**
   - What we know: Phase 29 has parseAuthor/serializeAuthor helpers that work with description field
   - What's unclear: Whether to integrate Author into serializeSettings or keep separate
   - Recommendation: Keep separate for now (Claude's discretion). Author is metadata, not a game setting. Serialize settings first, then append Author= as metadata.

2. **How to handle legacy user-written description text on first save?**
   - What we know: Some old maps may have arbitrary text in description field (not Key=Value format)
   - What's unclear: Whether to preserve, warn, or discard
   - Recommendation: Discard on save, document in release notes. Description field is now machine-managed (user decision from CONTEXT.md).

3. **Exact internal character limit for description field?**
   - What we know: UI was maxLength={256}, binary format supports 65,535 (uint16 length)
   - What's unclear: Optimal limit for 53 settings + metadata
   - Recommendation: 2000 chars (comfortably above ~1100 worst-case, well below binary limit).

4. **Should non-flagger settings be alphabetical or by category?**
   - What we know: User decision says "any reasonable stable order" for non-flagger
   - What's unclear: Alphabetical (simple) vs. category-grouped (matches UI tabs)
   - Recommendation: Alphabetical within non-flagger group (simplest, deterministic, matches SERIAL-05 requirement).

## Sources

### Primary (HIGH confidence)
- Existing codebase:
  - `E:\NewMapEditor\src\core\map\GameSettings.ts` - All 53 setting definitions (keys, min/max, defaults)
  - `E:\NewMapEditor\src\core\map\types.ts` - MapHeader.description field (string)
  - `E:\NewMapEditor\src\components\MapSettingsDialog\MapSettingsDialog.tsx` - Phase 29 parseAuthor/serializeAuthor pattern
  - `E:\NewMapEditor\src\core\map\MapParser.ts` - Binary format serialization (description length is uint16)
- Game documentation:
  - `E:\NewMapEditor\AC_Setting_Info_25.txt` - Official AC settings reference (confirms 53 settings, flagger ordering requirement)
  - `E:\AC-SEDIT-SRC-ANALYSIS\SEDIT\SEdit-SRC-Analysis\SEDIT_Technical_Analysis.md` - Binary format spec (description field length limit)
- Requirements:
  - `E:\NewMapEditor\.planning\REQUIREMENTS.md` - SERIAL-01 through SERIAL-06
  - `E:\NewMapEditor\.planning\phases\30-settings-serialization\30-CONTEXT.md` - User decisions

### Secondary (MEDIUM confidence)
- Phase 29 Research:
  - `E:\NewMapEditor\.planning\phases\29-author-metadata\29-RESEARCH.md` - Author metadata pattern (parseAuthor/serializeAuthor)
  - `E:\NewMapEditor\.planning\phases\29-author-metadata\29-01-PLAN.md` - Implementation pattern for description field manipulation

### Tertiary (LOW confidence)
None - all findings verified against codebase or official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing TypeScript/React/Zustand patterns
- Architecture: HIGH - Building on Phase 29's proven parseAuthor/serializeAuthor pattern
- Pitfalls: HIGH - Flagger ordering requirement verified in AC_Setting_Info_25.txt, all edge cases identified from requirements

**Research date:** 2026-02-09
**Valid until:** 2026-03-09 (30 days - stable domain, all settings defined)

---

## Implementation Checklist

For planner reference:

- [ ] Create `serializeSettings(settings: Record<string, number>): string` helper
  - [ ] Filter GAME_SETTINGS into non-flagger (alphabetical) and flagger (alphabetical)
  - [ ] Serialize all 53 settings (use default if value missing)
  - [ ] Return comma-space delimited string
- [ ] Create `parseSettings(description: string): { settings: Record<string, number>, unrecognized: string[] }` helper
  - [ ] Split by comma, parse Key=Value pairs
  - [ ] Clamp values to setting.min/max bounds
  - [ ] Preserve unrecognized pairs for round-trip
- [ ] Update `handleApply()` in MapSettingsDialog
  - [ ] Build description from serializeSettings(localSettings) + Author metadata
  - [ ] Pass to updateMapHeader({ description: ... })
- [ ] Update `open()` callback in MapSettingsDialog
  - [ ] Parse description into settings + author
  - [ ] Merge parsed settings with defaults and map.header.extendedSettings
- [ ] Remove description textarea from Map tab JSX
  - [ ] Delete `<div className="setting-group">` with Description label/textarea
  - [ ] Keep only Map Name and Author inputs
- [ ] Raise internal description length limit
  - [ ] Remove or increase maxLength in textarea (component removed, but affects internal validation)
  - [ ] Verify MapParser.serialize handles long descriptions (already supports uint16 length)
- [ ] Test legacy map compatibility
  - [ ] Load map without settings in description → defaults applied
  - [ ] Save legacy map → all 53 settings serialized
  - [ ] Round-trip preserves unrecognized Key=Value pairs
- [ ] Test edge cases
  - [ ] Out-of-range values clamped on load
  - [ ] Empty author doesn't leave "Author=" orphan
  - [ ] Flagger settings appear after non-flagger in output
