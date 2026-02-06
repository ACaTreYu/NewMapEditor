/**
 * Parser for SEdit custom.dat binary format
 * Populates mutable arrays in GameObjectData
 */

import {
  setBridgeLrData,
  setBridgeUdData,
  setSpawnData,
  setSwitchData,
  setConvLrData,
  setConvUdData
} from './GameObjectData';

// Block type mapping from custom.dat
const BLOCK_TYPE = {
  WALL: 0,
  BRIDGE_LR: 1,
  FLAG: 2,
  BUNKER: 3,
  POLE: 4,
  SPAWN: 5,
  BRIDGE_UD: 6,
  SWITCH: 7,
  CONV_LR: 8,
  CONV_UD: 9,
} as const;

// Version header bytes
const VERSION_HEADER = [0x07, 0x01, 0x02];

export interface CustomDatResult {
  success: boolean;
  error?: string;
}

export function parseCustomDat(buffer: ArrayBuffer): CustomDatResult {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // Version check
  if (buffer.byteLength < 3) {
    return { success: false, error: 'File too small' };
  }

  if (bytes[0] !== VERSION_HEADER[0] ||
      bytes[1] !== VERSION_HEADER[1] ||
      bytes[2] !== VERSION_HEADER[2]) {
    return { success: false, error: 'Invalid custom.dat version header' };
  }

  let offset = 3;
  const bridgeLr: number[] = new Array(15).fill(0);
  const bridgeUd: number[] = new Array(15).fill(0);
  const spawnArr: number[][] = [];
  const switchArr: number[][] = [];
  const convLr: number[] = new Array(8).fill(0);
  const convUd: number[] = new Array(8).fill(0);

  // Initialize spawn data slots
  for (let i = 0; i < 12; i++) {
    spawnArr.push(new Array(9).fill(0));
  }

  while (offset < buffer.byteLength - 1) {
    if (offset + 2 > buffer.byteLength) break;

    const blockType = bytes[offset];
    const count = bytes[offset + 1];
    offset += 2;

    // Each entry is count * 16 int32 values (count * 16 * 4 bytes)
    const dataSize = count * 16 * 4;
    if (offset + dataSize > buffer.byteLength) break;

    // Read int32 array
    const values: number[] = [];
    for (let i = 0; i < count * 16; i++) {
      if (offset + 4 <= buffer.byteLength) {
        values.push(view.getInt32(offset, true)); // little-endian
        offset += 4;
      }
    }

    switch (blockType) {
      case BLOCK_TYPE.BRIDGE_LR:
        for (let i = 0; i < Math.min(15, values.length); i++) {
          bridgeLr[i] = values[i];
        }
        break;

      case BLOCK_TYPE.BRIDGE_UD:
        for (let i = 0; i < Math.min(15, values.length); i++) {
          bridgeUd[i] = values[i];
        }
        break;

      case BLOCK_TYPE.SPAWN:
        // Each spawn entry is 16 values, but we only use first 9 (3x3)
        for (let e = 0; e < count && e < 12; e++) {
          for (let i = 0; i < 9; i++) {
            spawnArr[e][i] = values[e * 16 + i];
          }
        }
        break;

      case BLOCK_TYPE.SWITCH:
        // Variable count
        switchArr.length = 0;
        for (let e = 0; e < count; e++) {
          const entry: number[] = [];
          for (let i = 0; i < 9; i++) {
            entry.push(values[e * 16 + i]);
          }
          switchArr.push(entry);
        }
        break;

      case BLOCK_TYPE.CONV_LR:
        for (let i = 0; i < Math.min(8, values.length); i++) {
          convLr[i] = values[i];
        }
        break;

      case BLOCK_TYPE.CONV_UD:
        for (let i = 0; i < Math.min(8, values.length); i++) {
          convUd[i] = values[i];
        }
        break;

      // WALL, FLAG, BUNKER, POLE - these use hardcoded data, skip
      default:
        break;
    }
  }

  // Populate mutable arrays
  setBridgeLrData([bridgeLr]);
  setBridgeUdData([bridgeUd]);
  setSpawnData(spawnArr);
  if (switchArr.length > 0) {
    setSwitchData(switchArr);
  }
  setConvLrData([convLr]);
  setConvUdData([convUd]);

  return { success: true };
}
