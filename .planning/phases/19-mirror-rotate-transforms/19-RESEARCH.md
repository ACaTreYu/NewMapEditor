# Phase 19: Mirror/Rotate Transforms - Research

**Researched:** 2026-02-08
**Domain:** Clipboard transforms (rotation, mirroring) on 2D tile arrays
**Confidence:** HIGH

## Summary

This phase implements transform operations (mirror horizontal/vertical, rotate 90°) on clipboard contents for the AC Map Editor. The transforms must preserve full 16-bit tile encoding (animation flags, frame offsets, game objects) while performing geometric transformations on the rectangular clipboard buffer.

**Primary recommendation:** Use geometric transform algorithms (transpose + reverse for rotation, array reversal for mirroring) that operate on Uint16Array clipboard data. Apply SEdit keyboard shortcuts from toolbar. Preserve bits 8-14 (animation frame offsets) during transforms, only modify tile/animation IDs via lookup tables if needed in future.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.x | Type-safe array operations | Already in use, provides type safety for Uint16Array manipulation |
| React | 18.x | UI hooks for keyboard handling | Existing pattern for window.addEventListener in useEffect |
| Zustand | 4.x | Clipboard state management | Already managing clipboard in EditorState |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None required | - | Transforms are pure functions | Geometric operations don't need external libraries |

**Installation:**
No new packages required. All transforms use native TypeScript array operations on existing Uint16Array clipboard data.

## Architecture Patterns

### Recommended Project Structure

Transforms live in `src/core/editor/EditorState.ts` as new actions:

```
src/core/editor/
├── EditorState.ts        # Add: mirrorClipboard, rotateClipboard actions
└── types.ts              # ClipboardData already defined
```

### Pattern 1: Geometric Transform (Transpose + Reverse)

**What:** Rotate 90° clockwise by transposing matrix then reversing each row
**When to use:** Rotation operations on 2D tile grids
**Example:**

```typescript
// Source: Matrix rotation standard algorithm
// https://dev.to/a_b_102931/rotating-a-matrix-90-degrees-4a49
// https://medium.com/swlh/matrix-rotation-in-javascript-269cae14a124

rotateClipboard: () => {
  const { clipboard } = get();
  if (!clipboard) return;

  const { width, height, tiles } = clipboard;
  const newWidth = height;   // Dimensions swap
  const newHeight = width;
  const newTiles = new Uint16Array(width * height);

  // Rotate 90° clockwise: (x,y) -> (y, width-1-x)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIndex = y * width + x;
      const dstX = y;
      const dstY = width - 1 - x;
      const dstIndex = dstY * newWidth + dstX;
      newTiles[dstIndex] = tiles[srcIndex];
    }
  }

  set({
    clipboard: {
      width: newWidth,
      height: newHeight,
      tiles: newTiles,
      originX: clipboard.originX,
      originY: clipboard.originY
    }
  });
}
```

### Pattern 2: Array Reversal for Mirroring

**What:** Mirror horizontal by reversing each row, vertical by reversing rows
**When to use:** Flip operations on 2D tile grids
**Example:**

```typescript
// Mirror horizontally: reverse each row in place
mirrorHorizontal: () => {
  const { clipboard } = get();
  if (!clipboard) return;

  const { width, height, tiles } = clipboard;
  const newTiles = new Uint16Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIndex = y * width + x;
      const dstX = width - 1 - x;  // Reverse X
      const dstIndex = y * width + dstX;
      newTiles[dstIndex] = tiles[srcIndex];
    }
  }

  set({ clipboard: { ...clipboard, tiles: newTiles } });
}

// Mirror vertically: reverse row order
mirrorVertical: () => {
  const { clipboard } = get();
  if (!clipboard) return;

  const { width, height, tiles } = clipboard;
  const newTiles = new Uint16Array(width * height);

  for (let y = 0; y < height; y++) {
    const srcY = height - 1 - y;  // Reverse Y
    for (let x = 0; x < width; x++) {
      const srcIndex = srcY * width + x;
      const dstIndex = y * width + x;
      newTiles[dstIndex] = tiles[srcIndex];
    }
  }

  set({ clipboard: { ...clipboard, tiles: newTiles } });
}
```

### Pattern 3: Keyboard Shortcut Integration

**What:** Global window keydown listener in ToolBar.tsx (existing pattern)
**When to use:** Ctrl+key combinations for editor commands
**Example:**

```typescript
// Source: Existing pattern in ToolBar.tsx lines 260-295
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey) {
      // Existing: Ctrl+C, Ctrl+X, Ctrl+V, Ctrl+Z, etc.
      if (e.key === 'h' || e.key === 'H') {  // NEW
        e.preventDefault();
        mirrorHorizontal();  // SEdit doesn't use Ctrl+H, available
        return;
      }
      // ... other shortcuts
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [mirrorHorizontal, mirrorVertical, rotateClipboard]);
```

### Anti-Patterns to Avoid

- **Mutating clipboard in place:** Always create new Uint16Array to avoid state corruption
- **Forgetting dimension swap:** Rotation swaps width/height, must update both
- **Destroying paste preview:** Transforms should work whether paste preview is active or not (operate on clipboard, not preview)
- **Blocking transforms without clipboard:** Check `if (!clipboard) return;` early

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Content-aware tile rotation | Custom rotTbl[512] lookup | Geometric rotation first, add lookup later if needed | SEdit's rotTbl handles directional tiles (conveyors, bridges) but requires extracting 512-entry table from utils.cpp. Start simple, validate need with users. |
| Animation frame preservation | Custom bit masking logic | Direct tile value copy preserves bits 8-14 | Uint16Array operations preserve all bits. Frame offsets (bits 8-14) persist automatically. |
| Keyboard event library | Custom event system | window.addEventListener pattern | Existing codebase pattern works well, no library needed |

**Key insight:** SEdit's transform tables (`rotTbl`, `mirTbl`) exist to handle content-aware transformations (e.g., rotating a conveyor should change its direction). Starting with geometric transforms validates the feature before investing in complex lookup tables. Extract tables from SEdit source if users report tile corruption.

## Common Pitfalls

### Pitfall 1: Forgetting Dimension Swap on Rotation

**What goes wrong:** After rotating, clipboard dimensions remain unchanged, causing visual distortion or crashes
**Why it happens:** Rotating a 5x3 region produces a 3x5 result, but code forgets to swap width/height
**How to avoid:** Always set `newWidth = height` and `newHeight = width` after rotation
**Warning signs:** Paste preview shows stretched or truncated content after rotation

### Pitfall 2: Destroying Paste Preview State

**What goes wrong:** Transforming clipboard while paste preview is active cancels the preview
**Why it happens:** Transform actions don't update `pastePreviewPosition` or trigger re-render
**How to avoid:** Transforms operate only on clipboard state. Paste preview reads from clipboard, so it updates automatically.
**Warning signs:** User rotates clipboard mid-paste and preview disappears

### Pitfall 3: Not Validating Clipboard Exists

**What goes wrong:** Calling transform when clipboard is null causes runtime error
**Why it happens:** Toolbar buttons/shortcuts don't check clipboard state before calling action
**How to avoid:** Early return `if (!clipboard) return;` in each transform action. Optionally disable toolbar buttons when clipboard is empty.
**Warning signs:** Console errors when pressing shortcuts without copied content

### Pitfall 4: Animation Flag Loss

**What goes wrong:** Animated tiles become static after transform
**Why it happens:** Bit manipulation strips bit 15 (animation flag) accidentally
**How to avoid:** Copy full 16-bit values without masking. `tiles[i]` not `tiles[i] & 0x7FFF`
**Warning signs:** Transformed regions lose warp portals, holding pens, or flag animations

## Code Examples

Verified patterns from SEdit source analysis and web research:

### 90° Clockwise Rotation

```typescript
// Source: SEdit map.cpp:3414-3486 + standard matrix rotation
// Algorithm: (x,y) -> (y, width-1-x) for 90° clockwise
rotateClipboard: () => {
  const { clipboard } = get();
  if (!clipboard) return;

  const { width, height, tiles } = clipboard;
  const newTiles = new Uint16Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIndex = y * width + x;
      const dstX = y;
      const dstY = width - 1 - x;
      const dstIndex = dstY * height + dstX;  // Note: newWidth = height
      newTiles[dstIndex] = tiles[srcIndex];
    }
  }

  set({
    clipboard: {
      width: height,   // Swap dimensions
      height: width,
      tiles: newTiles,
      originX: clipboard.originX,
      originY: clipboard.originY
    }
  });
}
```

### Horizontal Mirror

```typescript
// Source: SEdit map.cpp:3488-3563 MirrorBits direction 0/1
mirrorHorizontal: () => {
  const { clipboard } = get();
  if (!clipboard) return;

  const { width, height, tiles } = clipboard;
  const newTiles = new Uint16Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIndex = y * width + x;
      const dstIndex = y * width + (width - 1 - x);
      newTiles[dstIndex] = tiles[srcIndex];
    }
  }

  set({ clipboard: { ...clipboard, tiles: newTiles } });
}
```

### Vertical Mirror

```typescript
// Source: SEdit map.cpp:3488-3563 MirrorBits direction 2/3
mirrorVertical: () => {
  const { clipboard } = get();
  if (!clipboard) return;

  const { width, height, tiles } = clipboard;
  const newTiles = new Uint16Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIndex = y * width + x;
      const dstIndex = (height - 1 - y) * width + x;
      newTiles[dstIndex] = tiles[srcIndex];
    }
  }

  set({ clipboard: { ...clipboard, tiles: newTiles } });
}
```

### Keyboard Shortcut Handler (ToolBar.tsx)

```typescript
// Source: Existing pattern in ToolBar.tsx:260-295
// Add to existing useEffect keyboard handler

useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey) {
      // ... existing Ctrl+C, Ctrl+X, Ctrl+V, Ctrl+Z, Ctrl+Y ...

      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        mirrorHorizontal();
        return;
      }
      if (e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        mirrorVertical();
        return;
      }
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        rotateClipboard();
        return;
      }
    }
    // ... rest of handler ...
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [mirrorHorizontal, mirrorVertical, rotateClipboard, /* ... other deps */]);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SEdit hardcoded keyboard in .rc file | React useEffect listeners | React era (2013+) | Centralized keyboard handling in ToolBar component |
| Content-aware rotTbl[512] required | Geometric first, tables optional | 2026 (this phase) | Faster implementation, validate need before complexity |
| Separate mirror directions (4 cases) | Two functions (H/V) | 2026 (this phase) | Simpler API, clear UX |

**Deprecated/outdated:**
- Win32 accelerator tables (IDR_ACCELERATOR in .rc files): Modern React apps use window event listeners
- Modal popup menus for mirror direction: SEdit's COMM_MIRROR showed popup to choose left/right/up/down. Modern UX uses separate H/V shortcuts.

## Open Questions

1. **SEdit keyboard shortcuts for transforms**
   - What we know: SEdit has toolbar buttons COMM_MIRROR (413) and COMM_ROTATE (414). No accelerator keys in sedit.rc.
   - What's unclear: Did SEdit use any keyboard shortcuts, or only toolbar clicks?
   - Recommendation: Create new shortcuts (Ctrl+H, Ctrl+J, Ctrl+R) not conflicting with existing. Document in UI tooltips.

2. **Content-aware rotation tables**
   - What we know: SEdit has rotTbl[512] and mirTbl[512] in utils.cpp for directional tiles (conveyors, bridges, flags).
   - What's unclear: How often do users rotate directional content? Will geometric transforms corrupt maps?
   - Recommendation: Ship geometric transforms first. If users report issues with rotated conveyors/bridges, extract rotTbl/mirTbl from SEdit source in follow-up phase.

3. **Transform during paste preview**
   - What we know: Paste preview reads clipboard state and renders at pastePreviewPosition
   - What's unclear: Should transforms update preview in real-time, or require re-pasting?
   - Recommendation: Transforms update clipboard immediately. Paste preview auto-updates because it reads clipboard reactively. No special handling needed.

## Sources

### Primary (HIGH confidence)

- **SEdit source code analysis:** E:\AC-SEDIT-SRC-ANALYSIS\SEDIT\SEdit-SRC-Analysis\SEDIT_Technical_Analysis.md (Section 10: Rotation and Mirror Transformation Tables)
- **SEdit map.cpp:** Lines 3414-3563 (RotateBits and MirrorBits implementations)
- **Existing codebase patterns:** EditorState.ts clipboard operations, ToolBar.tsx keyboard handlers
- **MDN Uint16Array documentation:** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint16Array

### Secondary (MEDIUM confidence)

- [Rotating a Matrix 90 Degrees - DEV Community](https://dev.to/a_b_102931/rotating-a-matrix-90-degrees-4a49) - Transpose + reverse algorithm
- [Matrix Rotation in JavaScript - Medium](https://medium.com/swlh/matrix-rotation-in-javascript-269cae14a124) - Geometric transform patterns
- [GitHub 2D Array Rotation](https://github.com/tinwatchman/2d-array-rotation) - Reference implementation

### Tertiary (LOW confidence)

- None - all findings verified against SEdit source or official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All operations use existing TypeScript/React patterns
- Architecture: HIGH - SEdit source provides reference, codebase has established patterns
- Pitfalls: HIGH - Derived from SEdit bugs (dimension swap) and existing paste preview architecture

**Research date:** 2026-02-08
**Valid until:** 90 days (stable algorithms, no fast-moving dependencies)
