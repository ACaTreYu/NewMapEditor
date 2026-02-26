# Phase 99: Wall Fix & Update Interval Removal - Research

**Researched:** 2026-02-26
**Domain:** WallSystem.ts bug fix (neighbor type preservation) + Electron main.ts interval removal
**Confidence:** HIGH

## Summary

This phase contains two independent surgical bug fixes. Both are localized to specific functions
and require no new dependencies, no architectural changes, and no new test infrastructure.

**Bug 1 (WALL-01/WALL-02):** `WallSystem.updateNeighbor()` and `WallSystem.collectNeighborUpdate()`
both call `this.getWallTile(this.currentType, connections)` when updating an adjacent wall tile that
was already placed. `this.currentType` is the brush's current wall type — not the existing neighbor's
wall type. The result: placing a "Red" wall next to an existing "Blue" wall converts the Blue tile
into a Red tile. The fix is to call `this.findWallType(currentTile)` on the neighbor's tile to read
its actual type, then pass that type to `getWallTile`. `findWallType` already exists in the class and
is already used correctly in `updateNeighborDisconnect`, making the fix a direct one-line change per
method.

**Bug 2 (UPDT-01):** `setupAutoUpdater()` in `electron/main.ts` calls both
`setTimeout(() => autoUpdater.checkForUpdates(), 5000)` (one-time startup check) and
`setInterval(() => autoUpdater.checkForUpdates(), 30 * 60 * 1000)` (recurring 30-minute poll).
The requirement is one startup check only. Removing the `setInterval` line entirely is the complete
fix — the startup `setTimeout` is correct and must remain.

**Primary recommendation:** Fix `updateNeighbor` and `collectNeighborUpdate` in `WallSystem.ts` to
use `findWallType(currentTile)` instead of `this.currentType`. Remove the `setInterval` line in
`electron/main.ts`. Total: three lines changed across two files.

## Bug Analysis: WALL-01 / WALL-02

### Root Cause (verified by source reading)

`WallSystem.ts` lines 163-176 (`updateNeighbor`) and lines 227-244 (`collectNeighborUpdate`) both
contain this exact pattern:

```typescript
// BUGGY — uses brush type, not neighbor's actual type
const connections = this.getConnections(map, x, y);
const newTile = this.getWallTile(this.currentType, connections);  // ← wrong
map.tiles[index] = newTile;
```

The `this.currentType` field is the wall type the user currently has selected (the brush). When
updating a neighbor, we want the neighbor's own type — the type it had before we placed an adjacent
wall.

The comment on line 163 even says: `// Uses currentType for the new tile (matching SEDIT's set_wall_tile behavior)` — this comment describes the SEDIT behavior the code is trying to match, but the match is incorrect. SEDIT's `set_wall_tile` would look up the neighbor tile's type from the tile data, not from a "current brush" global.

### The Correct Pattern (already used in removeWall path)

`updateNeighborDisconnect` (lines 270-285) does it correctly:

```typescript
// CORRECT — reads the neighbor's own type
const wallType = this.findWallType(currentTile);
if (wallType === -1) return;
const connections = this.getConnections(map, x, y);
const newTile = this.getWallTile(wallType, connections);  // ← uses neighbor's type
map.tiles[index] = newTile;
```

The fix for `updateNeighbor` and `collectNeighborUpdate` is to replicate this pattern.

### Exact Fix for `updateNeighbor` (single-tile pencil path)

```typescript
// BEFORE (line 174):
const newTile = this.getWallTile(this.currentType, connections);

// AFTER:
const wallType = this.findWallType(currentTile);
if (wallType === -1) return;
const connections = this.getConnections(map, x, y);
const newTile = this.getWallTile(wallType, connections);
```

Note: the line `const connections = this.getConnections(map, x, y);` already exists (line 173) and
must not be duplicated. Only the `getWallTile` call and a guard need to change:

```typescript
private updateNeighbor(map: MapData, x: number, y: number, _addConnection: number): void {
    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return;

    const index = y * MAP_WIDTH + x;
    const currentTile = map.tiles[index];

    if (!this.isWallTile(currentTile)) return;

    // FIXED: look up the neighbor's own wall type, not the brush's type
    const wallType = this.findWallType(currentTile);
    if (wallType === -1) return;

    const connections = this.getConnections(map, x, y);
    const newTile = this.getWallTile(wallType, connections);
    map.tiles[index] = newTile;
}
```

### Exact Fix for `collectNeighborUpdate` (batch/line-draw path)

```typescript
private collectNeighborUpdate(
    map: MapData,
    x: number,
    y: number,
    affectedTiles: Map<string, number>
): void {
    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return;

    const index = y * MAP_WIDTH + x;
    const currentTile = map.tiles[index];

    if (!this.isWallTile(currentTile)) return;

    // FIXED: look up the neighbor's own wall type, not the brush's type
    const wallType = this.findWallType(currentTile);
    if (wallType === -1) return;

    const connections = this.getConnections(map, x, y);
    const newTile = this.getWallTile(wallType, connections);
    affectedTiles.set(`${x},${y}`, newTile);
}
```

### Edge Cases to Consider

**What if `findWallType` returns -1?** This would mean `isWallTile` returned true but the tile
wasn't found in any wall type array. This is theoretically impossible since `isWallTile` queries the
same `wallTileLookup` Set that `buildLookupCache()` built from the same `wallTypes` array. However,
returning early on -1 (as `updateNeighborDisconnect` does) is the correct defensive pattern.

**What about tile 13 (the "no-connection" fallback)?** Tile 13 appears in multiple wall type arrays
as the isolated-tile variant. `findWallType` returns the index of the first type that contains it
(Type 0), so any isolated wall that shares tile 13 with another type would get type 0 assigned. This
is a pre-existing ambiguity, not introduced by this fix. The current behavior (type-A neighbor gets
converted to type-B) is unambiguously worse.

**Batch phase ordering:** `collectNeighborUpdate` is called in Phase 3 of `placeWallBatch`, AFTER
Phase 1 (place placeholder tiles) and Phase 2 (recalculate batch tiles). At Phase 3, the map already
has the new placeholder tiles in place, so `getConnections` correctly sees the new walls as neighbors.
The fix does not affect this ordering.

## Bug Analysis: UPDT-01

### Root Cause (verified by source reading)

`electron/main.ts`, `setupAutoUpdater()` function, lines 386-389:

```typescript
// Check on launch (delay to not compete with startup)
setTimeout(() => autoUpdater.checkForUpdates(), 5000);

// Re-check every 30 minutes
setInterval(() => autoUpdater.checkForUpdates(), 30 * 60 * 1000);
```

### Exact Fix

Remove lines 388-389 (the `setInterval` call and its comment). The `setTimeout` on line 387 must remain.

```typescript
// Check on launch (delay to not compete with startup)
setTimeout(() => autoUpdater.checkForUpdates(), 5000);
// (setInterval removed — startup check only per UPDT-01)
```

### Why This Is Safe

- The `manualCheckInProgress` flag gates UI dialogs for manual checks — it is not affected.
- The `'Check for Updates...'` menu item calls `autoUpdater.checkForUpdates()` directly — it is not affected.
- `autoUpdater.autoDownload = true` and `autoUpdater.autoInstallOnAppQuit = true` remain active — downloaded updates still install on quit.
- `update-downloaded` event still fires and prompts the user to restart — that flow is unchanged.
- No renderer-side code depends on periodic checks; `update-status` IPC events fire event-driven from `autoUpdater` emitters.

## Architecture Patterns

### Files Modified

| File | Change | Lines |
|------|--------|-------|
| `src/core/map/WallSystem.ts` | Fix `updateNeighbor` — use `findWallType` | ~174 |
| `src/core/map/WallSystem.ts` | Fix `collectNeighborUpdate` — use `findWallType` | ~243 |
| `electron/main.ts` | Remove `setInterval` call | ~389 |

### No New Dependencies

Both fixes use only existing code. No npm installs required. No new files created.

### WallSystem Singleton

`wallSystem` is exported as a singleton (`export const wallSystem = new WallSystem()`). The fix
happens inside the class methods — callers (`documentsSlice.ts`, `MapCanvas.tsx`) do not change.

### Test Verification Points

**Wall type preservation (WALL-01/WALL-02):**
1. Place type-A wall tiles (e.g., Basic = type 0).
2. Place type-B wall tile (e.g., Red = type 3) adjacent to the type-A tile.
3. Verify: the type-A tile updates its connection state but remains type A (its tile ID stays in the
   Basic wall type array).
4. Repeat via line-draw tool (drag) to test the batch path.

**Update interval (UPDT-01):**
1. Launch the packaged app.
2. Observe network activity — one `checkForUpdates` call fires ~5 seconds after launch.
3. Wait 31+ minutes — no further network requests to the update server.
4. Use Help > Check for Updates — fires one on-demand check, then stops.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Wall type lookup | Custom reverse-map | `findWallType()` (already exists) | Already correct, tested by disconnect path |
| Neighbor type detection | Bit-parsing tile IDs | `findWallType(currentTile)` | Type encoding is opaque — only `wallTypes` arrays are authoritative |

## Common Pitfalls

### Pitfall 1: Removing the setTimeout Instead of the setInterval
**What goes wrong:** App never performs any automatic update check on launch.
**Why it happens:** Both calls are adjacent; developer removes the wrong one.
**How to avoid:** The `setTimeout` on line 386 is the startup check (one-time). The `setInterval`
on line 389 is the recurring poll. Remove only `setInterval`.
**Warning signs:** No `update-status: 'checking'` event fires ~5 seconds after launch.

### Pitfall 2: Duplicating the `getConnections` Call in updateNeighbor
**What goes wrong:** `getConnections` is called twice, or the existing call is removed accidentally.
**Why it happens:** The fix adds lines near an existing `getConnections` call.
**How to avoid:** Read the existing method body carefully before editing. There is already one
`getConnections` call at line 173; the fix only changes the `getWallTile` call below it.

### Pitfall 3: Forgetting the `-1` Guard in updateNeighbor
**What goes wrong:** If `findWallType` somehow returns -1, `getWallTile` receives -1 and returns 0
(a no-op tile), corrupting the map.
**How to avoid:** Mirror the pattern in `updateNeighborDisconnect` exactly — check `if (wallType === -1) return;`.

### Pitfall 4: Breaking the Batch Phase Ordering
**What goes wrong:** Phase 3 neighbor updates see stale tile data.
**Why it happens:** Moving Phase 3 earlier or reading from `affectedTiles` instead of `map.tiles`.
**How to avoid:** Do not change `placeWallBatch`'s phase structure. The fix is only inside
`collectNeighborUpdate`, not in the phase ordering logic.

## Code Examples

### Corrected `updateNeighbor` (complete method)
```typescript
// Source: src/core/map/WallSystem.ts — fixed version
private updateNeighbor(map: MapData, x: number, y: number, _addConnection: number): void {
  if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return;

  const index = y * MAP_WIDTH + x;
  const currentTile = map.tiles[index];

  // Only update if it's already a wall
  if (!this.isWallTile(currentTile)) return;

  // Preserve the neighbor's existing wall type (not the brush's current type)
  const wallType = this.findWallType(currentTile);
  if (wallType === -1) return;

  // Recalculate connections for the neighbor
  const connections = this.getConnections(map, x, y);
  const newTile = this.getWallTile(wallType, connections);
  map.tiles[index] = newTile;
}
```

### Corrected `collectNeighborUpdate` (complete method)
```typescript
// Source: src/core/map/WallSystem.ts — fixed version
private collectNeighborUpdate(
  map: MapData,
  x: number,
  y: number,
  affectedTiles: Map<string, number>
): void {
  if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return;

  const index = y * MAP_WIDTH + x;
  const currentTile = map.tiles[index];

  // Only update if it's already a wall
  if (!this.isWallTile(currentTile)) return;

  // Preserve the neighbor's existing wall type (not the brush's current type)
  const wallType = this.findWallType(currentTile);
  if (wallType === -1) return;

  // Recalculate connections for the neighbor
  const connections = this.getConnections(map, x, y);
  const newTile = this.getWallTile(wallType, connections);
  affectedTiles.set(`${x},${y}`, newTile);
}
```

### setInterval Removal (electron/main.ts)
```typescript
// Source: electron/main.ts — after fix (setupAutoUpdater function, end)
  // Check on launch (delay to not compete with startup)
  setTimeout(() => autoUpdater.checkForUpdates(), 5000);
  // setInterval removed — startup check only (UPDT-01)
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `this.currentType` for neighbor updates | `findWallType(currentTile)` | Phase 99 | Neighbors keep their own type |
| Periodic 30-min update polling | Startup-only check | Phase 99 | No background network activity |

The `updateNeighborDisconnect` method already used the correct approach (findWallType). This fix
makes `updateNeighbor` and `collectNeighborUpdate` consistent with it.

## Open Questions

None. Both bugs are fully diagnosed from source code. No ambiguity remains.

## Sources

### Primary (HIGH confidence)
- Direct source read: `E:\NewMapEditor\src\core\map\WallSystem.ts` — full file, all methods
- Direct source read: `E:\NewMapEditor\electron\main.ts` — full file, setupAutoUpdater function
- Direct source read: `E:\NewMapEditor\src\components\MapCanvas\MapCanvas.tsx` lines 2169-2196 —
  confirmed batch path calls `wallSystem.placeWallBatch`
- Direct source read: `E:\NewMapEditor\src\core\editor\slices\documentsSlice.ts` lines 224-228 —
  confirmed single-tile path calls `wallSystem.placeWall`

## Metadata

**Confidence breakdown:**
- Bug diagnosis (wall): HIGH — source code is definitive, root cause and fix are unambiguous
- Bug diagnosis (interval): HIGH — source code shows both setTimeout and setInterval clearly
- Fix correctness: HIGH — the correct pattern (`findWallType`) already exists in same class
- Edge cases: HIGH — tile 13 ambiguity is pre-existing, not introduced; -1 guard mirrors existing code
- No external library research needed — both fixes are pure internal logic changes

**Research date:** 2026-02-26
**Valid until:** Indefinite (fixes are to internal logic, no external dependencies)
