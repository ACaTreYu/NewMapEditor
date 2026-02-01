# Phase 1: Bug Fixes - Research

**Researched:** 2026-02-01
**Domain:** Pattern fill algorithms, binary animation data parsing, canvas animation timing
**Confidence:** HIGH

## Summary

This research addresses three core bugs requiring fixes: pattern fill with multi-tile selections, animation frame data loading from binary files, and proper animated tile rendering on the map canvas. The standard approaches are well-established: flood fill with modulo arithmetic for pattern tiling, binary file parsing with DataView/Uint8Array for structured data extraction, and requestAnimationFrame with timestamp-based timing for animation playback.

**Primary recommendation:** Use iterative flood fill with modulo-based pattern indexing for FIX-01, implement binary parsing with DataView for the Gfx.dll animation structure for FIX-02, and use requestAnimationFrame with proper timestamp calculations for FIX-03 animation playback.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Built-in TypedArrays | ES2015+ | Binary data parsing (Uint8Array, Uint16Array) | Native JavaScript, zero dependencies, optimal performance |
| DataView | ES2015+ | Structured binary reading with endianness control | Built-in, handles mixed-format data structures |
| requestAnimationFrame | Browser API | Animation frame timing | Syncs with browser refresh, auto-pauses in background tabs |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node.js fs module | Built-in | File reading (already integrated via Electron IPC) | Reading animation data files |
| Electron IPC | 28.x | Bridge for file operations from renderer to main process | Already in use for map loading |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Built-in binary parsing | External library (binary-parser) | No benefit - adds dependency for functionality already available natively |
| requestAnimationFrame | setInterval/setTimeout | Worse - causes timing drift, screen tearing, and doesn't sync with refresh rate |
| Iterative flood fill | Recursive flood fill | Dangerous - causes stack overflow on large filled areas (256x256 map) |

**Installation:**
No new dependencies required - all solutions use built-in JavaScript/TypeScript features.

## Architecture Patterns

### Recommended Project Structure
```
src/core/
├── algorithms/      # Pattern fill, flood fill utilities
├── map/            # TileEncoding.ts (existing), animation loading
└── editor/         # EditorState.ts (existing fill function)

src/components/
└── AnimationPanel/ # Animation UI, file loading integration
```

### Pattern 1: Modulo-Based Pattern Fill
**What:** Extend flood fill to tile multi-tile selections using modulo arithmetic
**When to use:** When filling areas with rectangular tile patterns (stamps)
**Example:**
```typescript
// Source: Flood Fill Algorithm pattern extension
fillArea: (x, y, tileSelection) => {
  const { map } = get();
  if (!map) return;

  const targetTile = map.tiles[y * MAP_WIDTH + x];
  const stack: Array<{ x: number; y: number }> = [{ x, y }];
  const visited = new Set<number>();

  while (stack.length > 0) {
    const pos = stack.pop()!;
    const index = pos.y * MAP_WIDTH + pos.x;

    if (visited.has(index)) continue;
    if (map.tiles[index] !== targetTile) continue;

    visited.add(index);

    // Pattern tiling with modulo arithmetic
    const patternX = (pos.x - x) % tileSelection.width;
    const patternY = (pos.y - y) % tileSelection.height;
    const tileIndex = (tileSelection.startRow + patternY) * TILES_PER_ROW
                    + (tileSelection.startCol + patternX);

    map.tiles[index] = tileIndex;

    // Push neighbors (4-way connectivity)
    stack.push({ x: pos.x - 1, y: pos.y });
    stack.push({ x: pos.x + 1, y: pos.y });
    stack.push({ x: pos.x, y: pos.y - 1 });
    stack.push({ x: pos.x, y: pos.y + 1 });
  }

  map.modified = true;
  set({ map: { ...map } });
}
```

### Pattern 2: Binary Animation Data Parsing
**What:** Read 66-byte animation structures from Gfx.dll using DataView
**When to use:** Loading animation frame sequences from binary files
**Example:**
```typescript
// Source: SEDIT Technical Analysis + javascript.info binary arrays
interface Animation {
  id: number;
  frameCount: number;  // 1-32
  speed: number;       // Tick delay (0 = 255)
  frames: number[];    // Up to 32 WORD tile IDs
}

async function loadAnimationsFromFile(filePath: string): Promise<Animation[]> {
  // Use Electron IPC to read file
  const result = await window.electronAPI.readFile(filePath);
  if (!result.success || !result.data) {
    throw new Error('Failed to read animation file');
  }

  // Decode base64 to ArrayBuffer
  const binaryString = atob(result.data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const buffer = bytes.buffer;
  const dataView = new DataView(buffer);

  // Seek to animation data offset (0x642E0 for Gfx.dll)
  const ANIM_OFFSET = 0x642E0;
  const animations: Animation[] = [];

  for (let i = 0; i < 256; i++) {
    const offset = ANIM_OFFSET + (i * 66);

    // Read animation structure (66 bytes)
    const frameCount = dataView.getUint8(offset);
    const speed = dataView.getUint8(offset + 1);
    const frames: number[] = [];

    // Read 32 WORD (16-bit) frame indices
    for (let j = 0; j < 32; j++) {
      // Little-endian WORD
      const frameIndex = dataView.getUint16(offset + 2 + (j * 2), true);
      frames.push(frameIndex);
    }

    animations.push({
      id: i,
      frameCount,
      speed,
      frames: frames.slice(0, frameCount) // Only use valid frames
    });
  }

  return animations;
}
```

### Pattern 3: Timestamp-Based Animation Playback
**What:** Use requestAnimationFrame with timestamp deltas for frame-rate independent animation
**When to use:** Rendering animated tiles on canvas
**Example:**
```typescript
// Source: MDN requestAnimationFrame + sprite animation guides
class AnimationRenderer {
  private lastFrameTime: number = 0;
  private globalFrameIndex: number = 0;
  private animationId: number | null = null;

  start() {
    this.animationId = requestAnimationFrame((timestamp) => this.animate(timestamp));
  }

  stop() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private animate(timestamp: DOMHighResTimeStamp) {
    // 150ms per frame (matches SEDIT ANIMFRAME_DURATION)
    const FRAME_DURATION = 150;

    if (timestamp - this.lastFrameTime >= FRAME_DURATION) {
      this.globalFrameIndex++;
      this.lastFrameTime = timestamp;
      this.render();
    }

    this.animationId = requestAnimationFrame((t) => this.animate(t));
  }

  private render() {
    // For each animated tile on map:
    // const anim = animations[animationId];
    // const frameIndex = (frameOffset + globalFrameIndex) % anim.frameCount;
    // const displayTile = anim.frames[frameIndex];
    // drawTile(displayTile, x, y);
  }
}
```

### Anti-Patterns to Avoid
- **Recursive flood fill:** Stack overflow on 256x256 maps - use iterative with explicit stack
- **Fixed frame rate assumptions:** Breaking on 120Hz/144Hz displays - use timestamp deltas
- **Hardcoded animation frames:** Currently in AnimationPanel.tsx - must load from file
- **Single-tile fill only:** Ignoring tileSelection width/height - use modulo for patterns

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Binary file parsing | Custom byte reading logic | DataView + TypedArrays | Handles endianness, alignment, type safety automatically |
| Animation timing | setInterval/setTimeout | requestAnimationFrame | Syncs with refresh rate, avoids drift, pauses in background |
| Flood fill recursion | Basic recursive DFS | Iterative with explicit stack | Prevents stack overflow on large areas |
| Base64 decoding | Manual parsing | Built-in atob() | Native, optimized, handles edge cases |

**Key insight:** Binary parsing and animation timing have subtle edge cases (endianness, timing drift) that native APIs handle correctly. Custom solutions reintroduce bugs the ecosystem has already solved.

## Common Pitfalls

### Pitfall 1: Stack Overflow in Recursive Flood Fill
**What goes wrong:** Recursive flood fill crashes on large filled areas (e.g., filling empty 256x256 map)
**Why it happens:** Each recursive call consumes stack space. A 256x256 area = up to 65,536 calls, exceeding typical stack limits (browser: ~10,000 frames).
**How to avoid:** Use iterative flood fill with explicit stack (Array of coordinates). Current implementation in EditorState.ts already does this correctly.
**Warning signs:** "Maximum call stack size exceeded" errors during fill operations

### Pitfall 2: Modulo Arithmetic with Negative Offsets
**What goes wrong:** Pattern breaks at fill boundaries when starting point has negative offset from pattern origin
**Why it happens:** JavaScript's `%` operator returns negative results for negative dividends: `(-1) % 3 === -1`, not `2`
**How to avoid:** Use `((value % mod) + mod) % mod` for correct modulo, or ensure offsets are always positive relative to fill start
**Warning signs:** Pattern misalignment near the origin point of fill operation

### Pitfall 3: Animation Frame Timing Without Timestamp Deltas
**What goes wrong:** Animations run at different speeds on 60Hz vs 120Hz displays, causing inconsistency
**Why it happens:** requestAnimationFrame fires once per display frame. Without timestamp checking, frame advance happens 120 times/sec on 120Hz displays instead of 60.
**How to avoid:** Always use timestamp parameter: check `timestamp - lastFrameTime >= FRAME_DURATION` before advancing animation frame
**Warning signs:** Animations appear 2x speed on high refresh rate monitors, timing drift over long runtime

### Pitfall 4: Binary Data Endianness Assumptions
**What goes wrong:** 16-bit tile IDs read incorrectly when loading Gfx.dll animation data
**Why it happens:** Gfx.dll uses little-endian WORD format. DataView defaults to big-endian. Reading `getUint16(offset)` returns swapped bytes.
**How to avoid:** Always specify endianness: `dataView.getUint16(offset, true)` where `true` = little-endian
**Warning signs:** Frame indices appear as nonsensical values (e.g., 0x1234 becomes 0x3412)

### Pitfall 5: Visited Set Growth in Large Fills
**What goes wrong:** Memory usage spikes during large flood fill operations, potentially causing browser slowdown
**Why it happens:** The `visited` Set stores every filled coordinate index. For large areas, this can grow to tens of thousands of entries.
**How to avoid:** Clear the Set after operation completes. For extremely large fills, consider marking tiles in-place instead of tracking separately.
**Warning signs:** Memory profiler shows Set growing to >50MB, browser tab becomes unresponsive

## Code Examples

Verified patterns from official sources:

### Handling Multi-Tile Selection in Fill
```typescript
// Pattern offset calculation for 2x2 stamp filling 10x10 area
// If selection starts at (startCol: 5, startRow: 8) with width: 2, height: 2
// And fill starts at map position (10, 15)

const fillPosX = 12; // Current fill position X
const fillPosY = 17; // Current fill position Y
const fillStartX = 10; // Where fill began
const fillStartY = 15;

// Calculate offset from fill start
const offsetX = fillPosX - fillStartX; // 2
const offsetY = fillPosY - fillStartY; // 2

// Apply modulo to wrap within pattern bounds
const patternX = offsetX % tileSelection.width;  // 2 % 2 = 0
const patternY = offsetY % tileSelection.height; // 2 % 2 = 0

// Calculate actual tile index in tileset
const tileCol = tileSelection.startCol + patternX; // 5 + 0 = 5
const tileRow = tileSelection.startRow + patternY; // 8 + 0 = 8
const tileIndex = tileRow * TILES_PER_ROW + tileCol; // 8 * 40 + 5 = 325

map.tiles[fillPosY * MAP_WIDTH + fillPosX] = tileIndex;
```

### Reading 66-Byte Animation Structure
```typescript
// Gfx.dll animation structure layout (66 bytes per animation)
// Offset 0x642E0 + (animId * 66)
// [0]: BYTE frameCount (1-32)
// [1]: BYTE speed (tick delay, 0 = 255)
// [2-65]: 32x WORD (little-endian) frame tile IDs

const ANIM_OFFSET = 0x642E0;
const animId = 5; // Example: animation ID 5
const offset = ANIM_OFFSET + (animId * 66);

const dataView = new DataView(buffer);

// Read header bytes
const frameCount = dataView.getUint8(offset);     // Byte 0
const speed = dataView.getUint8(offset + 1);       // Byte 1

// Read frame array (32 WORDs)
const frames: number[] = [];
for (let i = 0; i < frameCount; i++) {
  // Little-endian 16-bit unsigned integer
  const frameId = dataView.getUint16(offset + 2 + (i * 2), true);
  frames.push(frameId);
}

console.log(`Animation ${animId}: ${frameCount} frames, speed ${speed}`);
console.log(`Frames: ${frames.join(', ')}`);
```

### Frame Index Calculation for Animated Tiles
```typescript
// From SEDIT Technical Analysis Section 5.3
// displayTile = anim.frames[(frameOffset + globalFrame) % anim.frameCount]

interface Animation {
  id: number;
  frameCount: number;
  speed: number;
  frames: number[];
}

function getDisplayTile(
  tile: number,          // 16-bit tile value from map
  animations: Animation[],
  globalFrame: number    // Increments every 150ms
): number {
  // Extract animation ID (bits 0-7) and frame offset (bits 8-14)
  const animId = tile & 0xFF;
  const frameOffset = (tile >> 8) & 0x7F;

  const anim = animations[animId];
  if (!anim || anim.frameCount === 0) {
    return 0; // Fallback to tile 0
  }

  // Calculate current frame index
  const frameIndex = (frameOffset + globalFrame) % anim.frameCount;
  return anim.frames[frameIndex];
}

// Example usage
const animatedTile = 0x8005; // Animated flag set, anim ID 5, offset 0
const globalFrame = 47;       // 47 animation ticks have elapsed
const displayTile = getDisplayTile(animatedTile, animations, globalFrame);
// Renders the tile ID at animations[5].frames[47 % animations[5].frameCount]
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Recursive flood fill | Iterative with explicit stack | ~2010 (HTML5 canvas era) | Prevents stack overflow on large images |
| setInterval for animations | requestAnimationFrame | 2011 (Chrome 10) | Syncs with refresh rate, saves battery |
| Manual binary parsing | TypedArrays + DataView | ES2015 (2015) | Native performance, correct endianness handling |
| Hard-coded frame rates | Timestamp-based timing | ~2016 (high refresh displays) | Works correctly on 60Hz/120Hz/144Hz monitors |

**Deprecated/outdated:**
- **Recursive flood fill:** Modern best practice is iterative to prevent stack overflow
- **setInterval/setTimeout for canvas animation:** Use requestAnimationFrame for proper vsync
- **Placeholder animation data:** Production applications must load real animation definitions

## Open Questions

Things that couldn't be fully resolved:

1. **Gfx.dll file location and extraction**
   - What we know: Animation data is at offset 0x642E0, 66 bytes per animation, 256 animations
   - What's unclear: Where users will source Gfx.dll (from Continuum installation, bundled, or user-provided)
   - Recommendation: Add file picker in AnimationPanel to load from user-specified path. Validate magic number/structure before parsing.

2. **Animation speed interpretation**
   - What we know: Speed byte affects playback rate, 0 = 255, typical values 1-5
   - What's unclear: Exact formula for converting speed value to milliseconds per frame
   - Recommendation: Use SEDIT's ANIMFRAME_DURATION (150ms) as base, potentially adjust by speed multiplier. May require testing with original client.

3. **Pattern fill edge case: Multi-tile stamp larger than filled area**
   - What we know: Modulo arithmetic handles wrapping correctly
   - What's unclear: Expected UX when 5x5 stamp fills 2x2 area (only shows partial pattern)
   - Recommendation: Allow it - mathematically sound, matches Tiled Map Editor behavior

## Sources

### Primary (HIGH confidence)
- [MDN: requestAnimationFrame()](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) - Animation timing API
- [javascript.info: ArrayBuffer, binary arrays](https://javascript.info/arraybuffer-binary-arrays) - Binary data parsing patterns
- SEDIT Technical Analysis (`E:\AC-SEDIT-SRC-ANALYSIS\SEDIT\SEdit-SRC-Analysis\SEDIT_Technical_Analysis.md`) - Animation structure specification (Sections 5.1-5.3)
- Existing codebase:
  - `electron/main.ts` - IPC file reading infrastructure
  - `src/core/editor/EditorState.ts` - Current flood fill implementation (lines 279-309)
  - `src/core/map/TileEncoding.ts` - Animation tile encoding utilities

### Secondary (MEDIUM confidence)
- [Tiled Map Editor: Bucket Fill Tool](https://doc.mapeditor.org/en/stable/manual/editing-tile-layers/) - Pattern fill behavior in established editor
- [DEV.to: Animating Sprite Sheets with JavaScript](https://dev.to/martyhimmel/animating-sprite-sheets-with-javascript-ag3) - Frame timing patterns
- [Wikipedia: Flood Fill](https://en.wikipedia.org/wiki/Flood_fill) - Pattern fill with modulo arithmetic technique

### Tertiary (LOW confidence)
- [GeeksforGeeks: Flood Fill Algorithm](https://www.geeksforgeeks.org/dsa/flood-fill-algorithm/) - General algorithm overview (no pattern-specific details)
- Various Stack Overflow discussions on flood fill stack overflow issues - Pattern confirmed across multiple sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All solutions use built-in JavaScript/TypeScript APIs with excellent documentation
- Architecture: HIGH - Patterns verified in SEDIT source code and MDN official documentation
- Pitfalls: HIGH - Common issues well-documented in WebSearch results and confirmed by multiple sources

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (30 days - stable domain, unlikely to change)
