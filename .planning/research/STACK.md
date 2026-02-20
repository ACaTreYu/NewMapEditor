# Stack Research

**Domain:** Linux .deb auto-update for Electron desktop app
**Researched:** 2026-02-20
**Confidence:** HIGH — all critical claims verified against installed source code in node_modules

---

## Context: What Already Exists (Do Not Re-Research)

| Already Shipped | Status |
|----------------|--------|
| `electron-updater ^6.7.3` (6.7.3 installed) | Working — Windows NSIS auto-update |
| GitHub releases provider | Configured in package.json `build.publish` |
| Update UI (checking/downloading/progress/ready/error) | Working in renderer |
| `setupAutoUpdater()` in `electron/main.ts` | All event wires in place |
| `tryLinuxAppImageRelaunch()` in `electron/platform.ts` | Exists — AppImage guard only |
| `ipcMain.on('update-install', ...)` | Exists — calls `quitAndInstall()` for non-AppImage |

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `electron-updater` | 6.7.3 (installed) | .deb download, hash verification, privilege escalation, install | `DebUpdater` class is already in the installed package. No upgrade required. The pkexec quoting bug from issue #8395 is fixed in 6.7.3 (verified from source). |
| `electron-builder` | 25.1.8 (installed) | Builds .deb and writes the `package-type` marker file | Automatically writes `resources/package-type` containing the string `deb` at build time. This is what triggers `DebUpdater` selection at runtime — no manual configuration needed. |

**No new npm packages are required.** The entire Linux .deb auto-update mechanism is already present in the installed dependencies.

---

## How the Runtime Dispatch Works (Verified from Source)

`electron-updater/out/main.js` automatically selects `DebUpdater` when running from a .deb install:

```javascript
// Verified at node_modules/electron-updater/out/main.js lines 51-68
_autoUpdater = new AppImageUpdater(); // default for Linux
const identity = path.join(process.resourcesPath, "package-type");
if (existsSync(identity)) {
  const fileType = readFileSync(identity).toString().trim(); // reads "deb"
  switch (fileType) {
    case "deb":
      _autoUpdater = new DebUpdater(); // replaces AppImageUpdater
      break;
  }
}
```

`app-builder-lib/out/targets/FpmTarget.js` writes that file at build time (verified at line 117):

```javascript
// runs automatically during: npm run electron:build:linux
await outputFile(path.join(resourceDir, "package-type"), target); // target = "deb"
```

**This is entirely automatic.** electron-builder writes `package-type`, electron-updater reads it. No code changes needed for dispatch.

---

## The `latest-linux.yml` Format

electron-builder generates and uploads `latest-linux.yml` when building with a GitHub publisher. The filename is computed as `latest` + channel file prefix. The channel file prefix for Linux x64 is `-linux` (no arch suffix for x64), so the file is `latest-linux.yml`. For arm64 it would be `latest-linux-arm64.yml`.

Verified from `electron-updater/out/providers/Provider.js` `getChannelFilePrefix()`:
```javascript
if (this.runtimeOptions.platform === "linux") {
  const arch = process.env["TEST_UPDATER_ARCH"] || process.arch;
  const archSuffix = arch === "x64" ? "" : `-${arch}`;
  return "-linux" + archSuffix;
}
```

**Exact YAML format** (verified from real Beeper and balena-etcher release files on GitHub):

```yaml
version: 1.1.4
files:
  - url: ac-map-editor_1.1.4_amd64.deb
    sha512: <base64-encoded-sha512-hash>
    size: 90000000
  - url: ac-map-editor_1.1.4.AppImage
    sha512: <base64-encoded-sha512-hash>
    size: 150000000
    blockMapSize: 180000
path: ac-map-editor_1.1.4_amd64.deb
sha512: <base64-encoded-sha512-hash>
releaseDate: '2026-02-20T00:00:00.000Z'
```

Key facts:
- `files` array lists every Linux artifact in the release
- `DebUpdater.doDownloadUpdate()` calls `findFile(..., "deb", ["AppImage", "rpm", "pacman"])` — it finds the entry with a `.deb` URL, skipping AppImage/rpm/pacman entries
- Top-level `path` and `sha512` are the "primary" file (can be .deb or AppImage)
- `sha512` is base64-encoded (not hex)
- `size` is in bytes
- `blockMapSize` only needed for AppImage differential updates — not needed for .deb
- **This file is generated automatically** by electron-builder on build — no manual authoring

---

## How DebUpdater Installs (pkexec)

The exact install flow, verified from `electron-updater/out/LinuxUpdater.js` and `DebUpdater.js`:

**Step 1 — Sudo tool detection** (LinuxUpdater.js `determineSudoCommand()` line 64):
```javascript
const sudos = ["gksudo", "kdesudo", "pkexec", "beesu"];
// probes each with `command -v <tool>` via spawnSync
// falls back to "sudo" if none found
```

**Step 2 — pkexec invocation** (LinuxUpdater.js `runCommandWithSudoIfNeeded()` lines 34-37):
```javascript
// For pkexec, wrapper = "" (no extra quotes around the path)
// pkexec gets --disable-internal-agent flag
spawnSyncLog("pkexec", ["--disable-internal-agent", "/bin/bash", "-c",
  "'dpkg -i /path/to/ac-map-editor_1.1.4_amd64.deb || apt-get install -f -y'"])
```

**Step 3 — dpkg install** (DebUpdater.js `installWithCommandRunner()` lines 53-63):
```javascript
// Primary: dpkg -i <path>
commandRunner(["dpkg", "-i", installerPath]);
// On dpkg failure (missing deps): apt-get install -f -y
commandRunner(["apt-get", "install", "-f", "-y"]);
```

**pkexec availability:**

| Distro | pkexec Present | GUI Prompt |
|--------|----------------|------------|
| Ubuntu 22.04 (Jammy) | Yes — pre-installed via `policykit-1` | Yes — GNOME polkit agent shows dialog |
| Ubuntu 24.04 (Noble) | Yes — pre-installed | Yes on X11/XWayland; unreliable on pure Wayland sessions |
| Debian 12 (Bookworm) | Yes — pre-installed with GNOME/KDE | Yes with standard desktop |
| Minimal/server installs | Possibly absent | No GUI — no polkit agent running |

`--disable-internal-agent` disables pkexec's text fallback. If no graphical polkit agent is running (headless, SSH, minimal DE), the command fails silently. This is acceptable — a GUI map editor won't be running headless.

**Wayland caveat (MEDIUM confidence):** Ubuntu 24.04's default GNOME session runs Electron via XWayland, so pkexec GUI prompts should work. Pure Wayland sessions without XWayland support have known pkexec GUI prompt failures (Launchpad bug #1713313). This is a known platform limitation, not an electron-updater bug.

---

## Bug Status: Issue #8395 — FIXED in 6.7.3

Issue #8395 (reported August 2024): DebUpdater's `pkexec /bin/bash -c` command was not quoted correctly — bash received `dpkg` as the command and `-i` as a separate arg, so the install never ran.

**Status in installed 6.7.3:** FIXED. Verified from `LinuxUpdater.js` line 37:

```javascript
// Before fix (broken): "/bin/bash", "-c", "dpkg -i /path/..."
// After fix:           "/bin/bash", "-c", "'dpkg -i /path/...'"
return this.spawnSyncLog(sudo[0], [...sudo.slice(1), `/bin/bash`, "-c",
  `'${commandWithArgs.join(" ")}'`]);
```

The single quotes wrap the entire bash command. **No patch is needed.** The installed version has the fix.

---

## Integration With Existing `update-install` IPC Handler

The existing handler in `electron/main.ts`:

```typescript
ipcMain.on('update-install', () => {
  try { fs.writeFileSync(updateMarkerPath, ''); } catch (_) {}
  if (!tryLinuxAppImageRelaunch()) {
    autoUpdater.quitAndInstall(true, true);
  }
});
```

`tryLinuxAppImageRelaunch()` returns `false` for .deb installs (because `process.env.APPIMAGE` is not set in a .deb install — correct behavior). So `autoUpdater.quitAndInstall(true, true)` is called, which triggers `DebUpdater.doInstall()`:

- `isSilent = true` — no additional prompt from electron-updater (pkexec handles privilege escalation)
- `isForceRunAfter = true` — calls `this.app.relaunch()` after dpkg completes

**The existing IPC handler works correctly for .deb without modification.** The AppImage guard cleanly passes through.

**`autoInstallOnAppQuit = true`** (set in `setupAutoUpdater()`) also works — dpkg installs on quit, but without `isForceRunAfter`, the app does not relaunch automatically. This is correct — user quits, update installs, user relaunches manually.

---

## What Needs to Change (Summary)

The gap is not in npm packages — it's in runtime configuration and build output:

| Gap | Fix |
|----|-----|
| `app-update.yml` written to resources must have `updaterCacheDirName` or correct feed URL | electron-builder writes this automatically from `build.publish` in package.json — already configured |
| `latest-linux.yml` must be uploaded to GitHub release | electron-builder does this automatically on `--publish always` or via `GH_TOKEN` |
| `.deb` artifact must be uploaded to the GitHub release | Same — electron-builder uploads all artifacts |
| `package-type` file must be in resources | Written automatically by electron-builder FpmTarget |
| `update-install` IPC must call `quitAndInstall` | Already done — no change needed |

The milestone work is: (1) ensure the Linux build pipeline uploads to GitHub with `--publish`, (2) verify `latest-linux.yml` contains the `.deb` entry, (3) test the pkexec prompt on Ubuntu, (4) handle the edge case where pkexec is absent or GUI prompt fails.

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| Built-in `DebUpdater` | Custom Node.js download + `child_process` dpkg | DebUpdater handles download, SHA512 verification, progress events, and privilege escalation. Rolling custom duplicates all this with no benefit. |
| `pkexec` (auto-detected) | Hardcoded `sudo` | `sudo` requires a terminal; GUI desktop app has no terminal. pkexec is the correct polkit-based GUI elevation tool. |
| `quitAndInstall()` for .deb | Custom relaunch script | DebUpdater.doInstall() + app.relaunch() is the correct lifecycle. No custom logic needed. |
| Keep `electron-updater@6.7.3` | Upgrade to 6.8.x | 6.7.3 has the deb bug fixed. No blocking reason to upgrade. Upgrading introduces unrelated changes and risks. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `gksudo` / `kdesudo` | Removed from Ubuntu 18.04+, not installed on modern Ubuntu/Debian | `pkexec` (auto-selected by priority list if gksudo/kdesudo absent) |
| Cross-compiling .deb on Windows | Unreliable; electron-builder fpm toolchain requires native Linux | Build .deb on Ubuntu host per existing `npm run electron:build:linux` workflow |
| Hardcoding pkexec path `/usr/bin/pkexec` | May differ on some distros | `determineSudoCommand()` already probes PATH — no hardcoding |
| `process.env.APPIMAGE` check for .deb | env var not set in .deb install | Already correctly returns `false` from `tryLinuxAppImageRelaunch()` |
| Manual `latest-linux.yml` authoring | Fragile, error-prone SHA512 computation | electron-builder generates and uploads it automatically |

---

## Stack Patterns by Variant

**If running as root (unusual but possible):**
- `LinuxUpdater.isRunningAsRoot()` returns true
- pkexec is skipped — dpkg runs directly without privilege elevation
- No GUI prompt shown

**If pkexec absent (minimal install without polkit):**
- `determineSudoCommand()` falls back to `sudo`
- `sudo` with no terminal fails silently — install does not happen
- User sees the app quit but no update installed
- Mitigation: Show an error dialog before quitting if on Linux and sudo tool probe fails (phase implementation decision)

**If `.deb` has spaces in artifact name:**
- `installerPath` getter escapes spaces with `\ ` (LinuxUpdater.js line 21)
- Current `artifactName`: `ac-map-editor_${version}_${arch}.deb` — no spaces, safe

**If arm64 build added in future:**
- `latest-linux-arm64.yml` is generated separately
- `DebUpdater` selects the correct file via `process.arch`

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `electron-updater@6.7.3` | `electron-builder@25.1.8` | Confirmed compatible — FpmTarget writes `package-type`, updater reads it; verified from both sources |
| `electron-updater@6.7.3` | `electron@34.0.0` | No known incompatibilities; Electron's net module used for download |

---

## Sources

All critical claims verified against installed source code (HIGH confidence):

- `E:\NewMapEditor\node_modules\electron-updater\out\main.js` — `package-type` dispatch logic, `DebUpdater` selection
- `E:\NewMapEditor\node_modules\electron-updater\out\DebUpdater.js` — `doDownloadUpdate()`, `doInstall()`, `installWithCommandRunner()`
- `E:\NewMapEditor\node_modules\electron-updater\out\LinuxUpdater.js` — `runCommandWithSudoIfNeeded()`, `sudoWithArgs()`, `determineSudoCommand()`, `detectPackageManager()`, space-escaping in `installerPath`
- `E:\NewMapEditor\node_modules\electron-updater\out\providers\Provider.js` — `getChannelFilePrefix()` returns `-linux`, confirms filename `latest-linux.yml`
- `E:\NewMapEditor\node_modules\app-builder-lib\out\targets\FpmTarget.js` line 117 — writes `package-type` to resources at build time
- `E:\NewMapEditor\electron\main.ts` — existing `setupAutoUpdater()` and `update-install` IPC handler
- `E:\NewMapEditor\electron\platform.ts` — `tryLinuxAppImageRelaunch()` behavior for .deb (returns false)
- [GitHub Issue #8395](https://github.com/electron-userland/electron-builder/issues/8395) — deb install command bug, fix description (fix verified present in installed 6.7.3)
- [Feat: Introducing deb/rpm auto-updates PR #7060](https://github.com/electron-userland/electron-builder/pull/7060) — original feature introduction (November 2022)
- [DebUpdater class docs](https://www.electron.build/electron-updater.Class.DebUpdater.html) — API overview (MEDIUM confidence — supplementary)
- [Launchpad bug #1713313](https://bugs.launchpad.net/bugs/1713313) — pkexec Wayland GUI prompt issue (MEDIUM confidence)
- Real-world `latest-linux.yml` examples from Beeper and balena-etcher GitHub releases — YAML format verification (MEDIUM confidence)

---

*Stack research for: Linux .deb auto-update — Electron 34 / electron-updater 6.7.3*
*Researched: 2026-02-20*
