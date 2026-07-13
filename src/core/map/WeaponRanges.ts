/**
 * Weapon range geometry for the editor overlay — derived from AC's actual
 * projectile mechanics (ac-org game/server). Range is a per-map-settings
 * value the mapper can visualize around ship stickers and turrets.
 *
 * Core AC fact: a straight projectile travels EXACTLY its TTL in pixels
 * (Life decrements by the same amount it moves each tick), independent of
 * speed. So range_px == the *TTL setting. Evidence: Laser.java:59-60,
 * Bounce.java:62-66, Missile.java:50, game aliases the TTL keys as
 * "*distance" keys documented as travel distance in pixels.
 */

import { MapHeader } from './types';

export type WeaponKey = 'laser' | 'missile' | 'bouncy' | 'grenade' | 'shrap';

// Distinct, colorblind-friendly-ish hues per weapon (stroke colors; fills use
// low alpha of the same). Order matches the toggle row.
export const WEAPON_RANGE_META: { key: WeaponKey; label: string; color: string }[] = [
  { key: 'laser',   label: 'Laser',    color: '#4bd6ff' }, // cyan
  { key: 'missile', label: 'Missile',  color: '#ff5d5d' }, // red
  { key: 'grenade', label: 'Grenade',  color: '#ffc63c' }, // amber
  { key: 'bouncy',  label: 'Bouncy',   color: '#7de07d' }, // green
  { key: 'shrap',   label: 'Shrapnel', color: '#c774ff' }, // violet
];

// Grenade landing is clamped to the shooter's viewport, NOT a TTL — it's an
// axis-aligned box of half-extents (ResolutionX/2, ResolutionY/2) around the
// ship. Standard AC play resolution is 800x600 → 400x300 half-extents.
// (LibGDXGame.java virtualMouse clamp + Spark.java OffsetX/Y = Res/2 - 16.)
export const GRENADE_BOX_HALF_X = 400;
export const GRENADE_BOX_HALF_Y = 300;

// Missile-burst shrapnel is a HARD-CODED 30px (Life=30, ShrapnelList.java:54),
// independent of settings. Grenade-burst shrapnel radius = ShrapTTL setting.
export const MISSILE_SHRAP_PX = 30;

export interface WeaponRanges {
  laserPx: number;    // = LaserTTL
  missilePx: number;  // = MissileTTL
  bouncyPx: number;   // = BouncyTTL (total path budget across bounces)
  shrapPx: number;    // = ShrapTTL (grenade-burst shrapnel radius)
}

const num = (v: number | undefined, dflt: number) =>
  (typeof v === 'number' && !isNaN(v) ? v : dflt);

/**
 * Read effective weapon ranges from a map's extended settings, falling back
 * to AC engine defaults (Map.java mod_* inits) when a key isn't set.
 */
export function getWeaponRanges(header: MapHeader): WeaponRanges {
  const s = header.extendedSettings ?? {};
  return {
    laserPx:   num(s['LaserTTL'], 480),
    missilePx: num(s['MissileTTL'], 480),
    bouncyPx:  num(s['BouncyTTL'], 970),
    shrapPx:   num(s['ShrapTTL'], 128),
  };
}
