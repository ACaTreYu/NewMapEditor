# Technology Stack: SELECT Tool & Animation Panel Redesign

**Milestone:** v2.0 - SELECT tool and Animation Panel redesign
**Researched:** 2026-02-04
**Confidence:** HIGH

## Executive Summary

**No new dependencies required.** All features can be implemented with existing Canvas API, native JavaScript, and Zustand state management. The stack is already complete for these features.

---

## Existing Stack (Validated)

All required capabilities exist in current dependencies:

| Technology | Version | Already Has | Used For |
|------------|---------|-------------|----------|
| Canvas API | Browser native | `setLineDash()`, `lineDashOffset`, `drawImage()` | Marching ants animation, selection rendering |
| JavaScript/TypeScript | 5.3.0 | Array methods, Uint16Array | Tile data transforms (rotate, mirror, flip) |
| Zustand | 4.4.7 | State management | Selection state, clipboard buffer, floating paste preview |
| React | 18.2.0 | `requestAnimationFrame` via hooks | 60fps marching ants animation |

**Recommendation:** Use existing stack. No npm installs needed.

---

## Feature Implementation Approaches

### 1. Marching Ants Animation

**Implementation:** Canvas API native capabilities
**Confidence:** HIGH

Canvas 2D Context provides `setLineDash()` and `lineDashOffset` specifically for marching ants effects:

```typescript
// In MapCanvas draw loop
ctx.setLineDash([4, 4]);
ctx.lineDashOffset = -animationFrame % 8; // Animate dash offset
ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
ctx.strokeRect(x, y, width, height);
ctx.setLineDash([]); // Reset
```

**Why this works:**
- `lineDashOffset` animates the dash pattern position
- Already using `requestAnimationFrame` in AnimationPanel (150ms tick)
- Can reuse `animationFrame` from Zustand store or use separate RAF loop for 60fps smoothness
- Zero dependencies, optimal performance

**Sources:**
- [MDN: lineDashOffset](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/lineDashOffset)
- [Plus2Net: Marching Ants Tutorial](https://www.plus2net.com/html_tutorial/html-canvas-marching-ants.php)
- [CodePen: Canvas Marching Ants](https://codepen.io/jaymc/pen/EwXrXW)

### 2. Clipboard Operations

**Implementation:** Internal state (Zustand), NOT system clipboard
**Confidence:** HIGH
**Decision rationale:** Internal clipboard is superior for tile editor use case

#### Option A: Internal Clipboard (RECOMMENDED)

Store copied tile data in Zustand state:

```typescript
interface ClipboardState {
  data: Uint16Array | null;  // Tile values
  width: number;
  height: number;
  sourceX: number;  // For reference
  sourceY: number;
}
```

**Advantages:**
- Preserves 16-bit tile encoding (animated flag, frame offset, tile ID)
- Instant copy/paste (no serialization overhead)
- No clipboard API limitations
- Works identically in renderer and main process
- Undo/redo integration is trivial

**Disadvantages:**
- Cannot paste into other applications
- Clipboard doesn't persist after app close

#### Option B: Electron System Clipboard (NOT RECOMMENDED)

Electron provides `clipboard.writeBuffer()` and `clipboard.readBuffer()` for custom formats.

**Why not use this:**
- Requires serialization/deserialization of Uint16Array
- Adds complexity with no benefit (who would paste map tiles into Notepad?)
- SEdit uses internal clipboard - we should match behavior
- System clipboard adds cross-process IPC overhead

**Verdict:** Use internal state. System clipboard is unnecessary complexity.

**Sources:**
- [Electron Clipboard API](https://www.electronjs.org/docs/latest/api/clipboard)
- [GeeksforGeeks: Clipboard API in ElectronJS](https://www.geeksforgeeks.org/clipboard-api-in-electronjs/)

### 3. Tile Transforms (Rotate, Mirror, Flip)

**Implementation:** Pure TypeScript algorithms, no libraries
**Confidence:** HIGH

All transform operations are simple 2D array manipulations on `Uint16Array`:

#### Rotate 90° Clockwise

```typescript
function rotate90CW(tiles: Uint16Array, width: number, height: number): Uint16Array {
  const result = new Uint16Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // (x,y) -> (height-1-y, x)
      result[x * height + (height - 1 - y)] = tiles[y * width + x];
    }
  }
  return result;
}
```

**Algorithm:** Transpose matrix, then reverse each row
**Complexity:** O(n) time, O(n) space (unavoidable for immutable result)

#### Mirror Horizontal

```typescript
function mirrorH(tiles: Uint16Array, width: number, height: number): Uint16Array {
  const result = new Uint16Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      result[y * width + (width - 1 - x)] = tiles[y * width + x];
    }
  }
  return result;
}
```

**Algorithm:** Reverse each row in place
**Complexity:** O(n) time, O(n) space

#### Mirror Vertical

```typescript
function mirrorV(tiles: Uint16Array, width: number, height: number): Uint16Array {
  const result = new Uint16Array(width * height);
  for (let y = 0; y < height; y++) {
    result.set(tiles.subarray(y * width, (y + 1) * width),
               (height - 1 - y) * width);
  }
  return result;
}
```

**Algorithm:** Reverse row order
**Complexity:** O(n) time, O(n) space

**Why not use a library:**
- Algorithms are trivial (10-15 lines each)
- No library supports Uint16Array tile encoding directly
- Libraries add dependency weight for minimal value
- Performance is identical (both O(n))

**Alternative considered:** `2d-array-rotation` npm package - rejected because:
- Works with regular arrays, not Uint16Array
- Conversion overhead negates any benefit
- Adds 5KB to bundle for 30 lines of code

**Sources:**
- [DEV: Rotating a 2D Matrix](https://dev.to/a_b_102931/rotating-a-matrix-90-degrees-4a49)
- [GitHub: Flip 2D Array Functions](https://gist.github.com/lndgalante/ef318c5742614325d703a90f8b79c06b)
- [Better Programming: Matrix Rotation in JavaScript](https://betterprogramming.pub/how-to-rotate-a-matrix-in-javascript-2c8a4c64b8d9)
- [Medium: Matrix Rotation in JavaScript](https://medium.com/swlh/matrix-rotation-in-javascript-269cae14a124)

### 4. Floating Paste Preview

**Implementation:** Canvas overlay in MapCanvas draw loop
**Confidence:** HIGH

Already using this pattern for other tool previews (line preview, rect drag, stamp tools).

```typescript
// In MapCanvas draw() function
if (floatingPasteState.active) {
  const { data, width, height, cursorX, cursorY } = floatingPasteState;

  // Draw semi-transparent tile preview
  ctx.globalAlpha = 0.7;
  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      const tile = data[dy * width + dx];
      // Draw tile at cursor offset
      drawTile(ctx, tile, cursorX + dx, cursorY + dy);
    }
  }
  ctx.globalAlpha = 1.0;

  // Draw marching ants border
  ctx.setLineDash([4, 4]);
  ctx.lineDashOffset = -animationFrame % 8;
  ctx.strokeRect(/* ... */);
  ctx.setLineDash([]);
}
```

**Integration point:** Add to existing MapCanvas tool preview section (lines 264-429)

### 5. Animation Panel Redesign

**Implementation:** Pure React component refactor, no new dependencies
**Confidence:** HIGH

Current AnimationPanel (257 lines) already has:
- Canvas rendering with `requestAnimationFrame` animation loop
- Scroll handling via `onWheel`
- Click selection
- Frame offset slider

**Required changes:**
- Replace current canvas list with SEdit-style numbered list (00-FF hex labels)
- Add Tile/Anim radio toggle (filters animation IDs vs tile IDs)
- Move offset field to always-visible position (currently only shows when selected)
- Adjust layout to match SEdit vertical list aesthetic

**No stack changes needed.** This is purely UI restructuring.

---

## Zustand State Additions

Add to `EditorState` interface in `EditorState.ts`:

```typescript
interface SelectionState {
  active: boolean;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  marqueeActive: boolean; // Drag-selecting
}

interface ClipboardState {
  data: Uint16Array | null;
  width: number;
  height: number;
  operation: 'copy' | 'cut' | null; // Track if cut (for clearing source)
}

interface FloatingPasteState {
  active: boolean;
  data: Uint16Array | null;
  width: number;
  height: number;
  cursorX: number;
  cursorY: number;
}
```

**Why Zustand, not Context API:**
- Already using Zustand for all editor state
- Undo/redo integration requires state snapshots
- Consistency with existing architecture

---

## What NOT to Add

### ❌ Image Processing Libraries

- **fabric.js** - Overkill for tile transforms, adds 500KB
- **konva.js** - Designed for interactive canvas apps, unnecessary
- **Jimp** - Node image processing, wrong use case

**Rationale:** Tile data is Uint16Array of game-specific encoding, not RGB image data. Standard image libraries don't understand tile IDs, animated flags, or frame offsets.

### ❌ Clipboard Libraries

- **electron-clipboard-extended** - Unnecessary complexity
- **clipboardy** - CLI-focused, not for GUI apps

**Rationale:** Internal clipboard is superior for this use case.

### ❌ Animation Libraries

- **gsap** - For DOM/CSS animations, not canvas
- **motion** - React animation library, doesn't help canvas rendering

**Rationale:** Canvas animations use `requestAnimationFrame` directly. Library overhead provides no benefit.

### ❌ Matrix Math Libraries

- **mathjs** - Scientific computing, massive overkill
- **gl-matrix** - WebGL matrix operations, wrong use case

**Rationale:** Tile transforms are simple nested loops, not matrix algebra.

---

## Performance Considerations

### Marching Ants Animation

- **Target:** 60fps marching ants
- **Approach:** Separate RAF loop from tile animation (which runs at 150ms)
- **Optimization:** Only animate when selection is active

```typescript
useEffect(() => {
  if (!selection.active) return;

  let frame = 0;
  let rafId: number;

  const animate = () => {
    frame++;
    draw(); // Redraws selection with updated lineDashOffset
    rafId = requestAnimationFrame(animate);
  };

  rafId = requestAnimationFrame(animate);
  return () => cancelAnimationFrame(rafId);
}, [selection.active]);
```

**Sources:**
- [DEV: Mastering requestAnimationFrame](https://dev.to/codewithrajat/mastering-requestanimationframe-create-smooth-high-performance-animations-in-javascript-2hpi)
- [MDN: requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
- [Accreditly: Understanding requestAnimationFrame](https://accreditly.io/articles/understanding-requestanimationframe)

### Large Selection Transforms

For 256x256 full-map rotations:
- Uint16Array operations: ~0.5ms for 65,536 tiles
- No optimization needed (imperceptible delay)

### Floating Paste Preview

- Render tiles on every `mousemove`
- For 10x10 selection (100 tiles): <1ms render time
- No throttling needed

---

## Integration Points with Existing Stack

### Canvas Rendering

**File:** `src/components/MapCanvas/MapCanvas.tsx`

**Add to draw() function:**
1. Selection rectangle with marching ants (after grid rendering, line 215)
2. Floating paste preview (after tool previews, line 429)

**Pattern:** Follow existing tool preview pattern (lines 294-429)

### Keyboard Shortcuts

**File:** `src/App.tsx`

Add handlers for:
- `Ctrl+C` - Copy selection
- `Ctrl+X` - Cut selection
- `Ctrl+V` - Paste (activate floating preview)
- `Delete` - Clear selection
- `Escape` - Cancel floating paste or marquee drag

**Pattern:** Already has keyboard event listener for undo/redo (Ctrl+Z/Y)

### Zustand Actions

**File:** `src/core/editor/EditorState.ts`

Add action methods:
- `copySelection()` - Store tiles in clipboard state
- `cutSelection()` - Copy + mark for clear on paste
- `pasteSelection()` - Activate floating paste mode
- `transformSelection(op: 'rotate90' | 'mirrorH' | 'mirrorV')` - Apply transform
- `deleteSelection()` - Clear selection area

**Pattern:** Follow existing tile operation methods (lines 394-492)

---

## Development Workflow

### Phase 1: Marching Ants (Proof of Concept)

1. Add `SelectionState` to Zustand
2. Add marquee drag to MapCanvas mouse handlers
3. Draw selection rectangle with animated border
4. **Validate:** Selection animates at 60fps

### Phase 2: Clipboard (Internal State)

1. Add `ClipboardState` to Zustand
2. Implement copy/cut/delete actions
3. Add keyboard shortcuts
4. **Validate:** Copy/cut stores correct tile data

### Phase 3: Transforms

1. Implement rotate/mirror/flip functions in new file: `src/core/map/TileTransforms.ts`
2. Add transform actions to Zustand
3. Wire up keyboard shortcuts (SEdit uses Ctrl+R, Ctrl+H, Ctrl+V)
4. **Validate:** Transforms produce correct output for test patterns

### Phase 4: Floating Paste

1. Add `FloatingPasteState` to Zustand
2. Render preview in MapCanvas draw loop
3. Add click-to-commit and Escape-to-cancel handlers
4. **Validate:** Preview follows cursor, commit places tiles correctly

### Phase 5: Animation Panel Redesign

1. Refactor AnimationPanel to SEdit-style list
2. Add Tile/Anim radio toggle
3. Reposition offset field
4. **Validate:** Visual match to SEdit reference screenshots

---

## Testing Strategy

### Unit Tests (Optional)

Transform functions are pure and easily testable:

```typescript
describe('TileTransforms', () => {
  it('rotate90CW: rotates 2x2 clockwise', () => {
    const input = new Uint16Array([1, 2, 3, 4]); // [[1,2], [3,4]]
    const output = rotate90CW(input, 2, 2);
    expect(output).toEqual(new Uint16Array([3, 1, 4, 2])); // [[3,1], [4,2]]
  });
});
```

No testing framework currently in package.json. Add if needed:
- Jest (already TypeScript compatible)
- Vitest (better Vite integration)

**Recommendation:** Manual testing sufficient. Transforms are simple, visual validation is faster.

### Manual Testing

**Test scenarios:**
1. Select 10x10 area → verify marching ants animate smoothly
2. Copy → paste → verify exact tile match
3. Cut → paste → verify source cleared, destination filled
4. Rotate animated tile → verify frame offset preserved
5. Paste 20x20 selection at map edge → verify clipping behavior
6. Animation panel → verify all 256 animations listed with correct hex IDs

---

## Migration Notes

### From Existing Selection State

Current `EditorState` already has basic `Selection` interface (lines 39-46):

```typescript
interface Selection {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  active: boolean;
}
```

**This is unused!** Can repurpose for SELECT tool without breaking changes.

### Naming Consistency

Current codebase uses:
- `tileSelection` - Tile palette multi-tile selection
- `selection` - Map tile selection (currently unused)

Keep both. `tileSelection` is for palette, `selection` is for map SELECT tool.

---

## Confidence Assessment

| Component | Confidence | Reasoning |
|-----------|-----------|-----------|
| Marching ants | HIGH | Canvas API explicitly designed for this (lineDashOffset) |
| Internal clipboard | HIGH | Trivial Zustand state, already using this pattern everywhere |
| Transforms | HIGH | Simple algorithms, well-documented, TypeScript native |
| Floating paste | HIGH | Already rendering tool previews this way |
| Animation panel | HIGH | Pure React refactor, no new capabilities needed |

**Overall confidence: HIGH** - Zero technical risk. All features use existing capabilities.

---

## Alternative Approaches Considered

### System Clipboard with Custom MIME Type

**Approach:** Use `clipboard.writeBuffer('application/x-ac-tiles', buffer)`

**Rejected because:**
- Adds IPC overhead (renderer → main process)
- Requires serialization format design
- Provides zero user benefit (can't paste tiles into other apps meaningfully)
- SEdit uses internal clipboard (precedent for this domain)

### CSS Animations for Marching Ants

**Approach:** Use CSS border animation instead of canvas

**Rejected because:**
- Selection overlay must be canvas (map is canvas)
- CSS border can't overlay canvas content precisely
- Would require DOM element per selection (performance hit)
- Canvas approach is simpler and more performant

### Immutable State Library (Immer)

**Approach:** Use Immer for undo/redo state snapshots

**Rejected because:**
- Undo/redo already works with current approach
- Tile data is Uint16Array (immutability handled by copying)
- Zustand already optimized for this use case
- Would add dependency for zero benefit

---

## Recommendations for Roadmap

### Quick Wins (Implement First)

1. **Marching ants animation** - Most visible feature, validates approach
2. **Copy/paste with internal clipboard** - Core workflow, builds on marching ants
3. **Delete selection** - Trivial once selection works

### Medium Complexity (Implement Second)

4. **Floating paste preview** - Reuses existing tool preview pattern
5. **Mirror horizontal/vertical** - Simpler than rotation

### Highest Complexity (Implement Last)

6. **Rotate 90°** - Most complex transform algorithm
7. **Animation panel redesign** - Cosmetic, can defer to polish phase

### No Blockers

All features can be developed in parallel. No inter-dependencies beyond basic selection state.

---

## Summary

**Stack verdict:** No changes needed. Existing Canvas API, TypeScript, React, and Zustand provide all required capabilities.

**Key decisions:**
- ✅ Canvas lineDashOffset for marching ants
- ✅ Internal Zustand clipboard (not system clipboard)
- ✅ Pure TypeScript transforms (no matrix libraries)
- ✅ requestAnimationFrame for 60fps selection animation
- ✅ Reuse existing MapCanvas tool preview patterns

**Next step:** Proceed to roadmap creation with confidence. No technical research gaps remain.
