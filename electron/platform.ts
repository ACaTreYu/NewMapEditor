import { app } from 'electron';
import type { App } from 'electron';

// ── Platform Detection ─────────────────────────────────────────────
// Single location for all process.platform checks.
// Never add platform checks in renderer (src/) code.

export const isMac     = process.platform === 'darwin';
export const isLinux   = process.platform === 'linux';
export const isWindows = process.platform === 'win32';

/**
 * Returns the user data directory for this application.
 *
 * Electron already follows XDG Base Directory spec on Linux by default:
 *   - If XDG_CONFIG_HOME is set: $XDG_CONFIG_HOME/ac-map-editor
 *   - Otherwise: ~/.config/ac-map-editor
 *
 * No manual app.setPath() override is needed; Electron handles it correctly.
 * This function exists to document that fact and provide a single access point
 * for the userData path across the main process.
 */
export function getUserDataPath(): string {
  return app.getPath('userData');
}

/**
 * Logs platform-specific paths to the console for dev-mode verification
 * of XDG compliance on Linux.
 *
 * Call this during app startup in development to confirm Electron is using
 * the expected XDG directories rather than hardcoded paths.
 *
 * @param isDev - Pass the isDev flag from main.ts to avoid circular imports.
 *                Logging only occurs when isDev is true AND running on Linux.
 */
export function logPlatformPaths(isDev: boolean): void {
  if (isDev && isLinux) {
    console.log('[platform] userData:', app.getPath('userData'));
    console.log('[platform] appData:', app.getPath('appData'));
  }
}

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
