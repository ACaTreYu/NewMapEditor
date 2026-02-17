# Phase 86: Settings Lifecycle - Research

**Researched:** 2026-02-17
**Domain:** TypeScript module extraction, settings serialization/parsing, map lifecycle hooks
**Confidence:** HIGH

## Summary

Phase 86 fixes a settings lifecycle gap: the four serialization/parsing functions currently private inside `MapSettingsDialog.tsx` are never called during map creation, open, or save — only when the user explicitly opens and applies the Map Settings dialog. This means a brand-new map has `description: 'New map'` (bare SEdit default), an opened map retains whatever description the file contained (possibly empty or missing settings keys), and a save writes description exactly as-is without injecting settings.

The fix is purely a TypeScript refactor + three hook-in points. No new libraries are needed. Extract the four functions (`serializeSettings`, `parseSettings`, `buildDescription`, `parseDescription`) plus the mapping constants (`LASER_DAMAGE_VALUES`, `SPECIAL_DAMAGE_VALUES`, `RECHARGE_RATE_VALUES`, `findClosestIndex`) into `src/core/map/settingsSerializer.ts`, then wire `initializeDescription()` into `createEmptyMap()`, `mergeSettingsIntoDescription()` into `MapService.loadMap()`, and `reserializeDescription()` into `MapService.saveMap()` and `MapService.saveMapAs()`.

The ordering requirement from SETT-04 (`Format=1.1, [settings...], [map name], Author=` last) exposes a bug in the current `buildDescription`: the map name does not appear in the description at all in the new architecture (the name lives in `header.name`, separate from `header.description`). The "Author=" field currently ends up at the START of unrecognized pairs rather than explicitly last. The fix is to make `buildDescription` accept an `author` string and always append `Author=xxx` as the final item after all settings, stripping it from the unrecognized array before appending.

**Primary recommendation:** Extract a `settingsSerializer.ts` module under `src/core/map/`, wire it at three call sites (createEmptyMap, loadMap, saveMap/saveMapAs), and fix the `buildDescription` ordering so Author= is always last.

---

## Standard Stack

No new packages are required. This phase uses only existing project dependencies.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.x (project) | Module definition, type safety | Project standard |
| Zustand | 4.x (project) | State management; `updateMapHeader` call site unchanged | Project standard |

### No Installation Required
All work is pure TypeScript refactoring within the existing codebase.

---

## Architecture Patterns

### Recommended Project Structure

```
src/core/map/
├── GameSettings.ts          # GAME_SETTINGS array + helpers — EXISTS, unchanged
├── settingsSerializer.ts    # NEW: extracted serialize/parse/build functions + constants
├── types.ts                 # createEmptyMap() — will call initializeDescription()
├── MapParser.ts             # unchanged
└── index.ts                 # add: export * from './settingsSerializer'

src/core/services/
└── MapService.ts            # loadMap, saveMap, saveMapAs — wire in merge/reserialize

src/components/MapSettingsDialog/
└── MapSettingsDialog.tsx    # import from @core/map instead of local private functions
```

### Pattern 1: Module Extraction (settingsSerializer.ts)

**What:** Move four private functions and three mapping constants from `MapSettingsDialog.tsx` into a new `src/core/map/settingsSerializer.ts` so they can be called from `MapService` and `types.ts` without a circular dependency.

**When to use:** Any time settings need to be serialized to or parsed from the description field.

**Functions to extract:**

```typescript
// Source: MapSettingsDialog.tsx lines 15-118 (existing code, to be moved)

// Constants needed by MapSettingsDialog header fields UI:
export const LASER_DAMAGE_VALUES = [5, 14, 27, 54, 112];
export const SPECIAL_DAMAGE_VALUES = [20, 51, 102, 153, 204];
export const RECHARGE_RATE_VALUES = [3780, 1890, 945, 473, 236];
export function findClosestIndex(value: number, valueArray: number[]): number { ... }

// Core serialization:
export function serializeSettings(settings: Record<string, number>): string { ... }
export function parseSettings(description: string): { settings: Record<string, number>; unrecognized: string[] } { ... }
export function buildDescription(settings: Record<string, number>, author: string, unrecognized?: string[]): string { ... }
export function parseDescription(description: string): { settings: Record<string, number>; author: string; unrecognized: string[] } { ... }

// New lifecycle helpers built on top of the above:
export function initializeDescription(): string { ... }
export function mergeDescriptionWithHeader(description: string, header: MapHeader): string { ... }
export function reserializeDescription(description: string): string { ... }
```

### Pattern 2: createEmptyMap Initialization (SETT-01)

**What:** Call `initializeDescription()` inside `createEmptyMap()` in `types.ts` so every new map starts with full settings in its description.

**Current code (types.ts line 201-210):**
```typescript
export function createEmptyMap(): MapData {
  const tiles = new Uint16Array(TILE_COUNT);
  tiles.fill(DEFAULT_TILE);
  return {
    header: createDefaultHeader(),  // description: 'New map' — WRONG
    tiles,
    modified: false
  };
}
```

**Fixed code:**
```typescript
// Import from settingsSerializer (same package, no circular dep)
import { initializeDescription } from './settingsSerializer';

export function createEmptyMap(): MapData {
  const tiles = new Uint16Array(TILE_COUNT);
  tiles.fill(DEFAULT_TILE);
  const header = createDefaultHeader();
  header.description = initializeDescription();   // SETT-01 fix
  header.extendedSettings = getDefaultSettings(); // populate extendedSettings too
  return { header, tiles, modified: false };
}
```

**What `initializeDescription()` produces:**
`"Format=1.1, BouncyDamage=48, BouncyEnergy=12, ..."` (all 53 settings at defaults, non-flagger alphabetically then flagger alphabetically, no Author= since empty)

### Pattern 3: Open Flow Merge (SETT-02)

**What:** After `MapParser.parse()` returns a `MapData`, call `mergeDescriptionWithHeader()` to ensure all 53 settings keys are present, binary header values are merged in, and `Format=1.1` is the prefix.

**Where:** `MapService.loadMap()` immediately after decompression succeeds.

**Current code (MapService.ts line 79):**
```typescript
return { success: true, map: mapData, filePath };
```

**Fixed code:**
```typescript
import { mergeDescriptionWithHeader, getDefaultSettings } from '@core/map';

// After decompression:
mapData.header.description = mergeDescriptionWithHeader(
  mapData.header.description,
  mapData.header
);
// Also sync extendedSettings so dialog opens with merged values
const { settings } = parseDescription(mapData.header.description);
mapData.header.extendedSettings = { ...getDefaultSettings(), ...settings };

return { success: true, map: mapData, filePath };
```

**What `mergeDescriptionWithHeader(description, header)` does:**
1. Parse existing description (extracts recognized settings + unrecognized pairs + author)
2. Derive header-derived values: `{ LaserDamage: LASER_DAMAGE_VALUES[header.laserDamage], MissileDamage: SPECIAL_DAMAGE_VALUES[header.specialDamage], MissileRecharge: RECHARGE_RATE_VALUES[header.rechargeRate] }`
3. Merge priority: `defaults < headerDerived < parsed settings`
4. Rebuild with `buildDescription(merged, author, unrecognized)` — produces ordered output

### Pattern 4: Save Flow Reserialize (SETT-03)

**What:** Before writing to disk, call `reserializeDescription()` to ensure all current settings are written, regardless of whether the Map Settings dialog was opened.

**Where:** Both `MapService.saveMap()` and `MapService.saveMapAs()` before `mapParser.serialize(map)`.

**Current code (MapService.ts line 98):**
```typescript
const headerBuffer = mapParser.serialize(map);
```

**Fixed code:**
```typescript
import { reserializeDescription } from '@core/map';

// Before serialize:
const mapToSave = {
  ...map,
  header: {
    ...map.header,
    description: reserializeDescription(map.header.description, map.header.extendedSettings)
  }
};
const headerBuffer = mapParser.serialize(mapToSave);
```

**What `reserializeDescription(description, extendedSettings)` does:**
1. Parse description to get existing author + unrecognized pairs
2. Use `extendedSettings` (already the canonical current values) as the settings to serialize
3. Fall back to defaults for any missing keys
4. Rebuild ordered description with `buildDescription(settings, author, unrecognized)`

### Pattern 5: buildDescription Ordering Fix (SETT-04)

**Current ordering (WRONG):**
```
[Format=1.1, settings...], [Author=xxx], [unrecognized...]
```

The current code appends `Author=` in the middle (before unrecognized pairs). The requirement says Author must be LAST.

**Fixed ordering:**
```typescript
function buildDescription(settings: Record<string, number>, author: string, unrecognized?: string[]): string {
  const parts: string[] = [];
  parts.push(serializeSettings(settings));          // Format=1.1 + all settings
  if (unrecognized && unrecognized.length > 0) {
    parts.push(...unrecognized);                    // unrecognized pairs (must NOT include Author=)
  }
  if (author.trim()) {
    parts.push(`Author=${author.trim()}`);          // Author= ALWAYS LAST
  }
  return parts.join(', ');
}
```

**Corresponding fix in `parseDescription()`** — must filter Author= from unrecognized BEFORE passing to buildDescription:
```typescript
function parseDescription(description: string): { settings: Record<string, number>; author: string; unrecognized: string[] } {
  const { settings, unrecognized } = parseSettings(description);
  const authorPair = unrecognized.find(p => p.startsWith('Author='));
  const author = authorPair ? authorPair.slice('Author='.length).trim() : '';
  const filteredUnrecognized = unrecognized.filter(p => !p.startsWith('Author='));
  return { settings, author, unrecognized: filteredUnrecognized };
  // This is already correct in the existing code — no change needed here
}
```

### Pattern 6: Unrecognized Pair Preservation (SETT-05)

The existing `parseSettings()` already handles this correctly: any comma-delimited item that is not a recognized `Key=Value` pair (or is a `Key=Value` for a key not in `GAME_SETTINGS`) goes into the `unrecognized` array. The `buildDescription()` function already passes those through. No change needed for SETT-05 beyond ensuring the new lifecycle hooks call `buildDescription` consistently.

### Anti-Patterns to Avoid

- **Calling `buildDescription` from `MapSettingsDialog` with a different ordering than the lifecycle hooks** — extract once, use everywhere.
- **Forgetting to sync `extendedSettings` when merging on open** — the dialog reads from `extendedSettings`, so both `description` AND `extendedSettings` must be updated on load.
- **Circular dependency** — `settingsSerializer.ts` must only import from `GameSettings.ts` and `types.ts`. It must NOT import from `MapParser.ts` or `MapService.ts`.
- **Mutating `MapData.header` inside `MapService`** — create a shallow copy: `{ ...map, header: { ...map.header, description: ... } }` before passing to `mapParser.serialize()`.
- **Assuming `extendedSettings` is always populated** — old maps loaded from disk have `extendedSettings: {}` from the parser; `reserializeDescription` must fall back to parsing the description string for values.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Ordered merge of defaults/header/description | Custom merge logic scattered at call sites | Single `mergeDescriptionWithHeader()` function | One source of truth for the three-layer merge priority |
| Format string construction | Ad-hoc string concatenation | `serializeSettings()` (already exists, just needs extraction) | Ensures Format=1.1 prefix and alphabetical sort invariant |
| Author= last enforcement | Manual string scanning at each call site | `buildDescription()` ordering contract | Guarantee only one place can break the order |

**Key insight:** The serialization logic already exists and works correctly — the only problem is it's private to a component. Extraction, not rewrite.

---

## Common Pitfalls

### Pitfall 1: "54 settings" vs "53 settings" Discrepancy
**What goes wrong:** Phase requirements say "54 settings" but `GAME_SETTINGS` has 53 entries and the file comment explicitly says 53 (HoldingTime is binary header, not extended setting).
**Why it happens:** The v1.0 Map Settings panel exposed HoldingTime as a UI control (labeled "Holding Time") alongside the extended settings, making it look like a 54th setting. It maps to `header.holdingTime`, not an entry in `GAME_SETTINGS`.
**How to avoid:** Treat the requirement "54 settings" as meaning all settings the dialog surfaces — 53 extended settings in description + HoldingTime in binary header. Only the 53 GAME_SETTINGS keys go into the description. Do NOT add HoldingTime to `GAME_SETTINGS`.
**Warning signs:** `GAME_SETTINGS.length` returning anything other than 53 after the refactor.

### Pitfall 2: Double-parsing on Open
**What goes wrong:** `mergeDescriptionWithHeader()` is called in `MapService.loadMap()`, AND the dialog calls `parseDescription()` again when opened — that's fine, but if the open-time merge result has inconsistencies (e.g., a typo in the format) the dialog will re-parse incorrectly.
**Why it happens:** Two parse paths for the same string.
**How to avoid:** After merging on open, the description is already in canonical form. The dialog's `parseDescription()` call will find all 53 keys in the string and produce correct `settings` with no merging needed.

### Pitfall 3: extendedSettings Out of Sync with description
**What goes wrong:** `header.description` has updated settings from open-time merge but `header.extendedSettings` is still `{}` (as parser sets it). Dialog opens, reads `extendedSettings` first in the merge priority, gets empty, falls back to description parse — settings are correct, but only by accident. Save-time `reserializeDescription` reading `extendedSettings` would produce all-defaults.
**Why it happens:** Two storage locations for the same data — `description` (serialized string) and `extendedSettings` (live record).
**How to avoid:** After calling `mergeDescriptionWithHeader()` in `loadMap()`, immediately also parse the resulting description and set `extendedSettings` to the parsed result. Similarly, in `createEmptyMap()`, set `extendedSettings: getDefaultSettings()`.

### Pitfall 4: Author= Appears in Unrecognized When It Shouldn't
**What goes wrong:** An old map has `"..., Author=SomeGuy, SomeCustomKey=val"`. When parsed, Author= ends up in `unrecognized` array. When `buildDescription` appends it (incorrectly), Author= appears mid-string, then `reserializeDescription` appends it again at the end — double Author=.
**Why it happens:** `parseDescription()` filters Author= out of `unrecognized` and returns it separately, but if the caller passes `unrecognized` that still contains Author= to `buildDescription`, it appears twice.
**How to avoid:** `parseDescription()` already filters Author= correctly. Ensure that all callers use `parseDescription()` (not raw `parseSettings()`) when they need to separate the author. The `buildDescription()` signature enforces this by taking `author` as a parameter and expecting `unrecognized` to NOT include Author=.

### Pitfall 5: Circular Import
**What goes wrong:** `settingsSerializer.ts` needs `GAME_SETTINGS` from `GameSettings.ts` and `MapHeader` type from `types.ts`. If it also imports from `MapParser.ts` or `MapService.ts`, you get a circular dependency chain.
**Why it happens:** MapService imports MapParser, MapParser imports types, types will import settingsSerializer — adding settingsSerializer → MapParser would close the loop.
**How to avoid:** `settingsSerializer.ts` ONLY imports from `GameSettings.ts` and `types.ts`. Both of those have no upstream dependencies within `src/core/map/`.

### Pitfall 6: App.tsx "new" menu action bypasses createEmptyMap fix
**What goes wrong:** `App.tsx` line 350: `case 'new': state.createDocument(createEmptyMap()); break;` — this calls `createEmptyMap()` directly. If `createEmptyMap()` is fixed, this call site is automatically fixed.
**Why it happens:** No action needed, but verify.
**How to avoid:** Confirm that ALL "new map" paths call `createEmptyMap()` rather than constructing a header directly. Currently: `handleNewMap` (App.tsx line 164-166) and the IPC menu handler (App.tsx line 350) both call `createEmptyMap()`. Both are covered by fixing `createEmptyMap()`.

---

## Code Examples

### Full settingsSerializer.ts skeleton (extracted + new helpers)

```typescript
// Source: src/core/map/settingsSerializer.ts (NEW FILE)
// Extracted from MapSettingsDialog.tsx + new lifecycle helpers

import { GAME_SETTINGS, getDefaultSettings } from './GameSettings';
import { MapHeader } from './types';

// === Constants (formerly private in MapSettingsDialog) ===
export const LASER_DAMAGE_VALUES = [5, 14, 27, 54, 112];
export const SPECIAL_DAMAGE_VALUES = [20, 51, 102, 153, 204];
export const RECHARGE_RATE_VALUES = [3780, 1890, 945, 473, 236];

export function findClosestIndex(value: number, valueArray: number[]): number {
  let closestIdx = 0;
  let minDiff = Math.abs(value - valueArray[0]);
  for (let i = 1; i < valueArray.length; i++) {
    const diff = Math.abs(value - valueArray[i]);
    if (diff < minDiff) { minDiff = diff; closestIdx = i; }
  }
  return closestIdx;
}

// === Core serialize/parse (formerly private in MapSettingsDialog) ===
export function serializeSettings(settings: Record<string, number>): string { ... }
export function parseSettings(description: string): { settings: Record<string, number>; unrecognized: string[] } { ... }

// FIXED ordering: unrecognized before Author=
export function buildDescription(settings: Record<string, number>, author: string, unrecognized?: string[]): string {
  const parts: string[] = [serializeSettings(settings)];
  if (unrecognized?.length) parts.push(...unrecognized);  // unrecognized BEFORE Author=
  if (author.trim()) parts.push(`Author=${author.trim()}`); // Author= ALWAYS LAST
  return parts.join(', ');
}

export function parseDescription(description: string): {
  settings: Record<string, number>; author: string; unrecognized: string[]
} { ... } // unchanged logic from MapSettingsDialog

// === NEW: Lifecycle helpers ===

/** SETT-01: Build a fresh description with all defaults */
export function initializeDescription(): string {
  return buildDescription(getDefaultSettings(), '', []);
}

/** SETT-02: Merge existing description + binary header values into canonical form */
export function mergeDescriptionWithHeader(description: string, header: MapHeader): string {
  const { settings, author, unrecognized } = parseDescription(description);
  const headerDerived: Record<string, number> = {
    LaserDamage: LASER_DAMAGE_VALUES[header.laserDamage] ?? 27,
    MissileDamage: SPECIAL_DAMAGE_VALUES[header.specialDamage] ?? 102,
    MissileRecharge: RECHARGE_RATE_VALUES[header.rechargeRate] ?? 945,
  };
  const defaults = getDefaultSettings();
  const merged = { ...defaults, ...headerDerived, ...settings };
  // Handle SwitchWin defaulting to switchCount
  if (merged['SwitchWin'] === 0 && header.switchCount > 0) {
    merged['SwitchWin'] = header.switchCount;
  }
  return buildDescription(merged, author, unrecognized);
}

/** SETT-03: Re-serialize description from extendedSettings (or parse existing) before save */
export function reserializeDescription(
  description: string,
  extendedSettings: Record<string, number>
): string {
  const { author, unrecognized } = parseDescription(description);
  const defaults = getDefaultSettings();
  // extendedSettings wins over defaults; any key missing from extendedSettings uses default
  const settings = { ...defaults, ...extendedSettings };
  return buildDescription(settings, author, unrecognized);
}
```

### MapService.loadMap() patch point

```typescript
// Source: src/core/services/MapService.ts
import { mergeDescriptionWithHeader, parseDescription, getDefaultSettings } from '@core/map';

// After decompression (line 79 area), before return:
mapData.header.description = mergeDescriptionWithHeader(
  mapData.header.description,
  mapData.header
);
// Sync extendedSettings so dialog has correct values without re-parsing
const { settings } = parseDescription(mapData.header.description);
mapData.header.extendedSettings = { ...getDefaultSettings(), ...settings };
```

### MapService.saveMap() patch point

```typescript
// Source: src/core/services/MapService.ts
import { reserializeDescription } from '@core/map';

// Before mapParser.serialize(map) (line 98 area):
const mapToSave: MapData = {
  ...map,
  header: {
    ...map.header,
    description: reserializeDescription(map.header.description, map.header.extendedSettings)
  }
};
const headerBuffer = mapParser.serialize(mapToSave);
// (same pattern for saveMapAs)
```

### MapSettingsDialog.tsx after extraction

```typescript
// Import from @core/map instead of defining locally:
import {
  serializeSettings, parseSettings, buildDescription, parseDescription,
  LASER_DAMAGE_VALUES, SPECIAL_DAMAGE_VALUES, RECHARGE_RATE_VALUES, findClosestIndex
} from '@core/map';
// Remove all four private function definitions and the three constant arrays
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Settings only persisted when dialog is opened+applied | Settings persisted at every lifecycle point | Phase 86 (this) | Maps round-trip correctly without needing dialog |
| `buildDescription` puts Author= before unrecognized | Author= is always last | Phase 86 (this) | SETT-04 compliance |
| Serialization logic private to MapSettingsDialog | Shared module in `src/core/map/settingsSerializer.ts` | Phase 86 (this) | MapService can call it without circular deps |

**No deprecations** — the `GAME_SETTINGS` array, `getDefaultSettings()`, `GameSettings.ts` are all unchanged.

---

## Open Questions

1. **"54 settings" in requirements vs 53 in GAME_SETTINGS**
   - What we know: GAME_SETTINGS has 53 entries; the file comment explicitly explains HoldingTime is binary-header-only (not in description).
   - What's unclear: Whether the requirement author meant 53 extended + HoldingTime binary = 54 "total settings the editor manages", or literally expected 54 keys in the description.
   - Recommendation: Keep 53 keys in description (current GAME_SETTINGS). HoldingTime stays binary-header-only. If the planner sees evidence of a 54th key needed, revisit — but do not add HoldingTime to the description without spec evidence.

2. **extendedSettings update on every `updateMapHeader` call**
   - What we know: `MapSettingsDialog.applySettings()` calls `updateMapHeader({ description: buildDescription(...), extendedSettings: localSettings })` — both fields updated together.
   - What's unclear: Whether any other code path calls `updateMapHeader` with partial `extendedSettings` that could leave them out of sync with `description`.
   - Recommendation: After phase 86, the save-time `reserializeDescription` uses `extendedSettings` as the authoritative source. If `extendedSettings` is ever missing a key, the function falls back to `getDefaultSettings()`. This makes the system resilient to partial updates.

---

## Sources

### Primary (HIGH confidence)
- Direct source code read of all relevant files in `E:\NewMapEditor\src\`
  - `src/core/map/GameSettings.ts` — all 53 settings, defaults, `getDefaultSettings()`
  - `src/core/map/types.ts` — `createEmptyMap()`, `createDefaultHeader()`, `MapHeader` interface
  - `src/core/map/MapParser.ts` — `parse()`, `serialize()` — description is read/written as raw string
  - `src/core/services/MapService.ts` — `loadMap()`, `saveMap()`, `saveMapAs()` — no lifecycle hooks currently
  - `src/core/editor/EditorState.ts` — `newMap()` calls `createEmptyMap()`; App.tsx IPC handler also calls `createEmptyMap()` directly
  - `src/components/MapSettingsDialog/MapSettingsDialog.tsx` — all four functions + constants to extract; current `buildDescription` ordering bug confirmed

### Secondary (MEDIUM confidence)
- Phase objective descriptions and requirements (SETT-01 through SETT-05) from the phase context — interpreted in light of direct code inspection.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no external libraries, pure TypeScript extraction
- Architecture: HIGH — all existing files read; call sites identified precisely
- Pitfalls: HIGH — all potential issues derived from direct code inspection, not speculation

**Research date:** 2026-02-17
**Valid until:** 2026-03-17 (stable codebase — no fast-moving dependencies)

---

## Implementation Checklist (for Planner)

The single plan (`86-01`) should include these ordered tasks:

1. **Create `src/core/map/settingsSerializer.ts`** — move/copy the four functions and three constants from `MapSettingsDialog.tsx`; fix `buildDescription` ordering (unrecognized before Author=); add three new lifecycle helpers (`initializeDescription`, `mergeDescriptionWithHeader`, `reserializeDescription`).

2. **Update `src/core/map/index.ts`** — add `export * from './settingsSerializer'`.

3. **Fix `createEmptyMap()` in `src/core/map/types.ts`** — import and call `initializeDescription()` for `header.description`; set `header.extendedSettings = getDefaultSettings()`.

4. **Fix `MapService.loadMap()` in `src/core/services/MapService.ts`** — after decompression, call `mergeDescriptionWithHeader()` and sync `extendedSettings`.

5. **Fix `MapService.saveMap()` and `saveMapAs()`** — before `mapParser.serialize()`, call `reserializeDescription()` on a shallow-copied map.

6. **Update `MapSettingsDialog.tsx`** — replace the four private function definitions and constant arrays with imports from `@core/map`; verify no behavior change for the dialog's own use.

7. **Verify TypeScript compiles** with `npm run typecheck`.
