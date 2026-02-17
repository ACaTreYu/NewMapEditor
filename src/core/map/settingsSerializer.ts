/**
 * Settings serialization module for AC map format.
 *
 * Extracted from MapSettingsDialog.tsx so that lifecycle hooks in
 * createEmptyMap(), MapService.loadMap(), MapService.saveMap(), and
 * MapService.saveMapAs() can call the same serialization logic without
 * a circular dependency.
 *
 * Exports:
 *   - Constants: LASER_DAMAGE_VALUES, SPECIAL_DAMAGE_VALUES, RECHARGE_RATE_VALUES
 *   - Helpers: findClosestIndex, serializeSettings, parseSettings, buildDescription, parseDescription
 *   - Lifecycle: initializeDescription, mergeDescriptionWithHeader, reserializeDescription
 */

import { GAME_SETTINGS, getDefaultSettings } from './GameSettings';
import { MapHeader } from './types';

// === Constants (formerly private in MapSettingsDialog) ===

/** Maps header laserDamage level (0-4) to the LaserDamage extended setting value */
export const LASER_DAMAGE_VALUES = [5, 14, 27, 54, 112];

/** Maps header specialDamage level (0-4) to the MissileDamage extended setting value */
export const SPECIAL_DAMAGE_VALUES = [20, 51, 102, 153, 204];

/** Maps header rechargeRate level (0-4) to the MissileRecharge extended setting value (lower = faster) */
export const RECHARGE_RATE_VALUES = [3780, 1890, 945, 473, 236];

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
 * @param settings - Record of setting key to value
 * @returns Serialized string like "Format=1.1, BouncyDamage=48, LaserDamage=27, ..."
 */
export function serializeSettings(settings: Record<string, number>): string {
  // Split settings into non-flagger and flagger groups
  const nonFlaggerSettings = GAME_SETTINGS.filter(s => s.category !== 'Flagger');
  const flaggerSettings = GAME_SETTINGS.filter(s => s.category === 'Flagger');

  // Sort each group alphabetically by key (defensive copy to prevent mutation)
  const sortedNonFlagger = [...nonFlaggerSettings].sort((a, b) => a.key.localeCompare(b.key));
  const sortedFlagger = [...flaggerSettings].sort((a, b) => a.key.localeCompare(b.key));

  // Serialize each group
  const nonFlaggerPairs = sortedNonFlagger.map(setting =>
    `${setting.key}=${settings[setting.key] ?? setting.default}`
  );
  const flaggerPairs = sortedFlagger.map(setting =>
    `${setting.key}=${settings[setting.key] ?? setting.default}`
  );

  // Combine: Format=1.1 first (required prefix), then non-flagger, then flagger
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
        // Parse and clamp value to min/max bounds
        const value = parseInt(valueStr, 10);
        settings[key] = Math.max(setting.min, Math.min(setting.max, value));
      } else {
        // Preserve unrecognized Key=Value pairs
        unrecognized.push(pair);
      }
    } else {
      // Preserve non-Key=Value entries (legacy text)
      unrecognized.push(pair);
    }
  }

  // Filter out Format=1.1 since serializeSettings always injects it
  const filtered = unrecognized.filter(p => !p.match(/^Format=[\d.]+$/));
  return { settings, unrecognized: filtered };
}

/**
 * Builds complete description string from settings, author, and unrecognized pairs.
 * Order: [Format=1.1 + settings...] [unrecognized...] [Author=...]
 * Author= is ALWAYS the last item (SETT-04).
 * @param settings - Game settings record
 * @param author - Author name
 * @param unrecognized - Unrecognized pairs to preserve (must NOT include Author=)
 * @returns Complete description string
 */
export function buildDescription(settings: Record<string, number>, author: string, unrecognized?: string[]): string {
  const parts: string[] = [];

  // Add serialized settings (Format=1.1 prefix + all settings)
  parts.push(serializeSettings(settings));

  // Add unrecognized pairs BEFORE Author= (SETT-04 fix)
  if (unrecognized && unrecognized.length > 0) {
    parts.push(...unrecognized);
  }

  // Author= ALWAYS LAST (SETT-04)
  if (author.trim()) {
    parts.push(`Author=${author.trim()}`);
  }

  return parts.join(', ');
}

/**
 * Parses description string to extract settings, author, and unrecognized pairs.
 * Author= is extracted from unrecognized and returned separately so that
 * buildDescription can place it correctly (always last).
 * @param description - The description string to parse
 * @returns Object with settings, author, and unrecognized pairs (without Author=)
 */
export function parseDescription(description: string): { settings: Record<string, number>; author: string; unrecognized: string[] } {
  const { settings, unrecognized } = parseSettings(description);

  // Find and extract Author entry
  const authorPair = unrecognized.find(p => p.startsWith('Author='));
  const author = authorPair ? authorPair.slice('Author='.length).trim() : '';

  // Filter Author entry out of unrecognized array
  const filteredUnrecognized = unrecognized.filter(p => !p.startsWith('Author='));

  return { settings, author, unrecognized: filteredUnrecognized };
}

// === Lifecycle helpers ===

/**
 * SETT-01: Build a fresh description with all defaults.
 * Used by createEmptyMap() so every new map starts with a complete description.
 * @returns Description string with Format=1.1 and all 53 settings at default values
 */
export function initializeDescription(): string {
  return buildDescription(getDefaultSettings(), '', []);
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
  const { settings, author, unrecognized } = parseDescription(description);

  // Derive values from binary header indices (0-4)
  const headerDerived: Record<string, number> = {
    LaserDamage: LASER_DAMAGE_VALUES[header.laserDamage] ?? 27,
    MissileDamage: SPECIAL_DAMAGE_VALUES[header.specialDamage] ?? 102,
    MissileRecharge: RECHARGE_RATE_VALUES[header.rechargeRate] ?? 945,
  };

  const defaults = getDefaultSettings();
  // Merge priority: defaults < headerDerived < parsed description settings
  const merged = { ...defaults, ...headerDerived, ...settings };

  // Default SwitchWin to switch count if not explicitly set
  if (merged['SwitchWin'] === 0 && header.switchCount > 0) {
    merged['SwitchWin'] = header.switchCount;
  }

  return buildDescription(merged, author, unrecognized);
}

/**
 * SETT-03: Re-serialize description from extendedSettings before save.
 * Preserves unrecognized pairs and author from the existing description.
 * Uses extendedSettings as authoritative values, filling gaps with defaults.
 * @param description - Current description string (for author/unrecognized extraction)
 * @param extendedSettings - Current extended settings record (canonical values)
 * @returns Updated description with all 53 settings from extendedSettings
 */
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
