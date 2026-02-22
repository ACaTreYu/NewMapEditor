/**
 * WebFileService: Browser implementation of FileService
 *
 * Uses the File API for open/save and pako for zlib compression.
 * Works in any modern browser (Chrome, Firefox, Safari, Edge).
 */

import pako from 'pako';
import type {
  FileService,
  FileDialogResult,
  FileReadResult,
  FileWriteResult,
  CompressionResult,
} from '../../core/services/FileService';

export class WebFileService implements FileService {
  /** Last opened file handle for "Save" (re-save to same file) */
  private lastFileHandle: FileSystemFileHandle | null = null;

  async openMapDialog(): Promise<FileDialogResult> {
    try {
      // Try modern File System Access API first (Chrome/Edge)
      if ('showOpenFilePicker' in window) {
        const [handle] = await (window as any).showOpenFilePicker({
          types: [{
            description: 'Map files',
            accept: { 'application/octet-stream': ['.map', '.lvl'] }
          }],
          multiple: false,
        });
        this.lastFileHandle = handle;
        const file: File = await handle.getFile();
        const data = await file.arrayBuffer();
        // Store data for readFile
        (this as any)._lastOpenedData = data;
        return { filePath: file.name, canceled: false };
      }

      // Fallback: <input type="file">
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.map,.lvl';
        input.onchange = async () => {
          if (!input.files?.length) {
            resolve({ filePath: null, canceled: true });
            return;
          }
          const file = input.files[0];
          const data = await file.arrayBuffer();
          (this as any)._lastOpenedData = data;
          resolve({ filePath: file.name, canceled: false });
        };
        // Handle cancel (user closes dialog without selecting)
        input.addEventListener('cancel', () => {
          resolve({ filePath: null, canceled: true });
        });
        input.click();
      });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { filePath: null, canceled: true };
      }
      return { filePath: null, canceled: true };
    }
  }

  async saveMapDialog(defaultPath?: string): Promise<FileDialogResult> {
    try {
      if ('showSaveFilePicker' in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: defaultPath || 'untitled.map',
          types: [{
            description: 'Map files',
            accept: { 'application/octet-stream': ['.map', '.lvl'] }
          }],
        });
        this.lastFileHandle = handle;
        return { filePath: handle.name, canceled: false };
      }

      // Fallback: use a generated filename
      const name = defaultPath?.split(/[\\/]/).pop() || 'untitled.map';
      return { filePath: name, canceled: false };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { filePath: null, canceled: true };
      }
      return { filePath: null, canceled: true };
    }
  }

  async readFile(_filePath: string): Promise<FileReadResult> {
    // Return the data from the last opened file
    const data = (this as any)._lastOpenedData as ArrayBuffer | undefined;
    if (data) {
      (this as any)._lastOpenedData = undefined;
      return { success: true, data };
    }
    return { success: false, error: 'No file data available' };
  }

  async writeFile(_filePath: string, data: ArrayBuffer): Promise<FileWriteResult> {
    try {
      // Try File System Access API (can write back to same file)
      if (this.lastFileHandle) {
        try {
          const writable = await (this.lastFileHandle as any).createWritable();
          await writable.write(data);
          await writable.close();
          return { success: true };
        } catch {
          // Permission denied or handle stale — fall through to download
        }
      }

      // Fallback: trigger download
      const blob = new Blob([data], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = _filePath || 'untitled.map';
      a.click();
      URL.revokeObjectURL(url);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async compress(data: ArrayBuffer): Promise<CompressionResult> {
    try {
      const compressed = pako.deflate(new Uint8Array(data));
      return { success: true, data: compressed.buffer };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async decompress(data: ArrayBuffer): Promise<CompressionResult> {
    try {
      const decompressed = pako.inflate(new Uint8Array(data));
      return { success: true, data: decompressed.buffer };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}
