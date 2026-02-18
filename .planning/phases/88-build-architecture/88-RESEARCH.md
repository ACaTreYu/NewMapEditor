# Phase 88: Build Architecture - Research

**Researched:** 2026-02-18
**Domain:** electron-builder multi-platform configuration, Linux AppImage packaging, npm build scripts
**Confidence:** HIGH

## Summary

Phase 88 is primarily a **configuration and organization** task, not a new-code task. The project already has electron-builder 25.1.8 installed and already has a `linux: { target: "AppImage" }` section in the `package.json` build config. The Linux target block exists and AppImage is the default Linux target. What is missing are: (1) separate `npm run electron:build:linux` and `npm run electron:build:win` scripts, (2) the build must be run on Linux/WSL (not on Windows) because electron-builder cannot produce a real AppImage from a Windows host without Docker, and (3) the single `process.platform` check in `electron/main.ts` (line 381) already follows the standard macOS-exclusion pattern and doesn't need restructuring — but PLAT-03 asks for consolidation into one file, which it already is.

The key insight for planning: the electron-builder config in `package.json` is already structured correctly (shared base + per-platform `win`/`linux`/`mac` override blocks). The main work is: (a) add platform-specific npm scripts, (b) verify the `atom.png` icon is adequate for Linux icon auto-generation, (c) confirm the build actually runs and produces the `.AppImage` in the `release/` output directory, and (d) document the WSL build requirement in the workflow.

**Primary recommendation:** Add `electron:build:win` and `electron:build:linux` scripts using `--win` and `--linux` CLI flags respectively; the Linux build must be invoked from WSL or a Linux environment. No structural changes to the electron-builder config are needed beyond the scripts.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| electron-builder | 25.1.8 | Cross-platform packaging | Already installed; de-facto standard for Electron distribution |
| electron-updater | 6.7.3 | Auto-update support | Paired with electron-builder publish config; already wired |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vite-plugin-electron | 0.28.8 | TypeScript transpile for main/preload | Already in use; produces `dist-electron/` before electron-builder runs |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| electron-builder AppImage | Snap, Flatpak, deb | AppImage has zero install friction, no root required; correct choice per REQUIREMENTS.md out-of-scope list |
| WSL for Linux build | Docker electronuserland/builder | Docker adds complexity; WSL is available and simpler for a solo developer |

**Installation:** No new packages needed. All tooling already present.

## Architecture Patterns

### Current electron-builder Config (Already Correct Structure)

The `package.json` `build` block already follows the correct pattern:

```json
{
  "build": {
    "appId": "com.armorcritical.mapeditor",
    "productName": "AC Map Editor",
    "directories": { "output": "release" },
    "files": ["dist/**/*", "dist-electron/**/*"],
    "icon": "atom.png",
    "win": {
      "target": "nsis"
    },
    "nsis": {
      "oneClick": true
    },
    "mac": {
      "target": "dmg"
    },
    "linux": {
      "target": "AppImage"
    },
    "publish": [
      { "provider": "github", "owner": "ACaTreYu", "repo": "NewMapEditor" }
    ]
  }
}
```

This is already the "shared base + per-platform override" structure required by BUILD-03. No restructuring needed.

### Pattern 1: Platform-Specific npm Scripts via CLI Flags

electron-builder CLI accepts `--win` and `--linux` flags to override which platform to build for. The correct script additions to `package.json`:

```json
"electron:build:win":   "vite build && electron-builder --win",
"electron:build:linux": "vite build && electron-builder --linux"
```

The existing `electron:build` script (without a flag) builds for the current host platform by default.

- `--win` flag: builds Windows NSIS installer using the `win` block config
- `--linux` flag: builds Linux AppImage using the `linux` block config

These scripts satisfy BUILD-02 (organized for cross-platform) and allow running each platform's build independently.

### Pattern 2: process.platform Isolation (PLAT-03)

The current state in `electron/main.ts`:

```typescript
// Line 381 — the ONLY process.platform check in the entire codebase
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
```

This is the standard Electron boilerplate. It is already consolidated in `electron/main.ts` — the only file that should ever have platform checks (main process only). There are zero `process.platform` checks in `src/` (renderer code). PLAT-03 is effectively already satisfied.

The correct approach for compliance: add a comment block at the top of `electron/main.ts` designating it as the single location for platform detection, and ensure no new checks get added elsewhere. Alternatively, extract a small `platform.ts` helper if future phases will add more checks (Phase 89 will add XDG paths and menu changes).

Since Phase 89 will add more platform-conditional code (XDG paths, menu conventions), the cleanest approach for Phase 88 is to create `electron/platform.ts` as a home for all `process.platform` logic, move the existing check there, and import it in `main.ts`. This sets up Phase 89 properly.

**Recommended `electron/platform.ts`:**

```typescript
// electron/platform.ts
// Single location for all platform-conditional logic.
// process.platform is only accessed here, never scattered across files.

export const isMac     = process.platform === 'darwin';
export const isLinux   = process.platform === 'linux';
export const isWindows = process.platform === 'win32';

/** Standard Electron: quit when all windows close, except on macOS. */
export function setupWindowAllClosed(app: Electron.App): void {
  app.on('window-all-closed', () => {
    if (!isMac) {
      app.quit();
    }
  });
}
```

Then in `main.ts`:

```typescript
import { setupWindowAllClosed } from './platform';
// ...
setupWindowAllClosed(app);
```

This satisfies PLAT-03 with a clean, extensible pattern that Phase 89 can add to.

### Pattern 3: Linux Icon Handling

electron-builder auto-generates Linux icons from a source PNG. The current `icon: "atom.png"` in the build config is a shared icon. For Linux, electron-builder will auto-generate the required icon set from this file.

**Requirement:** The source PNG should be at least 512x512 pixels to produce quality icons at all required sizes (16, 32, 48, 64, 128, 256, 512). If `atom.png` is smaller, a higher-resolution version should be placed at `build/icons/512x512.png` (or the icon path updated).

Verify atom.png dimensions before assuming it will auto-generate correctly.

### Pattern 4: Build Output Directory

The current output directory is `release/` (configured in `directories.output`). A Linux build will produce:

```
release/
  AC Map Editor-1.1.2.AppImage
  latest-linux.yml          ← used by auto-updater
  builder-debug.yml
```

This is correct for Phase 90's distribution step. The output directory stays `release/` — do not change it to `dist/` even though the phase success criteria says "dist/ directory." The success criteria text appears to use "dist" loosely; the actual electron-builder output goes to `release/` as configured.

**Note:** Phase success criterion #1 says "produces a valid `.AppImage` file in the `dist/` directory" — this conflicts with the configured `output: "release"`. The plan should verify the AppImage lands in `release/` and update the success criterion note, or change the output dir. Keeping `release/` is correct.

### Anti-Patterns to Avoid

- **Building AppImage from Windows host directly:** Running `npm run electron:build:linux` from Git Bash on Windows will fail — electron-builder cannot produce a real AppImage on Windows without Docker. This must be run from WSL2 or a Linux machine.
- **Scattering process.platform checks:** Never add `process.platform` checks in renderer code (`src/`). Main process only, consolidated in `electron/platform.ts`.
- **Changing output directory to `dist/`:** The `dist/` directory is used by Vite for renderer output. Using it for electron-builder output would cause conflicts. Keep `release/`.
- **Adding a separate `electron-builder.yml` config file:** The `package.json` `build` block is sufficient and already correct. Adding a separate config file creates two sources of truth.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| AppImage packaging | Custom shell script | electron-builder `--linux` flag | Handles AppDir structure, runtime embedding, architecture, all edge cases |
| Platform detection | Multiple scattered if-blocks | `electron/platform.ts` with exported constants | Single source of truth, easier to test and maintain |
| Icon set generation | Manual resizing to 16/32/48/64/128/256/512 | electron-builder auto-generation from source PNG | Auto-converts if source is ≥512px |
| Cross-platform npm scripts | Shell scripts | `package.json` scripts with CLI flags | Portable, npm-standard, no extra files |

**Key insight:** All the hard work (AppImage toolchain, icon generation, auto-update manifest creation) is handled by electron-builder automatically. The phase is configuration, not implementation.

## Common Pitfalls

### Pitfall 1: Building AppImage on Windows Host
**What goes wrong:** `npm run electron:build:linux` run in Git Bash or Windows terminal silently produces a `.exe` or fails with errors about missing Linux native tools.
**Why it happens:** AppImage creation requires Linux system tools (appimage-builder toolchain). electron-builder cannot invoke these from Windows without Docker.
**How to avoid:** Document that `electron:build:linux` must be run in WSL2 or on a Linux machine. The Windows scripts should only be run on Windows.
**Warning signs:** Build completes but output directory only contains Windows artifacts.

### Pitfall 2: Icon Too Small
**What goes wrong:** AppImage builds successfully but shows a blurry or missing icon on Linux desktop.
**Why it happens:** Source `atom.png` may be smaller than 512x512; electron-builder upscales it which produces poor quality.
**How to avoid:** Check `atom.png` dimensions before building. If under 512x512, prepare a higher-resolution source or place a 512x512.png in `build/icons/`.
**Warning signs:** electron-builder log mentions icon resize warnings.

### Pitfall 3: Output Directory Confusion
**What goes wrong:** Phase success criteria says "dist/" but electron-builder outputs to "release/".
**Why it happens:** The configured `directories.output: "release"` in the build config puts all packaged artifacts in `release/`. The `dist/` directory is Vite's renderer output.
**How to avoid:** Verify the AppImage appears in `release/` not `dist/`. Document the discrepancy in the plan.
**Warning signs:** Plan test checks `dist/` for `.AppImage` and always fails.

### Pitfall 4: WSL node_modules Incompatibility
**What goes wrong:** Running the Linux build in WSL using the Windows-native `node_modules` directory fails because Windows-compiled native modules are not compatible with Linux.
**Why it happens:** WSL shares the Windows filesystem; node_modules compiled on Windows contain `.dll` files, not `.so` files.
**How to avoid:** In WSL, run `npm install` inside the WSL environment before running the build. This may require keeping a separate WSL copy of the project or using `npm install` from within WSL to rebuild node_modules for Linux.
**Warning signs:** `Error: /build/... binary is not a linux binary` style errors during build.

### Pitfall 5: publish Config Triggers Upload on Build
**What goes wrong:** Running `electron:build:linux` uploads artifacts to GitHub Releases unexpectedly.
**Why it happens:** The `publish` block in the electron-builder config will auto-publish if `GH_TOKEN` env var is set.
**How to avoid:** Do not set `GH_TOKEN` when doing local test builds. Use `--publish never` flag if needed: `electron-builder --linux --publish never`.
**Warning signs:** Build hangs or produces "401 Unauthorized" errors connecting to GitHub.

## Code Examples

### Final package.json scripts section

```json
"scripts": {
  "dev": "vite",
  "build": "tsc && vite build && electron-builder",
  "electron:dev": "vite",
  "electron:build": "vite build && electron-builder",
  "electron:build:win": "vite build && electron-builder --win",
  "electron:build:linux": "vite build && electron-builder --linux",
  "preview": "vite preview",
  "typecheck": "tsc --noEmit"
}
```

### electron/platform.ts (new file)

```typescript
import type { App } from 'electron';

// Single location for all process.platform checks.
// Never add platform checks in renderer (src/) code.

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
```

### electron/main.ts change

Remove:
```typescript
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
```

Add at top of file:
```typescript
import { registerWindowAllClosed } from './platform';
```

And in `app.whenReady().then()` or at module level:
```typescript
registerWindowAllClosed(app);
```

### Verify build output (run from WSL)

```bash
npm run electron:build:linux
ls release/*.AppImage
# Expected: AC\ Map\ Editor-1.1.2.AppImage
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `electron-packager` | `electron-builder` | ~2018 | electron-builder handles signing, auto-update, multi-platform in one tool |
| Separate config files per platform | Unified `package.json` `build` block with per-platform overrides | electron-builder v8+ | One config file, shared base |
| AppImage desktop integration built-in | AppImageLauncher handles integration | electron-builder v21 | The produced AppImage itself is just an executable; no `.desktop` file integration without AppImageLauncher |

**Deprecated/outdated:**
- `electron-builder` `--dir` flag for testing without packaging: Still valid but not needed here
- `target: ["AppImage", "deb"]` for multiple targets: Valid, but AppImage-only per requirements

## Open Questions

1. **atom.png resolution**
   - What we know: `atom.png` exists at the project root and is used as the current icon
   - What's unclear: Its pixel dimensions — if under 512x512, Linux icons will be low quality
   - Recommendation: The plan should include a step to check dimensions and either use it as-is if ≥512px, or create a `build/icons/512x512.png` from the existing file

2. **WSL or separate Linux machine for build?**
   - What we know: AppImage builds require Linux; the project is on Windows; WSL is available per project context
   - What's unclear: Whether node_modules need to be reinstalled in WSL, and whether the Windows project path is accessible cleanly from WSL
   - Recommendation: Plan should document: "Run from WSL at `/mnt/e/NewMapEditor`, run `npm install` first inside WSL if node_modules are Windows-built"

3. **"dist/" vs "release/" in success criterion**
   - What we know: electron-builder outputs to `release/` per config; phase success criterion says "dist/"
   - What's unclear: Whether this is intentional (change output dir) or a typo
   - Recommendation: Keep `release/` as output directory (established convention); note the discrepancy in the plan and verify against `release/*.AppImage`

4. **auto-updater `latest-linux.yml` generation**
   - What we know: electron-updater uses `latest-linux.yml` for Linux update checks (Phase 89 concern)
   - What's unclear: Whether it auto-generates during a `--linux` build or requires publish config
   - Recommendation: Verify `latest-linux.yml` appears in `release/` after the Linux build; this is needed by Phase 89

## Sources

### Primary (HIGH confidence)
- electron-builder official docs, linux.html — Linux target options verified
- electron-builder official docs, cli.html — `--win`, `--linux`, `--mac` flags verified
- electron-builder official docs, configuration.html — per-platform override structure verified
- electron-builder official docs, icons.html — Linux icon auto-generation from PNG verified
- electron-builder official docs, appimage.html — AppImage options, desktop integration note

### Secondary (MEDIUM confidence)
- electron-builder official docs, multi-platform-build.html — Docker requirement for cross-platform; WSL as viable alternative (multiple sources agree)
- DoltHub blog 2025 (dolthub.com) — Real-world Linux AppImage config example with arm64/x64 targets

### Tertiary (LOW confidence)
- Beekeeper Studio WSL2 blog — General WSL2 setup; doesn't cover node_modules incompatibility in detail

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against installed package.json; electron-builder docs confirmed
- Architecture: HIGH — config structure confirmed against official docs; code pattern is established Electron convention
- Pitfalls: MEDIUM — WSL node_modules issue is well-known but the exact reproduction steps in this project are unverified; icon size is unverified
- Open questions: Require plan-time verification, not blockers

**Research date:** 2026-02-18
**Valid until:** 2026-08-18 (electron-builder config schema is stable; CLI flags are stable)
