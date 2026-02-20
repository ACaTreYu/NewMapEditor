# Feature Landscape

**Domain:** Linux .deb auto-update for Electron desktop app
**Researched:** 2026-02-20
**Confidence:** MEDIUM — electron-updater DebUpdater is real and documented; behavior details verified via GitHub issues; UX expectations inferred from ecosystem patterns and competitor analysis

---

## Context: What Already Exists (Windows)

The existing update system on Windows is the baseline. Linux must either match or gracefully downgrade each capability.

| Existing Windows Feature | How it Works | Linux .deb Equivalent |
|--------------------------|-------------|----------------------|
| Silent background check on launch (5s delay) | `autoUpdater.checkForUpdates()` | Same — DebUpdater uses same API |
| Periodic re-check every 30 min | `setInterval` | Same |
| "Checking..." banner | `checking-for-update` event | Same |
| Silent download with % progress banner | `autoDownload = true` + `download-progress` event | Same — DebUpdater downloads .deb |
| "Ready" banner with click-to-install | `update-downloaded` event | Same event fires; install behavior differs |
| Click "Ready" banner -> quitAndInstall(true,true) | NSIS silent install + relaunch | Different: pkexec + dpkg -i + app.relaunch() |
| autoInstallOnAppQuit | NSIS triggered on quit | Same API; DebUpdater calls dpkg on quit |
| Update-restart splash screen detection (.update-restart marker) | Marker file checked on startup | Relaunch after dpkg works differently — marker still applies |

**Key constraint:** `quitAndInstall(true, true)` works on Windows (NSIS silent install). On Linux .deb, it triggers pkexec for privilege elevation, then runs `dpkg -i <file> || apt-get install -f -y`, then relaunches via `app.relaunch()` if `autoRunAppAfterInstall = true`.

---

## Table Stakes

Features users expect. Missing = update feels broken or absent.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Update available notification | Users need to know updates exist — not knowing feels like abandonment | LOW | Same `update-available` event; existing "Downloading..." banner already works |
| Download progress display | Silent download with no feedback feels like a hang/crash | LOW | Same `download-progress` event; existing % banner works unchanged |
| "Ready to install" prompt | Update is useless if user doesn't know it's ready | LOW | Same `update-downloaded` event; existing "click to restart" banner works |
| Privilege escalation UI (password prompt) | dpkg requires root; polkit/pkexec provides a native GUI password dialog | MEDIUM | pkexec spawns the system's polkit authentication agent (GNOME, KDE, etc). User sees a standard OS password dialog. This is the Linux-native UX for privileged installs — NOT jarring if users recognize it |
| App quits cleanly before dpkg runs | dpkg -i on a running .deb can fail or produce partial installs | LOW | DebUpdater calls `app.quit()` first; dpkg then runs on the exited process. Files are replaced cleanly. |
| App relaunches after install | User expects to return to the app after update | LOW | DebUpdater calls `app.relaunch()` after dpkg completes if `autoRunAppAfterInstall = true` (default). Spawns new process from installed path. |
| Manual "Check for Updates" still works | Power users and support scenarios require on-demand checks | LOW | Same `checkForUpdates()` call; same "No updates" / error dialog path |
| Error handling with user-visible message | Network failures, pkexec cancellation, dpkg errors must not silently fail | LOW | `error` event fires same as Windows; existing error dialog path works |

---

## Differentiators

Features that meaningfully improve the Linux .deb update UX beyond the minimum.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Graceful pkexec fallback to "open release page" | If pkexec is unavailable (KDE without polkit agent, headless systemd, SSH session), rather than a cryptic failure the app opens the GitHub releases page in the browser so the user can download manually | LOW | Detect pkexec absence before attempting; use `shell.openExternal(releaseUrl)` as fallback. Most non-desktop environments won't have a polkit agent anyway. |
| Explicit "password required" pre-warning | Before calling quitAndInstall, show a dialog: "Installing the update requires your administrator password. Continue?" — so the OS password prompt isn't surprising | LOW | One `dialog.showMessageBox()` call before triggering install. Reduces user confusion about why the OS is asking for a password. |
| Distinguish "download ready" from "install now" | On Windows, "Ready" click = immediate silent install. On Linux, "Ready" click = download was already done, but install still needs pkexec. The banner label should reflect this: "Update ready — click to install (requires password)" | LOW | Change banner text conditionally based on `process.platform === 'linux'`. Reuses existing banner component. |
| Update-restart marker survives relaunch | The existing `.update-restart` marker file triggers a "just updated" splash treatment on Windows. It should work identically after Linux deb relaunch since `app.relaunch()` starts a fresh process that reads the marker on startup. | LOW | No code change likely needed; verify marker is written before `app.quit()` call in DebUpdater path |

---

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Requested | Why Problematic | Alternative |
|--------------|---------------|-----------------|-------------|
| Bundled apt repository / PPA | "Users should just run apt upgrade" | Requires managing GPG keys, repo hosting, separate signing infrastructure, and deb packaging pipeline far beyond current release workflow. Completely different distribution model. | Ship self-updating .deb with DebUpdater. Users who prefer APT can add a PPA later if demand warrants it. |
| Silent install without password prompt | Saves one user interaction | dpkg requires root. No legitimate way to bypass polkit without a polkit policy file bundled in the .deb (complex, distro-specific, and a security concern). Some hardened distros block this entirely. | Accept the password prompt as Linux-native UX. Pre-warn the user so it's not surprising. |
| Background install while app is running | Minimize disruption | dpkg cannot safely replace files of a running process. The app MUST quit before dpkg -i runs. | Quit first, install, relaunch — the standard DebUpdater sequence. |
| Custom graphical privilege escalation UI | Avoid the "plain" OS password dialog | Building a custom sudo/pkexec wrapper is a security liability and violates user trust (they want the SYSTEM asking for their password, not the app pretending to). | Use pkexec (polkit) — it's the Linux standard for GUI privilege elevation. |
| Automatic install on quit (no user interaction) | Match `autoInstallOnAppQuit` Windows behavior | `autoInstallOnAppQuit = true` on Linux means pkexec runs silently when the app quits via window close — this pops a password dialog AFTER the user tries to close the app, which is deeply confusing UX. | Disable `autoInstallOnAppQuit` on Linux. Only install when user explicitly clicks "Install update". |
| AppImage instead of .deb | AppImage avoids root requirement entirely | App is already shipped as .deb; switching format mid-product breaks existing users. AppImage has no system menu integration, requires chmod +x, and is less familiar to novice Ubuntu/Debian users. | Keep .deb; accept pkexec password prompt as the tradeoff. |

---

## Feature Dependencies

```
[Silent background check on launch]
    same as Windows: no changes needed

[download-progress banner]
    same as Windows: no changes needed

[update-downloaded banner (Linux variant)]
    └──requires──> [platform check: process.platform === 'linux']
    └──requires──> [changed banner label: "click to install (requires password)"]

[Install on user click (Linux path)]
    └──requires──> [pre-warning dialog: "requires administrator password"]
    └──requires──> [write .update-restart marker before quit]
    └──requires──> [autoUpdater.quitAndInstall() — DebUpdater handles dpkg + relaunch]
                       └──triggers──> [pkexec → dpkg -i → app.relaunch()]

[pkexec fallback]
    └──requires──> [detection: which pkexec at startup or before install]
    └──alternative──> [shell.openExternal(GitHub releases URL)]

[autoInstallOnAppQuit: DISABLED on Linux]
    └──conflicts──> [password prompt appearing on window close]
    └──replaces──> [user-initiated install only]

[.update-restart marker]
    └──no change needed: marker written before quit; new process reads it on startup]
```

### Dependency Notes

- **Platform check gates Linux behavior:** All Linux-specific paths branch on `isLinux` (already exists in `electron/platform.ts`). No renderer changes needed for the banner label tweak — only one `if (isLinux)` in the `update-install` IPC handler and one conditional in the banner text.

- **autoInstallOnAppQuit conflict:** On Windows, `autoInstallOnAppQuit = true` is desirable. On Linux it causes a password dialog on window close. Must be set to `false` on Linux, or conditionally set: `autoUpdater.autoInstallOnAppQuit = !isLinux`.

- **DebUpdater relaunch depends on correct dpkg command:** The command was buggy until issue #8395 fix (August 2024). Ensure electron-builder version >= the fix (check npm package version; the fix is in the version after the August 2024 merge). Verify with `npm ls electron-builder`.

---

## MVP Definition

### Launch With (v1 of Linux auto-update)

Minimum viable — brings Linux .deb to parity with existing Windows update UX.

- [ ] Verify `autoUpdater.autoInstallOnAppQuit = false` on Linux — eliminates post-close password prompt surprise
- [ ] Verify electron-builder version includes issue #8395 fix — confirms dpkg command executes correctly
- [ ] Confirm `latest-linux.yml` is generated and uploaded to GitHub releases on Linux build — without this, `checkForUpdates()` finds nothing
- [ ] Confirm `app-update.yml` is embedded in Linux .deb resources — required for DebUpdater to know where to check
- [ ] Platform-conditional banner text: on Linux, "Update ready — click to install (requires password)" vs Windows "click here to restart and apply"
- [ ] Pre-warning dialog before `quitAndInstall()` on Linux: "Installing requires your administrator password. Click Install to continue."
- [ ] Verify `.update-restart` marker is written before `app.quit()` fires in the Linux path — ensures splash detects update restart

### Add After Validation (v1.x)

- [ ] pkexec availability check + `shell.openExternal(releases URL)` fallback — handles headless/SSH/no-polkit-agent environments gracefully
- [ ] Smoke test on Ubuntu 24.04 with GNOME (most common target) and Linux Mint with Cinnamon (second most common)

### Future Consideration (v2+)

- [ ] APT repository / PPA distribution — only warranted if user demand significantly grows; separate infrastructure project
- [ ] Snap or Flatpak distribution — different sandboxing model; out of scope until core update flow is validated

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| autoInstallOnAppQuit = false on Linux | HIGH (prevents confusing post-close dialog) | LOW (one line, conditional) | P1 |
| Verify latest-linux.yml in releases | HIGH (without it nothing works) | LOW (build config check) | P1 |
| Verify app-update.yml embedded in .deb | HIGH (without it nothing works) | LOW (build output inspection) | P1 |
| Platform-conditional banner text | MEDIUM (clarity) | LOW (one ternary) | P1 |
| Pre-warning dialog before pkexec | MEDIUM (reduces surprise) | LOW (one dialog call) | P1 |
| .update-restart marker in Linux path | LOW (splash polish) | LOW (verify existing code path) | P2 |
| pkexec fallback to browser | MEDIUM (graceful failure) | LOW (which + openExternal) | P2 |
| Smoke test Ubuntu 24.04 GNOME | HIGH (real-world verification) | MEDIUM (requires Linux hardware) | P2 |

---

## Competitor Patterns

| Electron App | Linux Update Approach | Password Required? | Relaunch After? |
|--------------|----------------------|--------------------|-----------------|
| VS Code (.deb) | Registers apt repo on install; system apt handles updates | Yes (apt/Software Updater) | User re-opens manually |
| Discord (.deb) | No apt repo; no self-update; manual download from website | N/A | N/A |
| Slack (.deb) | No apt repo self-update in practice; website download | N/A | N/A |
| Spotify | Registers apt repo; system apt handles updates | Yes (apt/Software Updater) | User re-opens manually |
| Apps using electron-builder DebUpdater | In-app download + pkexec + dpkg + relaunch | Yes (polkit dialog) | Automatic via app.relaunch() |

**Takeaway:** The most common pattern for non-repository .deb apps is NO in-app update, just point users to a download page. Using electron-builder's DebUpdater to do an in-app download + pkexec install + auto-relaunch is actually more capable than most competitors. The password prompt is the only notable UX friction point — pre-warning the user eliminates the surprise.

---

## Sources

- [electron-builder Auto Update docs](https://www.electron.build/auto-update.html) — Linux supported targets (AppImage, DEB, Pacman beta, RPM); latest-linux.yml generation (MEDIUM confidence — docs are current but sparse on deb specifics)
- [DebUpdater class docs](https://www.electron.build/electron-updater.Class.DebUpdater.html) — `doInstall()`, `quitAndInstall()`, `autoInstallOnAppQuit`, `autoRunAppAfterInstall`, `determineSudoCommand()`, `runCommandWithSudoIfNeeded()` (MEDIUM confidence — official but thin)
- [electron-builder issue #8395](https://github.com/electron-userland/electron-builder/issues/8395) — Confirmed bug: missing quotes in pkexec dpkg command caused bash parse failure; fixed August 2024 (HIGH confidence — closed issue with PR reference)
- [electron-builder PR #7060](https://github.com/electron-userland/electron-builder/pull/7060) — Original DebUpdater introduction; relaunch via `app.relaunch()` if `isForceRunAfter`; privilege via `which gksudo || kdesudo || pkexec || beesu` (MEDIUM confidence — PR text, no direct source read)
- [electron-builder issue #6330](https://github.com/electron-userland/electron-builder/issues/6330) — Historical: deb was NOT supported for auto-update; superseded by PR #7060 (HIGH confidence — confirms feature was added later)
- [electron-update-notifier](https://github.com/ankurk91/electron-update-notifier) — Notification-only approach: notify user, redirect to release page; used by apps that avoid pkexec complexity (MEDIUM confidence — npm package README)
- pkexec headless failure patterns — pkexec requires a running polkit authentication agent; fails silently in SSH sessions, headless systemd, and non-GNOME/KDE environments without polkit agent (MEDIUM confidence — multiple forum sources + Arch wiki)
- `E:\NewMapEditor\electron\main.ts` — Existing Windows update flow: autoInstallOnAppQuit, quitAndInstall(true,true), tryLinuxAppImageRelaunch stub (HIGH confidence — direct code read)
- `E:\NewMapEditor\electron\platform.ts` — isLinux detection, tryLinuxAppImageRelaunch (HIGH confidence — direct code read)
- `E:\NewMapEditor\src\App.tsx` — Existing update banner UI: checking/downloading/progress/ready states (HIGH confidence — direct code read)

---
*Feature research for: Linux .deb auto-update*
*Researched: 2026-02-20*
