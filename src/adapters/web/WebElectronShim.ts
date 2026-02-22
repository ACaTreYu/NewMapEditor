/**
 * WebElectronShim: Browser stubs for window.electronAPI
 *
 * Provides browser-native equivalents for the Electron IPC calls
 * that App.tsx and RulerNotepadPanel.tsx make directly.
 * Maintains an internal file store so folder/file picking flows work.
 */

class WebElectronShim {
  private fileStore = new Map<string, File>();

  // ── File/Folder Dialogs ──

  async openPatchFolderDialog(): Promise<string | null> {
    // Use directory picker if available (Chrome/Edge)
    if ('showDirectoryPicker' in window) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker();
        const folderName = dirHandle.name;
        this.fileStore.clear();
        for await (const entry of dirHandle.values()) {
          if (entry.kind === 'file') {
            const file = await entry.getFile();
            this.fileStore.set(`/web/${folderName}/${file.name}`, file);
          }
        }
        return `/web/${folderName}`;
      } catch {
        return null;
      }
    }

    // Fallback: webkitdirectory file input
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.setAttribute('webkitdirectory', '');
      input.onchange = () => {
        if (!input.files?.length) { resolve(null); return; }
        this.fileStore.clear();
        const folderName = input.files[0].webkitRelativePath.split('/')[0];
        for (const file of Array.from(input.files)) {
          const name = file.name;
          this.fileStore.set(`/web/${folderName}/${name}`, file);
        }
        resolve(`/web/${folderName}`);
      };
      input.addEventListener('cancel', () => resolve(null));
      input.click();
    });
  }

  async openImageDialog(): Promise<string | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async () => {
        if (!input.files?.length) { resolve(null); return; }
        const file = input.files[0];
        const fakePath = `/web-image/${file.name}`;
        this.fileStore.set(fakePath, file);
        resolve(fakePath);
      };
      input.addEventListener('cancel', () => resolve(null));
      input.click();
    });
  }

  async openFileDialog(): Promise<string | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.map,.lvl';
      input.onchange = async () => {
        if (!input.files?.length) { resolve(null); return; }
        const file = input.files[0];
        const fakePath = `/web-file/${file.name}`;
        this.fileStore.set(fakePath, file);
        resolve(fakePath);
      };
      input.addEventListener('cancel', () => resolve(null));
      input.click();
    });
  }

  async openDllDialog(): Promise<string | null> {
    return null;
  }

  async saveFileDialog(_defaultPath?: string): Promise<string | null> {
    return _defaultPath || 'untitled.map';
  }

  async saveTextFileDialog(): Promise<string | null> {
    const name = prompt('Save as filename:', 'export.txt');
    return name || null;
  }

  // ── File I/O ──

  async listDir(dirPath: string): Promise<{ success: boolean; files?: string[]; error?: string }> {
    const files: string[] = [];
    for (const [path] of this.fileStore) {
      if (path.startsWith(dirPath + '/')) {
        const relative = path.slice(dirPath.length + 1);
        if (!relative.includes('/')) files.push(relative);
      }
    }
    return { success: true, files };
  }

  async readFile(filePath: string): Promise<{ success: boolean; data?: string; error?: string }> {
    const file = this.fileStore.get(filePath);
    if (!file) return { success: false, error: 'File not found in web store' };
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return { success: true, data: btoa(binary) };
  }

  async writeFile(_filePath: string, base64Data: string): Promise<{ success: boolean; error?: string }> {
    try {
      const binary = atob(base64Data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'application/octet-stream' });
      this.triggerDownload(blob, _filePath.split('/').pop() || 'file');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async writeTextFile(filePath: string, text: string): Promise<{ success: boolean; error?: string }> {
    try {
      const blob = new Blob([text], { type: 'text/plain' });
      this.triggerDownload(blob, filePath.split('/').pop() || 'export.txt');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // ── Compression (unused by shim — WebFileService handles this) ──

  async decompress(_data: string) { return { success: false, error: 'Use WebFileService' }; }
  async compress(_data: string) { return { success: false, error: 'Use WebFileService' }; }

  // ── Window/Menu (no-ops on web) ──

  setTitle(title: string) { document.title = title; }
  syncTheme(_theme: string) {}
  onArrangeWindows(_cb: any) {}
  removeArrangeWindowsListener(_cb: any) {}
  onMenuAction(_cb: any) {}
  removeMenuActionListener(_cb: any) {}
  onSetTheme(_cb: any) {}
  removeSetThemeListener(_cb: any) {}
  onUpdateStatus(_cb: any) {}
  installUpdate() {}

  // ── Clipboard ──

  writeClipboard(text: string) {
    navigator.clipboard.writeText(text).catch(() => {
      // Fallback for non-secure contexts
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    });
  }

  // ── Save confirmation ──

  async confirmSave(filename: string): Promise<number> {
    // 0 = Yes (save), 1 = No (discard), 2 = Cancel
    const result = window.confirm(`Save changes to ${filename}?`);
    return result ? 0 : 1;
  }

  // ── Helpers ──

  private triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

/** Install the shim on window.electronAPI before React mounts */
export function installWebElectronShim() {
  (window as any).electronAPI = new WebElectronShim();
}
