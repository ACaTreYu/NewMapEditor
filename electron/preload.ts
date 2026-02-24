import { contextBridge, ipcRenderer, clipboard } from 'electron';

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // File dialogs
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  saveFileDialog: (defaultPath?: string) => ipcRenderer.invoke('dialog:saveFile', defaultPath),
  saveTextFileDialog: () => ipcRenderer.invoke('dialog:saveTextFile'),
  openDllDialog: () => ipcRenderer.invoke('dialog:openDllFile'),
  openPatchFolderDialog: () => ipcRenderer.invoke('dialog:openPatchFolder'),
  openImageDialog: () => ipcRenderer.invoke('dialog:openImageFile'),
  selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),

  // Directory listing
  listDir: (dirPath: string) => ipcRenderer.invoke('file:listDir', dirPath),

  // File operations
  readFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath),
  writeFile: (filePath: string, data: string) => ipcRenderer.invoke('file:write', filePath, data),
  writeTextFile: (filePath: string, text: string) => ipcRenderer.invoke('file:writeText', filePath, text),

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
  },

  // Clipboard
  writeClipboard: (text: string) => clipboard.writeText(text),

  // Theme
  onSetTheme: (callback: (event: any, theme: string) => void) => {
    ipcRenderer.on('set-theme', callback);
  },
  removeSetThemeListener: (callback: (event: any, theme: string) => void) => {
    ipcRenderer.removeListener('set-theme', callback);
  },
  syncTheme: (theme: string) => ipcRenderer.send('theme-sync', theme),

  // Auto-update
  onUpdateStatus: (callback: (event: any, status: string, version?: string, percent?: number) => void) => {
    ipcRenderer.on('update-status', callback);
  },
  installUpdate: () => ipcRenderer.send('update-install')
});

// Type definitions for the exposed API
export interface ElectronAPI {
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
