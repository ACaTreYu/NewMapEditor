/**
 * Auto Patch Fixer — migrates old imgTuna.png sprite coordinates to new ones.
 *
 * Two corrections applied (Feb 2026 game source audit):
 *
 * 1. Flags: Y shifted up 3px (old Y=311+team*32 → new Y=308+team*32)
 * 2. Smoke/trails/explosions: complete coordinate overhaul from formula-based
 *    approximations to audited per-frame pixel coords.
 *
 * For each correction, the fixer:
 *   - Copies pixels from the OLD source rect
 *   - Clears the old rect (transparent)
 *   - Pastes into the NEW position
 *
 * This is non-destructive: only the affected regions are moved.
 */

interface PixelMove {
  label: string;
  oldX: number; oldY: number;
  newX: number; newY: number;
  w: number; h: number;
}

/**
 * Flag corrections: each team's flag shifted up 3px.
 * Old: Y = 311 + team*32, New: Y = 308 + team*32
 */
const FLAG_MOVES: PixelMove[] = [
  { label: 'Flag Green',  oldX: 288, oldY: 311, newX: 288, newY: 308, w: 16, h: 16 },
  { label: 'Flag Red',    oldX: 288, oldY: 343, newX: 288, newY: 340, w: 16, h: 16 },
  { label: 'Flag Blue',   oldX: 288, oldY: 375, newX: 288, newY: 372, w: 16, h: 16 },
  { label: 'Flag Yellow', oldX: 288, oldY: 407, newX: 288, newY: 404, w: 16, h: 16 },
  { label: 'Flag White',  oldX: 288, oldY: 439, newX: 288, newY: 436, w: 16, h: 16 },
];

/**
 * Smoke (player damage) — 9 frames.
 * Old coords were formula-based at Y~693 with shared X offsets.
 * New coords are audited per-frame at Y~602-604.
 */
const SMOKE_MOVES: PixelMove[] = [
  { label: 'Smoke 0', oldX: 12, oldY: 693, newX: 10,  newY: 603, w: 9,  h: 9 },
  { label: 'Smoke 1', oldX: 17, oldY: 693, newX: 20,  newY: 604, w: 11, h: 11 },
  { label: 'Smoke 2', oldX: 22, oldY: 693, newX: 32,  newY: 603, w: 15, h: 13 },
  { label: 'Smoke 3', oldX: 32, oldY: 693, newX: 51,  newY: 604, w: 17, h: 16 },
  { label: 'Smoke 4', oldX: 42, oldY: 692, newX: 70,  newY: 603, w: 20, h: 17 },
  { label: 'Smoke 5', oldX: 53, oldY: 693, newX: 94,  newY: 604, w: 19, h: 18 },
  { label: 'Smoke 6', oldX: 65, oldY: 693, newX: 117, newY: 604, w: 20, h: 18 },
  { label: 'Smoke 7', oldX: 76, oldY: 692, newX: 138, newY: 602, w: 20, h: 18 },
  { label: 'Smoke 8', oldX: 88, oldY: 692, newX: 162, newY: 602, w: 20, h: 18 },
];

/**
 * Grenade trails — 9 frames × 4 teams (green base, offset per team by +17 Y).
 * Old coords: same as smoke (shared Y~693 row).
 * New coords: Y~620 base, team offset = team * 17.
 */
function grenadeTrailMoves(): PixelMove[] {
  const baseOld = [
    { x: 12, y: 693, w: 9,  h: 9 },
    { x: 17, y: 693, w: 11, h: 10 },
    { x: 22, y: 693, w: 15, h: 12 },
    { x: 32, y: 693, w: 17, h: 15 },
    { x: 42, y: 692, w: 20, h: 15 },
    { x: 53, y: 693, w: 19, h: 17 },
    { x: 65, y: 693, w: 20, h: 17 },
    { x: 76, y: 692, w: 20, h: 17 },
    { x: 88, y: 692, w: 20, h: 17 },
  ];
  const baseNew = [
    { x: 10,  y: 620, w: 9,  h: 9 },
    { x: 20,  y: 621, w: 11, h: 10 },
    { x: 32,  y: 621, w: 15, h: 12 },
    { x: 51,  y: 622, w: 17, h: 15 },
    { x: 70,  y: 622, w: 20, h: 15 },
    { x: 94,  y: 622, w: 19, h: 17 },
    { x: 117, y: 622, w: 20, h: 17 },
    { x: 138, y: 620, w: 20, h: 17 },
    { x: 162, y: 620, w: 20, h: 17 },
  ];
  const teams = ['Green', 'Red', 'Blue', 'Yellow'];
  const moves: PixelMove[] = [];
  for (let t = 0; t < teams.length; t++) {
    for (let f = 0; f < 9; f++) {
      moves.push({
        label: `Gren Trail ${teams[t]} ${f}`,
        oldX: baseOld[f].x, oldY: baseOld[f].y + t * 17,
        newX: baseNew[f].x, newY: baseNew[f].y + t * 17,
        w: baseNew[f].w, h: baseNew[f].h,
      });
    }
  }
  return moves;
}

/**
 * Missile trails — 9 frames, team offsets.
 * Old: Y~693 shared row. New: Y=692 base.
 */
const MISSILE_TRAIL_MOVES: PixelMove[] = [
  { label: 'Miss Trail G0', oldX: 12, oldY: 693, newX: 11, newY: 692, w: 5,  h: 5 },
  { label: 'Miss Trail G1', oldX: 17, oldY: 693, newX: 16, newY: 692, w: 6,  h: 6 },
  { label: 'Miss Trail G2', oldX: 22, oldY: 693, newX: 22, newY: 692, w: 8,  h: 8 },
  { label: 'Miss Trail G3', oldX: 32, oldY: 693, newX: 31, newY: 692, w: 9,  h: 10 },
  { label: 'Miss Trail G4', oldX: 42, oldY: 692, newX: 41, newY: 692, w: 11, h: 10 },
  { label: 'Miss Trail G5', oldX: 53, oldY: 693, newX: 52, newY: 692, w: 12, h: 10 },
  { label: 'Miss Trail G6', oldX: 65, oldY: 693, newX: 65, newY: 692, w: 10, h: 10 },
  { label: 'Miss Trail G7', oldX: 76, oldY: 692, newX: 75, newY: 692, w: 11, h: 10 },
  { label: 'Miss Trail G8', oldX: 88, oldY: 692, newX: 87, newY: 692, w: 11, h: 10 },
];

/**
 * Missile projectile tip.
 * Old: X=6, Y=586, 4x4. New: X=10, Y=757, 3x3.
 */
const MISSILE_TIP_MOVE: PixelMove = {
  label: 'Missile Tip', oldX: 6, oldY: 586, newX: 10, newY: 757, w: 3, h: 3,
};

/** All moves combined */
const ALL_MOVES: PixelMove[] = [
  ...FLAG_MOVES,
  ...SMOKE_MOVES,
  ...grenadeTrailMoves(),
  ...MISSILE_TRAIL_MOVES,
  MISSILE_TIP_MOVE,
];

export interface PatchFixResult {
  movedCount: number;
  skippedCount: number;
  log: string[];
}

/**
 * Apply all coordinate fixes to an imgTuna canvas.
 * Returns a new canvas with corrections applied.
 */
export function fixPatchCoordinates(sourceImage: HTMLImageElement): { canvas: HTMLCanvasElement; result: PatchFixResult } {
  const canvas = document.createElement('canvas');
  canvas.width = sourceImage.naturalWidth;
  canvas.height = sourceImage.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(sourceImage, 0, 0);

  const log: string[] = [];
  let movedCount = 0;
  let skippedCount = 0;

  for (const move of ALL_MOVES) {
    // Check if old position has visible pixels
    const oldData = ctx.getImageData(move.oldX, move.oldY, move.w, move.h);
    const hasPixels = oldData.data.some((v, i) => i % 4 === 3 && v > 10);

    if (!hasPixels) {
      // Old position is empty — already migrated or blank
      skippedCount++;
      continue;
    }

    // Check if new position is already occupied
    const newData = ctx.getImageData(move.newX, move.newY, move.w, move.h);
    const newHasPixels = newData.data.some((v, i) => i % 4 === 3 && v > 10);

    if (newHasPixels) {
      // New position already has content — skip to avoid overwriting
      log.push(`SKIP ${move.label}: new position already has pixels`);
      skippedCount++;
      continue;
    }

    // Move: copy old → new, then clear old
    ctx.putImageData(oldData, move.newX, move.newY);
    ctx.clearRect(move.oldX, move.oldY, move.w, move.h);
    log.push(`MOVED ${move.label}: (${move.oldX},${move.oldY}) → (${move.newX},${move.newY})`);
    movedCount++;
  }

  return { canvas, result: { movedCount, skippedCount, log } };
}

/** Get summary of what would be fixed */
export function getFixSummary(): string {
  return `${ALL_MOVES.length} sprite regions to check:\n` +
    `• ${FLAG_MOVES.length} flag positions (Y shifted up 3px)\n` +
    `• ${SMOKE_MOVES.length} smoke frames (Y~693 → Y~603)\n` +
    `• ${grenadeTrailMoves().length} grenade trail frames (4 teams × 9 frames)\n` +
    `• ${MISSILE_TRAIL_MOVES.length} missile trail frames\n` +
    `• 1 missile projectile tip`;
}
