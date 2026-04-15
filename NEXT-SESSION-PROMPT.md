# Next Session Prompt — Copy/paste this to start

---

I'm continuing work on the AC Map Editor ATLAS suite. Here's where we left off:

## What was done last session (2026-03-29)

1. **Map description fix** — Maps were unjoinable because the description field had author text and free text that broke the AC game parser. Fixed: description is now settings-only (`Format=1.1, Key=Value, ...`), with mode-aware filtering (CTF omits DominationWin, etc.). Author stored in `MapHeader.author` field separately.

2. **Safari slider bug** — Range inputs in hidden tabs defaulted to midpoint (50000) on WebKit. Fixed with conditional tab rendering.

3. **Tile Editor overhaul** — Floating panel portaled to document.body (z-index 200001, never trapped). Tool sidebar on left. Apply/Revert/Undo Apply buttons. Grid nav: wheel zoom (cursor-anchored), space+drag pan.

4. **Sprite Slicer updated** — `E:\ac-sprite-slicer\batch_auto_slicer.py` coordinates matched to AC game source. Flags Y=308 (was 311), per-frame extraction for smoke/trails/explosions, 203 sprites total. Committed locally, not pushed.

5. **AC game source** cloned at `E:\AC-SRC`. Key reference: `E:\AC-SRC\docs\reference\TUNA_SPRITES_REFERENCE.md`

## What to do next (in order)

### 1. Sprite Slicer GUI
- Build a GUI for `E:\ac-sprite-slicer` styled like my web crawler app: https://github.com/ACaTreYu/WebCrawlScrape
- Should wrap the batch_auto_slicer.py pipeline with visual feedback

### 2. Sprite Editor (in map editor)
- New tab in TilesetPanel alongside "Tiles" and "Tile Editor"
- Grid view of imgTuna.png (same zoom/pan pattern as tile editor)
- Clickable sprite regions (ships at Y=292, flags at Y=308, effects, etc.)
- Floating pixel editor panel with tool sidebar (twin of TilesetEditor)
- Apply/Revert/Undo Apply back to imgTuna image
- Key file: `src/components/TilesetEditor/TilesetEditor.tsx` (pattern to follow)

### 3. Panel Reorganization
- Move Measurements panel into the Notepad panel as a tab
- Notepad panel gets: "Notes" | "Measurements" tabs
- Frees space for Stickers panel

### 4. Ship Stickers + Range Indicators
- Extract ship sprites from current patch's imgTuna at 1:1 map scale (32x32 = 2 tiles)
- Place as overlay "stickers" on the map canvas (not actual tiles)
- Per-sticker: team color, direction, draggable, deletable
- Circular range indicators based on weapon TTL from map settings:
  - Range formula: `range_pixels = TTL * Speed / 33` (33hz tick rate)
  - LaserTTL, MissileTTL, BouncyTTL, NadeTTL from GameSettings.ts
- Viewport range indicator (rectangular, shows what a player would see)
- Same indicators for turret game objects
- All toggle-able per sticker

## Key paths
- Map Editor: `E:\NewMapEditor` (branch: feature/tileset-editor, 2 ahead of origin)
- AC Game Source: `E:\AC-SRC`
- Sprite Slicer: `E:\ac-sprite-slicer` (1 ahead of origin)
- Sprite coords reference: `E:\AC-SRC\docs\reference\TUNA_SPRITES_REFERENCE.md`
- Patches: `C:\Users\arcje\.armorcritical\patches\` (AC Default has imgTuna.png, imgTiles.png, imgWhiteShips.png)

## Known issues
- Grid wheel zoom still fights with native scroll on the tile editor (needs stopPropagation fix)
- Dialog text field focus bug (pre-existing Electron `<dialog>` quirk, intermittent — leave alone for now)

## Bug report file
- `E:\NewMapEditor\Daddys-Darlings-Bugs.txt` — full investigation of the map join bug
- `E:\NewMapEditor\Daddys-Darlings.map` — the original broken map from Jawsh (Mac/Safari)
