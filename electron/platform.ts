import type { App } from 'electron';

// ── Platform Detection ─────────────────────────────────────────────
// Single location for all process.platform checks.
// Never add platform checks in renderer (src/) code.
// Phase 89 will add XDG paths and menu adjustments here.

export const isMac     = process.platform === 'darwin';
export const isLinux   = process.platform === 'linux';
export const isWindows = process.platform === 'win32';

/**
 * Standard Electron: quit when all windows close.
 * On macOS, apps stay running until explicitly quit (Cmd+Q).
 */
export function registerWindowAllClosed(app: App): void {
  app.on('window-all-closed', () => {
    if (!isMac) {
      app.quit();
    }
  });
}
