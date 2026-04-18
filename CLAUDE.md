# AC Map Editor

Electron/React tile map editor for Armor Critical (SubSpace/Continuum format).

## Tech Stack

- **Electron 28** - Desktop shell
- **React 18 + TypeScript** - UI
- **Vite 5** - Build tool
- **Zustand** - State management
- **Canvas API** - Tile rendering

## Project Structure

```
src/core/       # Portable logic (no Electron deps) - can be reused in AC app
src/components/ # React UI components
electron/       # Main process + IPC handlers
assets/         # Tileset images
```

## Commands

```bash
npm run electron:dev   # Development mode
npm run electron:build # Production build
npm run typecheck      # Type checking
```

## Map Format

- 256x256 tile grid, 16x16px tiles
- 16-bit tile encoding (bit 15 = animated)
- zlib compression, magic `0x4278`
- Full spec: `E:\AC-SEDIT-SRC-ANALYSIS\SEDIT\SEdit-SRC-Analysis\SEDIT_Technical_Analysis.md`

## Key Constants

| Constant | Value | Location |
|----------|-------|----------|
| TILES_PER_ROW | 40 | Tileset is 640px wide |
| DEFAULT_TILE | 280 | Empty/space tile |
| MAP_SIZE | 256x256 | Fixed dimensions |

## Features

### Navigation
- **Scroll bars** - Horizontal and vertical scroll bars for map navigation
- **Right-click drag** - Pan the map by right-click dragging
- **Zoom to cursor** - Mouse wheel zooms centered on cursor position (0.25x to 4x)
- **Middle-click/Alt+click** - Alternative pan methods

### Tile Selection
- **Multi-tile selection** - Drag in tile palette to select rectangular regions
- **Picker tool return** - Picker (I) returns to previous tool after picking

### Panels
- **Map Settings** (gear icon) - Edit map properties with range sliders
  - General: name, description
  - Game: max players (1-16), teams (1-4), objective, holding time
  - Combat: laser/special damage, recharge rate (1-5)
  - Weapons: missiles/bombs/bouncies toggles
  - Powerups: count, max simultaneous
- **Animations** (play icon) - View and place animated tiles
  - Live animation previews
  - Frame offset control (0-127)
  - Load animation data from file

## Architecture Notes

- `src/core/` is designed for portability to the AC React app
- File I/O happens via Electron IPC (main process handles zlib)
- Wall auto-connection uses Bresenham's algorithm for neighbor detection
- State is in Zustand store (`EditorState.ts`)
- `TileSelection` supports multi-tile stamps with width/height

## Gotchas

- Tileset must be placed at `assets/tileset.png` (or .bmp)
- GPU cache errors on Windows are harmless Chromium warnings
- Wall tool uses click-drag for line drawing
- Animation data must be loaded separately (not stored in map files)

## Map Format Invariants — DO NOT REGRESS

Two rules below were the direct cause of real upload-rejection incidents
(Daddys-Darlings, ACMETest101 on 2026-04-18). Do not change them unless the
user explicitly asks.

### 1. `MapParser.ts::serialize()` header layout

- `headerSize = 23` (fixed prefix; NOT 26)
- `new ArrayBuffer(headerSize)` — no `+2` padding
- `header.dataOffset = headerSize - 2` (SEdit convention; loader does `+2`)

The game's Java `Map.java` reads `neutralCount` (1 byte) and pipes the next
bytes straight into `Inflater.inflate(...)`. Any zero-pad between that byte
and the `78 DA` zlib magic corrupts the CMF → server rejects the upload.
Our own loader happened to mask this because it uses `dataOffset + 2`, so
round-tripping through the editor worked — only the real game chokes.

Spot-check after any change to offsets/sizes in this file:
```
python3 -c "import zlib; d=open('some.map','rb').read(); \
  off=(d[3]<<8|d[2])+2; print(len(zlib.decompress(d[off:])))"
# must print 131072
```

### 2. `settingsSerializer.ts` `ALWAYS_EMIT` set

Must always include: `LaserDamage`, `MissileDamage`, `BouncyDamage`,
`NadeDamage`, `MissileRecharge`, `BouncyRecharge`, `NadeRecharge` + all seven
`F*` flagger twins. `Format=1.1` is always first.

Game-side rationale (`E:\arcbound\reference\ac-source\src\spark\map\Map.java`
~line 346): damage is init'd from binary-header difficulty index via fixed
formulas (`HealthLaser=9, HealthMissile=34, HealthBouncy=16, HealthGrenade=7`
times `(idx + 1)`). Those formulas only line up with the editor's UI presets
at the "Normal" index. Omitting any of these keys when the user picked
non-Normal silently reverts damage to the game's formula — a quiet wrong-
behavior bug that won't show up as an upload error, only as "the damage
numbers in-game don't match what I set."

Recharge families have no header-derived init at all in the game, so
omitting them falls back to the game's hardcoded defaults regardless of
what the editor UI says. Same reason: always emit.

Non-damage/recharge settings (speeds, TTLs, energies, DHT_*, toggles, etc.)
are safe to omit when they equal the setting default — the game either uses
its own matching default or treats the value as a 1.0× multiplier.
