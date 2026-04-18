/**
 * Settings serialization module for AC map format.
 *
 * Extracted from MapSettingsDialog.tsx so that lifecycle hooks in
 * createEmptyMap(), MapService.loadMap(), MapService.saveMap(), and
 * MapService.saveMapAs() can call the same serialization logic without
 * a circular dependency.
 *
 * Exports:
 *   - Constants: LASER_DAMAGE_VALUES, SPECIAL_DAMAGE_VALUES, RECHARGE_RATE_VALUES,
 *               NADE_DAMAGE_VALUES, NADE_RECHARGE_VALUES, BOUNCY_DAMAGE_VALUES, BOUNCY_RECHARGE_VALUES
 *   - Helpers: findClosestIndex, serializeSettings, parseSettings, buildDescription, parseDescription
 *   - Lifecycle: initializeDescription, mergeDescriptionWithHeader, reserializeDescription
 */

import { GAME_SETTINGS, getDefaultSettings } from './GameSettings';
import { MapHeader, ObjectiveType } from './types';

/**
 * Mode-specific settings: only serialized when the map's objective matches.
 * All other settings are always serialized regardless of mode.
 * Lazy-initialized to avoid circular dependency with types.ts.
 */
let _modeSpecific: Record<string, number[]> | null = null;
function getModeSpecificSettings(): Record<string, number[]> {
  if (!_modeSpecific) {
    _modeSpecific = {
      DeathMatchWin: [ObjectiveType.FRAG],
      DominationWin: [ObjectiveType.DOMINATION],
      ElectionTime: [ObjectiveType.ASSASSIN],
      SwitchWin: [ObjectiveType.SWITCH],
      FlagInPlay: [ObjectiveType.FLAG],
    };
  }
  return _modeSpecific;
}

/**
 * Keys that must appear in the description regardless of value.
 *
 * The game inits these from the binary header's difficulty indices using
 * fixed formulas (Map.java, lines 346-354):
 *   LaserDamage   = HealthLaser   * (laserDamage   + 1)   // HealthLaser   = 9
 *   MissileDamage = HealthMissile * (specialDamage + 1)   // HealthMissile = 34
 *   BouncyDamage  = HealthBouncy  * (specialDamage + 1)   // HealthBouncy  = 16
 *   NadeDamage    = HealthGrenade * (specialDamage + 1)   // HealthGrenade = 7
 * Those formulas only coincide with our UI presets at the "Normal" index;
 * for any other index, omitting would silently diverge from what the user
 * chose in the editor. Recharges have no header-derived init — the game
 * keeps hardcoded defaults unless the description overrides — so they are
 * also pinned here to preserve the user's selection.
 */
const ALWAYS_EMIT = new Set<string>([
  'LaserDamage', 'MissileDamage', 'BouncyDamage', 'NadeDamage',
  'MissileRecharge', 'BouncyRecharge', 'NadeRecharge',
  'FLaserDamage', 'FMissileDamage', 'FBouncyDamage', 'FNadeDamage',
  'FMissileRecharge', 'FBouncyRecharge', 'FNadeRecharge',
]);

/**
 * Boolean-ish toggles: emitted only when the user turned them on (value != 0).
 * The "off" state is absence of the key.
 */
const TOGGLE_KEYS = new Set<string>([
  'FlagInPlay', 'InvisibleMap', 'FogOfWar', 'DisableSwitchSound', 'Widescreen',
]);

// === Constants (formerly private in MapSettingsDialog) ===

/** Maps header laserDamage level (0-4) to the LaserDamage extended setting value */
export const LASER_DAMAGE_VALUES = [5, 14, 27, 54, 112];

/** Maps header specialDamage level (0-4) to the MissileDamage extended setting value */
export const SPECIAL_DAMAGE_VALUES = [20, 51, 102, 153, 204];

/** Maps header rechargeRate level (0-4) to the MissileRecharge extended setting value (lower = faster) */
export const RECHARGE_RATE_VALUES = [3780, 1890, 945, 473, 236];

/** Maps Grenade damage preset (0-4) to the NadeDamage extended setting value.
 *  Doubling scale centered on AC default 21 at index 2 (Normal). */
export const NADE_DAMAGE_VALUES = [5, 11, 21, 42, 84];

/** Maps Grenade recharge preset (0-4) to the NadeRecharge extended setting value.
 *  Halving scale centered on AC default 1950 at index 2 (Normal). Lower = faster. */
export const NADE_RECHARGE_VALUES = [7800, 3900, 1950, 975, 488];

/** Maps Bouncy damage preset (0-4) to the BouncyDamage extended setting value.
 *  Doubling scale centered on AC default 48 at index 2 (Normal). */
export const BOUNCY_DAMAGE_VALUES = [12, 24, 48, 96, 192];

/** Maps Bouncy recharge preset (0-4) to the BouncyRecharge extended setting value.
 *  Halving scale centered on AC default 765 at index 2 (Normal). Lower = faster. */
export const BOUNCY_RECHARGE_VALUES = [3060, 1530, 765, 383, 191];

/**
 * Find the dropdown index (0-4) whose preset value is closest to the given
 * extended setting value. Handles custom values by snapping to nearest preset.
 */
export function findClosestIndex(value: number, valueArray: number[]): number {
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

// === Core serialize/parse (formerly private in MapSettingsDialog) ===

/**
 * Serializes game settings to comma-space delimited Key=Value pairs.
 * Non-flagger settings come first, then flagger settings, both sorted alphabetically.
 * Prefixes the result with "Format=1.1".
 *
 * Emission rules:
 *   - `Format=1.1` is always first.
 *   - `ALWAYS_EMIT` keys (header-derived damage/recharge families) are always
 *     included because omitting them would let the game fall back to its
 *     HealthLaser/HealthMissile/... formulas, which only match our UI presets
 *     at the "Normal" difficulty index.
 *   - `TOGGLE_KEYS` are included only when the user turned them on (value != 0).
 *   - Mode-specific keys (DeathMatchWin, DominationWin, ElectionTime, SwitchWin,
 *     FlagInPlay) are dropped when the current objective doesn't match.
 *   - All other keys are included only when the value differs from the
 *     setting's default — matching SEdit's "emit what the user changed" style.
 */
export function serializeSettings(settings: Record<string, number>, objective?: ObjectiveType): string {
  const shouldInclude = (setting: { key: string; default: number }): boolean => {
    const { key } = setting;

    const modes = getModeSpecificSettings()[key];
    if (modes && objective !== undefined && !modes.includes(objective)) return false;

    const value = settings[key] ?? setting.default;

    if (ALWAYS_EMIT.has(key)) return true;
    if (TOGGLE_KEYS.has(key)) return value !== 0;
    return value !== setting.default;
  };

  const nonFlaggerSettings = GAME_SETTINGS.filter(s => s.category !== 'Flagger');
  const flaggerSettings = GAME_SETTINGS.filter(s => s.category === 'Flagger');

  const sortedNonFlagger = [...nonFlaggerSettings].sort((a, b) => a.key.localeCompare(b.key));
  const sortedFlagger = [...flaggerSettings].sort((a, b) => a.key.localeCompare(b.key));

  const nonFlaggerPairs = sortedNonFlagger
    .filter(s => shouldInclude(s))
    .map(setting => `${setting.key}=${settings[setting.key] ?? setting.default}`);
  const flaggerPairs = sortedFlagger
    .filter(s => shouldInclude(s))
    .map(setting => `${setting.key}=${settings[setting.key] ?? setting.default}`);

  const allPairs = ['Format=1.1', ...nonFlaggerPairs, ...flaggerPairs];
  return allPairs.join(', ');
}

/**
 * Parses game settings from comma-delimited Key=Value pairs.
 * Values are clamped to min/max bounds. Unrecognized pairs are preserved.
 * @param description - The description string to parse
 * @returns Object with parsed settings and unrecognized pairs
 */
export function parseSettings(description: string): { settings: Record<string, number>; unrecognized: string[] } {
  const settings: Record<string, number> = {};
  const unrecognized: string[] = [];

  // Split by comma and trim each part
  const pairs = description.split(',').map(p => p.trim()).filter(Boolean);

  for (const pair of pairs) {
    const match = pair.match(/^(\w+)=(.+)$/);
    if (match) {
      const [, key, valueStr] = match;
      const setting = GAME_SETTINGS.find(s => s.key === key);

      if (setting) {
        // Parse and clamp value to min/max bounds; fall back to default on NaN
        const value = parseInt(valueStr, 10);
        settings[key] = isNaN(value) ? setting.default : Math.max(setting.min, Math.min(setting.max, value));
      } else {
        // Preserve unrecognized Key=Value pairs
        unrecognized.push(pair);
      }
    } else {
      // Preserve non-Key=Value entries (legacy text)
      unrecognized.push(pair);
    }
  }

  // Filter out Format=1.1 (always injected by serializeSettings) and any
  // unrecognized pairs whose key matches a known GAME_SETTINGS key (case-insensitive).
  // This prevents duplicates when a map description has e.g. "fShrapTTL=128" alongside
  // the canonical "FShrapTTL=128" that serializeSettings always emits.
  const knownKeys = new Set(GAME_SETTINGS.map(s => s.key.toLowerCase()));
  const filtered = unrecognized
    .filter(p => !p.match(/^Format=[\d.]+$/))
    .filter(p => {
      const m = p.match(/^(\w+)=/);
      return !m || !knownKeys.has(m[1].toLowerCase());
    });
  return { settings, unrecognized: filtered };
}

/**
 * Builds description string from settings only.
 * No author, no unrecognized pairs, no free text — purely Key=Value settings.
 * The AC game parser expects only Key=Value pairs in the description field;
 * free text (author names, notes) can break map joins.
 * @param settings - Game settings record
 * @param objective - Current game mode (filters mode-specific settings)
 * @returns Settings-only description: "Format=1.1, Key=Value, Key=Value, ..."
 */
export function buildDescription(settings: Record<string, number>, objective?: ObjectiveType): string {
  return serializeSettings(settings, objective);
}

/**
 * Parses description string to extract settings and author.
 * Author is the last comma-separated entry without '=' sign.
 * @param description - The description string to parse
 * @returns Object with settings, author, and unrecognized pairs (without author)
 */
export function parseDescription(description: string): { settings: Record<string, number>; author: string; unrecognized: string[] } {
  let author = '';
  let settingsStr = description;

  // New format: author after double-space (no comma) at end of description.
  // Also handles legacy comma format where ",  AuthorName" produces "  AuthorName" segment.
  const lastDoubleSpace = description.lastIndexOf('  ');
  if (lastDoubleSpace >= 0) {
    const candidate = description.substring(lastDoubleSpace + 2).trim();
    if (candidate && !candidate.includes('=') && !candidate.includes(',')) {
      author = candidate;
      // Strip author (and optional trailing comma) from settings portion
      settingsStr = description.substring(0, lastDoubleSpace).replace(/,\s*$/, '');
    }
  }

  const { settings, unrecognized } = parseSettings(settingsStr);

  // Fallback for legacy format: author is last comma-separated entry without '='
  if (!author && unrecognized.length > 0) {
    const lastIdx = unrecognized.length - 1;
    if (!unrecognized[lastIdx].includes('=')) {
      author = unrecognized[lastIdx].trim();
      unrecognized.splice(lastIdx, 1);
    }
  }

  return { settings, author, unrecognized };
}

// === Lifecycle helpers ===

/**
 * SETT-01: Build a fresh description with all defaults.
 * Used by createEmptyMap() so every new map starts with a complete description.
 * @returns Description string with Format=1.1 and all 53 settings at default values
 */
export function initializeDescription(): string {
  return buildDescription(getDefaultSettings());
}

/**
 * SETT-02: Merge existing description + binary header values into canonical form.
 * Merge priority: defaults < headerDerived < parsed description settings.
 * Used by MapService.loadMap() to ensure all 53 keys are present after opening any map.
 * @param description - Existing map description (may be bare text or partial settings)
 * @param header - Parsed binary header (contains laserDamage, specialDamage, rechargeRate indices)
 * @returns Canonical description with Format=1.1 and all 53 settings
 */
export function mergeDescriptionWithHeader(description: string, header: MapHeader): string {
  const { settings } = parseDescription(description);

  // Derive values from binary header indices (0-4)
  // Special Damage and Recharge Rate apply to all weapons (missile, grenade, bouncy)
  const headerDerived: Record<string, number> = {
    LaserDamage: LASER_DAMAGE_VALUES[header.laserDamage] ?? 27,
    MissileDamage: SPECIAL_DAMAGE_VALUES[header.specialDamage] ?? 102,
    NadeDamage: NADE_DAMAGE_VALUES[header.specialDamage] ?? 21,
    BouncyDamage: BOUNCY_DAMAGE_VALUES[header.specialDamage] ?? 48,
    MissileRecharge: RECHARGE_RATE_VALUES[header.rechargeRate] ?? 945,
    NadeRecharge: NADE_RECHARGE_VALUES[header.rechargeRate] ?? 1950,
    BouncyRecharge: BOUNCY_RECHARGE_VALUES[header.rechargeRate] ?? 765,
  };

  const defaults = getDefaultSettings();
  // Merge priority: defaults < headerDerived < parsed description settings
  const merged = { ...defaults, ...headerDerived, ...settings };

  // Default SwitchWin to switch count if not explicitly set
  if (merged['SwitchWin'] === 0 && header.switchCount > 0) {
    merged['SwitchWin'] = header.switchCount;
  }

  return buildDescription(merged, header.objective);
}

/**
 * SETT-03: Re-serialize description from extendedSettings before save.
 * Uses extendedSettings as authoritative values, filling gaps with defaults.
 * Description is purely settings — no author or free text.
 * Mode-specific settings are filtered based on objective.
 * @param extendedSettings - Current extended settings record (canonical values)
 * @param objective - Current game mode (filters mode-specific settings)
 * @returns Updated description with all settings from extendedSettings
 */
export function reserializeDescription(
  extendedSettings: Record<string, number>,
  objective?: ObjectiveType
): string {
  const defaults = getDefaultSettings();
  // extendedSettings wins over defaults; any key missing from extendedSettings uses default
  const settings = { ...defaults, ...extendedSettings };
  return buildDescription(settings, objective);
}
