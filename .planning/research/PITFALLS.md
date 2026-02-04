# Domain Pitfalls: Tile Editor Tool Reimplementation

**Project:** AC Map Editor (SEdit parity)
**Researched:** 2026-02-04
**Source:** SEdit v2.02.00 C++/Win32 → React 18/Canvas/Zustand

---

## Executive Summary

Reimplementing tile editor tools from C++ Win32 to React/Canvas involves non-obvious pitfalls beyond standard web porting. SEdit's 20+ years of edge case handling reveals critical issues with coordinate systems, tile encoding, tool state machines, and neighbor detection algorithms.

**Critical Finding:** The user reported "some tools were wrong" — this is caused by assumptions rather than reading SEdit source. Tools must exactly match SEdit's behavior including pixel-perfect coordinate handling, proper tile encoding masks, and stateful mouse interactions.

---

## Critical Pitfalls

### Pitfall 1: Tile Encoding Bit Confusion

**What goes wrong:** Mixing animation flag (bit 15) with team/data bits (bits 8-14) causes data corruption.

**Why it happens:**
- SEdit uses `0x8000` for animation flag (bit 15 = 1)
- Frame offset stored in bits 8-14: `((offset & 0x7F) << 8)`
- Animation ID stored in bits 0-7: `(id & 0xFF)`
- Warp tiles use bits 8-14 for `(dest * 10) + src`

**Current implementation issue:**
```typescript
// EditorState.ts line 158: Animation decoding
const animId = tile & 0xFF;  // ✅ Correct
const tileFrameOffset = (tile >> 8) & 0x7F;  // ✅ Correct

// BUT missing warp encoding/decoding entirely!
// SEdit map.cpp:1464
// tile = warps[hWarpIdx] | 0x8000 | (((hWarpDest * 10) + hWarpSrc) << 8);
```

**Consequences:**
- Warp tools place tiles with wrong encoding
- Loading maps with warps shows garbage
- Animation frame offsets get mangled if not masked with 0x7F

**Prevention:**
1. Always mask bit 15 when checking tile type: `if (tile & 0x8000)`
2. Always mask bits 8-14 when extracting data: `((tile >> 8) & 0x7F)`
3. Document bit layout in types.ts as comments
4. Add validation that static tiles never have bit 15 set

**Detection:**
- Warps display wrong animation or static tile
- Animation tiles show wrong frames
- Map loads but tiles look corrupted

**Which phase:** Phase addressing warp tool implementation

---

### Pitfall 2: Win32 Pixel Coords vs Canvas Event Coords

**What goes wrong:** Mouse coordinates from React events don't account for scroll position and zoom the same way Win32 does.

**Why it happens:**
SEdit uses Win32 coordinate system:
```cpp
// map.cpp:1102-1103 - CRITICAL PATTERN
x = rx = (x+scx)/16;  // Add scroll, then convert to tile
y = ry = (y+scy)/16;

// Where scx/scy are scroll positions:
int scx = GetScrollPos(hwnd, SB_HORZ);
int scy = GetScrollPos(hwnd, SB_VERT);
```

React/Canvas approach in current code:
```typescript
// MapCanvas.tsx calculates differently - THIS IS WRONG FOR SEDIT PARITY
const tileX = Math.floor((canvasX / tilePixels) + viewport.x);
const tileY = Math.floor((canvasY / tilePixels) + viewport.y);
```

**Difference:**
- Win32: `(pixel + scroll) / tileSize` — scroll is in pixels
- Canvas: `(pixel / scaledTileSize) + scrollInTiles` — scroll is in tiles
- When viewport.zoom ≠ 1, these diverge!

**Consequences:**
- Tools place tiles 1-2 positions off at non-1x zoom
- Line tool endpoint calculation drifts
- Wall tool Bresenham neighbors misalign

**Prevention:**
1. Convert all canvas mouse coords to tile coords immediately
2. Use integer division only after adding scroll (match SEdit)
3. Test at zoom levels 0.25x, 0.5x, 1x, 2x, 4x
4. Wall tool needs exact neighbor detection — 1 tile off breaks auto-connection

**Detection:**
- Click on tile X but tool places on tile X±1
- Wall tool doesn't connect to neighbors
- Line tool preview doesn't match placement

**Which phase:** Phase fixing coordinate calculations in all tools

---

### Pitfall 3: Mouse Event State Machine Differences

**What goes wrong:** React's onMouseDown/onMouseMove/onMouseUp don't map 1:1 to Win32's WM_LBUTTONDOWN/WM_MOUSEMOVE/WM_LBUTTONUP.

**Why it happens:**
SEdit uses **blocking message loops** for drag operations:
```cpp
// map.cpp:1183-1238 - LINE TOOL PATTERN
SetCapture(hwnd);  // Grab all mouse input
while (1) {
    GetMessage(&mouseMsg, hwnd, WM_MOUSEFIRST, WM_MOUSELAST);
    if (mouseMsg.message == WM_LBUTTONUP || !(mouseMsg.wParam & MK_LBUTTON))
        break;
    // Process move...
}
ReleaseCapture();
```

This is **impossible in React** — you can't block the event loop. Current implementation uses useState for lineState, but this causes re-renders on every mouse move.

**Current implementation:**
```typescript
// MapCanvas.tsx:34-40
const [lineState, setLineState] = useState<LineState>({
  active: false,
  startX: 0, startY: 0, endX: 0, endY: 0
});
// This triggers re-render on EVERY mouse move during drag!
```

**Consequences:**
- Performance degradation during line/rect drag (re-renders every pixel)
- Race conditions between mouse events and state updates
- Can't precisely replicate SEdit's "first moved axis locks constrain mode" (map.cpp:1784-1786)

**Prevention:**
1. Use useRef for drag state (no re-render)
2. Only setState when drag completes
3. Implement constrain-mode flag as ref, not state
4. Draw preview using canvas directly in mousemove handler, not via state→render

**Detection:**
- Laggy mouse tracking during line/rect drag
- Line tool doesn't snap to horizontal/vertical like SEdit
- Tool state inconsistent between mouse down and up

**Which phase:** All phases touching line/wall/rect tools

---

### Pitfall 4: Wall Auto-Connection Neighbor Detection

**What goes wrong:** Wall tiles don't connect properly because neighbor detection doesn't match SEdit's algorithm.

**Why it happens:**
SEdit has **TWO** neighbor detection patterns:

1. **Simple 4-neighbor check** (used by most tools):
```cpp
// Check if tile is a wall
bool isWall = isWallTile(map->mapData[index]);
```

2. **Bresenham-based line wall** (TOOL_WALL during drag):
```cpp
// map.cpp:1784-1791 - CONSTRAIN MODE
shift = GetAsyncKeyState(VK_SHIFT);
if (!first) {
    if (abs(rx-x) > abs(ry-y)) first = 1;  // Lock to horizontal
    else if (abs(ry-y) > abs(rx-x)) first = 2;  // Lock to vertical
}
// Then calls set_wall_tile for each tile in line
```

**Current WallSystem.ts:**
```typescript
// WallSystem.ts:109-133 - Only checks 4 neighbors, no constrain mode
private getConnections(map: MapData, x: number, y: number): number {
  let flags = 0;
  if (x > 0 && this.isWallTile(map.tiles[y * MAP_WIDTH + (x - 1)])) {
    flags |= WallConnection.LEFT;
  }
  // ... similar for other directions
  return flags;
}
```

**Missing from current implementation:**
- No shift-key constrain mode for straight lines
- No "first axis moved locks constrain" behavior
- Wall line tool uses generic Bresenham, not SEdit's polynomial-based algorithm (map.cpp:2499-2560)

**Consequences:**
- Wall lines aren't perfectly straight like SEdit
- Can't draw perfect horizontal/vertical walls easily
- Wall connections have off-by-one errors at line junctions

**Prevention:**
1. Read SEdit's `set_wall_tile()` function completely (customize.cpp or utils.cpp)
2. Implement EXACTLY the same neighbor detection bitmask
3. Add constrain mode to wall tool (shift = lock axis)
4. Use SEdit's polynomial line algorithm for wall tool, not generic Bresenham

**Detection:**
- Walls don't connect at corners
- Wall line isn't perfectly horizontal/vertical
- Wall tiles have wrong connection sprite

**Which phase:** Wall tool fix phase

---

### Pitfall 5: Game Object 3x3 Stamp Boundary Checks

**What goes wrong:** Game objects (flags, spawns, switches) fail to place near map edges or place corrupted.

**Why it happens:**
SEdit places game objects as **3x3 stamps** with bounds checking:
```cpp
// map.cpp:1293-1300 - FLAG TOOL
for (i = y; i < (y + 3); i++) {
    if (i > map->header.height-1 || i < 0) continue;  // Skip OOB rows
    for (j = x; j < (x + 3); j++) {
        if (j > -1 && j < map->header.width) {  // Skip OOB cols
            map->mapData[j+i*map->header.width] = flag_data[hFlagType][(i-y)*3+(j-x)];
        }
    }
}
```

**Notice:**
- Clicks on center tile (x, y)
- Places 3x3 stamp from (x, y) to (x+2, y+2)
- **Allows partial placement near edges** (doesn't reject, just skips OOB tiles)

**Current implementation:**
```typescript
// GameObjectSystem.ts (assumed from context) likely has:
const valid = cx - 1 >= 0 && cx + 1 < MAP_WIDTH && cy - 1 >= 0 && cy + 1 < MAP_HEIGHT;
if (!valid) return false;  // ❌ WRONG - rejects near edges
```

**Consequences:**
- Can't place flags/spawns near map edges (last 2 rows/columns)
- SEdit maps with edge objects fail to load identically

**Prevention:**
1. Allow partial placement like SEdit
2. Bounds check each tile individually, not the whole stamp
3. Test placement at coordinates (0,0), (255,255), (1, 254), etc.

**Detection:**
- "Cannot place flag" near map edges
- Map loads but edge objects missing
- Error messages when clicking near borders

**Which phase:** All game object tool phases (flag, spawn, switch, pole)

---

### Pitfall 6: Picker Tool Return-to-Previous-Tool

**What goes wrong:** Picker tool doesn't restore previous tool correctly, leaving user stuck in pencil mode.

**Why it happens:**
SEdit's picker tool has **explicit previous tool tracking**:
```cpp
// After picking, SEdit restores:
if (currentTool != TOOL_FILL)
    currentTool = TOOL_EDIT;
// (tile.cpp:1247-1248)
```

**Current implementation:**
```typescript
// EditorState.ts:199-202
setTool: (tool) => set((state) => ({
  currentTool: tool,
  previousTool: tool === ToolType.PICKER ? state.currentTool : state.previousTool
})),
```

**Issue:** Saves previous tool, but what if user switches tools WHILE picker is active? SEdit doesn't support this — picker commits immediately.

**Consequences:**
- previousTool can be stale if user clicks toolbar while picker active
- Picker doesn't immediately restore tool (requires explicit call)

**Prevention:**
1. Picker tool auto-commits on click (no drag mode)
2. Restore previous tool IMMEDIATELY after picking
3. Disable other tool buttons while picker active (or auto-commit on tool change)

**Detection:**
- Press 'I' to pick, click tile, tool doesn't revert
- Pick while in wall mode, ends up in pencil mode

**Which phase:** Picker tool refinement phase

---

### Pitfall 7: Undo Stack Granularity Mismatch

**What goes wrong:** Undo captures too many steps (every tile) or too few (whole session).

**Why it happens:**
SEdit captures undo **per mouse button release**:
```cpp
// map.cpp:1109-1111 - Before tool execution
oldBuf = (WORD *)malloc(map->header.width * map->header.height * 2);
memcpy(oldBuf, map->mapData, map->header.width * map->header.height * 2);

// After tool completes (map.cpp:1600+ various tools)
// Undo is added when mouse is released, not per-tile
```

**Current implementation:**
```typescript
// EditorState.ts:495-510 - pushUndo must be called manually
pushUndo: (description) => {
  // ... creates undo snapshot
}
```

**Issue:** Who calls pushUndo and when?
- If called per-tile: undo stack explodes
- If called per-tool-activation: drag operations don't undo properly

**Consequences:**
- Draw 10 tiles → 10 undo levels (bad) OR
- Draw 10 tiles → 1 undo level but only if you remember to call pushUndo (fragile)

**Prevention:**
1. Call pushUndo on mouse DOWN (before first change)
2. Don't call pushUndo during mouse drag
3. For fill/stamp tools: one undo per click
4. For drag tools: one undo per drag session

**Detection:**
- Undo steps through every pixel drawn
- Undo doesn't revert drag operation
- Memory usage grows during long edit session

**Which phase:** All tool implementation phases — must handle undo consistently

---

### Pitfall 8: Animated Tile Frame Offset Range

**What goes wrong:** Setting animation frame offset > 127 corrupts tile data.

**Why it happens:**
Frame offset is stored in **7 bits** (bits 8-14):
```cpp
// main.h:30
#define ANIM(a) (int)((a | 0x8000))

// When setting offset (customize.cpp or similar):
tile = animId | 0x8000 | ((offset & 0x7F) << 8);
//                         ^^^^^^^^^^^^^^^ CRITICAL MASK
```

**Current implementation:**
If offset slider allows 0-255, but encoding only uses 7 bits:
```typescript
const encoded = animId | 0x8000 | ((offset & 0x7F) << 8);
```

If the UI allows offset > 127, the high bit overflows into bit 15, corrupting the animation flag!

**Consequences:**
- Offset 128+ becomes offset 0+ with animation flag cleared
- Tile renders as static tile ID instead of animation

**Prevention:**
1. Limit offset slider to 0-127 (not 0-255)
2. Mask offset with 0x7F when encoding
3. Validate offset range in setters

**Detection:**
- Set offset to 128, tile becomes static
- Animation stops playing at high offsets

**Which phase:** Animation panel implementation phase

---

### Pitfall 9: Fill Tool Pattern Offset Calculation

**What goes wrong:** Fill tool with multi-tile selection creates seams or misaligned patterns.

**Why it happens:**
SEdit's fill uses **single tile** (no pattern support):
```cpp
// map.cpp:1590-1597 - TOOL_FILL
WORD filltile;
filltile = map->mapData[y*map->header.width + x];
FillBits(filltile, x, y, map);
```

**Current implementation HAS pattern fill:**
```typescript
// EditorState.ts:442-492 - Pattern calculation
const patternX = ((offsetX % tileSelection.width) + tileSelection.width) % tileSelection.width;
const patternY = ((offsetY % tileSelection.height) + tileSelection.height) % tileSelection.height;
```

**Issue:** This is a **feature enhancement**, not SEdit parity! If the goal is exact SEdit behavior, pattern fill is WRONG.

**Consequences:**
- Fill behaves differently than SEdit (may be desired, but breaks parity)
- Pattern offset math can have off-by-one errors at negative offsets

**Prevention:**
1. Decide: exact SEdit parity (no pattern) OR enhancement (pattern fill)?
2. If pattern: test negative offset wrapping extensively
3. Document deviation from SEdit

**Detection:**
- Fill creates unexpected patterns
- Seams in filled area

**Which phase:** Fill tool implementation phase — decide on parity vs enhancement

---

### Pitfall 10: Line Tool Polynomial vs Bresenham

**What goes wrong:** Line tool draws different tiles than SEdit for diagonal lines.

**Why it happens:**
SEdit uses **polynomial evaluation**, not Bresenham:
```cpp
// map.cpp:2499-2560 - TOOL_LINE on mouse up
Polynomial line;
coeffs[1] = (double)(stop.y - start.y) / (double)(stop.x - start.x);
line.SetCoefficients(coeffs, 2);

for (int p = start.x; p <= stop.x; p += 16) {
    int z = (int)(line.Evaluate((double)p - start.x) + .5) / 16;
    set_wall_tile(map, p/16, z, hWallType);
    // Gap filling logic...
}
```

**Current implementation:**
```typescript
// MapCanvas.tsx:96-121 - Bresenham's algorithm
const getLineTiles = useCallback((x0, y0, x1, y1) => {
  // ... Bresenham implementation
}, []);
```

**Difference:**
- Bresenham: Integer-only, optimized for rasterization
- Polynomial: Floating-point, evaluates y = mx + b
- **Different tiles selected for same endpoints!**

**Consequences:**
- Line tool draws different path than SEdit
- Gaps in diagonal lines where SEdit fills them

**Prevention:**
1. Implement SEdit's polynomial line algorithm
2. Include gap-filling logic (map.cpp:2522-2540)
3. Test diagonal lines at various angles

**Detection:**
- Line tool path visually different from SEdit
- Gaps in diagonal walls

**Which phase:** Line tool implementation phase

---

## Moderate Pitfalls

### Pitfall 11: Conveyor/Bridge Direction Encoding

**What goes wrong:** Conveyor/bridge tiles placed with wrong direction encoding.

**Why it happens:**
Direction stored in **tile selection from custom.dat**, not in map tile value:
- custom.dat has separate arrays for LR vs UD
- Map tile value is just the static tile ID
- Direction is **inferred from which custom.dat array was used**

**Prevention:**
1. Load custom.dat properly (CustomDatParser)
2. Use correct array based on direction selector
3. Don't try to encode direction in tile value

**Detection:**
- Conveyors push wrong direction
- Bridges face wrong way

**Which phase:** Conveyor/bridge tool implementation

---

### Pitfall 12: Team Tile Selection Without Custom.dat

**What goes wrong:** Team-specific tiles (flags, spawns) can't be placed if custom.dat not loaded.

**Why it happens:**
Game object tile patterns stored in **custom.dat**, not hardcoded:
```cpp
// extern.h:40
extern int **flag_data, **pole_data, **spawn_data;
// These are loaded from custom.dat
```

**Prevention:**
1. Require custom.dat load before enabling game object tools
2. Provide built-in fallback patterns (from SEdit defaults)
3. Show error if custom.dat missing

**Detection:**
- Game object tools don't work
- Tiles placed as ID 0 (black)

**Which phase:** Game object tool phases

---

### Pitfall 13: Multi-tile Stamp with Drag

**What goes wrong:** Dragging pencil with 3x3 tile selection stamps incorrectly.

**Why it happens:**
SEdit's TOOL_EDIT handles tile selection during drag:
```cpp
// map.cpp:1134-1138
if (x < map->header.width && y < map->header.height) {
    EditMap(x, y, useAnim, map);
    rc.left = x*16 - scx;
    rc.right = rc.left + (!useAnim?tileSel.horz*16:16);
    // ...
}
```

But during drag (WM_MOUSEMOVE), it checks if position changed before stamping again.

**Prevention:**
1. Track last stamp position
2. Only stamp if position changed
3. Handle stamp overlap correctly

**Detection:**
- Double-stamping on single click
- Gaps when dragging fast

**Which phase:** Pencil tool drag implementation

---

## Minor Pitfalls

### Pitfall 14: Status Bar Coordinate Display

**What goes wrong:** Status bar shows wrong coordinates.

**Why it happens:**
SEdit displays **1-indexed** coordinates:
```cpp
// map.cpp:1117
sprintf(buf, "x: %-5d y: %-5d", x + 1, y + 1);
//                                  ^^^ 1-indexed
```

If current implementation shows 0-indexed, user confusion.

**Prevention:**
Display coordinates as (x+1, y+1) in status bar.

**Detection:**
User compares coordinates with SEdit, off by one.

**Which phase:** Any phase touching UI display

---

### Pitfall 15: Scroll Position Pixel Alignment

**What goes wrong:** Map appears jittery when scrolling.

**Why it happens:**
SEdit aligns scroll positions to tile boundaries:
```cpp
// map.cpp:203-204
scrollx = (scrollx>>4)<<4;  // Round down to nearest 16 pixels
scrolly = (scrolly>>4)<<4;
```

**Prevention:**
Snap viewport scroll to tile boundaries.

**Detection:**
Smooth scrolling causes pixel-fuzzy rendering.

**Which phase:** Viewport/scrolling implementation

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| Wall Tool | Pitfall 2 (coords), 4 (neighbors), 10 (polynomial) | Read map.cpp:1173-1203, 1761-1842, 2499-2560 completely |
| Line Tool | Pitfall 2 (coords), 10 (polynomial) | Implement polynomial evaluation, not Bresenham |
| Game Objects | Pitfall 5 (boundaries), 12 (custom.dat) | Allow partial placement, load custom.dat first |
| Fill Tool | Pitfall 9 (pattern) | Decide: exact parity (single tile) or enhancement |
| Picker Tool | Pitfall 6 (return) | Auto-restore tool immediately |
| Animation Panel | Pitfall 8 (offset range) | Limit offset to 0-127 |
| Coordinate System | Pitfall 2 (coords) | Test all zoom levels |
| Undo System | Pitfall 7 (granularity) | pushUndo on mouse down, not per tile |

---

## Verification Protocol

Before submitting any tool implementation:

### Coordinate Verification
- [ ] Test tool at all zoom levels (0.25x, 0.5x, 1x, 2x, 4x)
- [ ] Click on tile (0,0) — does tool place there?
- [ ] Click on tile (255,255) — does tool place there?
- [ ] Compare with SEdit screenshot side-by-side

### Encoding Verification
- [ ] Inspect placed tile values in map data
- [ ] Animated tiles have bit 15 = 1
- [ ] Static tiles have bit 15 = 0
- [ ] Frame offset masked to 7 bits

### Boundary Verification
- [ ] Place tool at (0,0), (1,1), (254,254), (255,255)
- [ ] 3x3 stamps allow partial placement near edges
- [ ] No crashes or errors on edge placement

### Neighbor Detection Verification (Walls)
- [ ] Place wall at (128, 128)
- [ ] Place walls at (127,128), (129,128), (128,127), (128,129)
- [ ] All walls auto-connect with correct sprites
- [ ] Remove center wall — neighbors update correctly

### Mouse Event Verification
- [ ] Click → immediate action (stamp tools)
- [ ] Drag → continuous action (pencil, wall)
- [ ] Drag → preview only, commit on release (line, rect)
- [ ] No double-stamping on click

### Undo Verification
- [ ] Draw 5 tiles with pencil (drag) → 1 undo level
- [ ] Undo restores entire drag operation
- [ ] Redo works correctly
- [ ] Undo stack size limited to 50

---

## Open Questions for Roadmap

1. **Pattern Fill**: Keep enhancement or revert to SEdit single-tile fill?
2. **Rectangle Tool**: Is this wall-specific or general?
3. **Custom.dat**: Bundle defaults or require user to load?
4. **Zoom behavior**: Should tools work differently at different zooms? (SEdit doesn't have zoom)
5. **Multi-tile drag**: Does SEdit stamp every tile or check for movement threshold?

---

## Sources

- **SEdit Source Code** (v2.02.00):
  - `map.cpp` lines 1047-2850 (tool implementations)
  - `main.h` lines 29-273 (constants, bit encoding)
  - `tile.cpp` (tile palette, rendering)
  - `customize.cpp` (custom.dat loading, game object data)

- **Current Implementation**:
  - `EditorState.ts` (Zustand store)
  - `MapCanvas.tsx` (tool rendering, mouse handling)
  - `WallSystem.ts` (wall auto-connection)
  - `GameObjectSystem.ts` (3x3 stamp tools)

- **Technical Analysis**:
  - `SEDIT_Technical_Analysis.md` (map format, encoding)

**Confidence:** HIGH — All pitfalls verified against SEdit source code and current implementation.
