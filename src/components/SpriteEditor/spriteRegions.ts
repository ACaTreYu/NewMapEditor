/**
 * Sprite regions for imgTuna.png — clickable areas in the sprite editor.
 * All coordinates are 1x scale (640px wide image).
 * Reference: E:\AC-SRC\docs\reference\TUNA_SPRITES_REFERENCE.md
 */

export interface SpriteRegion {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  category: string;
}

/** Region categories with display colors */
export const CATEGORY_COLORS: Record<string, string> = {
  ui: '#6688cc',
  ships: '#44bb66',
  flags: '#eecc44',
  weapons: '#ee6644',
  effects: '#cc66dd',
  powerups: '#44cccc',
  panel: '#8888aa',
};

export const SPRITE_REGIONS: SpriteRegion[] = [
  // --- UI Elements ---
  { id: 'tab_active',   label: 'Tab (Active)',   x: 512, y: 0, width: 64, height: 16, category: 'ui' },
  { id: 'tab_inactive', label: 'Tab (Inactive)', x: 576, y: 0, width: 64, height: 16, category: 'ui' },

  // Team Buttons — 60x45
  { id: 'btn_green',  label: 'Team Btn Green',  x: 64,  y: 89, width: 60, height: 45, category: 'ui' },
  { id: 'btn_red',    label: 'Team Btn Red',    x: 124, y: 89, width: 60, height: 45, category: 'ui' },
  { id: 'btn_blue',   label: 'Team Btn Blue',   x: 184, y: 89, width: 60, height: 45, category: 'ui' },
  { id: 'btn_yellow', label: 'Team Btn Yellow', x: 244, y: 89, width: 60, height: 45, category: 'ui' },

  // Dialog Buttons — 59x20
  { id: 'dlg_cancel', label: 'Btn Cancel', x: 0, y: 109, width: 59, height: 20, category: 'ui' },
  { id: 'dlg_yes',    label: 'Btn Yes',    x: 0, y: 129, width: 59, height: 20, category: 'ui' },
  { id: 'dlg_no',     label: 'Btn No',     x: 0, y: 149, width: 59, height: 20, category: 'ui' },

  // Dialog Border 9-slice — 16x16 each
  { id: 'dlg_tl', label: 'Border TL', x: 0,  y: 170, width: 16, height: 16, category: 'ui' },
  { id: 'dlg_tc', label: 'Border TC', x: 16, y: 170, width: 16, height: 16, category: 'ui' },
  { id: 'dlg_tr', label: 'Border TR', x: 32, y: 170, width: 16, height: 16, category: 'ui' },
  { id: 'dlg_ml', label: 'Border ML', x: 0,  y: 186, width: 16, height: 16, category: 'ui' },
  { id: 'dlg_mc', label: 'Border MC', x: 16, y: 186, width: 16, height: 16, category: 'ui' },
  { id: 'dlg_mr', label: 'Border MR', x: 32, y: 186, width: 16, height: 16, category: 'ui' },
  { id: 'dlg_bl', label: 'Border BL', x: 0,  y: 202, width: 16, height: 16, category: 'ui' },
  { id: 'dlg_bc', label: 'Border BC', x: 16, y: 202, width: 16, height: 16, category: 'ui' },
  { id: 'dlg_br', label: 'Border BR', x: 32, y: 202, width: 16, height: 16, category: 'ui' },

  // Cursors — 32x32
  { id: 'cursor_0', label: 'Cursor 0', x: 0,   y: 260, width: 32, height: 32, category: 'ui' },
  { id: 'cursor_1', label: 'Cursor 1', x: 32,  y: 260, width: 32, height: 32, category: 'ui' },
  { id: 'cursor_2', label: 'Cursor 2', x: 64,  y: 260, width: 32, height: 32, category: 'ui' },
  { id: 'cursor_3', label: 'Cursor 3', x: 96,  y: 260, width: 32, height: 32, category: 'ui' },
  { id: 'cursor_4', label: 'Cursor 4', x: 128, y: 260, width: 32, height: 32, category: 'ui' },
  { id: 'cursor_5', label: 'Cursor 5', x: 160, y: 260, width: 32, height: 32, category: 'ui' },
  { id: 'cursor_6', label: 'Cursor 6', x: 192, y: 260, width: 32, height: 32, category: 'ui' },
  { id: 'cursor_7', label: 'Cursor 7', x: 224, y: 260, width: 32, height: 32, category: 'ui' },

  // --- Ships — 9 frames × 32px per team row ---
  // Green team: Y=292
  ...shipFrames('green', 292),
  // Red team: Y=324
  ...shipFrames('red', 324),
  // Blue team: Y=356
  ...shipFrames('blue', 356),
  // Yellow team: Y=388
  ...shipFrames('yellow', 388),

  // --- Flags — 16x16 per team ---
  { id: 'flag_green',  label: 'Flag Green',  x: 288, y: 308, width: 16, height: 16, category: 'flags' },
  { id: 'flag_red',    label: 'Flag Red',    x: 288, y: 340, width: 16, height: 16, category: 'flags' },
  { id: 'flag_blue',   label: 'Flag Blue',   x: 288, y: 372, width: 16, height: 16, category: 'flags' },
  { id: 'flag_yellow', label: 'Flag Yellow', x: 288, y: 404, width: 16, height: 16, category: 'flags' },
  { id: 'flag_white',  label: 'Flag White',  x: 288, y: 436, width: 16, height: 16, category: 'flags' },

  // --- Powerups — 24x23 frames ---
  { id: 'pu_wrench',  label: 'Wrench (6f)',  x: 0, y: 423, width: 144, height: 23, category: 'powerups' },
  { id: 'pu_missile', label: 'Missile (12f)', x: 0, y: 447, width: 288, height: 23, category: 'powerups' },
  { id: 'pu_grenade', label: 'Grenade (12f)', x: 0, y: 471, width: 288, height: 23, category: 'powerups' },
  { id: 'pu_bouncy',  label: 'Bouncy (12f)',  x: 0, y: 494, width: 288, height: 23, category: 'powerups' },

  // --- Weapons / Projectiles ---
  { id: 'grenade_proj', label: 'Grenade (5f)', x: 0,  y: 580, width: 80,  height: 16, category: 'weapons' },
  { id: 'missile_tip',  label: 'Missile Tip',  x: 10, y: 757, width: 3,   height: 3,  category: 'weapons' },
  { id: 'shrapnel',     label: 'Shrapnel',     x: 3,  y: 756, width: 5,   height: 5,  category: 'weapons' },

  // --- Effects ---
  { id: 'smoke',          label: 'Smoke (9f)',         x: 0, y: 596, width: 190, height: 24, category: 'effects' },
  { id: 'trail_gren_g',   label: 'Trail Gren Green',   x: 0, y: 614, width: 190, height: 17, category: 'effects' },
  { id: 'trail_gren_r',   label: 'Trail Gren Red',     x: 0, y: 631, width: 190, height: 17, category: 'effects' },
  { id: 'trail_gren_b',   label: 'Trail Gren Blue',    x: 0, y: 648, width: 190, height: 17, category: 'effects' },
  { id: 'trail_gren_y',   label: 'Trail Gren Yellow',  x: 0, y: 665, width: 190, height: 17, category: 'effects' },
  { id: 'trail_miss_g',   label: 'Trail Miss Green',   x: 0, y: 686, width: 100, height: 16, category: 'effects' },
  { id: 'trail_miss_r',   label: 'Trail Miss Red',     x: 90, y: 686, width: 100, height: 16, category: 'effects' },
  { id: 'trail_miss_b',   label: 'Trail Miss Blue',    x: 0, y: 696, width: 100, height: 16, category: 'effects' },
  { id: 'trail_miss_y',   label: 'Trail Miss Yellow',  x: 90, y: 696, width: 100, height: 16, category: 'effects' },
  { id: 'expl_small',     label: 'Explosion Small (9f)', x: 0, y: 714, width: 190, height: 24, category: 'effects' },
  { id: 'expl_medium',    label: 'Explosion Med (10f)',  x: 0, y: 786, width: 322, height: 88, category: 'effects' },
  { id: 'expl_large',     label: 'Explosion Lrg (20f)',  x: 0, y: 886, width: 320, height: 260, category: 'effects' },

  // --- Panel / HUD ---
  { id: 'radar_box',    label: 'Radar Box',     x: 594, y: 507, width: 46,  height: 46,  category: 'panel' },
  { id: 'bar_energy',   label: 'Energy Bar',    x: 572, y: 564, width: 34,  height: 10,  category: 'panel' },
  { id: 'bar_health',   label: 'Health Bar',    x: 606, y: 564, width: 34,  height: 10,  category: 'panel' },
  { id: 'panel_bg',     label: 'Panel BG',      x: 527, y: 260, width: 113, height: 100, category: 'panel' },
  { id: 'health_bar_bg', label: 'Health Bar BG', x: 527, y: 360, width: 113, height: 15, category: 'panel' },
  { id: 'team_scores',  label: 'Team Scores',   x: 527, y: 375, width: 113, height: 26,  category: 'panel' },
  { id: 'panel_border', label: 'Panel Border',  x: 527, y: 452, width: 113, height: 4,   category: 'panel' },
  { id: 'wpn_bg',       label: 'Weapon BG',     x: 602, y: 640, width: 38,  height: 72,  category: 'panel' },
  { id: 'wpn_laser',    label: 'Laser Sel',     x: 564, y: 640, width: 38,  height: 24,  category: 'panel' },
  { id: 'wpn_missile',  label: 'Missile Sel',   x: 564, y: 664, width: 38,  height: 24,  category: 'panel' },
  { id: 'wpn_bouncy',   label: 'Bouncy Sel',    x: 564, y: 688, width: 38,  height: 24,  category: 'panel' },
  { id: 'flag_drop',    label: 'Flag Drop Btn', x: 614, y: 863, width: 23,  height: 28,  category: 'panel' },
];

/** Generate ship frame regions for a team */
function shipFrames(team: string, y: number): SpriteRegion[] {
  const dirs = ['Right', 'Up-Right', 'Up', 'Up-Left', 'Left', 'Down-Left', 'Down', 'Down-Right', 'Idle'];
  return dirs.map((dir, i) => ({
    id: `ship_${team}_${i}`,
    label: `${team[0].toUpperCase()}${team.slice(1)} ${dir}`,
    x: i * 32,
    y,
    width: 32,
    height: 32,
    category: 'ships',
  }));
}
