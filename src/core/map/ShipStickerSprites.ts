/**
 * Ship sticker sprite constants — frame geometry inside imgTuna.png.
 * Shared by the sticker palette, map canvas overlay, and overview export.
 */

/** Source frame size in imgTuna (ships are 32x32) */
export const SHIP_FRAME_SIZE = 32;

/** Ship frame row Y-offsets in imgTuna, keyed by team index (Green/Red/Blue/Yellow) */
export const SHIP_TEAM_Y: Record<number, number> = { 0: 292, 1: 324, 2: 356, 3: 388 };
