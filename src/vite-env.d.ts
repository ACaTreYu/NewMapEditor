/// <reference types="vite/client" />

interface ElectronAPI {
  openFileDialog: () => Promise<string | null>;
  saveFileDialog: () => Promise<string | null>;
  openDllDialog: () => Promise<string | null>;
  openPatchFolderDialog: () => Promise<string | null>;
  readFile: (filePath: string) => Promise<{ success: boolean; data?: string; error?: string }>;
  writeFile: (filePath: string, data: string) => Promise<{ success: boolean; error?: string }>;
  listDir: (dirPath: string) => Promise<{ success: boolean; files?: string[]; error?: string }>;
  decompress: (data: string) => Promise<{ success: boolean; data?: string; error?: string }>;
  compress: (data: string) => Promise<{ success: boolean; data?: string; error?: string }>;
  setTitle: (title: string) => void;
  confirmSave: (filename: string) => Promise<number>;
  onArrangeWindows?: (callback: (event: any, mode: string) => void) => void;
  removeArrangeWindowsListener?: (callback: (event: any, mode: string) => void) => void;
  onMenuAction?: (callback: (event: any, action: string) => void) => void;
  removeMenuActionListener?: (callback: (event: any, action: string) => void) => void;
  writeClipboard: (text: string) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
