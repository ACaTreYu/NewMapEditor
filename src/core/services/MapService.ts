/**
 * MapService: Business logic for map loading and saving
 *
 * Extracts map file I/O logic from components, using FileService
 * for platform-agnostic file operations. Handles all map format
 * versions (v1 raw, v2 legacy, v3 compressed).
 */

import { MapData } from '../map/types';
import { mapParser } from '../map/MapParser';
import { FileService } from './FileService';
import { mergeDescriptionWithHeader, parseDescription, reserializeDescription } from '../map/settingsSerializer';
import { getDefaultSettings } from '../map/GameSettings';

export interface MapLoadResult {
  success: boolean;
  map?: MapData;
  filePath?: string;
  error?: string;
}

export interface MapSaveResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

export class MapService {
  constructor(private fileService: FileService) {}

  /**
   * Load a map from the filesystem
   * Prompts user with file dialog, reads file, parses header,
   * and decompresses tile data if needed (v3 maps).
   */
  async loadMap(): Promise<MapLoadResult> {
    // 1. Show file picker dialog
    const dialogResult = await this.fileService.openMapDialog();
    if (dialogResult.canceled || !dialogResult.filePath) {
      return { success: false, error: 'canceled' };
    }

    const filePath = dialogResult.filePath;

    // 2. Read file from disk
    const readResult = await this.fileService.readFile(filePath);
    if (!readResult.success) {
      return { success: false, error: readResult.error };
    }

    // 3. Parse map header and structure
    const parseResult = mapParser.parse(readResult.data!, filePath);
    if (!parseResult.success) {
      return { success: false, error: parseResult.error };
    }

    const mapData = parseResult.data!;

    // 4. Decompress tile data for v3 maps
    if (mapData.header.version === 3) {
      const rawBuffer = readResult.data!;
      const compressedStart = mapData.header.dataOffset + 2;

      // Extract compressed data slice from raw file buffer
      // CRITICAL: Use slice to get a clean ArrayBuffer (not shared)
      const compressedSlice = new Uint8Array(rawBuffer, compressedStart);
      const compressedBuffer = compressedSlice.buffer.slice(
        compressedSlice.byteOffset,
        compressedSlice.byteOffset + compressedSlice.byteLength
      );

      const decompResult = await this.fileService.decompress(compressedBuffer);
      if (!decompResult.success) {
        return { success: false, error: `Decompression failed: ${decompResult.error}` };
      }

      // Copy decompressed tile data into map
      mapData.tiles = new Uint16Array(decompResult.data!);
    }

    // SETT-02: Merge binary header values + defaults into description for all map versions.
    // This ensures all 53 settings keys are present regardless of what the file contained.
    mapData.header.description = mergeDescriptionWithHeader(
      mapData.header.description,
      mapData.header
    );
    // Sync extendedSettings so Map Settings dialog has correct values without re-parsing
    const { settings: parsedSettings } = parseDescription(mapData.header.description);
    mapData.header.extendedSettings = { ...getDefaultSettings(), ...parsedSettings };

    return { success: true, map: mapData, filePath };
  }

  /**
   * Save a map to the filesystem
   * Serializes header, compresses tile data, and writes combined buffer.
   * If no filePath provided, prompts user with save dialog.
   */
  async saveMap(map: MapData, filePath?: string): Promise<MapSaveResult> {
    // 1. If no path, show save dialog
    if (!filePath) {
      const dialogResult = await this.fileService.saveMapDialog();
      if (dialogResult.canceled || !dialogResult.filePath) {
        return { success: false, error: 'canceled' };
      }
      filePath = dialogResult.filePath;
    }

    // 2. Serialize header
    // SETT-03: Re-serialize current settings into description before writing to disk.
    // Uses a shallow copy to avoid mutating the in-memory map state.
    // SETT-02 TRIAGE: Log settings round-trip state at save time
    console.log('[SETT-02 TRIAGE] extendedSettings keys:', Object.keys(map.header.extendedSettings).length);
    console.log('[SETT-02 TRIAGE] description length (pre-reserialize):', map.header.description.length);
    const mapToSave: MapData = {
      ...map,
      header: {
        ...map.header,
        description: reserializeDescription(map.header.description, map.header.extendedSettings)
      }
    };
    console.log('[SETT-02 TRIAGE] description length (post-reserialize):', mapToSave.header.description.length);
    console.log('[SETT-02 TRIAGE] first 300 chars:', mapToSave.header.description.substring(0, 300));
    const headerBuffer = mapParser.serialize(mapToSave);

    // 3. Compress tile data
    // Copy to a new Uint8Array to ensure we get a proper ArrayBuffer
    const tileBytes = new Uint8Array(mapToSave.tiles.buffer);
    const tileBuffer = tileBytes.buffer.slice(0) as ArrayBuffer;
    const compResult = await this.fileService.compress(tileBuffer);
    if (!compResult.success) {
      return { success: false, error: `Compression failed: ${compResult.error}` };
    }

    // 4. Combine header + compressed data into single buffer
    const headerBytes = new Uint8Array(headerBuffer);
    const compressedBytes = new Uint8Array(compResult.data!);
    const fullBuffer = new Uint8Array(headerBytes.length + compressedBytes.length);
    fullBuffer.set(headerBytes);
    fullBuffer.set(compressedBytes, headerBytes.length);

    // 5. Write to disk
    const fullBufferCopy = fullBuffer.buffer.slice(0) as ArrayBuffer;
    const writeResult = await this.fileService.writeFile(filePath, fullBufferCopy);
    if (!writeResult.success) {
      return { success: false, error: writeResult.error };
    }

    return { success: true, filePath };
  }

  /**
   * Save a map as a new file (always shows save dialog)
   * Pre-fills dialog with defaultPath if provided.
   * Used for "Save As..." workflow.
   */
  async saveMapAs(map: MapData, defaultPath?: string): Promise<MapSaveResult> {
    // Always show dialog, pre-filled with defaultPath
    const dialogResult = await this.fileService.saveMapDialog(defaultPath);
    if (dialogResult.canceled || !dialogResult.filePath) {
      return { success: false, error: 'canceled' };
    }
    const filePath = dialogResult.filePath;

    // Serialize, compress, write (same as saveMap)
    // SETT-03: Re-serialize current settings into description before writing to disk.
    const mapToSave: MapData = {
      ...map,
      header: {
        ...map.header,
        description: reserializeDescription(map.header.description, map.header.extendedSettings)
      }
    };
    const headerBuffer = mapParser.serialize(mapToSave);
    const tileBytes = new Uint8Array(mapToSave.tiles.buffer);
    const tileBuffer = tileBytes.buffer.slice(0) as ArrayBuffer;
    const compResult = await this.fileService.compress(tileBuffer);
    if (!compResult.success) {
      return { success: false, error: `Compression failed: ${compResult.error}` };
    }
    const headerBytes = new Uint8Array(headerBuffer);
    const compressedBytes = new Uint8Array(compResult.data!);
    const fullBuffer = new Uint8Array(headerBytes.length + compressedBytes.length);
    fullBuffer.set(headerBytes);
    fullBuffer.set(compressedBytes, headerBytes.length);
    const fullBufferCopy = fullBuffer.buffer.slice(0) as ArrayBuffer;
    const writeResult = await this.fileService.writeFile(filePath, fullBufferCopy);
    if (!writeResult.success) {
      return { success: false, error: writeResult.error };
    }

    return { success: true, filePath };
  }
}
