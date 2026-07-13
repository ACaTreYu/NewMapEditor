/**
 * Ship sticker sprite constants — frame geometry inside imgTuna.png.
 * Shared by the sticker palette, map canvas overlay, and overview export.
 */

/** Source frame size in imgTuna (ships are 32x32) */
export const SHIP_FRAME_SIZE = 32;

/** Ship frame row Y-offsets in imgTuna, keyed by team index (Green/Red/Blue/Yellow) */
export const SHIP_TEAM_Y: Record<number, number> = { 0: 292, 1: 324, 2: 356, 3: 388 };

/**
 * White ships come from a separate per-patch imgWhiteShips.png (288x128 =
 * 9 dirs x 4 sets of 32x32). Sticker team indices 4-7 map to white sets 0-3,
 * each row at Y = set*32. When a patch ships imgWhiteShips.png, the sticker
 * palette offers 8 sets total (4 colored from tuna + 4 white); otherwise 4.
 */
export const WHITE_SHIP_TEAM_BASE = 4;
export const WHITE_SHIP_SET_COUNT = 4;

/** Is this sticker team index a white-ship set? */
export function isWhiteShipTeam(team: number): boolean {
  return team >= WHITE_SHIP_TEAM_BASE && team < WHITE_SHIP_TEAM_BASE + WHITE_SHIP_SET_COUNT;
}

/**
 * Resolve which source image + row Y a sticker's team draws from.
 * Colored teams (0-3) read imgTuna at SHIP_TEAM_Y; white sets (4-7) read
 * imgWhiteShips at (team-4)*32. Returns null when the needed image is absent.
 */
export function resolveShipFrameSource(
  team: number,
  tunaImage: HTMLImageElement | null,
  whiteShipsImage: HTMLImageElement | null
): { image: HTMLImageElement; srcY: number } | null {
  if (isWhiteShipTeam(team)) {
    if (!whiteShipsImage) return null;
    return { image: whiteShipsImage, srcY: (team - WHITE_SHIP_TEAM_BASE) * SHIP_FRAME_SIZE };
  }
  if (!tunaImage) return null;
  return { image: tunaImage, srcY: SHIP_TEAM_Y[team] ?? SHIP_TEAM_Y[0] };
}
