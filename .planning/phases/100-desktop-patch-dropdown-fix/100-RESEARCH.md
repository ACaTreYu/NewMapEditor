# Phase 100: Desktop Patch Dropdown Fix - Research

**Researched:** 2026-02-26
**Domain:** Electron IPC path resolution, bundled asset loading, React UI state
**Confidence:** HIGH

## Summary

The bundled patch dropdown in TilesetPanel uses URL-based image loading (`./assets/patches/...` with `new Image().src`). This works in Vite dev mode because Vite serves `public/` at the server root. In a packaged Electron build, `dist/index.html` is loaded from disk via `file://`, so relative URLs resolve against the app's `dist/` directory — but patches are extracted to `resources/patches/` (via `extraResources` in `package.json`), which is a sibling of `dist/`, not inside it. The result is silent 404s and no tileset change.

The fix follows the exact pattern already established by `handleChangeTileset`: use an IPC handler to get the absolute patches directory path, then load each image file via `window.electronAPI.readFile()` (which returns base64) and construct a `data:` URL. The existing `dialog:openPatchFolder` IPC handler already contains the correct dev/prod path logic (`process.cwd()/public/assets/patches` vs `process.resourcesPath/patches`). A new `patches:getDir` IPC handler should be added that returns this path without opening a dialog.

The active-patch indicator (PATCH-03) requires React state to track the currently loaded patch name and reflect it in the dropdown via a CSS class or checkmark. The AC Default farplane extension problem (PATCH-03/PATCH-01) is a bug where `handleSelectBundledPatch` always tries `imgFarplane.png` but AC Default ships `imgFarplane.jpg`. The fix must probe for both extensions using the `findImage` prefix pattern already used in `handleChangeTileset`.

**Primary recommendation:** Add `patches:getDir` IPC handler that returns the platform-correct absolute patches dir. Rewrite `handleSelectBundledPatch` to use `readFile` IPC instead of URL loading. Track `activePatchName` in App state and pass it to TilesetPanel for visual indication.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Electron IPC (`ipcMain.handle` / `ipcRenderer.invoke`) | Electron 34 | Main-to-renderer bridge for file paths | Already the project's established pattern |
| `process.resourcesPath` | Node.js built-in | Absolute path to `resources/` dir in packaged app | Official Electron way to locate `extraResources` |
| `window.electronAPI.readFile` | Project IPC | Read file as base64; renderer converts to data URL | Same pattern as `handleChangeTileset` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `fs.readdirSync` | Node.js built-in | List files in patch directory | Used in `file:listDir` handler already |
| `path.join` | Node.js built-in | Construct OS-correct file paths | Required for cross-platform correctness |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `readFile` IPC + data URL | `loadFile` with custom protocol | Custom protocol requires registration, more complex, overkill for this use case |
| New `patches:getDir` IPC | Reusing `dialog:openPatchFolder` path logic in renderer | Logic belongs in main process where `process.resourcesPath` is available |

**Installation:** No new packages needed.

## Architecture Patterns

### Production Resource Layout (verified from `package.json` `extraResources`)
```
release/
└── win-unpacked/
    └── resources/
        ├── app.asar           # dist/ content
        └── patches/           # extraResources "to": "patches"
            ├── AC Default/
            │   ├── imgTiles.png
            │   ├── imgFarplane.jpg   # <-- .jpg, not .png
            │   └── imgTuna.png
            ├── Gold/
            │   ├── imgTiles.png
            │   ├── imgFarplane.png
            │   └── imgTuna.png
            └── ...
```

- **Dev mode:** `public/assets/patches/` served by Vite as `./assets/patches/`
- **Prod mode:** `process.resourcesPath/patches/` — NOT reachable via relative URL from `file:///.../dist/index.html`

### Pattern 1: IPC Path Resolution (already used by `dialog:openPatchFolder`)
**What:** Main process computes the platform-correct patches directory path and returns it via IPC
**When to use:** Any time renderer needs an absolute path to a bundled (extraResources) asset

Existing logic in `electron/main.ts` (lines 551-554):
```typescript
// Source: E:\NewMapEditor\electron\main.ts
const patchesDir = isDev
  ? path.join(process.cwd(), 'public', 'assets', 'patches')
  : path.join(process.resourcesPath, 'patches');
```

New handler to add to `electron/main.ts`:
```typescript
// New handler: returns patches dir path without opening dialog
ipcMain.handle('patches:getDir', async () => {
  return isDev
    ? path.join(process.cwd(), 'public', 'assets', 'patches')
    : path.join(process.resourcesPath, 'patches');
});
```

### Pattern 2: readFile + data URL Image Loading (already used by `handleChangeTileset`)
**What:** Read a file via IPC as base64, construct a `data:` URL, assign to `img.src`
**When to use:** Loading images from absolute file-system paths in the renderer

```typescript
// Source: E:\NewMapEditor\src\App.tsx (handleChangeTileset, lines 105-123)
const loadImage = (filePath: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    window.electronAPI.readFile(filePath).then((res) => {
      if (!res.success || !res.data) {
        reject(new Error(res.error || 'Failed to read file'));
        return;
      }
      const ext = filePath.split('.').pop()?.toLowerCase() || 'png';
      const mimeMap: Record<string, string> = {
        png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
        bmp: 'image/bmp', gif: 'image/gif'
      };
      const mime = mimeMap[ext] || 'image/png';
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to decode ${filePath}`));
      img.src = `data:${mime};base64,${res.data}`;
    });
  });
```

### Pattern 3: File Discovery with Extension Probing
**What:** Try multiple file extensions for the same logical image (e.g., imgFarplane.jpg vs .png)
**When to use:** AC Default ships `.jpg` farplane; all others ship `.png`

```typescript
// Source: E:\NewMapEditor\src\App.tsx (handleChangeTileset, lines 96-103)
const findImage = (prefix: string): string | null => {
  const match = files.find((f: string) => {
    const lower = f.toLowerCase();
    return lower.startsWith(prefix.toLowerCase()) && imageExts.some((ext) => lower.endsWith(ext));
  });
  return match ? `${folderPath}/${match}` : null;
};
```

Applied to bundled patch loading: after getting patchesDir via IPC, call `listDir(patchDir)` then use `findImage` pattern to find the actual farplane file regardless of extension.

### Pattern 4: Active Patch State Tracking
**What:** React `useState` in App.tsx tracks the name of the currently loaded bundled patch
**When to use:** Visual indicator in TilesetPanel dropdown

```typescript
// New state in App.tsx
const [activePatchName, setActivePatchName] = useState<string | null>('AC Default');

// Set on successful load
const handleSelectBundledPatch = useCallback(async (patchName: string) => {
  // ... load images ...
  setActivePatchName(patchName);  // only set on success
}, []);

// Pass to TilesetPanel
<TilesetPanel
  ...
  activePatchName={activePatchName}
  onSelectBundledPatch={handleSelectBundledPatch}
/>
```

TilesetPanel adds a visual indicator (checkmark or bold text) next to the active patch in the dropdown:
```tsx
// In TilesetPanel.tsx
{BUNDLED_PATCHES.map((name) => (
  <button
    key={name}
    className={`tileset-patch-option${name === activePatchName ? ' tileset-patch-option--active' : ''}`}
    onClick={() => { onSelectBundledPatch(name); setDropdownOpen(false); }}
  >
    {name === activePatchName ? '✓ ' : ''}{name}
  </button>
))}
```

### Anti-Patterns to Avoid
- **URL-based loading for extraResources:** `./assets/patches/X/imgTiles.png` silently 404s in prod. Never use `new Image().src = './assets/...'` for bundled patches in the Electron path.
- **Hardcoding `.png` extension for farplane:** AC Default ships `.jpg`. Always probe using `findImage` / extension-agnostic discovery.
- **Assuming `process.resourcesPath` is available in renderer:** `process.resourcesPath` is only available in the main process. Renderer must request it via IPC.
- **Setting activePatchName on load failure:** Only update activePatchName after successful image load; failed loads should leave previous state intact.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Platform path detection | Custom env check in renderer | IPC `patches:getDir` handler | `process.resourcesPath` only available in main; renderer has no reliable way to detect packaged vs. dev |
| Image file format detection | Manual MIME sniffing | Extension-based `mimeMap` (already in `handleChangeTileset`) | Simple, already proven correct for all formats used |

**Key insight:** The renderer has no reliable access to the filesystem or `process.resourcesPath`. All path resolution for extraResources must go through IPC.

## Common Pitfalls

### Pitfall 1: Silent 404 on URL Load
**What goes wrong:** `new Image().src = './assets/patches/...'` returns no error in Electron; `img.onerror` fires but only the console logs it — the UI silently shows the old tileset.
**Why it happens:** `file://` base URL resolves `./assets/` relative to the app bundle's dist directory, not `resources/`.
**How to avoid:** Use IPC-based loading (readFile + data URL) for all bundled patches in production.
**Warning signs:** Patch dropdown appears to work (no error thrown), but tileset image doesn't change.

### Pitfall 2: Farplane Extension Mismatch
**What goes wrong:** `handleSelectBundledPatch` hardcodes `imgFarplane.png`, so AC Default's `imgFarplane.jpg` fails silently and farplane is set to null.
**Why it happens:** The original implementation assumed all patches use `.png` for farplane.
**How to avoid:** Use the `findImage` probe-with-listDir pattern (same as `handleChangeTileset`) instead of hardcoded file names.
**Warning signs:** No farplane shown after selecting AC Default; farplane shown correctly for other patches.

### Pitfall 3: activePatchName Initialized Incorrectly
**What goes wrong:** If `activePatchName` starts as `null`, the startup load of AC Default won't show as active in the dropdown until the user re-selects it.
**Why it happens:** Startup load uses URL-based loading (will be rewritten), so there's no explicit patch selection.
**How to avoid:** Initialize `activePatchName` to `'AC Default'` in state since that's always loaded on startup. Alternatively, rewrite startup load to use the IPC path and call a shared function.

### Pitfall 4: preload.ts Missing New Handler
**What goes wrong:** Adding `patches:getDir` to main.ts is not enough — the renderer must have access via `contextBridge`.
**Why it happens:** Electron's `contextIsolation: true` requires all IPC calls to be explicitly exposed via preload.
**How to avoid:** Always add new handlers to both `electron/main.ts` AND `electron/preload.ts` (both the implementation and the `ElectronAPI` TypeScript interface).

## Code Examples

### Full Rewritten `handleSelectBundledPatch` (App.tsx)
```typescript
// Replaces the existing URL-based implementation
const handleSelectBundledPatch = useCallback(async (patchName: string) => {
  // 1. Get the platform-correct patches directory from main process
  const patchesDir = await window.electronAPI.getPatchesDir?.();
  if (!patchesDir) {
    // Fallback: web mode, use URL loading
    const patchBase = `./assets/patches/${encodeURIComponent(patchName)}`;
    const loadImg = (src: string): Promise<HTMLImageElement> =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load ${src}`));
        img.src = src;
      });
    try {
      const img = await loadImg(`${patchBase}/imgTiles.png`);
      setTilesetImage(img);
      setActivePatchName(patchName);
    } catch { /* ignore */ }
    return;
  }

  const patchDir = `${patchesDir}/${patchName}`;
  const imageExts = ['.png', '.jpg', '.jpeg', '.bmp', '.gif'];

  // 2. List files in the patch directory
  const dirResult = await window.electronAPI.listDir(patchDir);
  if (!dirResult.success || !dirResult.files) return;

  const files = dirResult.files;

  // 3. Helper: find image by prefix, any extension
  const findImage = (prefix: string): string | null => {
    const match = files.find((f: string) => {
      const lower = f.toLowerCase();
      return lower.startsWith(prefix.toLowerCase()) &&
             imageExts.some((ext) => lower.endsWith(ext));
    });
    return match ? `${patchDir}/${match}` : null;
  };

  // 4. Helper: load image from absolute path via IPC
  const loadImage = (filePath: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      window.electronAPI.readFile(filePath).then((res) => {
        if (!res.success || !res.data) {
          reject(new Error(res.error || 'Failed to read file'));
          return;
        }
        const ext = filePath.split('.').pop()?.toLowerCase() || 'png';
        const mimeMap: Record<string, string> = {
          png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
          bmp: 'image/bmp', gif: 'image/gif'
        };
        const mime = mimeMap[ext] || 'image/png';
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to decode ${filePath}`));
        img.src = `data:${mime};base64,${res.data}`;
      });
    });

  // 5. Load imgTiles (required)
  const tilesPath = findImage('imgTiles');
  if (!tilesPath) {
    console.warn(`No imgTiles found for patch: ${patchName}`);
    return;
  }
  try {
    const img = await loadImage(tilesPath);
    setTilesetImage(img);
  } catch (err) {
    console.warn('Failed to load imgTiles:', err);
    return; // Don't update activePatchName if tiles failed
  }

  // 6. Load imgFarplane (optional, extension-agnostic)
  const farplanePath = findImage('imgFarplane');
  if (farplanePath) {
    try {
      const img = await loadImage(farplanePath);
      setFarplaneImage(img);
    } catch {
      setFarplaneImage(null);
    }
  } else {
    setFarplaneImage(null);
  }

  // 7. Load imgTuna (optional)
  const tunaPath = findImage('imgTuna');
  if (tunaPath) {
    try {
      const img = await loadImage(tunaPath);
      setTunaImage(img);
    } catch {
      setTunaImage(null);
    }
  } else {
    setTunaImage(null);
  }

  // 8. Mark this patch as active (only after successful tiles load)
  setActivePatchName(patchName);
}, []);
```

### New IPC Handler (electron/main.ts)
```typescript
// Add after existing handlers
ipcMain.handle('patches:getDir', async () => {
  return isDev
    ? path.join(process.cwd(), 'public', 'assets', 'patches')
    : path.join(process.resourcesPath, 'patches');
});
```

### Preload Addition (electron/preload.ts)
```typescript
// In contextBridge.exposeInMainWorld('electronAPI', { ... })
getPatchesDir: () => ipcRenderer.invoke('patches:getDir'),
```

```typescript
// In ElectronAPI interface
getPatchesDir?: () => Promise<string>;
```

### TilesetPanel Props Extension (TilesetPanel.tsx)
```typescript
interface Props {
  tilesetImage: HTMLImageElement | null;
  onTileHover?: (tileId: number | undefined, col: number, row: number) => void;
  onChangeTileset?: () => void;
  onSelectBundledPatch?: (patchName: string) => void;
  activePatchName?: string | null;  // NEW
}
```

Active patch indicator in dropdown button:
```tsx
<button
  key={name}
  className={`tileset-patch-option${name === activePatchName ? ' tileset-patch-option--active' : ''}`}
  onClick={() => { onSelectBundledPatch(name); setDropdownOpen(false); }}
>
  {name === activePatchName && <span className="tileset-patch-check">&#10003;</span>}
  {name}
</button>
```

### CSS for Active Indicator (TilesetPanel.css)
```css
.tileset-patch-option--active {
  font-weight: 600;
  color: var(--accent, var(--text-primary));
}

.tileset-patch-check {
  margin-right: 4px;
  color: var(--accent, var(--text-primary));
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| URL-based bundled patch loading (`new Image().src = './assets/...'`) | IPC-based path resolution + readFile | This phase | Works in packaged builds |
| All farplane assumed `.png` | Extension-agnostic probe via `findImage` | This phase | AC Default `.jpg` farplane loads correctly |
| No active-patch indication | `activePatchName` state + CSS class + checkmark | This phase | User knows which patch is loaded |

## Open Questions

1. **Should the startup load also use the IPC path for consistency?**
   - What we know: Startup currently uses URL-based load (`./assets/patches/AC%20Default/imgTiles.png`), which works in both dev (Vite serves it) and prod (Electron loads `file://` — wait, this is the same problem!).
   - What's unclear: Does the startup URL load also fail in packaged builds? Given the same `file://` vs `resources/` problem, it likely does.
   - Recommendation: The planner should include rewriting the startup patch load in `useEffect` to also use the IPC pattern. If both startup and dropdown use the same helper function, this is straightforward. Initialize `activePatchName` to `'AC Default'` in state to handle the visual indicator for the startup-loaded patch.

2. **Can `loadImage` helper be extracted to avoid duplication?**
   - What we know: The `loadImage` + `mimeMap` logic appears in both `handleChangeTileset` (custom folder) and will appear in `handleSelectBundledPatch`.
   - What's unclear: Whether the planner wants to extract it to a local helper in App.tsx.
   - Recommendation: Extract `loadImageFromPath` as a local function inside App.tsx (not exported). Both handlers call it.

## Sources

### Primary (HIGH confidence)
- `E:\NewMapEditor\src\App.tsx` — Full source of `handleSelectBundledPatch` (lines 164-199), `handleChangeTileset` (lines 87-161), and startup patch load (lines 61-84)
- `E:\NewMapEditor\electron\main.ts` — Full IPC handler list; `dialog:openPatchFolder` path logic (lines 551-554) confirms dev/prod path pattern
- `E:\NewMapEditor\electron\preload.ts` — Full `ElectronAPI` interface; `getPatchesDir` is absent and needs adding
- `E:\NewMapEditor\package.json` — `extraResources` config (lines 77-82): patches extracted to `resources/patches/` in production
- `E:\NewMapEditor\src\core\patches.ts` — `BUNDLED_PATCHES` list (verified all 11 patches)
- `E:\NewMapEditor\src\components\TilesetPanel\TilesetPanel.tsx` — Current dropdown renders without active state
- `E:\NewMapEditor\public\assets\patches\AC Default\` — `imgFarplane.jpg` confirmed (not `.png`)
- `E:\NewMapEditor\public\assets\patches\Gold\` — `imgFarplane.png` confirmed (other patches use `.png`)

### Secondary (MEDIUM confidence)
- Electron documentation on `process.resourcesPath`: available in main process, points to `resources/` dir in packaged app

## Metadata

**Confidence breakdown:**
- Bug diagnosis (URL vs IPC): HIGH — directly verified by reading source code and package.json extraResources config
- Fix approach (IPC pattern): HIGH — identical pattern already works in `handleChangeTileset`
- AC Default farplane extension: HIGH — directly observed `imgFarplane.jpg` in patch folder
- Active patch indicator: HIGH — standard React state pattern, no external dependencies
- Startup load also broken: HIGH — same URL-based load mechanism, same failure mode in production

**Research date:** 2026-02-26
**Valid until:** 60 days (project-internal research, code doesn't change independently)
