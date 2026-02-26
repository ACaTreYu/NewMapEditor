/**
 * Extract animation data from Gfx.dll
 *
 * Animation structure (66 bytes each):
 * - frameCount: 1 byte (BYTE)
 * - speed: 1 byte (BYTE)
 * - frames: 64 bytes (32 x WORD, little-endian)
 *
 * Location in Gfx.dll: offset 0x642E0
 * Total: 256 animations
 */

const fs = require('fs');
const path = require('path');

const GFX_DLL_PATH = 'E:\\SEdit SRC Analysis\\SeditSource\\sedit_src\\Gfx.dll';
const ANIMATION_OFFSET = 0x642E0;
const ANIMATION_COUNT = 256;
const ANIMATION_SIZE = 66; // 1 + 1 + 64 bytes

function extractAnimations() {
  console.log('Reading Gfx.dll...');

  const buffer = fs.readFileSync(GFX_DLL_PATH);
  console.log(`File size: ${buffer.length} bytes`);
  console.log(`Animation data offset: 0x${ANIMATION_OFFSET.toString(16)} (${ANIMATION_OFFSET})`);

  const animations = [];

  for (let i = 0; i < ANIMATION_COUNT; i++) {
    const offset = ANIMATION_OFFSET + (i * ANIMATION_SIZE);

    let frameCount = buffer.readUInt8(offset);
    let speed = buffer.readUInt8(offset + 1);

    // Apply same logic as original C code
    if (speed === 0) speed = 255;
    if (frameCount === 0) frameCount = 1;

    // Read frame tile IDs (32 WORDs, but only frameCount are valid)
    const frames = [];
    for (let f = 0; f < frameCount; f++) {
      const frameOffset = offset + 2 + (f * 2);
      const tileId = buffer.readUInt16LE(frameOffset);
      frames.push(tileId);
    }

    animations.push({
      id: i,
      hex: `0x${i.toString(16).toUpperCase().padStart(2, '0')}`,
      frameCount,
      speed,
      frames
    });
  }

  return animations;
}

function generateTypeScript(animations) {
  const lines = [];

  lines.push(`/**
 * Animation definitions extracted from Gfx.dll
 * Auto-generated - do not edit manually
 *
 * Source: Gfx.dll at offset 0x642E0
 * Generated: ${new Date().toISOString()}
 */

import { Animation } from './types';

export interface AnimationDefinition extends Animation {
  name: string;
}

/**
 * All 256 animation definitions (0x00-0xFF)
 * Entries with empty frames[] are undefined/unused animations
 */
export const ANIMATION_DEFINITIONS: AnimationDefinition[] = [`);

  for (const anim of animations) {
    const framesStr = anim.frames.length > 0
      ? `[${anim.frames.join(', ')}]`
      : '[]';

    // Try to identify animation by its characteristics
    const name = identifyAnimation(anim);

    lines.push(`  { id: ${anim.hex}, name: '${name}', frames: ${framesStr}, frameCount: ${anim.frameCount}, speed: ${anim.speed} },`);
  }

  lines.push(`];

/**
 * Get animation by ID
 */
export function getAnimationById(id: number): AnimationDefinition | undefined {
  if (id < 0 || id > 255) return undefined;
  return ANIMATION_DEFINITIONS[id];
}

/**
 * Get all defined (non-empty) animations
 */
export function getDefinedAnimations(): AnimationDefinition[] {
  return ANIMATION_DEFINITIONS.filter(a => a.frames.length > 0);
}

/**
 * Check if an animation ID has frame data
 */
export function isAnimationDefined(id: number): boolean {
  const anim = getAnimationById(id);
  return anim !== undefined && anim.frames.length > 0;
}
`);

  return lines.join('\n');
}

function identifyAnimation(anim) {
  // Known animation names from documentation
  const knownNames = {
    0x00: 'Anim Wall TL',
    0x01: 'Anim Wall TR',
    0x02: 'Anim Wall BL',
    0x03: 'Anim Wall BR',
    0x04: 'Red Spawn N',
    0x05: 'Red Spawn E',
    0x06: 'Red Spawn W',
    0x07: 'Red Spawn S',
    0x08: 'Green Spawn N',
    0x09: 'Green Spawn E',
    0x0A: 'Green Spawn W',
    0x0B: 'Green Spawn S',
    0x0C: 'Health Regen 1',
    0x0D: 'Health Regen 2',
    0x18: 'Green Pad GreenFlag Unsec',
    0x19: 'Green Pad RedFlag Unsec',
    0x1A: 'Green Pad BlueFlag Unsec',
    0x1B: 'Green Pad YellowFlag Unsec',
    0x1C: 'Green Pad GreenFlag Sec',
    0x1D: 'Green Pad RedFlag Sec',
    0x1E: 'Green Pad BlueFlag Sec',
    0x1F: 'Green Pad YellowFlag Sec',
    0x20: 'Red Pad GreenFlag Unsec',
    0x21: 'Red Pad RedFlag Unsec',
    0x22: 'Red Pad BlueFlag Unsec',
    0x23: 'Red Pad YellowFlag Unsec',
    0x24: 'Red Pad GreenFlag Sec',
    0x25: 'Red Pad RedFlag Sec',
    0x26: 'Red Pad BlueFlag Sec',
    0x27: 'Red Pad YellowFlag Sec',
    0x28: 'Blue Pad GreenFlag Unsec',
    0x29: 'Blue Pad RedFlag Unsec',
    0x2A: 'Blue Pad BlueFlag Unsec',
    0x2B: 'Blue Pad YellowFlag Unsec',
    0x2C: 'Blue Pad GreenFlag Sec',
    0x2D: 'Blue Pad RedFlag Sec',
    0x2E: 'Blue Pad BlueFlag Sec',
    0x2F: 'Blue Pad YellowFlag Sec',
    0x32: 'Blue Spawn N',
    0x33: 'Blue Spawn E',
    0x34: 'Blue Spawn W',
    0x35: 'Blue Spawn S',
    0x36: 'Yellow Spawn N',
    0x37: 'Yellow Spawn E',
    0x38: 'Yellow Spawn W',
    0x39: 'Yellow Spawn S',
    0x3A: 'Yellow Pad GreenFlag Unsec',
    0x3B: 'Yellow Pad RedFlag Unsec',
    0x3C: 'Yellow Pad BlueFlag Unsec',
    0x3D: 'Yellow Pad YellowFlag Unsec',
    0x3E: 'Yellow Pad GreenFlag Sec',
    0x3F: 'Yellow Pad RedFlag Sec',
    0x40: 'Yellow Pad BlueFlag Sec',
    0x41: 'Yellow Pad YellowFlag Sec',
    0x42: 'Green Cap Pad TL',
    0x43: 'Green Cap Pad TM',
    0x44: 'Green Cap Pad TR',
    0x45: 'Green Cap Pad ML',
    0x46: 'Green Cap Pad MM',
    0x47: 'Green Cap Pad MR',
    0x48: 'Green Cap Pad BL',
    0x49: 'Green Cap Pad BM',
    0x4A: 'Green Cap Pad BR',
    0x4B: 'Red Cap Pad TL',
    0x4C: 'Red Cap Pad TM',
    0x4D: 'Red Cap Pad TR',
    0x4E: 'Red Cap Pad ML',
    0x4F: 'Red Cap Pad MM',
    0x50: 'Red Cap Pad MR',
    0x51: 'Red Cap Pad BL',
    0x52: 'Red Cap Pad BM',
    0x53: 'Red Cap Pad BR',
    0x54: 'Blue Cap Pad TL',
    0x55: 'Blue Cap Pad TM',
    0x56: 'Blue Cap Pad TR',
    0x57: 'Blue Cap Pad ML',
    0x58: 'Blue Cap Pad MM',
    0x59: 'Blue Cap Pad MR',
    0x5A: 'Blue Cap Pad BL',
    0x5B: 'Blue Cap Pad BM',
    0x5C: 'Blue Cap Pad BR',
    0x5D: 'Yellow Cap Pad TL',
    0x5E: 'Yellow Cap Pad TM',
    0x5F: 'Yellow Cap Pad TR',
    0x60: 'Yellow Cap Pad ML',
    0x61: 'Yellow Cap Pad MM',
    0x62: 'Yellow Cap Pad MR',
    0x63: 'Yellow Cap Pad BL',
    0x64: 'Yellow Cap Pad BM',
    0x65: 'Yellow Cap Pad BR',
    0x66: 'Neutral Cap Pad TL',
    0x67: 'Neutral Cap Pad TM',
    0x68: 'Neutral Cap Pad TR',
    0x69: 'Neutral Cap Pad ML',
    0x6A: 'Neutral Cap Pad MM',
    0x6B: 'Neutral Cap Pad MR',
    0x6C: 'Neutral Cap Pad BL',
    0x6D: 'Neutral Cap Pad BM',
    0x6E: 'Neutral Cap Pad BR',
    0x6F: 'EnergyField LR Gate',
    0x70: 'EnergyField R End',
    0x71: 'EnergyField L End',
    0x74: 'EnergyField Bot End',
    0x75: 'EnergyField Top End',
    0x76: 'EnergyField UD Gate',
    0x7B: 'Switch Unflipped',
    0x7C: 'Switch Green Flipped',
    0x7D: 'Switch Red Flipped',
    0x7E: 'Switch Blue Flipped',
    0x7F: 'Switch Yellow Flipped',
    0x80: 'Green Pad NeutralFlag Unsec',
    0x81: 'Red Pad NeutralFlag Unsec',
    0x82: 'Blue Pad NeutralFlag Unsec',
    0x83: 'Yellow Pad NeutralFlag Unsec',
    0x84: 'NeutralFlag in Green Holder',
    0x85: 'NeutralFlag in Red Holder',
    0x86: 'NeutralFlag in Blue Holder',
    0x87: 'NeutralFlag in Yellow Holder',
    0x88: 'Neutral Pad NeutralFlag',
    0x8B: 'Spawn Into Map',
    0x8C: 'White Flag',
    0x8D: 'Green Spawn HoldingPen',
    0x8E: 'Red Spawn HoldingPen',
    0x8F: 'Blue Spawn HoldingPen',
    0x90: 'Yellow Spawn HoldingPen',
    0x9A: 'BigWarp TL',
    0x9B: 'BigWarp TM',
    0x9C: 'BigWarp TR',
    0x9D: 'BigWarp ML',
    0x9E: 'BigWarp MM',
    0x9F: 'BigWarp MR',
    0xA0: 'BigWarp BL',
    0xA1: 'BigWarp BM',
    0xA2: 'BigWarp BR',
    0xA3: 'Green OnMapSpawn',
    0xA4: 'Red OnMapSpawn',
    0xA5: 'Blue OnMapSpawn',
    0xA6: 'Yellow OnMapSpawn',
    0xBD: 'Turret',
    0xF6: 'Warp F6',
    0xF7: 'Warp F7',
    0xF8: 'Warp F8',
    0xF9: 'Warp F9',
    0xFA: 'Warp FA',
  };

  if (knownNames[anim.id]) {
    return knownNames[anim.id];
  }

  // If no frames, mark as unused
  if (anim.frames.length === 0 || (anim.frames.length === 1 && anim.frames[0] === 0)) {
    return `Unused ${anim.hex}`;
  }

  return `Animation ${anim.hex}`;
}

function generateJSON(animations) {
  return JSON.stringify(animations, null, 2);
}

// Main
try {
  const animations = extractAnimations();

  // Count defined animations
  const defined = animations.filter(a => a.frames.length > 0 && !(a.frames.length === 1 && a.frames[0] === 0));
  console.log(`\nExtracted ${ANIMATION_COUNT} animations (${defined.length} with frame data)`);

  // Save JSON for inspection
  const jsonPath = path.join(__dirname, 'animations-extracted.json');
  fs.writeFileSync(jsonPath, generateJSON(animations));
  console.log(`Saved JSON to: ${jsonPath}`);

  // Generate TypeScript
  const tsContent = generateTypeScript(animations);
  const tsPath = path.join(__dirname, '..', 'src', 'core', 'map', 'AnimationDefinitions.generated.ts');
  fs.writeFileSync(tsPath, tsContent);
  console.log(`Saved TypeScript to: ${tsPath}`);

  // Print a few samples
  console.log('\nSample animations:');
  console.log('Animation 0x00:', animations[0]);
  console.log('Animation 0x8C (140):', animations[0x8C]);

} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
