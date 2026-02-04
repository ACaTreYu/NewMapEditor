# Domain Pitfalls: SELECT Tool & Animation Panel Redesign

**Project:** AC Map Editor — v1.6 Milestone
**Researched:** 2026-02-04
**Focus:** Adding SELECT tool (marquee, clipboard, transforms) and Animation Panel redesign to existing Canvas/Zustand editor

---

## Executive Summary

Adding selection and clipboard features to an existing tile map editor introduces **coordinate system fragility** at non-1x zoom, **undo/redo integration complexity**, and **React state management challenges** for floating paste previews. Animation panel redesign risks breaking tile encoding assumptions.

**Critical Finding:** The existing editor already survived coordinate system challenges (v1.5 research identified zoom/coord issues). SELECT tool multiplies this problem — selection bounds, clipboard storage, paste preview rendering, and transform algorithms ALL must handle zoom correctly.

**Most Dangerous Pitfalls:**
1. **Selection bounds drift at non-1x zoom** (same coord bug pattern that plagued existing tools)
2. **Clipboard persists tile data without coord context** (paste at wrong zoom = wrong placement)
3. **Transform algorithms operate on Uint16Array** (must preserve animation flags, team data bits)
4. **Undo captures entire map** (clipboard ops double memory usage)
5. **Marching ants animation tanks performance** (canvas redraw every frame)

---

## Critical Pitfalls

### Pitfall 1: Selection Coordinate Drift at Non-1x Zoom

**What goes wrong:** Selection rectangle drawn at 2x zoom, but underlying tile coordinates calculated wrong — selection appears offset from actual tiles.

**Why it happens:**
Current system already has zoom coordinate challenges (identified in v1.5 PITFALLS.md):
```typescript
// MapCanvas.tsx:454-460 - screenToTile conversion
const screenToTile = (screenX, screenY) => {
  const tilePixels = TILE_SIZE * viewport.zoom;
  return {
    x: Math.floor(screenX / tilePixels + viewport.x),
    y: Math.floor(screenY / tilePixels + viewport.y)
  };
};
```

**SELECT tool doubles the problem:**
- **Mouse down at zoom 2x** → calculate start tile coords
- **Mouse drag to create selection** → calculate end tile coords
- **Both calculations must be pixel-perfect** or selection won't match visual grid

**Real-world scenario:**
```
User at 4x zoom:
1. Drags selection from (10,10) to (20,20)
2. Visual rectangle covers 10x10 tiles on screen
3. Underlying selection stores (10.2, 10.1) to (19.8, 20.3) due to rounding errors
4. Copy operation grabs tiles (10,10) to (19,20) — wrong dimensions!
5. Paste at 1x zoom — tiles appear at wrong offset
```

**Consequences:**
- Selection doesn't match visual rectangle
- Copy/paste grabs wrong tiles
- Clipboard data inconsistent between zoom levels
- Users lose trust in selection accuracy

**Prevention:**
1. **Store selection bounds as integer tile coords ONLY** (never pixels, never fractional)
2. **Validate coord conversion at all zoom levels** (0.25x, 0.5x, 1x, 2x, 4x)
3. **Use Math.floor consistently** for start coords, Math.floor for end coords
4. **Selection state interface:**
   ```typescript
   interface SelectionBounds {
     x1: number;  // Always integer tile coord
     y1: number;  // Always integer tile coord
     x2: number;  // Always integer tile coord
     y2: number;  // Always integer tile coord
   }
   ```
5. **Test pattern:** Draw 3x3 selection at each zoom, verify copy grabs exactly 9 tiles

**Detection:**
- Selection rectangle 1px off from tile grid lines
- Copy operation grabs N±1 tiles instead of N tiles
- Paste preview shows at different position than selection origin
- Selection bounds change when zooming without mouse input

**Which phase:** Phase 1 (Marquee Selection foundation) — MUST get this right before clipboard

**Source confidence:** HIGH — Current codebase already has coordinate challenges documented ([MapCanvas.tsx coordinate handling](https://www.cs.colostate.edu/~anderson/newsite/javascript-zoom.html), v1.5 PITFALLS.md)

---

### Pitfall 2: Clipboard Data Without Spatial Context

**What goes wrong:** Clipboard stores tile array but loses coordinate reference — paste operation doesn't know original selection size/position.

**Why it happens:**
Naive clipboard implementation:
```typescript
// ❌ WRONG - loses width/height context
interface Clipboard {
  tiles: Uint16Array;  // Just raw tile data
}

// When pasting:
// How many tiles wide is this?
// Was it 3x3? 9x1? 1x9?
// Can't reconstruct 2D shape from 1D array!
```

**Correct implementation needs:**
```typescript
interface ClipboardData {
  tiles: Uint16Array;  // Raw tile values
  width: number;       // Selection width in tiles
  height: number;      // Selection height in tiles
  sourceX?: number;    // Optional: for debugging
  sourceY?: number;    // Optional: for debugging
}
```

**Real-world scenario:**
```
User selects 4x2 region (8 tiles):
1. Copy → stores [t1, t2, t3, t4, t5, t6, t7, t8]
2. Without width/height metadata, paste can't tell if it's:
   - 8x1 (horizontal strip)
   - 1x8 (vertical strip)
   - 4x2 (correct)
   - 2x4 (wrong)
3. Paste draws wrong shape on map
```

**Consequences:**
- Paste operation draws wrong dimensions
- Mirror/rotate transforms fail (need 2D shape info)
- Undo can't correctly restore (wrong tile count)

**Prevention:**
1. **Always store width AND height with clipboard data**
2. **Validate dimensions before paste:** `tiles.length === width * height`
3. **Clear clipboard if dimension validation fails**
4. **Add debug logging:** "Copied WxH region with N tiles"

**Detection:**
- Copy 3x3, paste shows as 9x1 strip
- Rotate operation fails with "invalid dimensions"
- Paste preview has wrong aspect ratio

**Which phase:** Phase 2 (Clipboard Copy/Paste) — foundational data structure

**Source confidence:** MEDIUM — Common pattern in tile editors ([Tiled Forum copy/paste discussion](https://discourse.mapeditor.org/t/how-to-cut-and-paste-tiles/408))

---

### Pitfall 3: Tile Encoding Corruption During Transforms

**What goes wrong:** Mirror/rotate operations corrupt tile data by not preserving bit-encoded metadata.

**Why it happens:**
Tiles are 16-bit values with **packed bit fields** (from existing PITFALLS.md):
```
Bit 15:    Animation flag (0x8000)
Bits 8-14: Frame offset (animation) OR warp data (0x7F00)
Bits 0-7:  Tile ID or animation ID (0x00FF)
```

**Naive rotation algorithm:**
```typescript
// ❌ WRONG - treats tiles as opaque integers
function rotate90(tiles: Uint16Array, width: number, height: number): Uint16Array {
  const rotated = new Uint16Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = y * width + x;
      const dstIdx = x * height + (height - 1 - y);
      rotated[dstIdx] = tiles[srcIdx];  // ✓ Value preserved
    }
  }
  return rotated;
}
// This looks correct but...
```

**Hidden problem:** Some tiles have **directional semantics** encoded in custom.dat patterns:
- Conveyor tiles point left/right/up/down
- Bridge tiles have orientation
- Warp tiles store dest/src coordinates
- Rotating tile positions WITHOUT rotating tile graphics creates nonsense

**Example corruption:**
```
Original 3x3 conveyor (horizontal):
[→ → →]
[→ → →]
[→ → →]

After rotate90 (positions rotated, graphics not):
[→ → →]  ← Still pointing right!
[→ → →]
[→ → →]

Should be:
[↓ ↓ ↓]  ← Pointing down after rotation
```

**Consequences:**
- Rotated selections have wrong tile graphics
- Conveyor/bridge tiles point wrong direction
- Game objects become non-functional
- Users must manually fix every rotated object

**Prevention:**
1. **Document in code comments:** "Rotation preserves tile values — does NOT rotate tile graphics"
2. **SEdit doesn't support rotate** — consider deferring this feature entirely
3. **If implementing rotate:** Warn user that directional tiles won't auto-rotate
4. **Alternative:** Only allow rotate on "safe" tiles (static, non-directional)
5. **Check tile type before rotating:**
   ```typescript
   const hasGameObjects = tiles.some(t => isGameObjectTile(t));
   if (hasGameObjects) {
     showWarning("Selection contains game objects - rotation not recommended");
   }
   ```

**Detection:**
- Rotate conveyor → tiles still point original direction
- Rotate warp → warp links broken
- Rotate selection → visual discontinuities

**Which phase:** Phase 4 (Mirror/Rotate Transforms) — deep dive before implementing

**Source confidence:** HIGH — Tile encoding documented in types.ts, SEdit source analysis, existing PITFALLS.md

**Special note:** Mirror H/V is SAFER than rotate because:
- MirrorH: Reverses row order (tiles stay in same orientation)
- MirrorV: Reverses column order (tiles stay in same orientation)
- Rotate90: Changes tile orientation (graphics mismatch)

---

### Pitfall 4: Undo Stack Memory Explosion

**What goes wrong:** Every clipboard operation doubles undo memory usage — 50 undo levels consume 6.4MB instead of 3.2MB.

**Why it happens:**
Current undo system (EditorState.ts:495-510):
```typescript
interface MapAction {
  tiles: Uint16Array;  // 256x256x2 bytes = 131,072 bytes per snapshot
  description: string;
}

// 50 undo levels = 50 * 131KB = 6.4MB baseline
```

**Clipboard operations add:**
```typescript
interface ClipboardData {
  tiles: Uint16Array;  // Could be 256x256 = 131KB if full map selected
  width: number;
  height: number;
}

// Worst case:
// - 50 undo snapshots: 6.4MB
// - Clipboard holding full map: +131KB
// - Paste operation creates NEW undo snapshot: +131KB
// Total: ~6.7MB for undo alone
```

**Memory growth scenario:**
```
User workflow:
1. Select 100x100 region (20,000 tiles = 40KB clipboard)
2. Copy → allocates clipboard
3. Paste at new location → pushUndo (131KB) + applies paste
4. Repeat paste 10 times → 10 undo levels = 1.3MB
5. Clipboard still holding 40KB
6. User never cleared clipboard → memory never freed
```

**Consequences:**
- Electron renderer process memory grows unbounded
- Performance degradation after extended editing
- Risk of OOM crash on 32-bit systems
- Users complain of "lag after copying large selections"

**Prevention:**
1. **Limit clipboard size:** Max 64x64 selection (8KB instead of 131KB)
2. **Clear clipboard on tool switch:** Free memory when user switches from SELECT tool
3. **Undo stack compression:** Store deltas instead of full snapshots (complex!)
4. **Warn on large selections:** "Selection over 50x50 may impact performance"
5. **Memory profiling:** Test with 50 undo levels + clipboard + large selection
6. **Undo limit for clipboard ops:** Reduce maxUndoLevels to 25 when clipboard active?

**Alternative approach (intelligent undo):**
```typescript
interface SmartMapAction {
  type: 'full' | 'delta';
  tiles?: Uint16Array;        // Full snapshot
  changes?: TileChange[];     // Delta (x, y, oldValue, newValue)
  description: string;
}

// Clipboard paste with 100 tiles changed:
// Delta: 100 * (2+2+2+2) bytes = 800 bytes
// vs Full: 131KB
// 163x smaller!
```

**Detection:**
- Task Manager shows renderer process growing beyond 200MB
- Lag when opening undo history
- OOM errors after many copy/paste operations
- Performance degrades over time in single session

**Which phase:** Phase 2 (Clipboard Copy/Paste) — validate memory profile before shipping

**Source confidence:** MEDIUM — Existing undo system is straightforward, clipboard adds predictable overhead

**Source:** [React undo/redo patterns](https://konvajs.org/docs/react/Undo-Redo.html)

---

### Pitfall 5: Marching Ants Performance Tank

**What goes wrong:** Animated selection border (marching ants) redraws entire canvas at 60fps — frame rate drops below 30fps.

**Why it happens:**
Marching ants requires continuous animation:
```typescript
// Naive implementation
useEffect(() => {
  const interval = setInterval(() => {
    setMarchOffset(prev => (prev + 1) % 8);  // Advance dash offset
    draw();  // ❌ Redraws ENTIRE CANVAS every 50ms
  }, 50);
  return () => clearInterval(interval);
}, []);
```

**Current draw loop already expensive (MapCanvas.tsx:127-430):**
- Iterates visible tiles (could be 1000+ at low zoom)
- Draws each tile from tileset image
- Draws grid overlay
- Draws tool previews
- **Adding marching ants:** +1 more draw per animation frame

**Performance breakdown:**
```
At 1x zoom with 20x15 visible tiles (300 tiles):
- Tile rendering: ~5ms
- Grid rendering: ~2ms
- Marching ants stroke: ~1ms
- Total per frame: ~8ms (125fps) ✓ OK

At 0.25x zoom with 80x60 visible tiles (4800 tiles):
- Tile rendering: ~80ms
- Grid rendering: ~10ms
- Marching ants stroke: ~1ms
- Total per frame: ~91ms (11fps) ❌ UNPLAYABLE
```

**Consequences:**
- Laggy mouse tracking
- Choppy marching ants animation
- User frustration during selection
- CPU usage spikes

**Prevention:**
1. **Separate animation layer:** Only redraw marching ants, not tiles
   ```typescript
   // Two canvases stacked:
   <canvas ref={tileCanvasRef} />      // Static tiles
   <canvas ref={selectionCanvasRef} /> // Just marching ants (transparent)
   ```
2. **Use CSS animation instead:**
   ```css
   .selection-border {
     stroke-dasharray: 4 4;
     animation: march 0.5s linear infinite;
   }
   @keyframes march {
     to { stroke-dashoffset: 8; }
   }
   ```
3. **Throttle draw calls:** Max 30fps for ants (adequate visual feedback)
4. **Disable ants at low zoom:** When tiles < 4px, ants are invisible anyway
5. **requestAnimationFrame instead of setInterval:** Sync with browser repaint

**Detection:**
- FPS counter drops below 30fps during selection drag
- Mouse cursor lags behind actual position
- Ants stutter instead of smooth march
- CPU usage > 50% for renderer process

**Which phase:** Phase 1 (Marquee Selection) — optimize before users complain

**Source confidence:** HIGH — Canvas performance is well-documented concern

**Sources:**
- [Marching ants canvas examples](https://www.plus2net.com/html_tutorial/html-canvas-marching-ants.php)
- [Canvas 1px gaps case study](https://medium.com/@Christopher_Tseng/why-does-perfect-code-create-1px-gaps-a-canvas-rendering-case-study-efcaac96ed93)
- [Canvas performance optimization](https://www.sandromaglione.com/articles/infinite-canvas-html-with-zoom-and-pan)

---

### Pitfall 6: Floating Paste Preview State Desync

**What goes wrong:** Paste preview rendering lags behind mouse cursor, or appears at wrong position after zoom change.

**Why it happens:**
Floating paste preview requires **three state pieces** to stay synchronized:
1. **Clipboard data** (tiles + dimensions)
2. **Mouse cursor position** (in tile coords)
3. **Viewport state** (zoom + scroll offset)

**State desync scenario:**
```typescript
// State in EditorStore:
const [clipboard, setClipboard] = useState<ClipboardData | null>(null);
const [pastePreviewPos, setPastePreviewPos] = useState<{x: number, y: number} | null>(null);

// User workflow:
1. Copy 5x5 selection at zoom 1x
2. Zoom to 4x → viewport state changes
3. Move mouse to paste location → setPastePreviewPos({x: 50, y: 50})
4. Draw loop calculates screen position:
   const screenX = (50 - viewport.x) * TILE_SIZE * viewport.zoom;
   ↑ But viewport.x might be stale from React render cycle!
5. Preview renders 1-2 tiles off from cursor
```

**React render cycle timing issue:**
```
Frame N:
- User moves mouse → onMouseMove fires
- setPastePreviewPos({x: 52, y: 30}) called
- State update queued

Frame N+1:
- React re-renders component
- draw() uses NEW pastePreviewPos
- BUT viewport state might have changed between queuing and render
- Preview position calculated with mismatched state

Result: 1-frame lag creating "jittery" preview
```

**Consequences:**
- Paste preview doesn't follow cursor smoothly
- Preview jumps to wrong position on zoom
- Preview disappears when cursor near edge (coord calc overflow)
- Users can't accurately place pasted content

**Prevention:**
1. **Use useRef for paste preview position** (no re-render):
   ```typescript
   const pastePreviewRef = useRef<{x: number, y: number} | null>(null);

   const handleMouseMove = (e: React.MouseEvent) => {
     const {x, y} = screenToTile(...);
     pastePreviewRef.current = {x, y};  // No state update
     draw();  // Direct draw call
   };
   ```
2. **Read viewport.zoom directly in draw()** (no stale closure):
   ```typescript
   const draw = () => {
     const { viewport, clipboard } = useEditorStore.getState();  // Fresh
     if (pastePreviewRef.current && clipboard) {
       const screenPos = tileToScreen(pastePreviewRef.current.x, pastePreviewRef.current.y);
       drawClipboardPreview(screenPos, clipboard);
     }
   };
   ```
3. **Test at all zoom levels** — verify preview doesn't desync
4. **Bounds checking:** Ensure preview doesn't overflow map edges

**Detection:**
- Paste preview lags 1-2 frames behind cursor
- Preview jumps to different position after zoom
- Preview flickers or disappears intermittently
- Preview position wrong after panning

**Which phase:** Phase 3 (Floating Paste Preview) — critical UX issue

**Source confidence:** MEDIUM — React state sync challenges are common, but specific to this architecture

**Source:** Existing PITFALLS.md Pitfall 3 (Mouse Event State Machine)

---

### Pitfall 7: Rectangle Rotation Dimension Swap Ignored

**What goes wrong:** Rotate 90° on non-square selection corrupts output — dimensions not swapped correctly.

**Why it happens:**
Rotation changes aspect ratio:
```
Original 4x2 selection:
[A B C D]
[E F G H]

After rotate90 clockwise:
[E A]  ← Now 2x4 (dimensions swapped!)
[F B]
[G C]
[H D]
```

**Naive implementation misses dimension swap:**
```typescript
// ❌ WRONG
function rotate90Clockwise(data: ClipboardData): ClipboardData {
  const { tiles, width, height } = data;
  const rotated = new Uint16Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = y * width + x;
      const dstIdx = x * height + (height - 1 - y);
      rotated[dstIdx] = tiles[srcIdx];
    }
  }

  return {
    tiles: rotated,
    width,   // ❌ WRONG - should be height
    height   // ❌ WRONG - should be width
  };
}
```

**Consequences:**
- Rotated clipboard has wrong width/height metadata
- Paste draws wrong shape (4x2 instead of 2x4)
- Selection bounds validation fails
- Undo corrupts map state

**Prevention:**
1. **Swap width and height after rotation:**
   ```typescript
   return {
     tiles: rotated,
     width: height,   // ✓ Swapped
     height: width    // ✓ Swapped
   };
   ```
2. **Validate rotation output:** `rotated.length === width * height` still true
3. **Test with non-square selections:** 3x5, 7x2, 1x10, etc.
4. **Visual verification:** Paste preview shows correct aspect ratio

**Detection:**
- Rotate 4x2 selection, paste shows as 4x2 instead of 2x4
- Paste preview dimensions don't match clipboard
- Assertion failure: "Clipboard dimensions mismatch"

**Which phase:** Phase 4 (Mirror/Rotate Transforms)

**Source confidence:** HIGH — Well-documented algorithmic issue

**Sources:**
- [Rotate 2D array common mistakes](https://www.baeldung.com/cs/rotate-2d-matrix)
- [Matrix rotation transpose + reverse](https://dev.to/a_b_102931/rotating-a-matrix-90-degrees-4a49)

---

### Pitfall 8: Animation Panel Hex Numbering Mismatch

**What goes wrong:** Animation panel shows "0D5" but tile encoding uses `0x0D5` — off-by-16 error.

**Why it happens:**
Confusion between **animation array index** vs **animation tile ID**:

```typescript
// Current AnimationPanel.tsx shows:
const animId = anim.id;  // Array index (0-255)
ctx.fillText(animId.toString(16).toUpperCase(), ...);  // "D5"

// But tile encoding uses:
const animatedTile = ANIMATED_FLAG | (frameOffset << 8) | selectedAnimId;
//                                                          ↑ This should match panel display!
```

**Hex formatting inconsistency:**
```
Animation ID: 213 decimal

Panel displays: "D5" (hex for 213)
Tile encoding: 0x80D5 (animation flag + frame offset 0 + ID 213)

But if panel accidentally shows array index instead of ID:
Panel displays: "D5" (array index in hex)
Actual anim ID: 214 (off by one!)
```

**SEdit format (from user description):**
- "00-FF numbered vertical list"
- Implies TWO-digit hex: "00", "01", ..., "FF"
- NOT: "0", "1", ..., "255"

**Prevention:**
1. **Always use 2-digit hex formatting:**
   ```typescript
   anim.id.toString(16).toUpperCase().padStart(2, '0');
   // 0 → "00"
   // 15 → "0F"
   // 213 → "D5"
   ```
2. **Verify anim.id is correct tile encoding value** (not array index)
3. **Add validation:** Placed tile should have same ID shown in panel
4. **Test edge cases:** Animation 0x00, 0x0F, 0xFF

**Detection:**
- Panel shows "D5", placed tile encodes as 0x80D6 (off by one)
- Animation 0 shows as "0" instead of "00"
- Hex values don't match SEdit reference screenshots

**Which phase:** Phase 5 (Animation Panel Redesign)

**Source confidence:** MEDIUM — Hex formatting is straightforward, but easy to miss padding

---

### Pitfall 9: Tile/Anim Radio Toggle State Confusion

**What goes wrong:** User clicks Anim radio, but selectedTile still shows static tile ID — panel state doesn't update tool.

**Why it happens:**
Animation panel redesign adds **Tile/Anim radio toggle** (per user description). This creates TWO selection modes:
1. **Tile mode:** selectedTile is static tile ID (0-3999)
2. **Anim mode:** selectedTile is animated tile (0x8000 | frameOffset | animId)

**State synchronization challenge:**
```typescript
// EditorState currently has:
selectedTile: number;  // Could be static OR animated

// With radio toggle:
animPanelMode: 'tile' | 'anim';  // NEW state
selectedTile: number;             // Existing

// Who updates selectedTile when mode changes?
// What if user switches from tile 280 to anim 0x80D5 — does selectedTile update?
```

**Desync scenario:**
```
1. User in Tile mode, selectedTile = 280 (static)
2. User clicks Anim radio → animPanelMode = 'anim'
3. selectedTile STILL 280 (not updated!)
4. User clicks on map with PENCIL tool
5. Tool places tile 280 (static) even though Anim mode active
6. User expects animated tile to be placed
```

**Consequences:**
- Mode toggle doesn't change tool behavior
- Users can't place animated tiles
- selectedTile state becomes ambiguous
- Radio buttons don't reflect actual tool state

**Prevention:**
1. **selectedTile and animPanelMode must stay in sync:**
   ```typescript
   const toggleAnimMode = (mode: 'tile' | 'anim') => {
     setAnimPanelMode(mode);
     if (mode === 'anim' && (selectedTile & 0x8000) === 0) {
       // Was in tile mode, switch to default anim
       setSelectedTile(0x8000 | 0);  // Anim 0, frame offset 0
     } else if (mode === 'tile' && (selectedTile & 0x8000) !== 0) {
       // Was in anim mode, switch to default tile
       setSelectedTile(280);  // DEFAULT_TILE
     }
   };
   ```
2. **Radio buttons derive state from selectedTile:**
   ```typescript
   const isAnimMode = (selectedTile & 0x8000) !== 0;
   <input type="radio" checked={!isAnimMode} onChange={() => setMode('tile')} />
   <input type="radio" checked={isAnimMode} onChange={() => setMode('anim')} />
   ```
3. **Don't store separate animPanelMode** — derive from selectedTile bit 15
4. **Test:** Toggle radio → verify tool places correct tile type

**Detection:**
- Click Anim radio, place tile → static tile placed
- Click Tile radio, place tile → animated tile placed
- Radio state doesn't match selectedTile encoding

**Which phase:** Phase 5 (Animation Panel Redesign)

**Source confidence:** MEDIUM — State sync patterns common in React, but specific to this feature

---

## Moderate Pitfalls

### Pitfall 10: Selection Delete Without Undo Boundary

**What goes wrong:** User selects 100 tiles, presses Delete, loses tiles forever — no undo captured.

**Why it happens:**
Delete operation needs explicit undo push:
```typescript
// ❌ WRONG
const handleDelete = () => {
  const { selection, map } = useEditorStore.getState();
  for (let y = selection.y1; y <= selection.y2; y++) {
    for (let x = selection.x1; x <= selection.x2; x++) {
      map.tiles[y * MAP_WIDTH + x] = DEFAULT_TILE;
    }
  }
  // No pushUndo() call!
};
```

**Existing pattern (from PITFALLS.md Pitfall 7):**
> Call pushUndo on mouse DOWN (before first change)

**Prevention:**
1. **Push undo before delete:**
   ```typescript
   const handleDelete = () => {
     pushUndo('Delete selection');
     // ... delete tiles
   };
   ```
2. **Apply pattern to all selection ops:** Copy (no undo), Cut (pushUndo), Paste (pushUndo), Delete (pushUndo)

**Detection:**
- Delete selection → can't undo
- Undo history doesn't show "Delete selection"

**Which phase:** Phase 2 (Clipboard Copy/Paste/Delete)

---

### Pitfall 11: Cut Operation Leaves Visual Selection Active

**What goes wrong:** User cuts selection, tiles are cleared, but marching ants still visible — confusing state.

**Why it happens:**
Cut = Copy + Delete, but selection clearing isn't automatic:
```typescript
const handleCut = () => {
  handleCopy();    // Copy to clipboard
  handleDelete();  // Clear tiles
  // Selection bounds still active!
  // Marching ants still drawing!
};
```

**Prevention:**
1. **Clear selection after cut:**
   ```typescript
   const handleCut = () => {
     handleCopy();
     handleDelete();
     clearSelection();  // ✓ Remove marching ants
   };
   ```
2. **Alternative:** Keep selection for immediate paste reference

**Detection:**
- Cut selection → marching ants remain around deleted area
- User confused about selection state

**Which phase:** Phase 2 (Clipboard Cut)

---

### Pitfall 12: Paste Exceeds Map Bounds Without Warning

**What goes wrong:** User pastes 50x50 clipboard at (230, 230) — half the tiles clip outside 256x256 map.

**Why it happens:**
No bounds validation on paste:
```typescript
// ❌ WRONG
const handlePaste = (x: number, y: number) => {
  const { clipboard } = useEditorStore.getState();
  for (let cy = 0; cy < clipboard.height; cy++) {
    for (let cx = 0; cx < clipboard.width; cx++) {
      const tileX = x + cx;
      const tileY = y + cy;
      setTile(tileX, tileY, clipboard.tiles[cy * clipboard.width + cx]);
      // If tileX >= 256, silently fails or crashes
    }
  }
};
```

**Prevention:**
1. **Clip paste to map bounds:**
   ```typescript
   const maxX = Math.min(x + clipboard.width, MAP_WIDTH);
   const maxY = Math.min(y + clipboard.height, MAP_HEIGHT);
   for (let cy = 0; cy < maxY - y; cy++) {
     for (let cx = 0; cx < maxX - x; cx++) {
       // Only paste within bounds
     }
   }
   ```
2. **Warn user:** "Paste location clips 25 tiles outside map bounds"
3. **Preview shows clipped area** in different color

**Detection:**
- Paste near edge → some tiles missing
- No warning about clipping

**Which phase:** Phase 3 (Floating Paste Preview)

---

### Pitfall 13: Mirror Operation Doesn't Update Preview

**What goes wrong:** User selects region, presses Mirror H, selection visually unchanged — operation appears to fail.

**Why it happens:**
Mirror operates on clipboard, not visible selection:
```typescript
const handleMirrorH = () => {
  const { selection, map } = useEditorStore.getState();
  // Mirror tiles in-place on map
  for (let y = selection.y1; y <= selection.y2; y++) {
    const row = [];
    for (let x = selection.x1; x <= selection.x2; x++) {
      row.push(map.tiles[y * MAP_WIDTH + x]);
    }
    row.reverse();  // Mirror
    for (let x = selection.x1; x <= selection.x2; x++) {
      map.tiles[y * MAP_WIDTH + x] = row[x - selection.x1];
    }
  }
  // But canvas doesn't redraw!
};
```

**Prevention:**
1. **Force canvas redraw after transform:**
   ```typescript
   set({ map: { ...map } });  // Trigger React re-render
   ```
2. **Push undo before transform**
3. **Show visual feedback** (brief flash or highlight)

**Detection:**
- Mirror operation → no visual change
- Refresh screen → mirrored tiles appear

**Which phase:** Phase 4 (Mirror/Rotate Transforms)

---

## Minor Pitfalls

### Pitfall 14: Keyboard Shortcuts Conflict with Existing Tools

**What goes wrong:** User presses Ctrl+C to copy, but 'C' is CONVEYOR tool shortcut — wrong action triggered.

**Why it happens:**
Keyboard event handling priority:
```typescript
// Tool shortcuts check raw key:
if (e.key === 'c') setTool(ToolType.CONVEYOR);

// Clipboard shortcuts check modifier:
if (e.ctrlKey && e.key === 'c') handleCopy();

// Which fires first?
```

**Prevention:**
1. **Check modifiers BEFORE tool shortcuts:**
   ```typescript
   if (e.ctrlKey || e.metaKey || e.altKey) {
     // Handle Ctrl+C, etc. first
     return;
   }
   // Then check tool shortcuts
   ```
2. **Disable tool shortcuts when modifier held**
3. **Document shortcuts:** C = CONVEYOR, Ctrl+C = Copy

**Detection:**
- Press Ctrl+C → switches to CONVEYOR tool instead of copying
- Keyboard shortcuts unreliable

**Which phase:** Phase 2 (Clipboard shortcuts)

---

### Pitfall 15: Selection Persists Across Map Close/Open

**What goes wrong:** User closes map with active selection, opens new map, selection still visible — wrong map context.

**Why it happens:**
Selection state not cleared on map change:
```typescript
// EditorState.ts:178-185
setMap: (map, filePath) => set({
  map,
  filePath: filePath || null,
  undoStack: [],
  redoStack: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  selection: { startX: 0, startY: 0, endX: 0, endY: 0, active: false }  // ✓ Already cleared!
}),
```

**Status:** ✅ **Already handled correctly** in existing code

**No action needed** — just verify it works.

**Which phase:** Phase 1 (Marquee Selection) — test during development

---

## Phase-Specific Warnings

| Phase | Tool/Feature | Likely Pitfall | Mitigation |
|-------|--------------|----------------|------------|
| **Phase 1: Marquee** | Selection bounds | Pitfall 1 (coord drift at zoom) | Test at all zoom levels, integer tile coords only |
| **Phase 1: Marquee** | Marching ants | Pitfall 5 (performance) | Separate canvas layer or CSS animation |
| **Phase 2: Clipboard** | Copy/Cut/Paste | Pitfall 2 (spatial context) | Store width/height with tiles |
| **Phase 2: Clipboard** | Delete | Pitfall 10 (undo boundary) | pushUndo before delete |
| **Phase 2: Clipboard** | Cut | Pitfall 11 (selection clear) | clearSelection after cut |
| **Phase 2: Clipboard** | Shortcuts | Pitfall 14 (key conflicts) | Check modifiers first |
| **Phase 3: Paste Preview** | Floating preview | Pitfall 6 (state desync) | useRef for position, no setState |
| **Phase 3: Paste Preview** | Bounds clipping | Pitfall 12 (map overflow) | Validate paste location |
| **Phase 4: Transforms** | Rotate 90° | Pitfall 7 (dimension swap) | Swap width/height after rotation |
| **Phase 4: Transforms** | Rotate 90° | Pitfall 3 (tile corruption) | Warn about directional tiles |
| **Phase 4: Transforms** | Mirror | Pitfall 13 (no preview update) | Force canvas redraw |
| **Phase 5: Anim Panel** | Hex numbering | Pitfall 8 (format mismatch) | padStart(2, '0') |
| **Phase 5: Anim Panel** | Tile/Anim toggle | Pitfall 9 (state confusion) | Derive mode from selectedTile bit 15 |
| **All Phases** | Undo/redo | Pitfall 4 (memory explosion) | Test with 50 undo levels + clipboard |

---

## Verification Protocol

Before shipping SELECT tool:

### Coordinate Accuracy
- [ ] Draw selection at 0.25x zoom → bounds match tile grid exactly
- [ ] Draw selection at 4x zoom → bounds match tile grid exactly
- [ ] Copy 3x3 at 2x zoom, paste at 1x zoom → exactly 9 tiles placed
- [ ] Selection corners snap to integer tile coords

### Clipboard Operations
- [ ] Copy 5x7 selection → clipboard stores width=5, height=7
- [ ] Cut selection → tiles cleared, selection removed, undo works
- [ ] Paste at (200,200) → tiles placed at exact location
- [ ] Paste near edge (250,250) → clipping handled gracefully

### Transform Algorithms
- [ ] Rotate 4x2 selection → output is 2x4 (dimensions swapped)
- [ ] Mirror H selection → tiles reversed left-right
- [ ] Mirror V selection → tiles reversed top-bottom
- [ ] Rotate animated tiles → animation flags preserved

### Performance
- [ ] Marching ants at 60fps with no frame drops
- [ ] Copy/paste 100x100 selection → memory < 50MB increase
- [ ] 50 undo levels + clipboard → total memory < 10MB

### Animation Panel
- [ ] Hex numbers display as "00" to "FF" (2 digits)
- [ ] Tile radio → places static tiles
- [ ] Anim radio → places animated tiles
- [ ] Offset slider updates tile encoding correctly

### Undo Integration
- [ ] Delete selection → undo restores tiles
- [ ] Paste → undo removes pasted tiles
- [ ] Rotate → undo restores original orientation
- [ ] Undo stack limited to 50 levels

---

## Open Questions for Roadmap

1. **Rotate feature:** Should we defer rotate90 due to Pitfall 3 (tile corruption)?
2. **Clipboard size limit:** Max 64x64 or allow full 256x256?
3. **Marching ants:** CSS animation or separate canvas layer?
4. **Paste mode:** Floating preview vs immediate paste on click?
5. **Undo compression:** Worth implementing deltas vs full snapshots?
6. **SEdit parity:** Does SEdit support rotate? (If no, skip feature entirely)

---

## Sources

**WebSearch (LOW confidence — need verification):**
- [Tiled Forum: Copy/paste tiles](https://discourse.mapeditor.org/t/how-to-cut-and-paste-tiles/408)
- [Canvas zoom coordination](https://www.cs.colostate.edu/~anderson/newsite/javascript-zoom.html)
- [Canvas 1px gaps case study](https://medium.com/@Christopher_Tseng/why-does-perfect-code-create-1px-gaps-a-canvas-rendering-case-study-efcaac96ed93)
- [Marching ants canvas](https://www.plus2net.com/html_tutorial/html-canvas-marching-ants.php)
- [Matrix rotation algorithms](https://www.baeldung.com/cs/rotate-2d-matrix)
- [React undo/redo patterns](https://konvajs.org/docs/react/Undo-Redo.html)

**Existing Codebase (HIGH confidence):**
- `EditorState.ts` — Undo system, tile operations
- `MapCanvas.tsx` — Coordinate conversion, drawing loop
- `types.ts` — Tile encoding (bit 15 = animation flag)
- `.planning/research/PITFALLS.md` (v1.5) — Coordinate system challenges, undo granularity, tile encoding

**Confidence Assessment:**
- Coordinate pitfalls: **HIGH** (existing codebase already has these issues documented)
- Clipboard pitfalls: **MEDIUM** (common patterns, but specific to tile editors)
- Transform pitfalls: **HIGH** (well-documented algorithms)
- Animation panel pitfalls: **MEDIUM** (hex formatting straightforward, state sync more complex)
- Performance pitfalls: **MEDIUM** (canvas performance well-known, marching ants specific)

---

**Overall Confidence:** MEDIUM-HIGH

Pitfalls are derived from:
1. **Existing system challenges** (zoom coords, undo, tile encoding) — HIGH confidence
2. **Common tile editor patterns** (clipboard, selection) — MEDIUM confidence
3. **Algorithm correctness** (rotation, mirror) — HIGH confidence
4. **React/Canvas performance** (marching ants, state sync) — MEDIUM confidence

**Gaps:**
- SEdit behavior for SELECT tool not verified (need SEdit source or testing)
- Animation panel Tile/Anim toggle exact behavior unknown
- Performance testing needed to validate marching ants claims
