import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // File dialogs
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  saveFileDialog: () => ipcRenderer.invoke('dialog:saveFile'),
  openDllDialog: () => ipcRenderer.invoke('dialog:openDllFile'),

  // File operations
  readFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath),
  writeFile: (filePath: string, data: string) => ipcRenderer.invoke('file:write', filePath, data),

  // Compression
  decompress: (data: string) => ipcRenderer.invoke('zlib:decompress', data),
  compress: (data: string) => ipcRenderer.invoke('zlib:compress', data),

  // Window
  setTitle: (title: string) => ipcRenderer.send('set-title', title),

  // Dialogs
  confirmSave: (filename: string) => ipcRenderer.invoke('dialog:confirmSave', filename),

  // IPC event listeners
  onArrangeWindows: (callback: (event: any, mode: string) => void) => {
    ipcRenderer.on('arrange-windows', callback);
  },
  removeArrangeWindowsListener: (callback: (event: any, mode: string) => void) => {
    ipcRenderer.removeListener('arrange-windows', callback);
  },
  onMenuAction: (callback: (event: any, action: string) => void) => {
    ipcRenderer.on('menu-action', callback);
  },
  removeMenuActionListener: (callback: (event: any, action: string) => void) => {
    ipcRenderer.removeListener('menu-action', callback);
  }
});

// Type definitions for the exposed API
export interface ElectronAPI {
  openFileDialog: () => Promise<string | null>;
  saveFileDialog: () => Promise<string | null>;
  openDllDialog: () => Promise<string | null>;
  readFile: (filePath: string) => Promise<{ success: boolean; data?: string; error?: string }>;
  writeFile: (filePath: string, data: string) => Promise<{ success: boolean; error?: string }>;
  decompress: (data: string) => Promise<{ success: boolean; data?: string; error?: string }>;
  compress: (data: string) => Promise<{ success: boolean; data?: string; error?: string }>;
  setTitle: (title: string) => void;
  confirmSave: (filename: string) => Promise<number>;
  onArrangeWindows?: (callback: (event: any, mode: string) => void) => void;
  removeArrangeWindowsListener?: (callback: (event: any, mode: string) => void) => void;
  onMenuAction?: (callback: (event: any, action: string) => void) => void;
  removeMenuActionListener?: (callback: (event: any, action: string) => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
