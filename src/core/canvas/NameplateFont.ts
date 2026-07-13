/**
 * Ship sticker nameplates — 1:1 with the game's in-world player nameplates,
 * including the player's own in-game font settings from ~/.armorcritical/user.json.
 *
 * Source of truth (reference/ac-source):
 * - NormalMode.drawPlayerName: name centered on shipTopLeftX + 15, drawn at
 *   shipTopLeftY + 36, default color rgb(222, 170, 0), full alpha.
 * - LibGDXResources: fontFamily "Exo2" -> Exo2-<chatFontWeight>.ttf at base 10
 *   x scaleMultiplier(exo2NameScale); fontFamily "ARC" -> ARCName01.ttf at
 *   base 10 x arcNameMultiplier(arcNameScale).
 * - LibGDXEngine.flush: drop shadow = black at (+1, +1) px, same alpha
 *   (fontChatShadow).
 */

import exo2LightUrl from '../../assets/fonts/Exo2-Light.ttf';
import exo2RegularUrl from '../../assets/fonts/Exo2-Regular.ttf';
import exo2MediumUrl from '../../assets/fonts/Exo2-Medium.ttf';
import exo2SemiBoldUrl from '../../assets/fonts/Exo2-SemiBold.ttf';
import exo2BoldUrl from '../../assets/fonts/Exo2-Bold.ttf';
import arcName01Url from '../../assets/fonts/ARCName01.ttf';

export const NAMEPLATE_FONT_SIZE = 10;        // game base size, map-pixel units
export const NAMEPLATE_COLOR = 'rgb(222, 170, 0)';
export const NAMEPLATE_CENTER_X = 15;         // px from sticker left to name center
export const NAMEPLATE_TOP_Y = 36;            // px from sticker top to text top

// Exo2 weight files keyed by the game's chatFontWeight option
const EXO2_WEIGHTS: Record<string, { url: string; family: string }> = {
  'Light':     { url: exo2LightUrl,    family: 'AC-Nameplate-Exo2-Light' },
  'Normal':    { url: exo2RegularUrl,  family: 'AC-Nameplate-Exo2-Regular' },
  'Medium':    { url: exo2MediumUrl,   family: 'AC-Nameplate-Exo2-Medium' },
  'Semi-Bold': { url: exo2SemiBoldUrl, family: 'AC-Nameplate-Exo2-SemiBold' },
  'Bold':      { url: exo2BoldUrl,     family: 'AC-Nameplate-Exo2-Bold' },
};

const ARC_FONT = { url: arcName01Url, family: 'AC-Nameplate-ARC' };

// LibGDXResources.scaleMultiplier (Exo2 nameplates; smallest = 0.58)
function exo2NameMultiplier(level: string | undefined): number {
  switch (level) {
    case 'Smallest': return 0.58;
    case 'Small':    return 0.75;
    case 'Large':    return 1.25;
    case 'Largest':  return 1.5;
    default:         return 1.0; // 'Normal'
  }
}

// LibGDXResources.arcNameMultiplier (ARCName01 reads large; centered on 0.58)
function arcNameMultiplier(level: string | undefined): number {
  switch (level) {
    case 'Smallest': return 0.40;
    case 'Small':    return 0.48;
    case 'Large':    return 0.70;
    case 'Largest':  return 0.84;
    default:         return 0.58; // 'Normal'
  }
}

export interface GameFontSettings {
  fontFamily?: string;      // 'Exo2' | 'ARC'
  chatFontWeight?: string;  // Exo2 weight: Light/Normal/Medium/Semi-Bold/Bold
  exo2NameScale?: string;   // Smallest/Small/Normal/Large/Largest
  arcNameScale?: string;
  fontChatShadow?: boolean;
}

// Active nameplate config — game defaults (Exo2 Semi-Bold, Normal, shadow on)
let activeFont = EXO2_WEIGHTS['Semi-Bold'];
let activeSizeMul = 1.0;
let activeShadow = true;

const loadedFamilies = new Set<string>();

function registerFont(font: { url: string; family: string }): void {
  if (loadedFamilies.has(font.family) || typeof FontFace === 'undefined') return;
  loadedFamilies.add(font.family);
  const face = new FontFace(font.family, `url(${font.url})`);
  face.load()
    .then((f) => (document.fonts as any).add(f))
    .catch((err) => console.warn(`Nameplate font ${font.family} failed to load:`, err));
}

/** Load the currently-configured nameplate font into document.fonts (idempotent). */
export function loadNameplateFont(): void {
  registerFont(activeFont);
}

/**
 * Apply the player's in-game font settings (gameoptions from user.json).
 * Falls back to game defaults for any missing key.
 */
export function configureNameplateFromGameSettings(opts: GameFontSettings): void {
  const arc = opts.fontFamily === 'ARC';
  if (arc) {
    activeFont = ARC_FONT;
    activeSizeMul = arcNameMultiplier(opts.arcNameScale);
  } else {
    activeFont = EXO2_WEIGHTS[opts.chatFontWeight ?? 'Semi-Bold'] ?? EXO2_WEIGHTS['Semi-Bold'];
    activeSizeMul = exo2NameMultiplier(opts.exo2NameScale);
  }
  activeShadow = opts.fontChatShadow !== false;
  registerFont(activeFont);
}

/**
 * Draw a sticker nameplate exactly like the game draws player names.
 * (stickerX, stickerY) is the sticker's top-left in CANVAS pixels; scale is
 * the map-pixel -> canvas-pixel factor (viewport zoom, or 1 for exports).
 */
export function drawNameplate(
  ctx: CanvasRenderingContext2D,
  name: string,
  stickerX: number,
  stickerY: number,
  scale: number,
): void {
  if (!name) return;
  ctx.save();
  ctx.font = `${NAMEPLATE_FONT_SIZE * activeSizeMul * scale}px "${activeFont.family}", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const cx = stickerX + NAMEPLATE_CENTER_X * scale;
  const ty = stickerY + NAMEPLATE_TOP_Y * scale;
  if (activeShadow) {
    // Game drop shadow: black, +1px screen offset, same alpha as the text
    ctx.fillStyle = '#000';
    ctx.fillText(name, cx + 1, ty + 1);
  }
  ctx.fillStyle = NAMEPLATE_COLOR;
  ctx.fillText(name, cx, ty);
  ctx.restore();
}
