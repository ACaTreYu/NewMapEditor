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

import { MapHeader, MAP_WIDTH, MAP_HEIGHT, TILE_SIZE } from './types';
import { isAnimatedTile, getAnimationId, getFrameOffset } from './TileEncoding';
import { TURRET_ANIM_ID, decodeTurretOffset } from './GameObjectData';

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

export interface WeaponRangeFlags {
  laser: boolean; missile: boolean; grenade: boolean; bouncy: boolean; shrap: boolean;
}

// Per-weapon turret toggles (turret weapons only: no shrap).
export interface TurretWeaponFlags {
  laser: boolean; bouncy: boolean; missile: boolean; grenade: boolean;
}

export interface DrawWeaponRangesOptions {
  ranges: WeaponRanges;
  /** Per-weapon ship-sticker range shapes. */
  flags: WeaponRangeFlags;
  /** Per-weapon turret projectile-reach circles. Omit to skip turret reach. */
  turretReach?: TurretWeaponFlags;
  /** Per-weapon turret acquisition rings (dashed). Omit to skip acquisition. */
  turretAcq?: TurretWeaponFlags;
  /** Ship centers in MAP pixels (already filtered to visible). */
  shipCenters: { xPx: number; yPx: number }[];
  /** Map tiles for turret scanning; omit to skip turret rings. */
  tiles?: ArrayLike<number>;
  /** Map-pixel -> output-canvas transform: outX = (mapPx - originX) * scale. */
  originX: number;
  originY: number;
  scale: number;
}

/**
 * Single source of truth for drawing weapon-range shapes — used by both the
 * live MapCanvas overlay and the overview PNG export so they match exactly.
 */
export function drawWeaponRanges(ctx: CanvasRenderingContext2D, o: DrawWeaponRangesOptions): void {
  const { ranges, flags, scale } = o;
  const colorOf = (k: WeaponKey) => WEAPON_RANGE_META.find(m => m.key === k)!.color;
  const tx = (mapPxX: number) => (mapPxX - o.originX) * scale;
  const ty = (mapPxY: number) => (mapPxY - o.originY) * scale;

  const circle = (cx: number, cy: number, rPx: number, color: string) => {
    ctx.beginPath();
    ctx.arc(cx, cy, rPx * scale, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.globalAlpha = 0.06; ctx.fill();
    ctx.globalAlpha = 0.85; ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.globalAlpha = 1;
  };
  const box = (cx: number, cy: number, halfX: number, halfY: number, color: string) => {
    const w = halfX * 2 * scale, h = halfY * 2 * scale;
    ctx.fillStyle = color; ctx.globalAlpha = 0.06;
    ctx.fillRect(cx - halfX * scale, cy - halfY * scale, w, h);
    ctx.globalAlpha = 0.85; ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - halfX * scale, cy - halfY * scale, w, h);
    ctx.globalAlpha = 1;
  };
  const roundedBox = (cx: number, cy: number, halfX: number, halfY: number, r: number, color: string) => {
    const hx = halfX * scale, hy = halfY * scale, rr = r * scale;
    ctx.beginPath();
    ctx.moveTo(cx - hx, cy - hy - rr);
    ctx.lineTo(cx + hx, cy - hy - rr);
    ctx.arcTo(cx + hx + rr, cy - hy - rr, cx + hx + rr, cy - hy, rr);
    ctx.lineTo(cx + hx + rr, cy + hy);
    ctx.arcTo(cx + hx + rr, cy + hy + rr, cx + hx, cy + hy + rr, rr);
    ctx.lineTo(cx - hx, cy + hy + rr);
    ctx.arcTo(cx - hx - rr, cy + hy + rr, cx - hx - rr, cy + hy, rr);
    ctx.lineTo(cx - hx - rr, cy - hy);
    ctx.arcTo(cx - hx - rr, cy - hy - rr, cx - hx, cy - hy - rr, rr);
    ctx.closePath();
    ctx.fillStyle = color; ctx.globalAlpha = 0.05; ctx.fill();
    ctx.globalAlpha = 0.7; ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]); ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  };

  ctx.save();

  for (const c of o.shipCenters) {
    const cx = tx(c.xPx), cy = ty(c.yPx);
    if (flags.laser)   circle(cx, cy, ranges.laserPx, colorOf('laser'));
    if (flags.missile) circle(cx, cy, ranges.missilePx, colorOf('missile'));
    if (flags.bouncy)  circle(cx, cy, ranges.bouncyPx, colorOf('bouncy'));
    if (flags.grenade) box(cx, cy, GRENADE_BOX_HALF_X, GRENADE_BOX_HALF_Y, colorOf('grenade'));
    if (flags.shrap)   roundedBox(cx, cy, GRENADE_BOX_HALF_X, GRENADE_BOX_HALF_Y, ranges.shrapPx, colorOf('shrap'));
  }

  if ((o.turretReach || o.turretAcq) && o.tiles) {
    const reachF = o.turretReach;
    const acqF = o.turretAcq;
    const WEAPON_KEY: (keyof TurretWeaponFlags)[] = ['laser', 'bouncy', 'missile', 'grenade']; // decodeTurretOffset order
    for (let ty2 = 0; ty2 < MAP_HEIGHT; ty2++) {
      for (let tx2 = 0; tx2 < MAP_WIDTH; tx2++) {
        const t = o.tiles[ty2 * MAP_WIDTH + tx2];
        if (!isAnimatedTile(t) || getAnimationId(t) !== TURRET_ANIM_ID) continue;
        const { weapon } = decodeTurretOffset(getFrameOffset(t));
        const wk = WEAPON_KEY[weapon] ?? 'laser';
        const reachOn = !!(reachF && reachF[wk]); // per-weapon reach toggle
        const acqOn = !!(acqF && acqF[wk]);        // per-weapon acquisition toggle
        if (!reachOn && !acqOn) continue;          // nothing to draw for this turret
        const cx = tx(tx2 * TILE_SIZE + TILE_SIZE / 2), cy = ty(ty2 * TILE_SIZE + TILE_SIZE / 2);
        const color = colorOf(wk);
        // Projectile reach (solid). Grenade turrets are target-limited (lob at
        // acquired enemies ≤300), so their reach == the 300px acquisition radius.
        if (reachOn) {
          const reach = wk === 'laser' ? ranges.laserPx
            : wk === 'bouncy' ? ranges.bouncyPx
            : wk === 'missile' ? ranges.missilePx : 300;
          if (reach > 0) circle(cx, cy, reach, color);
        }
        // Target-acquisition ring (dashed).
        if (acqOn) {
          const acq = (wk === 'laser' || wk === 'bouncy') ? 512 : 300;
          ctx.beginPath();
          ctx.arc(cx, cy, acq * scale, 0, Math.PI * 2);
          ctx.globalAlpha = 0.7; ctx.strokeStyle = color; ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
          ctx.globalAlpha = 1;
        }
      }
    }
  }

  ctx.restore();
}
