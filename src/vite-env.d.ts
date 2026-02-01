/// <reference types="vite/client" />

interface ElectronAPI {
  openFileDialog: () => Promise<string | null>;
  saveFileDialog: () => Promise<string | null>;
  openDllDialog: () => Promise<string | null>;
  readFile: (filePath: string) => Promise<{ success: boolean; data?: string; error?: string }>;
  writeFile: (filePath: string, data: string) => Promise<{ success: boolean; error?: string }>;
  decompress: (data: string) => Promise<{ success: boolean; data?: string; error?: string }>;
  compress: (data: string) => Promise<{ success: boolean; data?: string; error?: string }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
