# Phase 89: Platform Polish - Research

**Researched:** 2026-02-18
**Domain:** Electron Linux platform conventions — XDG paths, AppImage auto-update, menu adjustments
**Confidence:** HIGH (XDG paths and menu), MEDIUM (AppImage auto-update quitAndInstall relaunch)

## Summary

Phase 89 adds three Linux-specific behaviors to the Electron main process: XDG-compliant paths, AppImage auto-update via GitHub Releases, and Linux menu conventions. All work happens in `electron/platform.ts` (created in Phase 88) and `electron/main.ts`. No renderer changes are needed.

**XDG paths (PLAT-01):** Electron already returns XDG-compliant paths on Linux by default — `app.getPath('userData')` returns `~/.config/<appName>` and `app.getPath('appData')` returns `$XDG_CONFIG_HOME` or `~/.config`. The `updateMarkerPath` in `main.ts` uses `app.getPath('userData')` and is therefore already XDG-compliant on Linux without code changes. If the app ever needs to store large data files, XDG best practice is `~/.local/share/<appName>` (XDG_DATA_HOME), but for small config/settings files, `userData` is correct. The requirement as stated (PLAT-01) is already satisfied by Electron's default behavior on Linux — the plan should verify this and document it rather than rewriting path logic.

**AppImage auto-update (PLAT-02):** `electron-updater` supports AppImage as a first-class update target. The existing `setupAutoUpdater()` function works cross-platform — on Linux, `autoUpdater` automatically uses the `AppImageUpdater` class when running inside an AppImage. The `latest-linux.yml` file is generated during `npm run electron:build:linux` alongside the `.AppImage`. The critical requirement is that the app must be **running as an AppImage** (i.e., `process.env.APPIMAGE` env var must be set by the AppImage runtime). In dev mode, the updater is already disabled via the `if (!isDev)` guard. One known issue: `quitAndInstall(true, true)` (silently install + relaunch) has historically had problems on AppImage — the app may not properly relaunch because AppImages mount to temporary directories. The recommended workaround is to listen for `update-downloaded` and use `execFile(process.env.APPIMAGE, ...)` + `app.quit()` on Linux instead of `quitAndInstall`. The `autoInstallOnAppQuit = true` flag may or may not work reliably on AppImage.

**Linux menu (PLAT-04):** On macOS, the first menu item is always an application menu (`role: 'appMenu'`) containing About, Services, Hide, Quit. On Linux/Windows there is no system-level application menu — the menu bar lives in each window. The current `buildMenu()` in `main.ts` has no `appMenu` role item (it has File, Edit, View, Window, Help) so there is no "App" menu to remove. The real adjustment needed is: (1) verify there is no macOS-specific item leaking into the Linux menu template, and (2) add `&` prefixes to top-level menu label strings so Linux generates `Alt+<key>` keyboard accelerators (e.g., `&File` generates `Alt+F`). The `CmdOrCtrl` accelerator used in the existing menu is cross-platform and correct for Linux.

**Primary recommendation:** Phase 89 is small in scope. PLAT-01 is verified-as-already-satisfied by Electron defaults. PLAT-04 requires adding `&` prefixes to menu labels (a one-line change per menu item). PLAT-02 requires verifying the auto-updater works when running as an AppImage (needs Linux host to test), and adding a Linux-specific relaunch path for `update-install` IPC handler using `execFile(process.env.APPIMAGE)` instead of `quitAndInstall`.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| electron-updater | 6.7.3 | AppImage auto-update | Already installed; `AppImageUpdater` class handles Linux update automatically |
| Electron app.getPath() | Built-in | XDG-compliant paths | Returns `$XDG_CONFIG_HOME` or `~/.config` on Linux by default |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node.js `child_process.execFile` | Built-in | Linux AppImage relaunch after update | Only on Linux when `process.env.APPIMAGE` is set |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `quitAndInstall(true, true)` on Linux | `execFile(process.env.APPIMAGE)` + `app.quit()` | `quitAndInstall` is unreliable for AppImage relaunch; execFile workaround is well-documented and stable |
| Manually setting XDG paths | Electron default `app.getPath('userData')` | Electron already follows XDG on Linux; manual overrides add complexity without benefit |

**Installation:** No new packages needed. All tooling already present.

## Architecture Patterns

### Recommended Project Structure

All changes go into:
```
electron/
├── platform.ts    # Add: getLinuxUpdatePath(), linuxRelaunch()
└── main.ts        # Modify: buildMenu() for Linux accelerators
                   # Modify: update-install IPC for Linux relaunch
```

No changes needed in `src/` (renderer). No new files needed.

### Pattern 1: XDG Paths via Electron Default Behavior

**What:** On Linux, `app.getPath('userData')` returns `~/.config/<appName>` by default, following XDG Base Directory spec. The `appData` path returns `$XDG_CONFIG_HOME` or `~/.config`. No custom path logic is needed.

**Verification approach:** The plan task should verify what path is actually returned on Linux by logging `app.getPath('userData')` during startup in dev mode.

**When to use:** Always — Electron's built-in behavior is correct. Only override if the app needs to store large binary data (use `~/.local/share/<appName>` for that via `app.getPath('home') + '/.local/share/' + app.getName()`).

**Example (verifying in platform.ts):**
```typescript
// Source: Electron official docs, app.getPath() Linux behavior
// electron/platform.ts

import { app } from 'electron';
import path from 'path';

/**
 * Returns the correct user data directory for the current platform.
 * On Linux: ~/.config/ac-map-editor (XDG_CONFIG_HOME/appName)
 * On Windows: %APPDATA%\ac-map-editor
 */
export function getUserDataPath(): string {
  return app.getPath('userData');
}

/**
 * Returns the XDG data directory on Linux for large data files.
 * Only needed if we store large binary data (currently we don't).
 */
export function getLinuxDataPath(): string {
  if (isLinux) {
    const xdgData = process.env.XDG_DATA_HOME || path.join(app.getPath('home'), '.local', 'share');
    return path.join(xdgData, app.getName());
  }
  return app.getPath('userData');
}
```

The `updateMarkerPath` in `main.ts` uses `app.getPath('userData')` — this is already correct for Linux (resolves to `~/.config/ac-map-editor/.update-restart`). No change needed.

### Pattern 2: Linux AppImage Auto-Update

**What:** `electron-updater` automatically detects Linux AppImage via `process.env.APPIMAGE` env var set by the AppImage runtime. When running inside an AppImage, `autoUpdater.checkForUpdates()` uses `AppImageUpdater` instead of the NSIS updater. The update manifest file is `latest-linux.yml` (not `latest.yml`).

**Critical requirement:** The app must be running from a `.AppImage` file (not from `dist-electron/` or extracted dir). In production this is automatic. In dev, the updater is already disabled.

**The quitAndInstall relaunch problem:** `autoUpdater.quitAndInstall(true, true)` on AppImage works for the *install* step (replacing the AppImage file on disk) but the *relaunch* step is unreliable because AppImages execute from a tmpfs mount. The `process.env.APPIMAGE` contains the path to the original AppImage file on disk — use this to relaunch.

**Recommended Linux relaunch pattern:**
```typescript
// Source: electron-builder GitHub issues #5380, #4650 — confirmed community pattern
// electron/platform.ts

import { execFile } from 'child_process';
import { app } from 'electron';

/**
 * On Linux AppImage: relaunch the AppImage directly after update install.
 * On Windows/macOS: use standard quitAndInstall.
 * Returns true if Linux relaunch was handled, false if caller should use quitAndInstall.
 */
export function tryLinuxRelaunch(): boolean {
  if (isLinux && process.env.APPIMAGE) {
    execFile(process.env.APPIMAGE);
    app.quit();
    return true;
  }
  return false;
}
```

Then in `main.ts` `update-install` IPC handler:
```typescript
ipcMain.on('update-install', () => {
  // Write restart marker so splash knows to show shorter duration
  try { fs.writeFileSync(updateMarkerPath, ''); } catch (_) {}

  if (!tryLinuxRelaunch()) {
    // Windows/macOS path
    autoUpdater.quitAndInstall(true, true);
  }
});
```

**Note on `autoInstallOnAppQuit`:** Keep `autoInstallOnAppQuit = true` as-is. On Linux, when the app quits normally after an update is downloaded, electron-updater's `AppImageUpdater` replaces the AppImage file. The relaunch workaround is only needed when the user explicitly clicks "Install Now". If the user just closes the app and reopens it, the new AppImage file is already in place.

### Pattern 3: Linux Menu Conventions

**What:** On Linux, there is no macOS-style application menu (the first menu named after the app). The current `buildMenu()` function has no `appMenu` role item, so no removal is needed. The Linux convention is to add `&` character prefixes to top-level menu labels to enable `Alt+<key>` keyboard navigation.

**macOS-only items that must NOT appear on Linux:**
- `role: 'appMenu'` — not present in current menu (good)
- `role: 'services'` — not present (good)
- `role: 'hide'` / `role: 'hideOthers'` / `role: 'unhide'` — not present (good)
- `role: 'front'` — not present (good)

**Current state:** The existing menu is already Linux-safe (no macOS-specific roles). The only adjustment is adding `&` prefixes for Alt-key accelerators.

**Linux accelerator convention via `&` in labels:**
```typescript
// Source: Electron docs, Menu API — "&" generates Alt+<char> on Windows and Linux
// Before (no accelerator):
{ label: 'File', submenu: [...] }

// After (adds Alt+F accelerator on Linux/Windows):
{ label: '&File', submenu: [...] }
```

**Full recommended menu labels:**
- `'&File'` → Alt+F
- `'&Edit'` → Alt+E
- `'&View'` → Alt+V
- `'&Window'` → Alt+W
- `'&Help'` → Alt+H

**Note:** `CmdOrCtrl+S`, `CmdOrCtrl+Shift+S`, etc. are already cross-platform correct — `CmdOrCtrl` maps to `Ctrl` on Linux/Windows and `Cmd` on macOS. No accelerator changes needed beyond the `&` prefixes.

**Platform-conditional menu building:** Since the menu is the same on Windows and Linux, no platform check is needed for the `&` prefix change — it works correctly on macOS too (macOS ignores `&` in native menu contexts where the menu bar is system-level). However, if future items require macOS-specific additions, use the standard pattern:
```typescript
// Source: Electron tutorial/application-menu
const isMacMenu = process.platform === 'darwin';
const template = [
  ...(isMacMenu ? [{ role: 'appMenu' as const }] : []),
  { label: '&File', submenu: [...] },
  // ...
];
```

### Anti-Patterns to Avoid

- **Adding `app.setPath('userData', ...)` to force XDG paths:** Electron already returns XDG paths on Linux. Overriding the path manually adds complexity and can break electron-updater's app-update.yml resolution.
- **Calling `quitAndInstall(true, true)` unconditionally on Linux:** Works for update install but relaunch is unreliable. Use the `execFile(process.env.APPIMAGE)` workaround on Linux.
- **Adding `role: 'appMenu'` to the menu template without platform guard:** This role is macOS-only. On Linux it renders as an empty or broken menu item. Always wrap with `...(isMac ? [{ role: 'appMenu' }] : [])`.
- **Using `process.platform` directly in `main.ts`:** All platform checks belong in `platform.ts` (established by Phase 88). Import `isLinux`, `isMac` from `platform.ts`.
- **Checking `process.env.APPIMAGE` in dev mode:** The `if (!isDev)` guard already prevents auto-updater from running in dev. Don't add dev-specific APPIMAGE workarounds.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| XDG path resolution | Custom XDG path parser reading env vars | `app.getPath('userData')` | Electron already handles $XDG_CONFIG_HOME fallback |
| Linux update manifest | Custom yaml generation | electron-builder `--linux` build output | `latest-linux.yml` auto-generated by electron-builder alongside AppImage |
| AppImage update download | Custom HTTP fetch | `autoUpdater.checkForUpdates()` | AppImageUpdater class handles differential download, checksum, chmod |
| Alt-key menu accelerators | Custom keyboard event listeners | `&` prefix in menu label strings | Electron's native menu handles `&` → `Alt+<char>` on Linux/Windows |

## Common Pitfalls

### Pitfall 1: PLAT-01 Misread — XDG Paths Already Work
**What goes wrong:** Developer writes code to manually override `app.getPath('userData')` with `$XDG_CONFIG_HOME` logic, duplicating what Electron already does.
**Why it happens:** The requirement says "use XDG conventions" which sounds like work to do, but Electron's default behavior already satisfies it on Linux.
**How to avoid:** Verify by logging `app.getPath('userData')` on Linux — it returns `~/.config/ac-map-editor`. Document this as the verification, not implementation.
**Warning signs:** New code setting `app.setPath('userData', ...)` in the Linux branch.

### Pitfall 2: AppImage Auto-Update Fails in Test Because APPIMAGE Env Var Not Set
**What goes wrong:** Testing auto-update from extracted/dev build shows "APPIMAGE env is not defined" warning, developer concludes auto-update is broken.
**Why it happens:** The `$APPIMAGE` env var is only set when running from a real `.AppImage` file (the runtime sets it to the path of the AppImage). Running from `dist-electron/` or extracted dir does not set it.
**How to avoid:** Only test AppImage auto-update by running the actual `.AppImage` binary. The `if (!isDev)` guard already blocks dev-mode checks. The "APPIMAGE env not defined" warning is expected and harmless in dev.
**Warning signs:** Developer adds `process.env.APPIMAGE = '/path/to/fake.AppImage'` workaround in production code.

### Pitfall 3: quitAndInstall Relaunch Fails on AppImage
**What goes wrong:** Update downloads successfully, user clicks "Install Now", app quits but does not relaunch on Linux.
**Why it happens:** AppImage runs from a tmpfs mount point (e.g., `/tmp/.mount_xxx/`). After `quitAndInstall()` replaces the AppImage file and calls `app.relaunch()`, the tmpfs mount is gone and the relaunch target no longer exists.
**How to avoid:** Use `execFile(process.env.APPIMAGE)` + `app.quit()` on Linux instead of relying on `quitAndInstall`'s relaunch. The `execFile` launches the new AppImage from its permanent disk location.
**Warning signs:** `autoUpdater.quitAndInstall(true, true)` used unconditionally on all platforms.

### Pitfall 4: update-restart Marker File Not Written on Linux
**What goes wrong:** After Linux AppImage update and relaunch, the splash screen shows for 5 seconds instead of 2 seconds.
**Why it happens:** The `tryLinuxRelaunch()` function launches the new AppImage but the code path skips writing the `.update-restart` marker file.
**How to avoid:** Write the marker file before calling `execFile(process.env.APPIMAGE)`, exactly as the current code does before `quitAndInstall`.
**Warning signs:** `fs.writeFileSync(updateMarkerPath, '')` missing from Linux relaunch path.

### Pitfall 5: Menu `&` Prefix Shows as Literal `&` on macOS
**What goes wrong:** On macOS, menu items show `&File`, `&Edit` with the literal ampersand character.
**Why it happens:** macOS's native menu system does not use `&` for keyboard navigation — it ignores the `&` but on some Electron versions may display it literally.
**How to avoid:** In practice, Electron strips `&` from menu labels on macOS when rendering the native menu bar. Verified behavior: `&File` renders as "File" on macOS. The `&` is safe to use cross-platform. If macOS display issues arise, use `isMac` conditional from `platform.ts`.
**Warning signs:** macOS users report ampersands in menu names.

## Code Examples

Verified patterns from official sources and community evidence:

### XDG Path Verification (logging on startup)
```typescript
// Source: Electron docs — app.getPath() Linux behavior
// In main.ts or platform.ts, for dev-mode logging only:
if (isDev && isLinux) {
  console.log('[Linux] userData path:', app.getPath('userData'));
  // Expected: /home/<user>/.config/ac-map-editor
}
```

### Linux AppImage Relaunch (for update-install IPC)
```typescript
// Source: electron-builder GitHub issues #5380, #4650, #1727
// electron/platform.ts

import { execFile } from 'child_process';
import { app } from 'electron';

/**
 * On Linux AppImage: relaunch the AppImage after update.
 * Returns true if handled (Linux), false if caller should use quitAndInstall.
 */
export function tryLinuxAppImageRelaunch(): boolean {
  if (isLinux && process.env.APPIMAGE) {
    execFile(process.env.APPIMAGE);
    app.quit();
    return true;
  }
  return false;
}
```

```typescript
// electron/main.ts — updated update-install handler
ipcMain.on('update-install', () => {
  try { fs.writeFileSync(updateMarkerPath, ''); } catch (_) {}
  if (!tryLinuxAppImageRelaunch()) {
    autoUpdater.quitAndInstall(true, true);
  }
});
```

### Linux Menu Conventions (& prefix for Alt-key accelerators)
```typescript
// Source: Electron docs, Menu API — & generates Alt+<char> on Linux/Windows
// electron/main.ts — buildMenu() function

function buildMenu() {
  const menuTemplate: any = [
    {
      label: '&File',      // Alt+F on Linux/Windows
      submenu: [...]
    },
    {
      label: '&Edit',      // Alt+E
      submenu: [...]
    },
    {
      label: '&View',      // Alt+V
      submenu: [...]
    },
    {
      label: '&Window',    // Alt+W
      submenu: [...]
    },
    {
      label: '&Help',      // Alt+H
      submenu: [...]
    }
  ];
  // No 'appMenu' role — correct for Windows/Linux
  // On macOS: appMenu would go first with ...(isMac ? [{ role: 'appMenu' }] : [])
  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
}
```

### electron-builder publish config (already in package.json — no change needed)
```json
// Already in package.json — generates latest-linux.yml when building on Linux
"publish": [
  {
    "provider": "github",
    "owner": "ACaTreYu",
    "repo": "NewMapEditor"
  }
]
```

When `npm run electron:build:linux` is run on a Linux host, it produces:
```
release/
  AC Map Editor-1.1.2.AppImage
  latest-linux.yml          ← electron-updater reads this to check for updates
  builder-debug.yml
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual XDG path construction | `app.getPath('userData')` (auto XDG on Linux) | Electron ~v5+ | No custom code needed for XDG compliance |
| `squirrel` updater on Linux | `electron-updater AppImageUpdater` | electron-builder v19+ | AppImage is the supported Linux update mechanism |
| `app.relaunch()` for AppImage restart | `execFile(process.env.APPIMAGE)` + `app.quit()` | Documented workaround since 2017 | The tmpfs mount issue makes `app.relaunch()` unreliable in AppImage context |

**Deprecated/outdated:**
- `squirrel` on Linux: Never actually worked; `AppImageUpdater` in `electron-updater` is the current standard
- `--appimage-extract-and-run` flag in relaunch args: An older workaround; current approach is direct `execFile(process.env.APPIMAGE)`

## Open Questions

1. **Does `autoInstallOnAppQuit = true` work for AppImage?**
   - What we know: When set, electron-updater replaces the AppImage file on disk when the app exits normally. The user then manually relaunches the (now-updated) AppImage.
   - What's unclear: Whether the file replacement works reliably in all Linux environments — some GitHub issues report the filename changes to include the version number, breaking the user's launcher shortcut.
   - Recommendation: Keep `autoInstallOnAppQuit = true` but note this may cause a filename change issue. The user-triggered "Install Now" path uses the `execFile` workaround above, which avoids this.

2. **Should PLAT-01 verification be automated or manual?**
   - What we know: `app.getPath('userData')` returns `~/.config/ac-map-editor` on Linux by default.
   - What's unclear: Whether the plan should include a test that verifies the path, or just document that Electron handles it.
   - Recommendation: The plan for 89-01 should include a step that logs the path during Linux startup (in dev mode) and verifies it contains `.config`. This is human-verified since it requires a Linux environment.

3. **Does the `update-restart` marker file path work on Linux?**
   - What we know: `updateMarkerPath = path.join(app.getPath('userData'), '.update-restart')` resolves to `~/.config/ac-map-editor/.update-restart` on Linux.
   - What's unclear: Whether the directory exists when the app first runs (it may not exist until the app creates it).
   - Recommendation: Add `fs.mkdirSync(path.dirname(updateMarkerPath), { recursive: true })` before writing the marker. This is already safe on Windows because `%APPDATA%\ac-map-editor` is created by Electron; the same should be true on Linux, but defensive mkdir costs nothing.

4. **AppImage auto-update testing without a Linux GitHub Release**
   - What we know: Testing auto-update requires an actual `.AppImage` file and a `latest-linux.yml` on GitHub Releases for a newer version.
   - What's unclear: How to test the Linux auto-updater before Phase 90 publishes to GitHub Releases.
   - Recommendation: Phase 89 verifies that auto-update *wiring* is correct (code reads `latest-linux.yml`, responds to events, handles relaunch). End-to-end testing of actual download+install is Phase 90's scope. The plan for 89-02 should scope to code verification, not live update test.

## Sources

### Primary (HIGH confidence)
- Electron official docs, `app.getPath()` — Linux returns `$XDG_CONFIG_HOME` or `~/.config` for `appData`; `userData` is `appData + appName`
- Electron official docs, `Menu` API — `&` in label generates `Alt+<char>` accelerator on Linux/Windows; macOS ignores `&`
- Electron official docs, `application-menu` tutorial — `appMenu` role is macOS-only; standard cross-platform template pattern shown
- electron-builder official docs, `auto-update.html` — Linux AppImage listed as supported auto-update target; `latest-linux.yml` generated for all providers
- AppImageUpdater source (`electron-userland/electron-builder`) — checks `process.env.APPIMAGE`; returns false and logs warning if not set; uses `mv` for file replacement

### Secondary (MEDIUM confidence)
- electron-builder GitHub issue #5380 (AppImage relaunch + auto-updater) — `execFile(process.env.APPIMAGE)` + `app.quit()` confirmed working approach
- electron-builder GitHub issue #4650 (AppImage relaunch not working) — same workaround confirmed
- DoltHub blog 2025-05-29 (Building a Linux Electron App) — `~/.local/share` for large data files vs `~/.config` for small config; XDG per-directory convention

### Tertiary (LOW confidence)
- electron-builder GitHub issue #2672 (filename change after AppImage update) — `autoInstallOnAppQuit` may rename AppImage to include version in filename, breaking launcher shortcuts. Not definitively resolved.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Electron docs confirm XDG behavior; electron-updater source confirms AppImageUpdater class
- Architecture (XDG): HIGH — Electron default behavior verified; no code changes required
- Architecture (menu): HIGH — `&` prefix documented in Electron Menu API; macOS behavior verified
- Architecture (AppImage update): MEDIUM — Core mechanism verified; relaunch workaround is documented community pattern, not official API
- Pitfalls (quitAndInstall relaunch): MEDIUM — Multiple issues confirm the problem; workaround widely used but not in official docs
- Pitfalls (XDG already works): HIGH — Verified via Electron docs

**Research date:** 2026-02-18
**Valid until:** 2026-08-18 (Electron path behavior is stable; AppImage workaround is stable since 2017)

## Phase Plan Guidance

Based on this research, the two plans map cleanly:

**89-01: XDG paths and Linux menu conventions**
- Task 1: Verify PLAT-01 — log `app.getPath('userData')` on Linux startup and confirm XDG path. Document in code. No path changes needed.
- Task 2: Add `&` prefixes to all 5 top-level menu labels in `buildMenu()`. Run typecheck.
- Task 3: Confirm no `appMenu` role or macOS-only roles in menu template (audit only — they're not present).
- This plan is completable on Windows (code changes + typecheck). Human verification of `userData` path requires Linux.

**89-02: Wire Linux auto-updater via AppImage + latest-linux.yml**
- Task 1: Add `tryLinuxAppImageRelaunch()` to `platform.ts`.
- Task 2: Update `update-install` IPC handler in `main.ts` to call `tryLinuxAppImageRelaunch()` before `quitAndInstall`.
- Task 3: Add defensive `mkdirSync` for `updateMarkerPath` parent directory.
- Task 4: Verify auto-updater wiring by code review (check for `APPIMAGE` env var handling, correct event listeners). Human verification of actual download+install is Phase 90 scope.
- This plan is completable on Windows (code changes + typecheck). End-to-end AppImage update test requires Linux + GitHub Release.
