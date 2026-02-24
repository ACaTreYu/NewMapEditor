/// <reference types="vite/client" />

interface ElectronAPI {
  openFileDialog: () => Promise<string | null>;
  saveFileDialog: (defaultPath?: string) => Promise<string | null>;
  saveTextFileDialog: () => Promise<string | null>;
  openDllDialog: () => Promise<string | null>;
  openPatchFolderDialog: () => Promise<string | null>;
  openImageDialog: () => Promise<string | null>;
  selectDirectory: () => Promise<string | null>;
  readFile: (filePath: string) => Promise<{ success: boolean; data?: string; error?: string }>;
  writeFile: (filePath: string, data: string) => Promise<{ success: boolean; error?: string }>;
  writeTextFile: (filePath: string, text: string) => Promise<{ success: boolean; error?: string }>;
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
  onSetTheme?: (callback: (event: any, theme: string) => void) => void;
  removeSetThemeListener?: (callback: (event: any, theme: string) => void) => void;
  syncTheme?: (theme: string) => void;
  onUpdateStatus?: (callback: (event: any, status: string, version?: string, percent?: number) => void) => void;
  installUpdate?: () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
