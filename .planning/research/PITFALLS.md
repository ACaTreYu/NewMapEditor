# Pitfalls Research

**Domain:** Incremental tile map editor — canvas background modes, patch dropdown, wall type fix, updater interval removal
**Researched:** 2026-02-26
**Confidence:** HIGH (all findings verified against actual codebase source)

---

## Critical Pitfalls

Mistakes that cause rewrites or regressions if not caught up front.

---

### Pitfall 1: Background drawn into the off-screen buffer poisons incremental patching

**What goes wrong:**
If the farplane/solid-color background is painted into the 4096x4096 off-screen buffer (alongside tile pixels), then every `clearRect` called during incremental patching will punch transparent holes through it. Tile 280 (empty/space) explicitly skips `renderTile` — it relies on the buffer cell being transparent so the screen context's underlying fill shows through. Painting a background into the buffer before tiles are rendered breaks this contract: patching any neighbor of an empty tile clears the background pixel at that position, producing a grid of holes at every empty-tile location.

**Why it happens:**
The natural instinct is "the buffer represents the whole map, so the background goes there too." But the buffer's `clearRect`-based incremental system (`drawMapLayer` incremental branch, `CanvasEngine.ts` line 193) clears individual 16x16 tile cells without redrawing anything below them. Anything painted into the buffer before tile rendering is irrecoverably lost during any patch operation.

**How to avoid:**
The background must live in the screen context (`blitToScreen`), not the buffer. The correct insertion point is inside `blitToScreen`, between the existing `screenCtx.clearRect(0, 0, ...)` call (line 224) and the `screenCtx.drawImage(buffer, ...)` call (line 228). The sequence must be: (1) clear screen, (2) draw background, (3) blit buffer on top. Never draw the background into `bufferCtx`.

**Warning signs:**
- Empty tiles (280) show background correctly at rest but develop holes after any paint stroke.
- The hole pattern matches the positions of tiles that were painted or whose neighbors changed.
- Grid render looks fine on full rebuild but degrades during drag painting.

**Phase to address:**
Canvas background mode phase (first feature phase).

---

### Pitfall 2: `blitDirtyRect` bypasses `blitToScreen` — background disappears on animation ticks

**What goes wrong:**
`blitDirtyRect` (called from `patchAnimatedTiles`) blits only a sub-rectangle of the buffer to the screen. It does NOT call `blitToScreen`. If the background is rendered only inside `blitToScreen`, animated tile updates will erase background pixels in the dirty region: `blitDirtyRect` calls `screenCtx.clearRect(clipX, clipY, ...)` (line 396) before drawing the buffer sub-rect. After any animation frame, the background is missing in the dirty band until the next `blitToScreen` call (triggered by a viewport change or tile edit).

**Why it happens:**
`blitDirtyRect` was designed as a performance path that bypasses full-screen redraw. It clears only the dirty screen region and re-draws just that buffer slice. Without a background re-fill in `blitDirtyRect`, the cleared region stays transparent.

**How to avoid:**
Extract a `drawBackground(ctx, clipX, clipY, clipW, clipH)` helper and call it from both `blitToScreen` (full screen) and `blitDirtyRect` (clipped to dirty rect) before the buffer blit. For solid-color modes this is a single `fillRect`. For image modes it requires a clipped `drawImage` of the farplane image.

Alternatively, render the background as a CSS `background` on the screen `<canvas>` element (not as drawn pixels). CSS backgrounds survive canvas `clearRect` because the browser composites them separately. This works for solid colors and simple gradients, but not for the tiled/scaled farplane image background (which must be drawn into the canvas pixel buffer).

**Warning signs:**
- Background looks correct on initial load and after pan/zoom (which triggers `blitToScreen`).
- After 1–2 seconds (animation timer fires), strips of background disappear around animated tiles.
- The disappearing strips exactly match the dirty region passed to `blitDirtyRect`.

**Phase to address:**
Canvas background mode phase — write the background-rendering helper once and call it from both `blitToScreen` and `blitDirtyRect`.

---

### Pitfall 3: Bundled patch dropdown resolves correctly in dev but silently 404s in packaged builds

**What goes wrong:**
`handleSelectBundledPatch` in `App.tsx` (line 165) uses `./assets/patches/${encodeURIComponent(patchName)}/imgTiles.png` as a browser-relative URL. In dev (Vite dev server at `http://localhost:5173`), `public/` is the web root, so `./assets/patches/` resolves to `public/assets/patches/` and loads fine. In a packaged build, `index.html` is loaded as a local file via `mainWindow.loadFile(...)`. The relative URL `./assets/patches/` resolves relative to `dist/`, which contains no `patches/` directory — `extraResources` copies patches to `resources/patches/` (i.e., `process.resourcesPath/patches/`), which is entirely outside `dist/`. The browser silently 404s on every patch image; the `onerror` handler swallows it with `console.warn`.

**Why it happens:**
`extraResources` in `electron-builder` (configured in `package.json` lines 77–82) places files at `process.resourcesPath/to` (here `resources/patches/`), not inside the renderer's `dist/` directory. The renderer cannot reach `resourcesPath` via a browser-relative URL — it requires an IPC call to the main process.

The existing desktop folder flow (`handleChangeTileset`) already handles this correctly: it calls `openPatchFolderDialog` (IPC, main.ts line 554) which returns the absolute filesystem path, then reads each image via `readFile` (IPC) and sets `img.src = data:...` base64. The bundled patch flow entirely bypasses this.

**How to avoid:**
For bundled patch loading, add a new IPC handler (e.g., `patches:readBundled`) that accepts a patch name and image filename, reads from `path.join(process.resourcesPath, 'patches', patchName, filename)` in production (or `path.join(process.cwd(), 'public/assets/patches', patchName, filename)` in dev), and returns base64. The renderer calls this instead of using a relative URL. The `openPatchFolderDialog` handler (main.ts line 554–558) shows the exact production/dev path pattern to replicate.

Alternatively, copy patch assets into `dist/assets/patches/` during the Vite build using `build.copyPublicDir: true` and a targeted Vite plugin. This is simpler but increases the packaged bundle size.

**Warning signs:**
- All bundled patches load correctly in `npm run electron:dev`.
- In a production build (`npm run electron:build:win`), selecting any patch from the dropdown produces no visual change and no error toast.
- DevTools Network tab shows 404 for all `file:///...dist/assets/patches/...` URLs.

**Phase to address:**
Desktop patch dropdown phase. This is a deployment-time bug — always verify bundled patch selection in a production build, not just dev mode.

---

### Pitfall 4: `updateNeighbor` overwrites neighbor wall type with `currentType` instead of the neighbor's own type

**What goes wrong:**
`WallSystem.updateNeighbor` (line 174) calls `this.getWallTile(this.currentType, connections)` for every neighboring wall tile. If the map has a Blue wall (type 4) adjacent to a Basic wall (type 0), and the user paints a new Basic wall next to the Blue wall, `updateNeighbor` replaces the Blue wall with a Basic wall tile (wrong type, correct connection state). The neighbor's visual appearance changes silently without the user touching it. On a map with many mixed-type wall regions, painting a single tile can corrupt dozens of nearby neighbors.

`findWallType` already exists at line 179 and is used correctly in `updateNeighborDisconnect` (the wall removal path) — the placement path simply never calls it.

**Why it happens:**
The original comment at line 162 notes "Uses currentType for the new tile (matching SEDIT's set_wall_tile behavior)." This was an intentional choice to match SEDIT behavior. If the requirement is to preserve neighbor types, `findWallType(currentTile)` must replace `this.currentType`.

**How to avoid:**
In `updateNeighbor`, replace:
```typescript
const newTile = this.getWallTile(this.currentType, connections);
```
with:
```typescript
const wallType = this.findWallType(currentTile);
if (wallType === -1) return;
const newTile = this.getWallTile(wallType, connections);
```
Apply the identical fix to `collectNeighborUpdate` (the batch path used by `placeWallBatch`), which has the same bug at line 243.

`findWallType` uses `Array.includes()` — O(n) per lookup across 15 types × 16 tiles = 240 comparisons maximum. No performance concern.

**Warning signs:**
- Painting a wall tile adjacent to a different-type wall visually converts the neighbor's type.
- The neighbor's tile ID in the status bar changes after a paint stroke that should not affect it.
- Undo restores the original tile correctly (Zustand history records the overwritten value), confirming the store is wrong but recoverable.
- The bug only appears at boundaries between different wall types; homogeneous wall regions look correct.

**Phase to address:**
Wall tool fix phase. This is a logic-only fix in `WallSystem.ts` — two lines changed in `updateNeighbor`, two lines changed in `collectNeighborUpdate`.

---

### Pitfall 5: Removing the `setInterval` update check without cleaning up the `manualCheckInProgress` state machine

**What goes wrong:**
`setupAutoUpdater` (main.ts line 328) uses a module-level boolean `manualCheckInProgress` to distinguish user-initiated checks (show dialog) from background checks (silent). The startup `setTimeout` at line 386 fires `checkForUpdates()` 5 seconds after launch without setting `manualCheckInProgress = true`. If the user clicks "Help > Check for Updates" within those first 5 seconds, `manualCheckInProgress` is `true` (set at line 225) when the startup check's response arrives first — triggering the "You're on the latest version" dialog for the background check, consuming the flag, and leaving the user's manual check orphaned (its response will behave as if `manualCheckInProgress = false`).

If the 30-minute `setInterval` is simply removed, this 5-second race window is the only remaining concern. The risk is low in practice (users rarely click Help within 5 seconds of launch), but it can produce a spurious "You're on the latest version" dialog immediately after startup.

**Why it happens:**
`manualCheckInProgress` is a boolean that conflates "triggered by user" with "currently in flight." Two simultaneous in-flight checks cannot both be flagged as manual.

**How to avoid:**
Simplest approach: remove the `setInterval` call (one line), keep the startup `setTimeout`, and add a guard so the startup check only fires if `!manualCheckInProgress`:
```typescript
setTimeout(() => {
  if (!manualCheckInProgress) autoUpdater.checkForUpdates();
}, 5000);
```
This eliminates the race. No other changes needed.

**Warning signs:**
- After removing the interval, the "Check for Updates" manual dialog appears immediately on app launch (within 5 seconds) for the startup background check, not the user's click.
- "You're on the latest version" dialog fires 5 seconds after launch without any user action.

**Phase to address:**
Startup-only update check phase. One-line `setInterval` removal + one-line guard on the startup `setTimeout`.

---

### Pitfall 6: Background mode state change triggers unnecessary full buffer rebuild

**What goes wrong:**
If the background mode setting is stored in Zustand and CanvasEngine's map subscription (line 521) fires on any state object change that happens to coincide with the background mode change, it will call `drawMapLayer` and potentially trigger a full 4096x4096 buffer rebuild. More specifically: if the implementation uses `prevTiles = null` to force a rebuild when background mode changes (a common "let's make it redraw" shortcut), all 65,536 tiles are re-rendered needlessly.

**Why it happens:**
Because the background lives in `blitToScreen` (not the buffer), a background mode change requires only a `blitToScreen` call — no buffer changes whatsoever. The shortcut of invalidating `prevTiles` conflates buffer content with screen appearance.

**How to avoid:**
Store background mode in `GlobalSlice`. In `CanvasEngine.setupSubscriptions`, add a targeted subscription that watches only the background mode field and calls `this.blitToScreen(vp, width, height)` — similar to the viewport subscription pattern (line 510). Never null `prevTiles` in response to a background mode change.

**Warning signs:**
- Switching background mode causes a visible full-canvas flicker (the buffer rebuild blanks the canvas momentarily before re-rendering all tiles).
- CPU spikes to ~100% for 50–150ms on mode switch.
- The performance is fine on first render but mode-switch feels like a "reload."

**Phase to address:**
Canvas background mode phase.

---

## Moderate Pitfalls

---

### Pitfall 7: Background image tiling requires coordinate math relative to the map origin, not the viewport

**What goes wrong:**
A farplane image used as a background is typically tiled or stretched to fill the 256×256 tile space. If the background image draw call uses screen coordinates (0,0) as the origin, the background will appear to shift as the user pans (because the map's pixel origin shifts on screen when the viewport changes). The background should remain anchored to map-tile-space, not screen-space — i.e., it should scroll with the map, not stay fixed relative to the window.

**Why it happens:**
`blitToScreen` computes `srcX = viewport.x * TILE_SIZE` for the buffer blit. A background drawn at screen (0,0) is drawn in screen-space and does not account for this offset. The buffer blit's visible region is `viewport.x * TILE_SIZE` pixels into the buffer's map-space — the background must match that offset.

**How to avoid:**
When drawing a tiled background image in `blitToScreen`, use the same viewport transform: the background draw must compute its screen position as `(mapOriginX - viewport.x * TILE_SIZE) * viewport.zoom` for the left edge, mirroring how `blitToScreen` computes the map's screen position for the out-of-map fill strips (lines 239–257).

**Warning signs:**
- Background image appears correctly at viewport (0,0) but drifts when panning.
- Background and tiles are misaligned by exactly `viewport.x * TILE_SIZE * zoom` pixels horizontally.

**Phase to address:**
Canvas background mode phase — decide whether background is map-anchored or screen-anchored during design, and implement accordingly.

---

### Pitfall 8: `AC Default` patch has a `.jpg` farplane but others use `.png` — extension mismatch

**What goes wrong:**
The startup load in `App.tsx` (line 81) explicitly loads `imgFarplane.jpg` for the AC Default patch. All other bundled patches have `imgFarplane.png`. The bundled patch loader uses `./assets/patches/${patchBase}/imgFarplane.png` (line 186). If the dropdown is updated to include "AC Default" and uses the `.png` extension, the AC Default farplane silently fails to load (it has no `.png` file). Conversely, the current startup code hardcodes `.jpg` — making AC Default inconsistent with the dropdown flow.

**How to avoid:**
Either: (a) convert `AC Default/imgFarplane.jpg` to `.png` for consistency, or (b) add extension-probing logic: try `.png` first, fall back to `.jpg`. The desktop folder flow (`handleChangeTileset`) already does this via `imageExts` array matching (line 95). Replicate that approach in the bundled patch loader or IPC handler.

**Warning signs:**
- Selecting "AC Default" from the dropdown shows tileset correctly but background reverts to `null` (solid color).

**Phase to address:**
Desktop patch dropdown phase.

---

## Minor Pitfalls

---

### Pitfall 9: Background mode preference not persisted across sessions

**What goes wrong:**
If the background mode is stored only in Zustand in-memory state (not persisted to `localStorage`), it resets to the default every time the app restarts. Users will need to re-select their preferred background each session.

**Prevention:**
Store background mode in `localStorage` using the same pattern as `ac-editor-theme` (App.tsx line 441). Apply the persisted value during the same startup `useEffect` that reads the theme. Key suggestion: `ac-editor-bg-mode`.

**Phase to address:**
Canvas background mode phase.

---

### Pitfall 10: Wall batch path (`placeWallBatch`) has same type-overwrite bug as single-place path

**What goes wrong:**
`collectNeighborUpdate` (line 227) has the identical `this.currentType` bug as `updateNeighbor`. The wall line tool uses `placeWallBatch` — fixing only `updateNeighbor` leaves the line tool broken.

**Prevention:**
Fix both methods in the same commit. They require identical changes.

**Phase to address:**
Wall tool fix phase (same commit as Pitfall 4 fix).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Relative URL `./assets/patches/` for bundled patches | Works in dev with no IPC | Silently fails in packaged builds | Never for production |
| Storing farplane image in React `useState` instead of Zustand | Simple, already working | CanvasEngine cannot subscribe to it; must be passed as props | Acceptable short-term; problematic if background modes multiply |
| Invalidating `prevTiles` on background mode change | Forces guaranteed redraw | Full 65k-tile rebuild on every mode switch | Never — background is in `blitToScreen` not the buffer |
| CSS `background` on canvas element for solid colors | No CanvasEngine changes | Cannot be used for image backgrounds (must be drawn pixels) | Acceptable for solid-color-only mode |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `blitToScreen` + background | Draw background after `drawImage(buffer, ...)` | Draw background after `clearRect` but BEFORE `drawImage(buffer, ...)` |
| `blitDirtyRect` + background | Omit background fill in the dirty-rect path | Re-fill background clipped to dirty region before buffer sub-blit |
| `extraResources` + renderer URL | Use `./assets/patches/` relative URL in renderer | Use IPC to read from `process.resourcesPath/patches/` in production |
| `openPatchFolderDialog` pattern | Build new IPC from scratch | Replicate the dev/prod path split at main.ts lines 554–558 exactly |
| `electron-updater` manual check flag | Remove interval without guarding startup check | Guard startup `setTimeout` with `!manualCheckInProgress` |
| `WallSystem.updateNeighbor` | `this.currentType` for neighbor tile | `findWallType(currentTile)` to preserve neighbor's actual type |
| `WallSystem.collectNeighborUpdate` | Same bug in the batch path | Same fix — both methods require the substitution |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Background drawn into buffer | Holes in background after any paint operation | Draw in `blitToScreen` only, never `bufferCtx` | Immediately on first paint stroke |
| Full buffer rebuild on background mode switch | 50–150ms freeze on mode change | Call `blitToScreen` only; never invalidate `prevTiles` for mode change | Every mode switch |
| Per-pixel background image tiling loop | CPU spike on every viewport change | Use `drawImage` with repeat pattern or `createPattern` once | Any map that has a farplane background |

---

## "Looks Done But Isn't" Checklist

- [ ] **Canvas background:** Test with animated tiles present — background must not flicker or disappear during animation ticks. Verify the `blitDirtyRect` path includes background fill.
- [ ] **Canvas background:** Test at zoom 0.25x where the map occupies a small portion of screen — background must fill the entire screen canvas, including the out-of-map border regions.
- [ ] **Canvas background:** Pan from (0,0) to map center — background must remain correctly positioned relative to the map, not drift.
- [ ] **Bundled patch dropdown:** Test in a packaged production build (`npm run electron:build:win`), NOT in dev mode. Select each patch — tileset and background must update.
- [ ] **Bundled patch dropdown:** Verify "AC Default" farplane loads (`.jpg` extension, not `.png`).
- [ ] **Wall fix:** Test painting a Basic wall adjacent to Blue, Green, and Red walls. Each neighbor must retain its original type after the connection update.
- [ ] **Wall fix:** Test the line tool (`placeWallBatch`) with mixed-type neighbors — `collectNeighborUpdate` fix must also be applied.
- [ ] **Updater interval removal:** Confirm `setInterval` line is removed and no `clearInterval` handle remains as dead code.
- [ ] **Updater interval removal:** Confirm "Help > Check for Updates" still shows the dialog correctly after removal.
- [ ] **Updater interval removal:** Confirm the startup `setTimeout` check does not produce a spurious dialog if the user clicks the menu item within 5 seconds of launch.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Background drawn into buffer | MEDIUM | Move background fill to `blitToScreen`; force one full rebuild to clear buffer |
| `blitDirtyRect` missing background | LOW | Add background fill helper; call at start of `blitDirtyRect` clipped to dirty rect |
| Bundled patches 404 in production | LOW | Add `patches:readBundled` IPC handler; update renderer to use IPC path |
| Neighbor wall type overwritten | LOW | Two-line fix in each of `updateNeighbor` and `collectNeighborUpdate`; undo history already valid |
| Interval removal side effects | LOW | Add `!manualCheckInProgress` guard to startup `setTimeout` |
| Background mode triggers full rebuild | LOW | Remove `prevTiles = null` from mode-change handler; use `blitToScreen` call instead |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Background drawn into buffer (Pitfall 1) | Canvas background mode | Paint tiles adjacent to empty tiles — no holes in background |
| `blitDirtyRect` missing background (Pitfall 2) | Canvas background mode | Wait for animation tick with background active — no disappearing strips |
| Background image map-anchoring (Pitfall 7) | Canvas background mode | Pan while background active — background scrolls with map, no drift |
| Background mode triggers full rebuild (Pitfall 6) | Canvas background mode | Switch modes rapidly — no flicker, no CPU spike |
| Bundled patches 404 in production (Pitfall 3) | Desktop patch dropdown | Select patch in packaged build — tileset and farplane update |
| AC Default `.jpg` extension (Pitfall 8) | Desktop patch dropdown | Select "AC Default" — farplane loads correctly |
| Neighbor wall type overwritten (Pitfall 4) | Wall tool fix | Paint Basic wall next to Blue — Blue neighbor keeps Blue tile ID |
| `placeWallBatch` same bug (Pitfall 10) | Wall tool fix | Draw wall line through Blue wall region — Blue tiles keep type |
| `manualCheckInProgress` race (Pitfall 5) | Startup-only update check | Click Help > Check for Updates within 5s — one dialog, correct message |

---

## Sources

All findings are HIGH confidence — derived from direct inspection of production source:

- `E:\NewMapEditor\src\core\canvas\CanvasEngine.ts` — buffer architecture, `blitToScreen` (lines 215–258), `blitDirtyRect` (lines 360–398), `renderTile` tile-280 skip (line 143), incremental patching (lines 185–205)
- `E:\NewMapEditor\src\core\map\WallSystem.ts` — `updateNeighbor` (lines 163–176), `collectNeighborUpdate` (lines 227–244), `findWallType` (lines 179–186), correct usage in `updateNeighborDisconnect` (lines 270–285)
- `E:\NewMapEditor\electron\main.ts` — `setupAutoUpdater` (lines 328–390), `setInterval` at line 389, `manualCheckInProgress` flag, `openPatchFolderDialog` IPC handler with dev/prod path split (lines 554–558)
- `E:\NewMapEditor\src\App.tsx` — `handleSelectBundledPatch` relative URL bug (line 165), `handleChangeTileset` correct IPC pattern (lines 87–161), AC Default `.jpg` farplane (line 81)
- `E:\NewMapEditor\package.json` — `extraResources` config (`public/assets/patches` → `resources/patches`, lines 77–82)
- `E:\NewMapEditor\public\assets\patches\AC Default\imgFarplane.jpg` — confirmed `.jpg` extension (all other patches use `.png`)

---
*Pitfalls research for: AC Map Editor — canvas backgrounds, patch dropdown, wall fix, updater interval*
*Researched: 2026-02-26*
