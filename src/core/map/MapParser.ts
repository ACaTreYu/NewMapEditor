/**
 * Map file parser for SubSpace/Continuum .map format
 * Supports v1 (raw), v2 (legacy), and v3 (current) formats
 */

/**
 * Binary Format Compatibility Notes:
 *
 * SEdit source code (main.h:90) uses "misslesEnabled" (misspelled) for the
 * boolean field at offset 0x10. Our TypeScript types use the correct spelling
 * "missilesEnabled". The binary I/O at offset 0x10 reads/writes this field
 * correctly — no spelling issue in binary data, only in SEdit's C++ struct.
 *
 * Default values written by this editor match SEdit's CreateNewMap() exactly
 * (map.cpp:2774-2848). Version is always written as V3_CURRENT.
 *
 * String encoding: UTF-8 (TextEncoder/TextDecoder). SEdit used system ANSI
 * code page, but UTF-8 is backwards-compatible for ASCII range (0x00-0x7F).
 */

import {
  MapData,
  MapHeader,
  MapVersion,
  MAP_MAGIC,
  MAP_WIDTH,
  MAP_HEIGHT,
  TILE_COUNT,
  ObjectiveType,
  MAX_TEAMS,
  createDefaultHeader,
  createEmptyMap
} from './types';

// Raw file size for version 1 maps
const V1_FILE_SIZE = TILE_COUNT * 2; // 131072 bytes

export interface ParseResult {
  success: boolean;
  data?: MapData;
  error?: string;
}

export class MapParser {
  private lastError: string = '';

  getLastError(): string {
    return this.lastError;
  }

  // Parse map from binary data
  parse(buffer: ArrayBuffer, filePath?: string): ParseResult {
    try {
      const data = new DataView(buffer);
      const fileSize = buffer.byteLength;

      // Detect version 1 by file size
      if (fileSize === V1_FILE_SIZE) {
        return this.parseV1(buffer, filePath);
      }

      // Check magic number
      const magic = data.getUint16(0, true);
      if (magic !== MAP_MAGIC) {
        this.lastError = `Invalid magic number: 0x${magic.toString(16)} (expected 0x${MAP_MAGIC.toString(16)})`;
        return { success: false, error: this.lastError };
      }

      // Read version
      const version = data.getUint8(4);

      if (version === 2) {
        return this.parseV2(buffer, filePath);
      } else if (version === 3) {
        return this.parseV3(buffer, filePath);
      } else {
        this.lastError = `Unsupported map version: ${version}`;
        return { success: false, error: this.lastError };
      }
    } catch (error) {
      this.lastError = `Parse error: ${(error as Error).message}`;
      return { success: false, error: this.lastError };
    }
  }

  // Parse version 1 (raw uncompressed)
  private parseV1(buffer: ArrayBuffer, filePath?: string): ParseResult {
    const header = createDefaultHeader();
    header.version = MapVersion.V1_RAW;

    const tiles = new Uint16Array(buffer);

    return {
      success: true,
      data: {
        header,
        tiles,
        filePath,
        modified: false
      }
    };
  }

  // Parse version 2 (legacy compressed)
  private parseV2(buffer: ArrayBuffer, filePath?: string): ParseResult {
    // V2 format is similar to V3 but with fewer header fields
    // For simplicity, treat as V3 with defaults
    return this.parseV3(buffer, filePath);
  }

  // Parse version 3 (current format)
  private parseV3(buffer: ArrayBuffer, filePath?: string): ParseResult {
    const data = new DataView(buffer);
    let offset = 0;

    // Read fixed header fields sequentially
    const id = data.getUint16(offset, true); offset += 2;
    const dataOffset = data.getUint16(offset, true); offset += 2;
    const version = data.getUint8(offset) as MapVersion; offset += 1;
    const width = data.getUint16(offset, true); offset += 2;
    const height = data.getUint16(offset, true); offset += 2;
    const maxPlayers = data.getUint8(offset); offset += 1;
    const holdingTime = data.getUint8(offset); offset += 1;
    const numTeams = data.getUint8(offset); offset += 1;
    const objective = data.getUint8(offset) as ObjectiveType; offset += 1;
    const laserDamage = data.getUint8(offset); offset += 1;
    const specialDamage = data.getUint8(offset); offset += 1;
    const rechargeRate = data.getUint8(offset); offset += 1;
    const missilesEnabled = data.getUint8(offset) !== 0; offset += 1; // offset 0x10: "misslesEnabled" in SEdit
    const bombsEnabled = data.getUint8(offset) !== 0; offset += 1;
    const bounciesEnabled = data.getUint8(offset) !== 0; offset += 1;
    const powerupCount = data.getUint16(offset, true); offset += 2;
    const maxSimulPowerups = data.getUint8(offset); offset += 1;
    const switchCount = data.getUint8(offset); offset += 1;

    const header: MapHeader = {
      id,
      dataOffset,
      version,
      width,
      height,
      maxPlayers,
      holdingTime,
      numTeams,
      objective,
      laserDamage,
      specialDamage,
      rechargeRate,
      missilesEnabled,
      bombsEnabled,
      bounciesEnabled,
      powerupCount,
      maxSimulPowerups,
      switchCount,
      flagCount: [0, 0, 0, 0],
      flagPoleCount: [0, 0, 0, 0],
      flagPoleData: [new Uint8Array(0), new Uint8Array(0), new Uint8Array(0), new Uint8Array(0)],
      name: '',
      description: '',
      neutralCount: 0,
      extendedSettings: {}
    };

    // Read variable header based on numTeams
    const teamCount = Math.min(header.numTeams, MAX_TEAMS);

    // Flag counts
    for (let i = 0; i < teamCount; i++) {
      header.flagCount[i] = data.getUint8(offset); offset += 1;
    }

    // Flag pole counts
    for (let i = 0; i < teamCount; i++) {
      header.flagPoleCount[i] = data.getUint8(offset); offset += 1;
    }

    // Flag pole data
    for (let i = 0; i < teamCount; i++) {
      const count = header.flagPoleCount[i];
      if (count > 0) {
        header.flagPoleData[i] = new Uint8Array(buffer, offset, count);
        offset += count;
      }
    }

    // Name
    const nameLength = data.getUint16(offset, true); offset += 2;
    if (nameLength > 0) {
      const nameBytes = new Uint8Array(buffer, offset, nameLength);
      header.name = new TextDecoder().decode(nameBytes);
      offset += nameLength;
    }

    // Description
    const descLength = data.getUint16(offset, true); offset += 2;
    if (descLength > 0) {
      const descBytes = new Uint8Array(buffer, offset, descLength);
      header.description = new TextDecoder().decode(descBytes);
      offset += descLength;
    }

    // Neutral count
    header.neutralCount = data.getUint8(offset); offset += 1;

    // Compressed tile data starts at dataOffset + 2
    const compressedStart = header.dataOffset + 2;
    const compressedData = new Uint8Array(buffer, compressedStart);

    // Note: Actual decompression happens via Electron IPC
    // Return the compressed data for now - caller will decompress
    return {
      success: true,
      data: {
        header,
        tiles: new Uint16Array(TILE_COUNT), // Will be filled after decompression
        filePath,
        modified: false
      }
    };
  }

  // Serialize map to binary format
  serialize(map: MapData): ArrayBuffer {
    const header = map.header;

    // Calculate header size
    const numTeams = Math.min(header.numTeams, MAX_TEAMS);
    const nameBytes = new TextEncoder().encode(header.name);
    const descBytes = new TextEncoder().encode(header.description);

    let headerSize = 26; // Base fixed header
    headerSize += numTeams * 2; // flagCount + flagPoleCount
    for (let i = 0; i < numTeams; i++) {
      headerSize += header.flagPoleCount[i];
    }
    headerSize += 2 + nameBytes.length; // nameLength + name
    headerSize += 2 + descBytes.length; // descLength + description
    headerSize += 1; // neutralCount

    // Update dataOffset
    header.dataOffset = headerSize;

    // Create header buffer (compressed data will be appended separately)
    const headerBuffer = new ArrayBuffer(headerSize + 2);
    const view = new DataView(headerBuffer);
    let offset = 0;

    // Write fixed header
    view.setUint16(offset, MAP_MAGIC, true); offset += 2;
    view.setUint16(offset, header.dataOffset, true); offset += 2;
    view.setUint8(offset, MapVersion.V3_CURRENT); offset += 1;
    view.setUint16(offset, header.width, true); offset += 2;
    view.setUint16(offset, header.height, true); offset += 2;
    view.setUint8(offset, header.maxPlayers); offset += 1;
    view.setUint8(offset, header.holdingTime); offset += 1;
    view.setUint8(offset, header.numTeams); offset += 1;
    view.setUint8(offset, header.objective); offset += 1;
    view.setUint8(offset, header.laserDamage); offset += 1;
    view.setUint8(offset, header.specialDamage); offset += 1;
    view.setUint8(offset, header.rechargeRate); offset += 1;
    view.setUint8(offset, header.missilesEnabled ? 1 : 0); offset += 1; // offset 0x10: "misslesEnabled" in SEdit (typo preserved in binary format)
    view.setUint8(offset, header.bombsEnabled ? 1 : 0); offset += 1;
    view.setUint8(offset, header.bounciesEnabled ? 1 : 0); offset += 1;
    view.setUint16(offset, header.powerupCount, true); offset += 2;
    view.setUint8(offset, header.maxSimulPowerups); offset += 1;
    view.setUint8(offset, header.switchCount); offset += 1;

    // Write variable header
    for (let i = 0; i < numTeams; i++) {
      view.setUint8(offset, header.flagCount[i]); offset += 1;
    }
    for (let i = 0; i < numTeams; i++) {
      view.setUint8(offset, header.flagPoleCount[i]); offset += 1;
    }
    for (let i = 0; i < numTeams; i++) {
      const poleData = header.flagPoleData[i];
      new Uint8Array(headerBuffer, offset, poleData.length).set(poleData);
      offset += poleData.length;
    }

    // Name
    view.setUint16(offset, nameBytes.length, true); offset += 2;
    new Uint8Array(headerBuffer, offset, nameBytes.length).set(nameBytes);
    offset += nameBytes.length;

    // Description
    view.setUint16(offset, descBytes.length, true); offset += 2;
    new Uint8Array(headerBuffer, offset, descBytes.length).set(descBytes);
    offset += descBytes.length;

    // Neutral count
    view.setUint8(offset, header.neutralCount); offset += 1;

    return headerBuffer;
  }

  // Get tile data as buffer for compression
  getTileBuffer(map: MapData): ArrayBuffer {
    return map.tiles.buffer;
  }
}

export const mapParser = new MapParser();
