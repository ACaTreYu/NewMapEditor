# Pitfalls Research

**Domain:** Linux .deb auto-update for existing Electron app (electron-updater + electron-builder)
**Researched:** 2026-02-20
**Confidence:** HIGH — based on electron-updater source code (v6.7.3, local node_modules), confirmed GitHub issues, and project history

---

## Critical Pitfalls

### Pitfall 1: latest-linux.yml Not Generated for deb-only Builds

**What goes wrong:**
When the Linux build target is `deb` only (no AppImage target), electron-builder may not generate `latest-linux.yml` — the file electron-updater needs to detect new versions. Without this file uploaded to GitHub Releases, `checkForUpdates()` fails silently or with a 404.

**Why it happens:**
electron-builder historically tied update manifest generation to AppImage targets. The deb update path (introduced PR #7060, merged Nov 2022) is newer and has had issues. Some older build configurations skip the manifest for non-AppImage targets. The project currently builds deb-only (`"target": "deb"` in package.json) with no AppImage target.

**How to avoid:**
After every Linux build, verify that `release/latest-linux.yml` was generated and contains a `.deb` artifact URL. The file must list the `.deb` with its sha512 checksum. If missing, ensure electron-builder 25.x+ is used and the `publish` config is correct. Check `release/builder-debug.yml` to understand what was emitted.

**Warning signs:**
- `release/` directory has `latest.yml` (Windows) but no `latest-linux.yml` after a Linux build
- `autoUpdater.on('error')` fires immediately on Linux app launch with a 404 or "update yml not found" message
- `release/builder-debug.yml` shows no publish entries for the deb artifact

**Phase to address:**
Phase 1 (Build Verification) — verify manifest generation as part of the build checklist before any GitHub upload.

---

### Pitfall 2: GitHub Replaces Spaces with Dots in Asset Filenames, Breaking URL in latest-linux.yml

**What goes wrong:**
This project already hit this bug on Windows (`AC Map Editor Setup 1.1.3.exe` → `AC.Map.Editor.Setup.1.1.3.exe`). The Linux deb suffers the same: if `artifactName` uses spaces, GitHub uploads the file with dots, but `latest-linux.yml` records the electron-builder name (with spaces or dashes). electron-updater then fetches the wrong URL and gets a 404.

**Why it happens:**
GitHub Releases normalizes spaces to dots in uploaded asset filenames. electron-builder writes the URL using the template value from `artifactName` — which may differ from what GitHub actually stores. The current deb config uses `"artifactName": "ac-map-editor_${version}_${arch}.deb"` (all lowercase, underscores — safe). But if the productName ("AC Map Editor") ever bleeds into the filename, spaces become dots on GitHub while the yml records something different.

**How to avoid:**
- Keep `deb.artifactName` as `ac-map-editor_${version}_${arch}.deb` — no spaces, no capital letters.
- After building, verify that the URL inside `latest-linux.yml` exactly matches the filename that would appear on GitHub.
- Never rely on `productName` as the artifact filename — always set `artifactName` explicitly in the `deb` config block.

**Warning signs:**
- `latest-linux.yml` URL contains spaces or mixed-case words that match the productName
- 404 errors in electron-updater logs on Linux update check
- GitHub Release page shows `.deb` filename with dots where spaces were, but `latest-linux.yml` has dashes or spaces

**Phase to address:**
Phase 1 (Build Verification) — artifact name audit is part of the pre-upload checklist.

---

### Pitfall 3: Wrong Install Command — Shell Quoting Bug (Historic, Verify Not Regressed)

**What goes wrong:**
In electron-updater versions before mid-2024, `DebUpdater.doInstall()` passed the dpkg command to pkexec without proper shell quoting. The command `dpkg -i /path/to/file.deb || apt-get install -f -y` was not wrapped in single quotes, causing bash to parse it incorrectly. The update appeared to proceed (pkexec prompt appeared, user authenticated) but dpkg was never actually called. The app relaunched into the same old version.

**Why it happens:**
The `runCommandWithSudoIfNeeded` method in `LinuxUpdater.js` builds: `spawnSyncLog(sudo[0], [...sudo.slice(1), '/bin/bash', '-c', "'${commandWithArgs.join(' ')}'"])`. In older versions, the single-quote wrapping was missing. As of electron-updater 6.7.3 (this project's installed version), the source code in `LinuxUpdater.js` line 37 shows the fix is in place: the command is wrapped in single quotes.

**How to avoid:**
- The installed electron-updater is 6.7.3 — the fix is present (confirmed by reading `node_modules/electron-updater/out/LinuxUpdater.js`).
- After implementing deb auto-update, do a live end-to-end test: build v+1, upload, trigger update, confirm the new version number is actually installed — not just that the app restarted.
- Log `autoUpdater` to a file on Linux so the spawnSyncLog output is captured and reviewable.

**Warning signs:**
- App restarts after "installing" update but `app.getVersion()` still shows the old version
- No dpkg entries in `/var/log/dpkg.log` for the expected timestamp
- electron-updater log shows pkexec command executed but no follow-on apt-get fallback attempt

**Phase to address:**
Phase 2 (End-to-End Update Test) — the acceptance criterion must verify the new version is actually installed.

---

### Pitfall 4: pkexec Unavailable, No Polkit Agent, or Silent Failure

**What goes wrong:**
electron-updater's `determineSudoCommand()` checks for: `gksudo`, `kdesudo`, `pkexec`, `beesu` — in that order — then falls back to `sudo`. On Ubuntu 24.04 Desktop, pkexec is present but requires a running polkit agent to show a GUI authentication dialog. If the polkit agent is not running (headless environment, SSH session, non-standard desktop), pkexec fails silently with no prompt. The fallback to bare `sudo` also fails in a GUI app context: no tty is available, so sudo immediately exits with "no tty present and no askpass program specified."

**Why it happens:**
- `gksudo` and `kdesudo` are checked first but are absent on all modern distros (deprecated since ~2020).
- `pkexec --disable-internal-agent` suppresses the polkit agent's D-Bus interface, meaning no GUI dialog appears unless a separate polkit agent (e.g., gnome-polkit, lxpolkit) is already running as a user daemon.
- On Wayland sessions: pkexec GUI prompts require proper display forwarding; on some Wayland compositors they fail.
- `sudo` fallback has no tty in a GUI app → immediate EPERM.

**How to avoid:**
- Before calling `autoUpdater.quitAndInstall()` on Linux, test elevation availability by spawning `pkexec /bin/true` (or `pkexec echo ok`). If it fails or times out, show a manual install dialog instead.
- In the `update-install` IPC handler: add a Linux-specific pre-flight check. If elevation is unavailable, emit a user-visible error: "Install requires admin access. Download the latest .deb from [website] and run: `sudo dpkg -i ac-map-editor_X.X.X_amd64.deb`"
- Do not assume pkexec always succeeds on Ubuntu 24.04 just because the prior sandbox fix worked — the sandbox fix used a wrapper script at launch time (root not needed), but dpkg needs root.

**Warning signs:**
- `autoUpdater.on('error')` fires during install phase with "EPERM", "exit code 1", or "ENOENT" after pkexec
- No polkit authentication dialog ever appears when clicking "Install Update"
- User's system has no display (DISPLAY/WAYLAND_DISPLAY not set) when app is launched
- User runs the app from SSH without X11 forwarding

**Phase to address:**
Phase 2 (Install Flow Implementation) — error handling for all pkexec failure modes must be implemented before shipping.

---

### Pitfall 5: App Still Running When dpkg Executes, Causing File Lock / Partial Overwrite

**What goes wrong:**
`quitAndInstall()` in electron-updater calls `doInstall()` synchronously then `app.quit()` via `setImmediate`. On Linux, `dpkg -i` runs before `app.quit()` completes. dpkg tries to overwrite files that the still-running Electron process has open (the main executable, shared libraries in `/opt/AC Map Editor/`). dpkg either fails with "cannot overwrite" errors or — worse — partially overwrites files, leaving a broken installation.

**Why it happens:**
Verified in `node_modules/electron-updater/out/BaseUpdater.js`: `quitAndInstall()` calls `install()` first (synchronous dpkg), then `setImmediate(() => app.quit())`. The install runs before the process exits. On Windows, the NSIS installer coordinates this correctly — it waits for the process to exit before writing. dpkg has no such coordination.

**How to avoid:**
- Override the install sequencing: quit first, then dpkg. Options:
  1. Spawn a detached post-quit helper script (shell script) that sleeps 2 seconds then runs `pkexec dpkg -i [path]`, then call `app.quit()`.
  2. Set `autoInstallOnAppQuit = true` and do NOT call `quitAndInstall()` — let the quit handler trigger install. This still has the race, but the renderer is already gone by then.
  3. Override `doInstall` via a custom updater subclass that delays dpkg until after quit.
- The existing `tryLinuxAppImageRelaunch()` pattern (exec then quit) shows the right model: start the new process, then quit the current one.

**Warning signs:**
- dpkg log shows "cannot overwrite '/opt/AC Map Editor/ac-map-editor.bin'" or similar errors
- App fails to launch after an "update" (broken binary from partial overwrite)
- `dpkg --configure -a` or `sudo dpkg -i [file]` needed to recover

**Phase to address:**
Phase 2 (Install Flow) — the install sequence must explicitly handle the race between dpkg and process exit.

---

### Pitfall 6: User Cancels pkexec Password Prompt — App Has Already Quit

**What goes wrong:**
The current update flow (modeled on Windows): user clicks "Install" → `quitAndInstall()` is called → app quits → pkexec shows password prompt. If the user cancels the password prompt, the update is not installed but the app is already dead. The user must manually relaunch from the app menu. There is no feedback that the update failed.

**Why it happens:**
On Windows, canceling the NSIS elevation dialog means "the installer didn't run" — the app was already closed, and the user just relaunches normally. Same on Linux: the app closed, dpkg never ran, the old version is still installed. The difference is discoverability: on Windows the user understands they closed an installer; on Linux a context-free pkexec prompt appearing after the app closed is confusing.

**How to avoid:**
- On Linux, show the pkexec elevation test BEFORE closing the app. If it fails or is cancelled, abort the update flow and keep the app running.
- After pkexec cancellation, auto-relaunch the current (old) version: `execFile('/opt/AC Map Editor/ac-map-editor')`.
- Show a clear message before quitting: "The app will close. An administrator password prompt will appear. If you cancel the prompt, relaunch the app from your app menu."

**Warning signs:**
- Users report "the app disappeared without updating"
- No dpkg entry in `/var/log/dpkg.log` (confirms update never ran)
- Support reports: "I clicked install and now the app won't open" (must relaunch from desktop)

**Phase to address:**
Phase 2 (Install Flow UX) — Linux-specific pre-quit elevation check and cancel recovery.

---

### Pitfall 7: autoInstallOnAppQuit Triggers Unexpected dpkg on Normal Quit

**What goes wrong:**
`autoInstallOnAppQuit = true` is already set in `main.ts`. After an update is downloaded, the next time the user normally quits the app (File → Exit or the window close button), dpkg runs automatically with a pkexec prompt. This surprises users who expected a clean quit. On a slow machine or a large update, the pkexec prompt appears unexpectedly after the app window is gone.

**Why it happens:**
Verified in `node_modules/electron-updater/out/BaseUpdater.js`: `addQuitHandler()` registers an `onQuit` callback. When the app exits with code 0 (any normal quit), `install(true, false)` is called synchronously. This behavior is intentional for Windows (silent NSIS install) but on Linux it triggers a visible pkexec prompt that the user did not request.

**How to avoid:**
- Set `autoUpdater.autoInstallOnAppQuit = false` explicitly for Linux. Gate it with `if (isLinux) autoUpdater.autoInstallOnAppQuit = false;` in `setupAutoUpdater()`.
- On Linux, always present an explicit "Install Update" action via the UI (already wired via `update-install` IPC). Never install silently on quit.

**Warning signs:**
- A polkit password prompt appears after users close the app normally
- QA testers report that "closing the app sometimes prompts for a password"

**Phase to address:**
Phase 2 (Install Flow Configuration) — add `autoInstallOnAppQuit = false` on Linux.

---

### Pitfall 8: Wrapper Script Missing or Overwritten After deb Re-install

**What goes wrong:**
The current afterPack hook (`scripts/remove-sandbox.js`) renames `ac-map-editor` → `ac-map-editor.bin` and creates a shell wrapper. Both files are packaged into the `.deb`. When dpkg installs a new `.deb`, it overwrites both files from the new package — which should contain the renamed binary and wrapper script from the new build's afterPack run. The risk: if the Linux `.deb` was built without afterPack running correctly (build on wrong host, hook error swallowed), the installed `.deb` contains a raw Electron binary as `ac-map-editor` with no wrapper and no `--no-sandbox`. After update, the app crashes at launch on Ubuntu 24.04.

**Why it happens:**
The afterPack hook currently returns without error even if the executable doesn't exist at `execPath` (line 28-31 of `remove-sandbox.js`). A silent failure produces a `.deb` with the raw Electron binary — identical to what triggered the original AppArmor crash. This `.deb` will install successfully (dpkg doesn't check for the wrapper) and then crash at launch.

**How to avoid:**
- After every Linux build, inspect the `.deb` contents: `dpkg --contents release/ac-map-editor_*.deb | grep ac-map-editor`. Verify both `./opt/AC Map Editor/ac-map-editor` (the wrapper script) and `./opt/AC Map Editor/ac-map-editor.bin` (the real binary) are present.
- Make the afterPack hook exit with a non-zero code if the rename fails: `process.exit(1)` instead of `return`.
- After installing an update via dpkg, check `/opt/AC Map Editor/ac-map-editor` is a shell script: `file '/opt/AC Map Editor/ac-map-editor'` should output "ASCII text" not "ELF".

**Warning signs:**
- App crashes with SIGTRAP or "The SUID sandbox helper binary was found, but is not configured correctly" immediately after an auto-update
- `/opt/AC Map Editor/ac-map-editor` is an ELF 64-bit binary (not a shell script)
- Build log shows afterPack ran but with `[afterPack] Executable not found` message (currently exits silently)

**Phase to address:**
Phase 1 (Build Verification) + Phase 2 (Post-Install Smoke Test) — both the .deb content and the installed result must be checked.

---

### Pitfall 9: Download Cache Corruption or Root-Owned Files After Failed Install

**What goes wrong:**
electron-updater downloads the `.deb` to `~/.config/ac-map-editor-updater/pending/` (per `updaterCacheDirName: ac-map-editor-updater` in `app-update.yml`). If a previous failed install attempt ran pkexec (which spawns as root) and left files in this directory owned by root, subsequent download attempts fail with EACCES. The updater emits an error and gives up — there is no self-healing for permission errors.

**Why it happens:**
Verified in `DownloadedUpdateHelper.js`: `cleanCacheDirForPendingUpdate()` uses `emptyDir()` which fails silently if the directory is root-owned. The next download attempt tries to write to the same directory and fails. The sha512 validation and cache recovery logic assumes the download can be retried — but it cannot if the directory is inaccessible.

**How to avoid:**
- In the `update-install` IPC handler (or in an `autoUpdater.on('error')` handler), check if the pending directory is accessible. If not, attempt `chown` (not possible from user process) or prompt the user to run `rm -rf ~/.config/ac-map-editor-updater/pending/`.
- If dpkg is spawned via pkexec and writes to the download cache as root (unlikely but possible), this creates the problem. Keep the download and the install as separate steps: download to user-owned temp, then pass only the path to pkexec.

**Warning signs:**
- `autoUpdater.on('error')` fires with EACCES on download start
- `ls -la ~/.config/ac-map-editor-updater/pending/` shows root ownership
- Update check succeeds but download never starts (error emitted immediately)

**Phase to address:**
Phase 2 (Error Recovery) — explicit cache permission check and user-visible recovery instructions.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Reusing Windows update UI flow for Linux | Less code, one code path | Confusing UX (app quits before pkexec prompt, no cancel recovery) | Never — Linux needs a separate install flow |
| Using `autoInstallOnAppQuit = true` on Linux | Matches Windows behavior | Users see unexpected pkexec prompts when quitting normally | Never — disable on Linux |
| Skipping end-to-end update test on real deb | Faster iteration | Pitfalls 3, 5, 8 all invisible until production | Never — always test the full dpkg install |
| Assuming pkexec always works on Ubuntu | Simpler code | Breaks on SSH sessions, headless, non-GNOME setups | Never — always handle pkexec failure gracefully |
| Building deb on Windows (cross-compile) | Convenient | afterPack hook path behavior differs; sandbox issues may not surface | Never for final release — always build deb on Linux host |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| GitHub Releases + latest-linux.yml | Uploading .deb separately, GitHub renames it, URL mismatch in yml | Set `deb.artifactName` without spaces (already `ac-map-editor_${version}_${arch}.deb`); verify URLs match after upload |
| pkexec + electron-updater | Assuming pkexec always shows a GUI prompt on Ubuntu | Test elevation availability before quitting the app; handle EACCES/exit-code-1 explicitly |
| dpkg + running Electron process | Calling `install()` before `app.quit()` (current BaseUpdater behavior) | Quit first via a detached post-quit helper script, then dpkg runs after process exits |
| electron-updater + autoInstallOnAppQuit | Leaving the default `true` on Linux | Set to `false` on Linux; always present an explicit install action in UI |
| afterPack + deb re-install | Assuming the installed wrapper persists across updates automatically | Include both `ac-map-editor` (shell script) and `ac-map-editor.bin` in every .deb; verify via `dpkg --contents` |
| electron-updater + deb-only Linux build | Expecting latest-linux.yml to be auto-generated | Verify after each build; check builder-debug.yml for publish output |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Not verifying sha512 of downloaded .deb | Tampered update if GitHub is compromised or download intercepted | electron-updater verifies sha512 automatically (confirmed in DownloadedUpdateHelper source) — do not skip or override this |
| Skipping download integrity check for faster CI | Faster builds | Never skip — sha512 check is the only tamper detection before root-level dpkg install |
| Exposing pkexec command details in error dialogs | Reveals internal paths to users | Show generic "install failed" with download link; log detailed error to file only |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| App quits before pkexec prompt — user cancels — app is gone | User must manually relaunch; no feedback update didn't install | Show elevation test prompt while app is still running; only quit after confirmed elevation |
| No confirmation of what version was installed | Users can't tell if update worked | Show "Updated to v1.x.x" splash or About dialog message on first launch after update |
| Generic "Update Error" with no actionable text | User has no recourse | Include: "Download the latest .deb from [website] and run: `sudo dpkg -i ac-map-editor_X.X.X_amd64.deb`" |
| Progress bar freezes at 100% while dpkg runs | User thinks app crashed | Add "Installing..." state after download completes, before calling quitAndInstall |
| Unexpected pkexec prompt on normal app quit | Users think the app is broken | Set autoInstallOnAppQuit=false on Linux; require explicit user action |

---

## "Looks Done But Isn't" Checklist

- [ ] **latest-linux.yml generated:** After Linux build, verify `release/latest-linux.yml` exists and its `url` field exactly matches the actual filename on GitHub (no space→dot mismatch).
- [ ] **New version actually installed:** After triggering update, confirm `app.getVersion()` returns the new version number — not just that the app relaunched.
- [ ] **Wrapper script intact after update:** After dpkg installs the update, check `/opt/AC Map Editor/ac-map-editor` is still the bash wrapper (not an ELF binary): `file '/opt/AC Map Editor/ac-map-editor'`.
- [ ] **Update cancelled recovery:** Cancel the pkexec prompt mid-update; confirm the app relaunches cleanly or provides a clear message.
- [ ] **Error case handled:** Disconnect network mid-download; confirm error event fires and the download cache is cleaned up properly.
- [ ] **autoInstallOnAppQuit=false on Linux:** Confirm that normally quitting the app after a downloaded update does NOT trigger a pkexec prompt.
- [ ] **Cache directory permissions:** After a failed update, confirm `~/.config/ac-map-editor-updater/pending/` is owned by the current user, not root.
- [ ] **dpkg.log entry present:** After a successful update, confirm `/var/log/dpkg.log` shows a `status installed ac-map-editor:amd64` entry for the new version.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| latest-linux.yml not generated | LOW | Rebuild the Linux deb; re-upload both .deb and latest-linux.yml to GitHub Release |
| Filename URL mismatch (spaces/dots) | LOW | Edit latest-linux.yml url field to match GitHub's actual asset name; re-upload the yml |
| Wrong install command (old quoting bug) | LOW | Pin electron-updater to 6.7.3+; already fixed in current version |
| pkexec unavailable or no polkit agent | MEDIUM | Show manual install dialog with download URL; user runs `sudo dpkg -i` from terminal |
| App quit before dpkg — update failed | MEDIUM | User relaunches app; next launch finds no pending update (cache cleared); re-downloads and retries |
| dpkg partial overwrite — broken install | HIGH | User runs `sudo dpkg --configure -a` then `sudo dpkg -i [latest.deb]` from terminal; ship recovery instructions on website |
| Stale cache with root-owned files | MEDIUM | User runs `sudo rm -rf ~/.config/ac-map-editor-updater/`; app re-downloads on next launch |
| Wrapper script missing after update | HIGH | App crashes at launch; must reinstall from website; fix afterPack hook and rebuild deb |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| latest-linux.yml not generated | Phase 1: Build & Publish setup | After Linux build: `ls release/latest-linux.yml` |
| GitHub filename spaces→dots | Phase 1: Build & Publish setup | Inspect `release/latest-linux.yml` url field vs. GitHub asset name after upload |
| Wrong install command (quoting) | Phase 2: Install flow | End-to-end: confirm new version string after dpkg |
| pkexec unavailable / no polkit | Phase 2: Install flow error handling | Test with pkexec removed from PATH; verify user-visible error message |
| App still running during dpkg | Phase 2: Install flow sequencing | Check `/var/log/dpkg.log` for errors; inspect `/opt` for partial overwrites |
| User cancels pkexec prompt | Phase 2: Install flow UX | QA: cancel the prompt; confirm app-relaunch or clear error message |
| autoInstallOnAppQuit on Linux | Phase 2: Install flow configuration | Normal quit with pending update does NOT trigger pkexec prompt |
| Wrapper script broken after update | Phase 1: Build verification + Phase 2 post-install | `dpkg --contents` inspection; `file` check on installed binary |
| Download cache corruption | Phase 2: Error recovery | Interrupt download mid-way; verify cache cleaned; re-download succeeds |

---

## Sources

- `E:\NewMapEditor\node_modules\electron-updater\out\DebUpdater.js` — verified dpkg/apt install command, package manager detection (electron-updater v6.7.3)
- `E:\NewMapEditor\node_modules\electron-updater\out\LinuxUpdater.js` — verified sudo detection chain (`gksudo → kdesudo → pkexec → beesu → sudo`), `runCommandWithSudoIfNeeded` quoting (line 37), `installerPath` space escaping
- `E:\NewMapEditor\node_modules\electron-updater\out\BaseUpdater.js` — verified `quitAndInstall()` ordering (install runs synchronously, THEN `setImmediate(quit)`), `autoInstallOnAppQuit` behavior
- `E:\NewMapEditor\node_modules\electron-updater\out\DownloadedUpdateHelper.js` — verified sha512 cache validation, `cleanCacheDirForPendingUpdate()`, recovery paths
- `E:\NewMapEditor\electron\main.ts` — project's existing update setup (autoDownload=true, autoInstallOnAppQuit=true, tryLinuxAppImageRelaunch)
- `E:\NewMapEditor\scripts\remove-sandbox.js` — afterPack wrapper script; identified silent-failure mode (lines 28-31)
- `E:\NewMapEditor\package.json` — deb artifactName config, electron-updater 6.7.3, publish config
- `E:\NewMapEditor\release\linux-unpacked\resources\app-update.yml` — updaterCacheDirName: ac-map-editor-updater
- [GitHub Issue #8395: Linux deb auto updater doesn't update due wrong install command](https://github.com/electron-userland/electron-builder/issues/8395)
- [GitHub Issue #6330: Does electron-updater support auto updating on Linux non-AppImage packages?](https://github.com/electron-userland/electron-builder/issues/6330)
- [GitHub Issue #4519: Adding deb format to latest-linux.yml file](https://github.com/electron-userland/electron-builder/issues/4519)
- [GitHub Issue #3937: The name in latest.yml is different from the installer name](https://github.com/electron-userland/electron-builder/issues/3937)
- [GitHub Issue #7569: electron-updater rpm, unable to automatically update](https://github.com/electron-userland/electron-builder/issues/7569)
- [GitHub PR #7060: feat: Introducing deb and rpm auto-updates](https://github.com/electron-userland/electron-builder/pull/7060)
- [GitHub Issue #7724: Error: sha512 checksum mismatch](https://github.com/electron-userland/electron-builder/issues/7724)
- [electron-builder Auto Update docs](https://www.electron.build/auto-update.html)
- `E:\NewMapEditor\.planning\milestones\v1.1.2-linux-ROADMAP.md` — prior art: AppImage relaunch wiring, sandbox fix, .deb decision

---
*Pitfalls research for: Linux .deb auto-update integration for AC Map Editor*
*Researched: 2026-02-20*
