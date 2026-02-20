# Architecture Research

**Domain:** Linux .deb auto-update integration for Electron/React map editor
**Researched:** 2026-02-20
**Confidence:** HIGH — all claims verified against installed `electron-updater` and `app-builder-lib` source code in `node_modules`

---

## Existing Update Architecture (Confirmed from Source)

### Current Data Flow (Windows/macOS)

```
autoUpdater.checkForUpdates()
  │
  ├─ checking-for-update event → main.ts sends 'update-status', 'checking'
  ├─ update-available event    → main.ts sends 'update-status', 'downloading', version
  ├─ download-progress event   → main.ts sends 'update-status', 'progress', undefined, percent
  ├─ update-downloaded event   → main.ts sends 'update-status', 'ready', version
  └─ error event               → main.ts sends 'update-status', 'error'

renderer (App.tsx)
  └─ onUpdateStatus handler → setUpdateStatus / setUpdateVersion / setDownloadPercent
      └─ update-banner JSX:
          'downloading' | 'progress'  → <div> showing percent
          'ready'                     → <button> onClick: installUpdate()
          'checking'                  → <div> "Checking..."

ipcMain.on('update-install')          ← triggered by button click
  └─ tryLinuxAppImageRelaunch()       ← returns false (no APPIMAGE env on .deb)
       └─ false → autoUpdater.quitAndInstall(true, true)
```

### Current Linux Problem

`tryLinuxAppImageRelaunch()` in `platform.ts` returns `true` only if `process.env.APPIMAGE` is set (AppImage installs). For a `.deb` install, `APPIMAGE` is undefined, so it falls through to `autoUpdater.quitAndInstall(true, true)` — which is correct. **The current `update-install` handler already does the right thing for `.deb`.** No branching is needed.

---

## How electron-updater Selects DebUpdater

Source: `node_modules/electron-updater/out/main.js` lines 42-79

```
doLoadAutoUpdater()
  if win32  → NsisUpdater
  if darwin → MacUpdater
  else (linux):
    default → AppImageUpdater
    check: does resources/package-type exist?
      if "deb"    → DebUpdater   ← our path
      if "rpm"    → RpmUpdater
      if "pacman" → PacmanUpdater
```

The `package-type` file is written automatically by `app-builder-lib/out/targets/FpmTarget.js`:

```javascript
await outputFile(path.join(resourceDir, 'package-type'), target);
// target = "deb" for our build
```

This means building with `electron-builder --linux` and `target: "deb"` in `package.json` automatically produces a `package-type` file containing the text `deb` inside the `.deb`'s resources directory. No manual configuration required.

**Confidence: HIGH** — verified from `node_modules/app-builder-lib/out/targets/FpmTarget.js` line 117.

---

## Download Cache Location

Source: `node_modules/electron-updater/out/AppAdapter.js` + `AppUpdater.js`

```
baseCachePath (Linux) = $XDG_CACHE_HOME || ~/.cache
cacheDir             = baseCachePath / updaterCacheDirName
                     = ~/.cache / ac-map-editor-updater   (from app-update.yml)
pendingDir           = cacheDir / pending
downloadedFile       = pendingDir / ac-map-editor_<version>_amd64.deb
```

The `updaterCacheDirName` value comes from `app-update.yml` which electron-builder writes into `resources/` at build time. The `installerPath` getter in `LinuxUpdater.js` reads from `downloadedUpdateHelper.file`, which is this `.deb` path, shell-escaped (spaces → `\ `, backslashes doubled).

**No developer code needed to find the file path.** `DebUpdater.doInstall()` handles it internally.

---

## DebUpdater.doInstall() Mechanics

Source: `node_modules/electron-updater/out/DebUpdater.js`

```
doInstall(options):
  1. Check: installerPath != null
  2. Check: dpkg or apt is available (hasCommand)
  3. detectPackageManager(['dpkg', 'apt']) — returns 'dpkg' on Ubuntu
  4. DebUpdater.installWithCommandRunner('dpkg', installerPath, runCommandWithSudoIfNeeded)
     └─ commandRunner(['dpkg', '-i', installerPath])
          └─ runCommandWithSudoIfNeeded(['dpkg', '-i', installerPath])
               └─ isRunningAsRoot()? → direct spawnSync
                  else:
                    determineSudoCommand() → tries gksudo, kdesudo, pkexec, beesu, sudo
                    sudoWithArgs():
                      for pkexec: ['pkexec', '--disable-internal-agent']
                    spawnSyncLog(
                      'pkexec',
                      ['--disable-internal-agent', '/bin/bash', '-c', "'dpkg -i /path/to/update.deb'"]
                    )
  5. On failure: try apt-get install -f -y (dependency fix)
  6. if options.isForceRunAfter: this.app.relaunch()
  7. return true → BaseUpdater calls app.quit()
```

**pkexec is invoked by electron-updater internally.** The main process does not need to invoke it directly. The entire install and privilege escalation is handled inside `DebUpdater.doInstall()` when `autoUpdater.quitAndInstall()` is called.

---

## latest-linux.yml vs latest.yml

Source: `node_modules/app-builder-lib/out/publish/updateInfoBuilder.js` line 52

```javascript
function getUpdateInfoFileName(channel, packager, arch) {
  const osSuffix = packager.platform === Platform.WINDOWS ? '' : `-${packager.platform.buildConfigurationKey}`;
  return `${channel}${osSuffix}${archPrefix}.yml`;
}
// For Linux: osSuffix = '-linux', channel = 'latest'
// Result: 'latest-linux.yml'
```

| File | Platform | Content |
|------|----------|---------|
| `latest.yml` | Windows (NSIS) | NSIS installer metadata |
| `latest-mac.yml` | macOS | DMG/ZIP metadata |
| `latest-linux.yml` | Linux (AppImage/deb/rpm) | `.deb` or AppImage metadata |

For a `.deb` build with GitHub publish, `electron-builder` automatically generates and uploads `latest-linux.yml` to the GitHub release alongside the `.deb` file. The YAML contains `version`, `path` (filename), `sha512`, and `releaseDate`.

**The existing project already uses `latest.yml` for Windows.** The `.deb` build will produce `latest-linux.yml` automatically — no additional publish configuration is needed.

---

## What `autoInstallOnAppQuit` Does on Linux .deb

Source: `node_modules/electron-updater/out/BaseUpdater.js`

`autoInstallOnAppQuit = true` (currently set in `setupAutoUpdater()`) tells electron-updater to call `install()` when the app quits after a download is ready. For Linux `.deb`, this triggers `doInstall()` which spawns the pkexec/dpkg command. However, **no relaunch happens** because `isForceRunAfter` is `false` in the quit-handler path.

**Implication:** When the user closes the app without clicking the banner, the pkexec authentication dialog appears at quit time but the app does not relaunch. The user must manually reopen. This is acceptable behavior. When the user clicks the banner (calls `quitAndInstall(true, true)`), `isForceRunAfter = true` is passed and `this.app.relaunch()` is called after install — so the app relaunches automatically.

---

## Integration Point Map

### Files Modified

| File | Change | Reason |
|------|--------|--------|
| `electron/main.ts` | Remove or gate `tryLinuxAppImageRelaunch()` guard | .deb never sets `APPIMAGE`, so the guard already falls through correctly — but the function name is misleading |
| `electron/platform.ts` | Optionally rename/clarify `tryLinuxAppImageRelaunch` | No functional change needed; the fallthrough to `quitAndInstall` is correct for .deb |

### Files Unchanged

| File | Status | Reason |
|------|--------|--------|
| `electron/preload.ts` | No change | `installUpdate()` → `ipcRenderer.send('update-install')` is correct for all platforms |
| `src/App.tsx` | No change | `installUpdate?.()` call is correct for all platforms |
| `package.json` `build` | No change | Already has `linux: { target: "deb" }` and `publish: [{ provider: "github" }]` |

### Files New (Release Workflow Only)

| File | Purpose |
|------|---------|
| GitHub Release | Must include both `ac-map-editor_<ver>_amd64.deb` and `latest-linux.yml` |

---

## System Overview After Integration

```
┌───────────────────────────────────────────────────────────────────┐
│                    GitHub Releases (provider)                      │
│  latest.yml              latest-linux.yml                          │
│  AC.Map.Editor.Setup.exe  ac-map-editor_1.x.x_amd64.deb           │
└─────────────────────────┬─────────────────────────────────────────┘
                          │ HTTPS (electron-updater)
┌─────────────────────────▼─────────────────────────────────────────┐
│                     Main Process (Electron)                        │
│                                                                    │
│  autoUpdater                                                       │
│    Windows: NsisUpdater  ─── .exe download ──► quitAndInstall()   │
│    Linux:   DebUpdater   ─── .deb download ──► doInstall()        │
│               │                                  │                 │
│               │ ~/.cache/ac-map-editor-updater/  │                 │
│               │ pending/ac-map-editor_x.deb      │                 │
│               │                                  │                 │
│               └─────────────────────────────────►│                 │
│                                                  ▼                 │
│                            pkexec --disable-internal-agent         │
│                            /bin/bash -c 'dpkg -i /path/to.deb'    │
│                                                  │                 │
│  ipcMain.on('update-status')                     │                 │
│  ipcMain.on('update-install') ──► quitAndInstall(true, true)      │
│                                                  │                 │
└─────────────────────────────────────┬────────────┘                 │
                                      │ IPC                          │
┌─────────────────────────────────────▼──────────────────────────────┐
│                     Renderer (App.tsx)                              │
│  onUpdateStatus → setUpdateStatus                                   │
│  update-banner:                                                     │
│    'downloading'/'progress' → shows percent                        │
│    'ready'                  → button → installUpdate()             │
└────────────────────────────────────────────────────────────────────┘
```

---

## Architectural Patterns

### Pattern 1: Transparent Platform Dispatch via package-type

**What:** electron-updater automatically selects `DebUpdater` or `AppImageUpdater` at runtime by reading `resources/package-type`. No app-level code dispatches on platform.

**When to use:** Nothing to do. The pattern is built into electron-updater and electron-builder.

**Trade-off:** If `package-type` is missing (e.g., dev mode or AppImage without the file), it falls back to `AppImageUpdater`. This means updates don't work in dev mode on Linux — which is fine since `setupAutoUpdater()` is already gated on `!isDev`.

### Pattern 2: Sudo Tool Discovery Chain

**What:** `LinuxUpdater.determineSudoCommand()` probes `gksudo → kdesudo → pkexec → beesu → sudo` via `which`. On Ubuntu 22.04+, only `pkexec` is typically available.

**When to use:** Nothing to do. Handled internally.

**Trade-off:** pkexec opens a graphical PolicyKit dialog. If the session has no graphical policy agent running (headless server, SSH), pkexec fails silently. This is an edge case — the app is a GUI tool not used headlessly.

### Pattern 3: autoInstallOnAppQuit for Silent Background Install

**What:** `autoInstallOnAppQuit = true` installs the downloaded `.deb` when the user quits normally (without clicking the banner). The pkexec prompt appears at quit time.

**When to use:** Already configured. Provides "install next time you close" behavior as fallback.

**Trade-off:** No auto-relaunch in this path (`isForceRunAfter = false`). User must manually reopen. This is acceptable — forced relaunch on quit would be surprising.

---

## Data Flow

### Update Check → Download → Install

```
[Startup + 5 second delay]
  autoUpdater.checkForUpdates()
    ↓ GET latest-linux.yml from GitHub releases
    ↓ compare version vs app.getVersion()
    ↓ if newer:
      update-available → main sends 'downloading' to renderer
      DebUpdater.doDownloadUpdate()
        ↓ finds .deb file info in latest-linux.yml
        ↓ downloads to ~/.cache/ac-map-editor-updater/pending/ac-map-editor_x.deb
        ↓ verifies sha512
      update-downloaded → main sends 'ready' to renderer
        renderer shows banner button

[User clicks banner]
  window.electronAPI.installUpdate()
    → ipcRenderer.send('update-install')
    → ipcMain.on('update-install')
    → tryLinuxAppImageRelaunch()  → false (no APPIMAGE env on .deb)
    → autoUpdater.quitAndInstall(true, true)
    → BaseUpdater.install(isSilent=true, isForceRunAfter=true)
    → DebUpdater.doInstall({ isForceRunAfter: true })
    → runCommandWithSudoIfNeeded(['dpkg', '-i', '/path/to.deb'])
    → pkexec --disable-internal-agent /bin/bash -c 'dpkg -i /path.deb'
    → [PolicyKit dialog appears]
    → dpkg installs new version to /opt/AC Map Editor/
    → this.app.relaunch()  → new version starts
    → this.app.quit()      → old process exits
```

---

## Build Order Considerations

The update flow works with zero code changes if the `.deb` is built and published correctly. The recommended build order:

1. **Verify latest-linux.yml generation** — run `electron:build:linux` on the Linux host, confirm `latest-linux.yml` appears in `release/` dir alongside the `.deb`. This is automatic but must be confirmed once.

2. **Verify package-type file** — inside the built `.deb`, confirm `resources/package-type` contains `deb`. Extract with `dpkg-deb --fsys-tarfile` and check. This is automatic from `FpmTarget.js`.

3. **Upload both artifacts to GitHub release** — `latest-linux.yml` AND `ac-map-editor_<ver>_amd64.deb` must both be attached. If the `.deb` is missing from the release, the download will fail even though version detection succeeds.

4. **Verify pkexec is available on target** — Ubuntu 22.04+ ships pkexec. Ubuntu 20.04 ships it too. This is safe to assume for the target audience.

5. **Test the DebUpdater bug** — Issue #8395 (fixed in electron-updater ~6.3.3+) caused the install command to be improperly quoted. The installed version is `6.7.3` which is past that fix. No workaround needed.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Manually invoking pkexec from main.ts

**What:** Writing custom pkexec spawn code in the `update-install` IPC handler.
**Why bad:** `DebUpdater.doInstall()` already handles this, including the sudo tool discovery chain, path escaping, and fallback to apt-get for dependency fixes. Custom code would duplicate and likely break this.
**Instead:** Call `autoUpdater.quitAndInstall(true, true)` and let electron-updater handle it.

### Anti-Pattern 2: Branching `update-install` handler by platform

**What:** Adding `if (isLinux) { spawnDpkg() } else { autoUpdater.quitAndInstall() }` in main.ts.
**Why bad:** electron-updater already does this branching internally via `DebUpdater` vs `NsisUpdater`. The app-level handler does not need to know the platform.
**Instead:** One handler: `autoUpdater.quitAndInstall(true, true)`. Works correctly on all platforms.

### Anti-Pattern 3: Downloading the .deb manually

**What:** Using `axios` or `https.get` to download the .deb and writing install code from scratch.
**Why bad:** electron-updater handles sha512 verification, progress events, cache management, and resume logic. Reimplementing loses all of this.
**Instead:** Trust `autoUpdater.autoDownload = true` and the `update-downloaded` event.

### Anti-Pattern 4: Omitting latest-linux.yml from GitHub release

**What:** Publishing only the `.deb` binary without uploading `latest-linux.yml`.
**Why bad:** electron-updater fetches `latest-linux.yml` first to compare versions. Without it, `checkForUpdates()` fails and emits `error`. Users see the error banner.
**Instead:** Upload both `latest-linux.yml` and `ac-map-editor_<ver>_amd64.deb` to every GitHub release.

### Anti-Pattern 5: Removing tryLinuxAppImageRelaunch without understanding it

**What:** Deleting `tryLinuxAppImageRelaunch()` from platform.ts because it "doesn't apply to .deb".
**Why bad:** The function correctly returns `false` for .deb (no APPIMAGE env), causing correct fallthrough to `quitAndInstall()`. If the project ever ships an AppImage again, the function is needed.
**Instead:** Leave it in place. Optionally add a comment clarifying it is a no-op for .deb builds.

---

## Component Boundaries

| Component | Responsibility | Notes |
|-----------|---------------|-------|
| `electron-builder` (FpmTarget) | Writes `package-type` file into .deb resources | Build-time; automatic |
| `electron-builder` (updateInfoBuilder) | Generates `latest-linux.yml` | Build-time; automatic with GitHub publish |
| `electron-updater` (DebUpdater) | Detects deb format, downloads .deb, runs pkexec/dpkg | Runtime; selected automatically from `package-type` |
| `electron/main.ts` setupAutoUpdater | Wires events → IPC, handles `update-install` → quitAndInstall | Existing; no change needed |
| `electron/platform.ts` tryLinuxAppImageRelaunch | Returns false for .deb, falls through to quitAndInstall | Existing; no change needed |
| `electron/preload.ts` installUpdate | Forwards renderer click to main via IPC | Existing; no change needed |
| `src/App.tsx` update banner | Shows download progress and install button | Existing; no change needed |

---

## Integration Points Summary

**New components:** None.

**Modified files:** None required for functionality. Optional: add clarifying comment to `tryLinuxAppImageRelaunch()` noting it is a no-op for `.deb`.

**New release artifacts:** `latest-linux.yml` (auto-generated by build) + `ac-map-editor_<ver>_amd64.deb` — both must appear on each GitHub release.

**Build order:** Linux build → verify artifacts → publish to GitHub release. No code changes block this.

---

## Sources

All claims are HIGH confidence — verified by direct source code analysis of installed node_modules.

- `E:\NewMapEditor\node_modules\electron-updater\out\main.js` — `doLoadAutoUpdater()`, package-type dispatch
- `E:\NewMapEditor\node_modules\electron-updater\out\DebUpdater.js` — `doInstall()`, `installWithCommandRunner()`
- `E:\NewMapEditor\node_modules\electron-updater\out\LinuxUpdater.js` — `runCommandWithSudoIfNeeded()`, `determineSudoCommand()`, pkexec invocation
- `E:\NewMapEditor\node_modules\electron-updater\out\BaseUpdater.js` — `quitAndInstall()`, `install()`, `autoInstallOnAppQuit`
- `E:\NewMapEditor\node_modules\electron-updater\out\DownloadedUpdateHelper.js` — `cacheDirForPendingUpdate`, file storage
- `E:\NewMapEditor\node_modules\electron-updater\out\AppAdapter.js` — `getAppCacheDir()` → `~/.cache` on Linux
- `E:\NewMapEditor\node_modules\electron-updater\out\ElectronAppAdapter.js` — `baseCachePath` binding
- `E:\NewMapEditor\node_modules\electron-updater\out\AppUpdater.js` — `cacheDir` construction from `baseCachePath + updaterCacheDirName`
- `E:\NewMapEditor\node_modules\app-builder-lib\out\targets\FpmTarget.js` line 117 — `package-type` file write
- `E:\NewMapEditor\node_modules\app-builder-lib\out\publish\updateInfoBuilder.js` lines 51-53 — `latest-linux.yml` filename generation
- `E:\NewMapEditor\electron\main.ts` — existing update architecture
- `E:\NewMapEditor\electron\platform.ts` — `tryLinuxAppImageRelaunch()` behavior
- `E:\NewMapEditor\electron\preload.ts` — IPC bridge for `installUpdate`
- `E:\NewMapEditor\src\App.tsx` lines 424-476 — update banner UI
- Issue #8395 electron-builder — DebUpdater install command bug (fixed in 6.3.3+; installed 6.7.3 is safe)
- PR #7060 electron-builder — original deb/rpm auto-update feature addition (Nov 2022)

---

*Architecture research for: Linux .deb auto-update integration*
*Researched: 2026-02-20*
