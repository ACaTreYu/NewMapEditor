# Domain Pitfalls: Animation Offset Control

**Domain:** Tile Map Editor - Parameterized Tile Placement
**Researched:** 2026-02-15

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Separate Offset State Per Tool (State Sync Hell)

**What goes wrong:** Creating separate Zustand fields for warp offset (`warpSrc`, `warpDest`), spawn offset (`spawnTeam`, `spawnVariant`), and general animation offset (`frameOffset`).

**Why it happens:**
- Seems "clean" to have tool-specific state
- Mirrors how GameObjectToolPanel currently has `warpSrc`, `warpDest` fields
- Avoids "decoding" offset value into tool-specific semantics

**Consequences:**
- **Picker breaks:** Picker captures tile with offset 25. Is that warp routing (src=5, dest=2) or spawn variant (team=6, variant=1) or frame offset (25)? Picker doesn't know which fields to update.
- **Tool switching loses data:** Pick warp with offset 25 → switch to spawn tool → offset resets because spawn reads `spawnTeam`/`spawnVariant` (not set) instead of `frameOffset`.
- **State sync bugs:** User sets warp src=3, dest=7 (offset=73) → picks animated tile with offset 10 → warp UI shows src=0, dest=1 (decoded from frameOffset=10) → user confused why warp routing changed.

**Prevention:**
- Single `frameOffset` field (0-127) in Zustand
- Tool-specific widgets decode offset on read, encode on write
- Picker always updates same field regardless of tile type

**Detection:** State diverges when switching tools or using picker. Offset value "disappears" or changes unexpectedly.

**Recovery:** Migrate all tool-specific offset fields to single `frameOffset` field. Update widgets to use encode/decode helpers.

---

### Pitfall 2: Not Updating selectedTile When Offset Changes

**What goes wrong:** User changes offset in AnimationPanel or GameObjectToolPanel, but `selectedTile` Zustand field doesn't update. Next placement uses stale offset.

**Why it happens:**
- `selectedTile` is set when clicking animation list or tileset
- Offset changes happen in separate component (AnimationPanel or GameObjectToolPanel)
- Easy to forget that `selectedTile` encodes offset in bits 14-8

**Consequences:**
- User sets offset to 50, places tile, gets offset 0 (default)
- Confusing UX: UI shows offset 50, but placement uses offset 0
- User thinks offset control is broken

**Prevention:**
```typescript
// AnimationPanel.tsx - Update selectedTile when offset changes
const handleOffsetChange = (value: string) => {
  const num = parseInt(value, 10);
  if (!isNaN(num) && num >= 0 && num <= 127) {
    setFrameOffset(num);

    // CRITICAL: Update selectedTile with new offset
    if (selectedAnimId !== null) {
      const anim = ANIMATION_DEFINITIONS[selectedAnimId];
      if (anim && anim.frames.length > 0) {
        const newTile = makeAnimatedTile(selectedAnimId, num);
        setSelectedTile(newTile);
      }
    }
  }
};
```

**Detection:** Offset input shows one value, but placed tiles have different offset (check with picker).

**Recovery:** Add `useEffect` to sync `selectedTile` whenever `frameOffset` or `selectedAnimId` changes.

---

### Pitfall 3: Picker Doesn't Sync Offset to UI

**What goes wrong:** Picker captures tile with offset 30, sets `selectedTile` to encoded value (0x8094 with offset=30), but doesn't update `frameOffset` field. UI still shows offset 0.

**Why it happens:**
- Picker handler is simple: `setSelectedTile(tile)` and done
- Easy to forget offset is encoded in tile value, not separate field
- AnimationPanel's offset input is controlled by its own state, doesn't observe `selectedTile`

**Consequences:**
- User picks tile, sees offset 0 in UI, thinks tile has no offset
- User adjusts offset to 10, re-places tile, surprised that it changed from 30 to 10
- Inspect-adjust-replace workflow broken

**Prevention:**
```typescript
// MapCanvas.tsx - Picker handler syncs offset
case ToolType.PICKER:
  if (map) {
    const tile = map.tiles[y * MAP_WIDTH + x];
    setSelectedTile(tile);

    // Decode and sync offset
    if (isAnimatedTile(tile)) {
      const offset = getFrameOffset(tile);
      setFrameOffset(offset); // Update Zustand offset state

      const animId = getAnimationId(tile);
      setSelectedAnimId(animId); // Also sync anim selection
    } else {
      setFrameOffset(0); // Reset offset for static tiles
    }

    restorePreviousTool();
  }
  break;
```

**Detection:** Pick animated tile, offset input doesn't update. Or pick tile with known offset (e.g., warp src=5, dest=7 = offset 75), UI shows offset 0.

**Recovery:** Add offset extraction to picker handler, update `frameOffset` Zustand field.

---

## Moderate Pitfalls

### Pitfall 4: Warp Offset Encoding Confusion

**What goes wrong:** Misunderstanding warp offset formula. Thinking it's `src * 10 + dest` when it's actually `dest * 10 + src`.

**Why it happens:**
- Both formulas produce valid 0-99 range
- Code comment might be unclear or missing
- Easy to mix up parameter order

**Consequences:**
- Warp routing backwards: warp marked src=3, dest=7 actually routes from 7 to 3
- Map testing reveals warps go to wrong destinations
- Requires re-placing all warps in map

**Prevention:**
- Explicit formula in code comment: `offset = destWarp * 10 + srcWarp`
- Unit tests: `makeWarpTile(3, 7) === 0x8000 | (73 << 8) | 0xFA`
- Validation: decode then re-encode, assert roundtrip works

**Detection:** In-game testing shows warps route to wrong destinations.

**Recovery:** Fix formula, provide migration tool to re-encode all warp tiles in existing maps.

---

### Pitfall 5: No Visual Feedback for Invalid Offset

**What goes wrong:** User types offset 200 in input field, no error message, value silently clamped to 127. User doesn't realize offset was invalid.

**Why it happens:**
- Validation code does `Math.min(127, offset)` but doesn't show error
- Input field updates to clamped value (127) without explaining why

**Consequences:**
- User confused why offset keeps resetting to 127
- User doesn't know valid range (0-127)
- Trial-and-error to find valid values

**Prevention:**
```typescript
// AnimationPanel.tsx - Show validation error
const [offsetError, setOffsetError] = useState<string | null>(null);

const handleOffsetChange = (value: string) => {
  const num = parseInt(value, 10);
  if (isNaN(num)) {
    setOffsetError('Invalid number');
    return;
  }
  if (num < 0 || num > 127) {
    setOffsetError('Offset must be 0-127');
    return;
  }
  setOffsetError(null);
  setFrameOffset(num);
};

// Render error message
{offsetError && <div className="error-text">{offsetError}</div>}
```

**Detection:** User reports "offset keeps changing to 127" or "can't set offset above 127".

**Recovery:** Add error message display, update input to show invalid state (red border).

---

### Pitfall 6: Status Bar Offset Flicker on Fast Mouse Movement

**What goes wrong:** Moving mouse quickly across map causes status bar offset to flicker between values or become unreadable.

**Why it happens:**
- Status bar updates on every mousemove event (60+ events/sec)
- Each tile has different offset, status bar re-renders constantly
- No debouncing or throttling

**Consequences:**
- Status bar text unreadable during mouse movement
- Performance cost (React re-renders on every mousemove)
- Distracting UI flicker

**Prevention:**
```typescript
// StatusBar.tsx - Debounce offset display
const [displayedOffset, setDisplayedOffset] = useState<number | null>(null);
const offsetTimeoutRef = useRef<number | null>(null);

useEffect(() => {
  if (offsetTimeoutRef.current !== null) {
    clearTimeout(offsetTimeoutRef.current);
  }

  offsetTimeoutRef.current = window.setTimeout(() => {
    setDisplayedOffset(cursorTileInfo?.frameOffset ?? null);
  }, 100); // 100ms debounce

  return () => {
    if (offsetTimeoutRef.current !== null) {
      clearTimeout(offsetTimeoutRef.current);
    }
  };
}, [cursorTileInfo?.frameOffset]);
```

**Alternative:** Don't debounce, but optimize React rendering with `React.memo` and precise props.

**Detection:** Status bar text flickers or is hard to read during mouse movement.

**Recovery:** Add debouncing or optimize rendering.

---

## Minor Pitfalls

### Pitfall 7: Offset Input Accepts Non-Numeric Characters

**What goes wrong:** User types "abc" in offset input, `parseInt()` returns NaN, input shows blank or "0".

**Why it happens:**
- Input type="text" allows any characters
- Validation only runs on blur or Enter keypress

**Consequences:**
- Confusing UX: typing letters clears the field
- User accidentally deletes offset value

**Prevention:**
```typescript
// AnimationPanel.tsx - Filter non-numeric input
const handleOffsetInput = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value;

  // Allow only digits (and empty string for deleting)
  if (value === '' || /^\d+$/.test(value)) {
    const num = value === '' ? 0 : parseInt(value, 10);
    if (num >= 0 && num <= 127) {
      setFrameOffset(num);
    }
  }
  // Ignore non-digit characters (don't update input)
};
```

**Alternative:** Use input type="number" but style browser spinners to match UI.

**Detection:** User reports "can't type letters in offset field" (actually correct behavior).

**Recovery:** Document intended behavior, no fix needed.

---

### Pitfall 8: Forgetting to Reset Offset When Switching to Static Tile

**What goes wrong:** User places animated tile with offset 50, then switches to static tile (non-animated), offset still shows 50 in UI. Next animated tile placement uses offset 50 unexpectedly.

**Why it happens:**
- Offset state persists across tool/tile changes
- No logic to reset offset when selecting static tile

**Consequences:**
- User expects offset 0 (default) when placing new animated tile
- Gets offset 50 from previous placement
- Confusing UX: "where did offset 50 come from?"

**Prevention:**
```typescript
// TilesetPanel.tsx - Reset offset when selecting static tile
const handleTileClick = (tileId: number) => {
  setSelectedTile(tileId);

  if (!isAnimatedTile(tileId)) {
    setFrameOffset(0); // Reset to default for static tiles
  }
};
```

**Alternative:** Don't reset, keep last offset. User can manually change if needed. Preference decision.

**Detection:** User reports "offset doesn't reset when selecting new tile".

**Recovery:** Add reset logic or document as intended behavior.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Picker sync | Pitfall #3 (picker doesn't sync offset to UI) | Add offset extraction + `setFrameOffset()` call in picker handler |
| Status bar feedback | Pitfall #6 (offset flicker on fast mouse movement) | Debounce offset display or optimize React rendering |
| Warp contextual UI | Pitfall #4 (warp offset encoding confusion) | Unit tests for encode/decode, explicit formula comments |
| State management | Pitfall #1 (separate offset state per tool) | Design review before coding, enforce single `frameOffset` field |
| Offset validation | Pitfall #5 (no visual feedback for invalid offset) | Add error message display before user testing |

## Sources

### Code Analysis
- `E:\NewMapEditor\src\components\AnimationPanel\AnimationPanel.tsx` — Offset input handling (line 281-294), selectedTile update (line 253-256)
- `E:\NewMapEditor\src\components\MapCanvas\MapCanvas.tsx` — Picker handler (line 1951-1956)
- `E:\NewMapEditor\src\core\map\TileEncoding.ts` — Warp encoding formula (line 48-50)
- `E:\NewMapEditor\src\components\GameObjectToolPanel\GameObjectToolPanel.tsx` — Warp Source/Dest state (line 36)

### React Patterns
- [React useState Pitfalls](https://react.dev/learn/state-a-components-memory#troubleshooting) — Common state sync issues (HIGH confidence)
- [React useEffect Dependencies](https://react.dev/reference/react/useEffect#specifying-reactive-dependencies) — Preventing stale closures (HIGH confidence)

### Zustand Patterns
- [Zustand Common Pitfalls](https://docs.pmnd.rs/zustand/guides/updating-state#common-patterns) — State update patterns (HIGH confidence)

### Domain Knowledge
- SubSpace warp encoding formula discovered via existing code analysis (TileEncoding.ts:48-50) (HIGH confidence)

---
*Domain pitfalls for: Animation Offset Control*
*Researched: 2026-02-15*
