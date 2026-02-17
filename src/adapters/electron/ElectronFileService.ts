/**
 * ElectronFileService: Electron implementation of FileService
 *
 * Wraps window.electronAPI IPC calls behind the FileService interface.
 * Handles all ArrayBuffer <-> base64 conversions required by the IPC boundary.
 */

import type {
  FileService,
  FileDialogResult,
  FileReadResult,
  FileWriteResult,
  CompressionResult,
} from '../../core/services/FileService';

export class ElectronFileService implements FileService {
  /**
   * Convert ArrayBuffer to base64 string for IPC
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert base64 string to ArrayBuffer from IPC
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  async openMapDialog(): Promise<FileDialogResult> {
    const filePath = await window.electronAPI.openFileDialog();
    return {
      filePath,
      canceled: !filePath,
    };
  }

  async saveMapDialog(defaultPath?: string): Promise<FileDialogResult> {
    const filePath = await window.electronAPI.saveFileDialog(defaultPath);
    return {
      filePath,
      canceled: !filePath,
    };
  }

  async readFile(filePath: string): Promise<FileReadResult> {
    const result = await window.electronAPI.readFile(filePath);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    // Convert base64 to ArrayBuffer
    const data = this.base64ToArrayBuffer(result.data!);

    return {
      success: true,
      data,
    };
  }

  async writeFile(filePath: string, data: ArrayBuffer): Promise<FileWriteResult> {
    // Convert ArrayBuffer to base64
    const base64 = this.arrayBufferToBase64(data);

    const result = await window.electronAPI.writeFile(filePath, base64);

    return {
      success: result.success,
      error: result.error,
    };
  }

  async compress(data: ArrayBuffer): Promise<CompressionResult> {
    // Convert ArrayBuffer to base64
    const base64 = this.arrayBufferToBase64(data);

    const result = await window.electronAPI.compress(base64);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    // Convert base64 result back to ArrayBuffer
    const compressedData = this.base64ToArrayBuffer(result.data!);

    return {
      success: true,
      data: compressedData,
    };
  }

  async decompress(data: ArrayBuffer): Promise<CompressionResult> {
    // Convert ArrayBuffer to base64
    const base64 = this.arrayBufferToBase64(data);

    const result = await window.electronAPI.decompress(base64);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    // Convert base64 result back to ArrayBuffer
    const decompressedData = this.base64ToArrayBuffer(result.data!);

    return {
      success: true,
      data: decompressedData,
    };
  }
}
