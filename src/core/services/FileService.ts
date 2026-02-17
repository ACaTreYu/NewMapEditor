/**
 * FileService: Platform-agnostic file I/O interface
 *
 * This interface abstracts all file operations needed by the map editor.
 * Implementations can target different platforms (Electron, Web, etc.)
 * without changing any consuming code.
 */

/**
 * Result of a file dialog operation
 */
export interface FileDialogResult {
  /** Path to the selected file, or null if canceled */
  filePath: string | null;
  /** Whether the user canceled the dialog */
  canceled: boolean;
}

/**
 * Result of a file read operation
 */
export interface FileReadResult {
  /** Whether the read succeeded */
  success: boolean;
  /** File contents as ArrayBuffer (if successful) */
  data?: ArrayBuffer;
  /** Error message (if failed) */
  error?: string;
}

/**
 * Result of a file write operation
 */
export interface FileWriteResult {
  /** Whether the write succeeded */
  success: boolean;
  /** Error message (if failed) */
  error?: string;
}

/**
 * Result of a compression/decompression operation
 */
export interface CompressionResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Compressed/decompressed data (if successful) */
  data?: ArrayBuffer;
  /** Error message (if failed) */
  error?: string;
}

/**
 * Platform-agnostic file service interface
 *
 * All operations are async. Result types include both success/error
 * states to avoid throwing exceptions across the abstraction boundary.
 */
export interface FileService {
  /**
   * Open a file picker dialog for .map/.lvl files
   * @returns FileDialogResult with selected path or canceled flag
   */
  openMapDialog(): Promise<FileDialogResult>;

  /**
   * Open a save file dialog
   * @param defaultPath Optional default file path to pre-fill dialog
   * @returns FileDialogResult with selected path or canceled flag
   */
  saveMapDialog(defaultPath?: string): Promise<FileDialogResult>;

  /**
   * Read a file from the filesystem
   * @param filePath Absolute path to the file
   * @returns FileReadResult with ArrayBuffer data or error
   */
  readFile(filePath: string): Promise<FileReadResult>;

  /**
   * Write a file to the filesystem
   * @param filePath Absolute path to write to
   * @param data File contents as ArrayBuffer
   * @returns FileWriteResult with success flag or error
   */
  writeFile(filePath: string, data: ArrayBuffer): Promise<FileWriteResult>;

  /**
   * Compress data using zlib
   * @param data Uncompressed data
   * @returns CompressionResult with compressed data or error
   */
  compress(data: ArrayBuffer): Promise<CompressionResult>;

  /**
   * Decompress data using zlib
   * @param data Compressed data
   * @returns CompressionResult with decompressed data or error
   */
  decompress(data: ArrayBuffer): Promise<CompressionResult>;
}
