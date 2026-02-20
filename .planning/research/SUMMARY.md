# Project Research Summary

**Project:** AC Map Editor — v1.1.4 Linux .deb Auto-Update
**Domain:** Linux .deb auto-update for Electron desktop app (electron-updater + electron-builder)
**Researched:** 2026-02-20
**Confidence:** HIGH

## Executive Summary

The v1.1.4 milestone adds Linux .deb auto-update to the AC Map Editor. The mechanism is almost entirely already in place. The installed `electron-updater@6.7.3` contains a fully functional `DebUpdater` class that handles download, SHA512 verification, privilege escalation via pkexec, dpkg install, and app relaunch. The installed `electron-builder@25.1.8` automatically writes a `package-type` file into the .deb's resources directory at build time — all that is needed to trigger `DebUpdater` selection at runtime. No new npm packages are required, no new IPC handlers, no new architecture. The existing `update-install` IPC handler already calls `autoUpdater.quitAndInstall(true, true)` correctly for .deb installs.

The implementation work is primarily verification, configuration hardening, and UX polish rather than new feature code. Three things must be confirmed end-to-end: (1) `latest-linux.yml` is generated and uploaded to GitHub Releases alongside the `.deb`, (2) the `package-type` file is present inside the built `.deb`, and (3) the pkexec privilege elevation flow works on Ubuntu 22.04/24.04 GNOME. Two code changes are required: disable `autoInstallOnAppQuit` on Linux (currently `true`, causes an unexpected pkexec prompt on normal quit), and add a Linux-specific pre-warning dialog before calling `quitAndInstall()` so the OS password prompt is not surprising.

The most significant implementation risk is install sequencing: `BaseUpdater.quitAndInstall()` calls `doInstall()` (which spawns dpkg) synchronously before `app.quit()` runs via `setImmediate`. This creates a window where dpkg tries to overwrite files that Electron still has open. The mitigation is to sequence quit-first via a detached shell helper. Secondary risks are pkexec availability (handle gracefully with a fallback to the GitHub releases page) and the afterPack wrapper script surviving dpkg re-install (verify via `dpkg --contents` after every build). The pkexec quoting bug (issue #8395) that caused dpkg to never actually run is confirmed fixed in the installed 6.7.3 — no workaround needed.

---

## Key Findings

### Recommended Stack

No new dependencies are required. `electron-updater@6.7.3` (installed) already includes `DebUpdater`. `electron-builder@25.1.8` (installed) already writes the `package-type` dispatch file and `latest-linux.yml` at build time. The entire auto-update mechanism is present; the gap is in build pipeline confirmation and runtime UX decisions.

The critical runtime dispatch chain: electron-builder writes `resources/package-type` containing `"deb"` during `npm run electron:build:linux` — at app startup, `electron-updater` reads this file and instantiates `DebUpdater` instead of the default `AppImageUpdater`. This is verified directly from installed source code in `node_modules`.

**Core technologies:**
- `electron-updater@6.7.3` — download, SHA512 verification, pkexec install, relaunch — already installed; no upgrade needed; issue #8395 quoting fix confirmed present
- `electron-builder@25.1.8` — writes `package-type` (FpmTarget.js line 117) and generates `latest-linux.yml` (updateInfoBuilder.js lines 51-53) — fully automatic; no configuration changes needed
- `pkexec` (system) — polkit-based GUI privilege elevation for dpkg — pre-installed on Ubuntu 22.04+ and Debian 12 with GNOME/KDE; auto-detected by `determineSudoCommand()` priority chain

### Expected Features

The feature surface is minimal because most behavior is inherited from the existing Windows update flow. The delta is Linux-specific UX hardening.

**Must have (table stakes):**
- Silent background update check on launch — same `checkForUpdates()` call; works for .deb unchanged
- Download progress display — same `download-progress` event; existing banner works unchanged
- "Ready to install" prompt — same `update-downloaded` event; banner button triggers install
- Privilege escalation via pkexec — OS-native GUI password dialog; handled internally by `DebUpdater.doInstall()`
- App quits then relaunches after install — `DebUpdater.doInstall()` with `isForceRunAfter=true` calls `app.relaunch()` then `app.quit()`
- Error handling with user-visible message — same `error` event; existing error dialog path works
- `autoInstallOnAppQuit = false` on Linux — prevents unexpected pkexec prompt on normal quit

**Should have (differentiators):**
- Pre-warning dialog before pkexec: "This will close the app and require your administrator password" — eliminates surprise
- Linux-specific banner text: "Update ready — click to install (requires password)" — sets correct expectations
- pkexec fallback: if unavailable, open GitHub releases page in browser instead of failing silently
- Install sequencing fix: quit first, then dpkg — avoids file-lock race from `BaseUpdater`'s current behavior
- `.update-restart` marker verified in Linux code path — ensures "just updated" splash shows correctly after relaunch

**Defer (v2+):**
- APT repository / PPA distribution — separate infrastructure project; only warranted if user demand grows
- Snap or Flatpak distribution — different sandboxing model; out of scope until core update flow is validated
- Smoke test on Linux Mint with Cinnamon — Ubuntu 24.04 GNOME is the primary target for v1.1.4

### Architecture Approach

The architecture is unchanged from Windows. `DebUpdater` slots in transparently via the `package-type` dispatch — main process, IPC handler, renderer, and preload are structurally identical. The only code changes are in `electron/main.ts` `setupAutoUpdater()`: disable `autoInstallOnAppQuit` on Linux, and add a pre-warning dialog call before the `quitAndInstall()` invocation in the `update-install` handler. Optionally add a clarifying comment to `tryLinuxAppImageRelaunch()` noting it correctly returns false for .deb installs.

**Major components:**
1. `electron-builder` (FpmTarget + updateInfoBuilder) — writes `package-type` and generates `latest-linux.yml` at build time; fully automatic; no code needed
2. `electron-updater` (DebUpdater) — selected at runtime via `package-type`; handles download to `~/.cache/ac-map-editor-updater/pending/`, SHA512 verify, pkexec + dpkg install, `app.relaunch()`; no code needed
3. `electron/main.ts` (setupAutoUpdater) — existing wiring; needs `autoInstallOnAppQuit = false` on Linux and a pre-warning dialog before `quitAndInstall()` on Linux; 2-3 small changes
4. GitHub Releases — must include both `latest-linux.yml` and `ac-map-editor_<ver>_amd64.deb`; generated and uploaded automatically by electron-builder with `--publish`

### Critical Pitfalls

1. **`latest-linux.yml` not generated for deb-only builds** — After every Linux build, verify `release/latest-linux.yml` exists and contains a `.deb` URL. Without this file on GitHub Releases, `checkForUpdates()` returns nothing. Check `release/builder-debug.yml` if the manifest is missing. Prevention: Phase 1 build verification.

2. **`autoInstallOnAppQuit = true` causes surprise pkexec prompt on normal quit** — The current `main.ts` sets this to `true`. On Linux this triggers a polkit password dialog when the user closes the app normally after a download. Fix: `if (isLinux) autoUpdater.autoInstallOnAppQuit = false` in `setupAutoUpdater()`. Prevention: Phase 2.

3. **dpkg runs before `app.quit()` — file lock / partial overwrite** — `BaseUpdater.quitAndInstall()` calls `doInstall()` synchronously then `setImmediate(app.quit)`. dpkg tries to overwrite Electron's open files. Fix: detached post-quit helper script that sleeps briefly then runs `pkexec dpkg -i [path]`; `app.quit()` fires from main process first. Prevention: Phase 2.

4. **Wrapper script (`ac-map-editor` shell wrapper) missing after dpkg re-install** — If the Linux .deb was built without afterPack running correctly, the `.deb` contains a raw Electron binary instead of the wrapper+binary pair. After update, app crashes on Ubuntu 24.04 (AppArmor SUID sandbox). Fix: harden afterPack to `process.exit(1)` on failure; verify `dpkg --contents release/*.deb` shows both `ac-map-editor` (script) and `ac-map-editor.bin` after every build. Prevention: Phase 1 and Phase 2 post-install smoke test.

5. **pkexec unavailable or polkit agent not running** — On headless, SSH, or minimal desktop installs, pkexec fails silently. Fix: before calling `quitAndInstall()`, probe pkexec availability. If unavailable, show a dialog with download link and manual dpkg command. Prevention: Phase 2.

---

## Implications for Roadmap

Based on research, the milestone fits into two implementation phases preceded by build pipeline verification.

### Phase 1: Build and Publish Verification
**Rationale:** Nothing works until `latest-linux.yml` is generated and uploaded correctly alongside the `.deb`. This is the foundational prerequisite — all subsequent runtime testing depends on correct release artifacts. Must be confirmed first before any runtime work begins.
**Delivers:** A Linux build that produces both `latest-linux.yml` and `ac-map-editor_<ver>_amd64.deb` and uploads them to GitHub Releases with correct content.
**Addresses:** Table stakes update check, download, SHA512 verification — all depend on correct release artifacts being present.
**Avoids:**
- Pitfall 1 (manifest not generated) — verify `release/latest-linux.yml` exists after build
- Pitfall 2 (filename space-to-dot mismatch on GitHub) — confirm `artifactName` has no spaces (already `ac-map-editor_${version}_${arch}.deb`)
- Pitfall 8 (wrapper script missing from .deb) — inspect `dpkg --contents release/*.deb`; harden afterPack to fail loudly
**Work items:**
- Run `npm run electron:build:linux` on Ubuntu host; verify `release/latest-linux.yml` is generated
- Confirm `latest-linux.yml` `url` field matches actual GitHub asset filename (no space-to-dot mismatch)
- Confirm both `latest-linux.yml` and `.deb` upload to GitHub Release when building with `--publish`
- Run `dpkg --contents release/*.deb | grep ac-map-editor` — verify wrapper script `ac-map-editor` (ASCII text) and `ac-map-editor.bin` (ELF) both present
- Harden `scripts/remove-sandbox.js` afterPack hook: replace silent return on missing executable with `process.exit(1)`
- Verify `resources/package-type` contains `"deb"` inside the built .deb (extract with `dpkg-deb --fsys-tarfile`)

### Phase 2: Install Flow Implementation and UX
**Rationale:** With build artifacts confirmed, implement the runtime code changes. All changes concentrate in `electron/main.ts`. This phase delivers a safe, user-friendly install flow with graceful error handling for all failure modes identified in PITFALLS.md.
**Delivers:** Working end-to-end update on Ubuntu 22.04/24.04 — from update check through pkexec prompt through dpkg install through app relaunch, with clear UX at each step and graceful degradation when pkexec is unavailable.
**Uses:** `electron-updater@6.7.3` DebUpdater (installed), `isLinux` from `electron/platform.ts` (existing).
**Avoids:**
- Pitfall 4 (autoInstallOnAppQuit surprise) — `autoInstallOnAppQuit = false` on Linux
- Pitfall 5 (dpkg/process race) — detached post-quit sequencing
- Pitfall 6 (user cancels pkexec, app is gone) — pre-warning dialog + elevation test before quitting
- Pitfall 7 (duplicate of autoInstallOnAppQuit — addressed by same fix)
- Pitfall 9 (download cache corruption from root-owned files) — document recovery path; handle EACCES in error handler
**Work items:**
- `if (isLinux) autoUpdater.autoInstallOnAppQuit = false` in `setupAutoUpdater()`
- Linux-conditional banner text: "Update ready — click to install (requires password)"
- Pre-warning dialog before `quitAndInstall()` on Linux: one `dialog.showMessageBox()` call
- Install sequencing fix: detached helper script or `app.quit()` first approach to avoid dpkg file-lock
- pkexec availability probe + `shell.openExternal(releasesUrl)` fallback if unavailable
- Add clarifying comment to `tryLinuxAppImageRelaunch()` noting it is a no-op for .deb installs
- Verify `.update-restart` marker is written before `app.quit()` fires in the Linux install path
- End-to-end test: trigger update, confirm `app.getVersion()` returns new version, verify `/var/log/dpkg.log` entry
- Test pkexec cancel recovery: cancel the polkit prompt; confirm app provides a clear message or recovery path

### Phase Ordering Rationale

Phase 1 before Phase 2 because:
- Phase 2 integration testing requires a live GitHub Release with correct artifacts — no point testing the runtime flow against a missing or malformed manifest
- Build verification catches the wrapper script pitfall (Pitfall 8) before it can corrupt a user install in production
- `latest-linux.yml` generation is the single most-reported failure point for electron-builder deb updates — eliminating it first de-risks all downstream testing
- The Phase 1 work is on the Ubuntu build host, Phase 2 work is on the Windows dev machine — they can be done sequentially in one session

### Research Flags

Phases with well-understood patterns — no `gsd:research-phase` needed:
- **Phase 1 (Build Verification):** electron-builder behavior verified directly from installed `node_modules` source code. All verification steps are concrete commands (`dpkg --contents`, `dpkg-deb --fsys-tarfile`, file existence checks). No research needed — mechanical verification.
- **Phase 2 (Install Flow):** `DebUpdater` behavior verified from source; pkexec behavior documented across multiple sources; patterns are clear. All code changes are small and targeted. No novel patterns required.

One implementation detail that may need iteration during execution:
- **Install sequencing (Pitfall 5):** The detached post-quit helper approach is the recommended mitigation, but the exact mechanism (shell script spawned with `child_process.spawn` `detached: true`, timing, correct installed path detection after dpkg replaces files) may need iteration on Ubuntu hardware. Treat as an implementation detail to refine during Phase 2 execution, not a research blocker.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All claims verified against installed `node_modules` source code — `electron-updater` 6.7.3, `app-builder-lib` 25.1.8, project's `main.ts` and `platform.ts`. No external documentation guesswork. |
| Features | MEDIUM-HIGH | Table stakes features verified from source. UX recommendations (pre-warning dialog, banner text, pkexec fallback) are inferred from ecosystem patterns and competitor analysis — judgment calls, not verified behavior. |
| Architecture | HIGH | Data flow verified step-by-step from source code. Integration point map is concrete — specific files, line numbers, verified IPC paths. No guesswork. |
| Pitfalls | HIGH | Critical pitfalls verified from source (`BaseUpdater` install-before-quit ordering confirmed at source, `autoInstallOnAppQuit` behavior verified, afterPack silent-failure mode identified at lines 28-31). GitHub issues referenced and confirmed closed with fixes. |

**Overall confidence:** HIGH

### Gaps to Address

- **Wayland pkexec GUI prompt reliability:** Ubuntu 24.04 default GNOME session runs Electron via XWayland, so pkexec GUI prompts should work. Pure Wayland without XWayland has known failures (Launchpad bug #1713313). Mitigated by the pkexec availability probe + fallback to releases page. Validate during Phase 2 execution if a Wayland-only environment is available — not a blocker for planning.

- **Install sequencing implementation details:** The recommended fix for Pitfall 5 (dpkg running before process exits) requires a detached helper approach. The exact mechanism and timing need to be worked out during Phase 2 plan/execute. The problem is well-understood; the approach is correct; the details need fleshing out at implementation time.

- **`latest-linux.yml` generation for deb-only target:** PITFALLS.md flags this as a known issue with older electron-builder versions. `25.1.8` is expected to handle it correctly, but must be confirmed empirically on the first Linux build. If the manifest is not generated, the fix is a build configuration adjustment — not a code change.

---

## Sources

### Primary (HIGH confidence — verified from installed source code)

- `E:\NewMapEditor\node_modules\electron-updater\out\main.js` — `package-type` dispatch logic, `doLoadAutoUpdater()`, DebUpdater selection
- `E:\NewMapEditor\node_modules\electron-updater\out\DebUpdater.js` — `doDownloadUpdate()`, `doInstall()`, `installWithCommandRunner()`
- `E:\NewMapEditor\node_modules\electron-updater\out\LinuxUpdater.js` — sudo detection chain (`gksudo → kdesudo → pkexec → beesu → sudo`), pkexec invocation with `--disable-internal-agent`, install command quoting (issue #8395 fix at line 37 confirmed present), `installerPath` space escaping
- `E:\NewMapEditor\node_modules\electron-updater\out\BaseUpdater.js` — `quitAndInstall()` ordering (install synchronous, quit via `setImmediate`), `autoInstallOnAppQuit` quit handler behavior
- `E:\NewMapEditor\node_modules\electron-updater\out\AppUpdater.js` — `cacheDir` construction from `baseCachePath + updaterCacheDirName`
- `E:\NewMapEditor\node_modules\electron-updater\out\DownloadedUpdateHelper.js` — cache path, SHA512 verification, `cleanCacheDirForPendingUpdate()` behavior on permission errors
- `E:\NewMapEditor\node_modules\electron-updater\out\providers\Provider.js` — `getChannelFilePrefix()` returns `-linux` for x64, confirms `latest-linux.yml` filename
- `E:\NewMapEditor\node_modules\app-builder-lib\out\targets\FpmTarget.js` line 117 — `package-type` file written at build time
- `E:\NewMapEditor\node_modules\app-builder-lib\out\publish\updateInfoBuilder.js` lines 51-53 — `latest-linux.yml` filename generation
- `E:\NewMapEditor\electron\main.ts` — existing `setupAutoUpdater()`, `update-install` IPC handler, `tryLinuxAppImageRelaunch()` integration
- `E:\NewMapEditor\electron\platform.ts` — `isLinux` detection, `tryLinuxAppImageRelaunch()` returns false for .deb
- `E:\NewMapEditor\electron\preload.ts` — `installUpdate()` IPC bridge
- `E:\NewMapEditor\src\App.tsx` lines 424-476 — update banner UI (checking/downloading/progress/ready states)
- `E:\NewMapEditor\scripts\remove-sandbox.js` lines 28-31 — afterPack hook; silent-failure mode identified
- `E:\NewMapEditor\release\linux-unpacked\resources\app-update.yml` — `updaterCacheDirName: ac-map-editor-updater`

### Secondary (MEDIUM confidence — official docs, confirmed GitHub issues)

- [GitHub Issue #8395](https://github.com/electron-userland/electron-builder/issues/8395) — DebUpdater install command quoting bug; fix confirmed present in installed 6.7.3
- [GitHub PR #7060](https://github.com/electron-userland/electron-builder/pull/7060) — original deb/rpm auto-update feature introduction (Nov 2022)
- [electron-builder Auto Update docs](https://www.electron.build/auto-update.html) — Linux supported targets, `latest-linux.yml` generation
- [DebUpdater class docs](https://www.electron.build/electron-updater.Class.DebUpdater.html) — API overview
- Real-world `latest-linux.yml` examples from Beeper and balena-etcher GitHub releases — YAML format verification

### Tertiary (MEDIUM confidence — platform documentation, forum sources)

- [Launchpad bug #1713313](https://bugs.launchpad.net/bugs/1713313) — pkexec Wayland GUI prompt failure; known platform limitation
- pkexec headless failure patterns — requires running polkit agent; fails in SSH/headless/non-GNOME without polkit agent (Arch wiki + multiple forum sources)

---

*Research completed: 2026-02-20*
*Ready for roadmap: yes*
