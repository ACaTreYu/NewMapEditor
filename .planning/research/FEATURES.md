# Feature Landscape

**Domain:** Tile map editor — bug fixes and polish milestone (v1.1.3)
**Researched:** 2026-02-20
**Confidence:** HIGH (all findings derived from direct codebase inspection)

---

## Table Stakes

Features users expect in this milestone. Missing = the release feels broken or incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Move Selection (marquee reposition) | SELECT tool is the primary editing workflow; users must reposition the marquee after drawing it without discarding it | Medium | Drag on selection interior to offset startX/startY/endX/endY together without touching tiles |
| Map boundary visualization | Without it, users cannot tell where the 256x256 map ends; working near edges feels ambiguous | Low | Two-zone background: in-bounds (beige/neutral) vs out-of-bounds (dark); border line on UI overlay |
| Minimap z-order above maximized windows | Minimap at z-index 100, MDI windows start at BASE_Z_INDEX 1000; maximized window covers minimap completely | Low | CSS z-index increase on `.minimap` and `.game-object-tool-panel` |
| Grenade/Bouncy dropdown sync | "Special Damage" dropdown correctly syncs only to MissileDamage; grenade and bouncy have sliders only — no labeled preset access | Low | Add dropdown controls using SPECIAL_DAMAGE_VALUES as preset scale for both weapon types |
| Settings serialization completeness | User reports only some settings appearing in SEdit's description box after save | Low | Audit save path; verify extendedSettings is committed before saveMap; check description field length |

---

## Differentiators

Features that go beyond the immediate bug report but would meaningfully improve v1.1.3 quality.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Move Selection keyboard nudge | Arrow-key nudge (1 tile/press, 10 with Shift) of the marquee — consistent with Tiled and RPG Maker editors | Low | Piggybacks on existing arrow-key handling; just shifts selection coords in Zustand |
| Map boundary border line | 1px outline at tile (0,0) top-left and (255,255) bottom-right drawn on the UI overlay canvas layer | Low | Drawn in drawUiLayer alongside marching ants; no buffer changes |
| Tool options panel z-order | GameObjectToolPanel also uses z-index 100; same z-order bug as minimap | Low | Same CSS fix as minimap — one change fixes both panels |

---

## Anti-Features

Features to explicitly NOT build in this milestone.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Move tiles with selection (cut-move-paste) | The request is specifically to move the marquee border, NOT the underlying tiles. Tile movement requires a floating selection layer, undo complexity, and is a significantly larger feature. | Keep existing cut/paste workflow for tile movement; document the distinction in the phase plan |
| Floating selection (Photoshop-style) | Requires a third canvas layer for floating tile data; entirely different architecture from marquee-only approach | Log as future feature candidate; out of scope for v1.1.3 |
| Custom per-weapon preset scales | AC binary header has no per-weapon preset indices beyond laser/special/recharge. Grenade and bouncy are extended-settings-only. Inventing bespoke scales diverges from SEdit convention. | Use SPECIAL_DAMAGE_VALUES (same 5-level scale) for BouncyDamage dropdown; derive grenade proportionally |
| DHT settings in serialization audit | DHT settings parse and serialize correctly via the same code path as all other extended settings | Limit audit to extendedSettings commit path and buildDescription call site |

---

## Feature Dependencies

```
Move Selection (marquee) ← existing → selection.active state + setSelection action
Move Selection (marquee) ← new ref needed → movingSelectionRef in MapCanvas
Move Selection (marquee) ← existing → requestUiRedraw already triggers UI layer refresh
Move Selection (marquee) ← NO dependency → CanvasEngine buffer (marquee only, no tile writes)

Map boundary (background zones) ← independent → CSS on .workspace / canvas element
Map boundary (border line) ← existing → drawUiLayer already renders UI at correct scale

Minimap z-order fix ← knowledge needed → MDI z-index range (BASE_Z_INDEX 1000, ceiling 100000)
GameObjectToolPanel z-order fix ← same fix as → Minimap (same z-index 100, same problem)

Grenade/Bouncy dropdown sync ← existing → SPECIAL_DAMAGE_VALUES already imported in MapSettingsDialog
Grenade/Bouncy dropdown sync ← new state → headerFields.bouncyDamageLevel, headerFields.grenadeDamageLevel
Grenade/Bouncy dropdown sync ← no new preset array needed → reuse SPECIAL_DAMAGE_VALUES for bouncy

Settings serialization audit ← trace path → saveMap → reserializeDescription → buildDescription
Settings serialization audit ← verify → map.header.extendedSettings is populated before save call
```

---

## MVP Recommendation

Prioritize in this order:

1. **Settings serialization audit** — highest user-facing pain; the description field is how AC reads map config at game runtime; silently broken serialization means custom settings are lost on save
2. **Grenade/Bouncy dropdown sync** — missing feature parity with the existing Missile dropdown; one-day fix; well-understood code path; adds labeled presets for two weapon types
3. **Minimap + GameObjectToolPanel z-order** — trivial CSS fix; must ship because maximized windows completely hide navigation aids
4. **Map boundary visualization** — polish feature; low risk; two independent sub-tasks (CSS background zones + UI overlay border line)
5. **Move Selection tool** — most complex new interaction; implement last to avoid destabilizing existing mouse handler logic in MapCanvas.tsx

Defer to future milestone: floating selection, tile-move-with-selection, custom weapon preset scales.

---

## Detailed Behavior Expectations

### 1. Move Selection (Marquee Reposition)

**Expected behavior in professional tile map editors (Tiled, RPG Maker, EDGE):**
- While SELECT tool is active and `selection.active === true`, hovering inside the selection rectangle changes the cursor to a move cursor (`move` CSS cursor).
- Left-click-drag inside the selection moves the marquee. The delta (dx, dy in tiles) is computed from drag start to current mouse position.
- The selection rectangle updates live during the drag via `requestUiRedraw`.
- On mouseup, the final offset is committed to Zustand via `setSelection`.
- The marquee is clamped to map bounds (0..255) during the move.
- If the user clicks OUTSIDE the selection area while SELECT tool is active, the existing behavior activates: discard current selection, start a new drag.

**Implementation fit to existing code:**

Add `movingSelectionRef` alongside `selectionDragRef` in MapCanvas.tsx:

```typescript
const movingSelectionRef = useRef<{
  active: boolean;
  startMouseX: number;
  startMouseY: number;
  origStartX: number;
  origStartY: number;
  origEndX: number;
  origEndY: number;
} | null>(null);
```

In `handleMouseDown`: check if click (converted to tile coords) falls inside the committed `selection` rect → if yes, begin move; if no, begin new selection drag (existing code path unchanged).

In `handleMouseMove`: if `movingSelectionRef.current`, compute tile delta and update a transient preview rect for the UI layer. Do not write to Zustand mid-drag.

In `handleMouseUp`: if `movingSelectionRef.current.active`, compute final offset, clamp, call `setSelection`, clear ref.

In `drawUiLayer`: when `movingSelectionRef.current.active`, draw the marching-ants rect at the preview position (same marching-ants code, different coords).

Cursor management: on `handleMouseMove`, when hovering inside `selection` rect with SELECT tool active, set `canvas.style.cursor = 'move'`; otherwise restore normal tool cursor.

**What it does NOT do:** does not move tiles. The marquee repositions; tiles at the new position are not affected. The tile content of the old marquee position remains unchanged.

---

### 2. Map Boundary Visualization

**Expected behavior:**
- The 256x256 tile map area has a warm, neutral background (e.g., beige or `oklch(95% 0.03 80)`) that visually identifies it as the editable canvas.
- Outside the map area shows a distinctly different, darker color (the existing `--bg-secondary` already serves this for the workspace).
- A crisp 1px border line at the map edge (tile 0,0 to tile 255,255) is drawn on the UI overlay canvas so the boundary is always precise regardless of background color.

**Implementation paths:**

Option A (CSS, zero-cost): The empty tile (tile 280) already renders transparent in CanvasEngine (`renderTile` returns early). Set the canvas element's CSS `background-color` to a warm neutral token. Since the canvas is exactly `MAP_WIDTH * TILE_SIZE * zoom` px at 1:1 scale, the canvas element IS the map boundary — the workspace background shows outside it.

Option B (UI overlay border): In `drawUiLayer`, after all other overlays, compute the screen-space rectangle for the full map:
```typescript
const topLeft = tileToScreen(0, 0);
const bottomRight = tileToScreen(MAP_WIDTH, MAP_HEIGHT);
ctx.strokeStyle = 'rgba(255, 200, 100, 0.6)'; // amber, theme-relative
ctx.lineWidth = 1;
ctx.strokeRect(topLeft.x + 0.5, topLeft.y + 0.5, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
```

**Recommendation:** Implement both. CSS background for the zone distinction (zero render cost), UI overlay border for precise edge visibility.

**Theme tokens:** Add `--map-bg` CSS variable to all three themes so each theme has its own in-bounds color. The existing `--bg-secondary` already covers the out-of-bounds zone correctly.

---

### 3. Minimap and Tool Options Panel Z-Order

**Current z-index inventory (from codebase inspection):**

| Element | CSS z-index | Notes |
|---------|-------------|-------|
| `.minimap` | 100 | Minimap.css |
| `.game-object-tool-panel` | 100 | GameObjectToolPanel.css |
| MDI ChildWindow (initial) | 1000 | `BASE_Z_INDEX` in windowSlice.ts |
| MDI ChildWindow (ceiling) | ~100000 | `Z_INDEX_NORMALIZE_THRESHOLD` |
| `.minimized-bars-container` | 500 | Workspace.css |
| ToolBar dropdowns | 200000 | ToolBar.css |

**Problem:** Any MDI window with zIndex >= 100 (always true; base is 1000) renders above the minimap and tool panel. A maximized window fills the entire workspace, producing 100% coverage of both overlay panels.

**Fix:** Raise minimap and GameObjectToolPanel to `z-index: 200000` to match the ToolBar dropdown tier. Both panels are positioned relative to the workspace container (`.main-area`), so raising z-index within that stacking context is safe.

**Expected behavior after fix:** Minimap and tool options panel remain visible and interactive at all zoom levels, window counts, and maximize states. Maximized windows fill the workspace canvas but do not occlude navigation overlays.

---

### 4. Grenade/Bouncy Dropdown Sync

**Current state (from MapSettingsDialog.tsx):**

```
headerFields.laserDamage (0-4)   → LASER_DAMAGE_VALUES[idx]   → localSettings.LaserDamage  ✓
headerFields.specialDamage (0-4) → SPECIAL_DAMAGE_VALUES[idx] → localSettings.MissileDamage ✓
headerFields.rechargeRate (0-4)  → RECHARGE_RATE_VALUES[idx]  → localSettings.MissileRecharge ✓
(no dropdown)                                                  → localSettings.BouncyDamage  ✗
(no dropdown)                                                  → localSettings.NadeDamage    ✗
(no dropdown)                                                  → localSettings.BouncyRecharge ✗
(no dropdown)                                                  → localSettings.NadeRecharge   ✗
```

**Root cause:** SEdit's binary header has exactly 3 indices (`laserDamage`, `specialDamage`, `rechargeRate`). These map only to laser/missile/missile-recharge. Grenade and bouncy have always been pure extended-settings-only fields — they have no binary header backing. The existing UI only exposes sliders for them.

**Recommended fix:**

Add two new UI-only index fields to `headerFields` state (these do NOT write to the binary header):
```typescript
bouncyDamageLevel: number;  // 0-4, UI-only index
grenadeDamageLevel: number; // 0-4, UI-only index
```

Use `SPECIAL_DAMAGE_VALUES = [20, 51, 102, 153, 204]` as the preset scale for `BouncyDamage`. SEdit labeled both missile and bouncy under "Special Damage" — same 5-level scale is consistent with SEdit convention.

Use a proportional scale for `NadeDamage` based on the grenade's lower default (21 vs missile's 102). Suggested: `GRENADE_DAMAGE_VALUES = [10, 26, 51, 102, 153]`. Note: this specific scale is LOW confidence (SEdit source inaccessible). Safe fallback: use `SPECIAL_DAMAGE_VALUES` for both and accept that "Normal" grenade damage will show 51 instead of 21 (still functional; users can override with slider).

On dialog open, initialize the new index fields with `findClosestIndex`:
```typescript
bouncyDamageLevel: findClosestIndex(merged['BouncyDamage'] ?? 48, SPECIAL_DAMAGE_VALUES),
grenadeDamageLevel: findClosestIndex(merged['NadeDamage'] ?? 21, GRENADE_DAMAGE_VALUES),
```

On dropdown change:
```typescript
onChange={(val) => {
  setHeaderFields(prev => ({ ...prev, bouncyDamageLevel: val }));
  updateSetting('BouncyDamage', SPECIAL_DAMAGE_VALUES[val] ?? 48);
  setIsDirty(true);
}}
```

**Scope note:** The BouncyRecharge and NadeRecharge dropdowns are a parallel enhancement. The `RECHARGE_RATE_VALUES` array works for all three weapon types (same scale). Add if time allows; skip if scope is tight.

---

### 5. Settings Serialization Audit

**Current save path (traced from code inspection):**

```
User edits settings in dialog
  → updateSetting(key, value) → localSettings state

User clicks OK/Apply
  → applySettings()
  → updateMapHeader({
      description: buildDescription(localSettings, author, unrecognized),
      extendedSettings: localSettings,  ← writes to Zustand
      ...headerFields
    })

User clicks File > Save
  → MapService.saveMap()
  → reserializeDescription(map.header.description, map.header.extendedSettings)
  → buildDescription({ ...defaults, ...extendedSettings }, author, unrecognized)
  → binary encode + zlib → file
```

**Likely causes of partial serialization:**

1. **Save without Apply (most likely):** If the user edits settings and saves without clicking Apply/OK, `map.header.extendedSettings` in Zustand is still the old (possibly empty for new maps) object. The save writes stale values. The dialog and Zustand are out of sync.

2. **Empty extendedSettings on new map:** `createEmptyMap()` calls `initializeDescription()` which creates a full-settings description string. BUT the `header.extendedSettings` field in the new map object may not be populated from that string until dialog-open triggers the merge. On File > New → immediately File > Save without opening settings → `extendedSettings` may be `{}` → `reserializeDescription` fills gaps from defaults, not from the description string.

3. **AC description field truncation:** The 53-setting serialized string is approximately 600-800 characters. If the binary format's description field has a shorter maximum (e.g., 256 or 512 bytes), SEdit will silently truncate. Verify against the format spec.

4. **SEdit display filter:** SEdit may only show settings it was compiled to recognize. If the AC server version is older than AC_Setting_Info_25.txt's additions (e.g., `Widescreen`, `DHT_*`), those settings appear in the file but not in SEdit's dialog. This is NOT a bug — expected behavior.

**Audit steps:**
1. Verify `createEmptyMap()` populates `header.extendedSettings` from `getDefaultSettings()` (not relying on lazy dialog-open merge).
2. Check if `MapService.saveMap()` reads from `map.header.extendedSettings` or directly from `map.header.description`.
3. Measure serialized description length; compare to binary format limit.
4. Add an assertion or dev-mode log: "extendedSettings has N keys at save time; expected 53."

---

## Weapon Preset Reference Values

From `E:\NewMapEditor\src\core\map\settingsSerializer.ts` (HIGH confidence):

| Setting | Very Low | Low | Normal | High | Very High | Confidence |
|---------|----------|-----|--------|------|-----------|------------|
| LaserDamage | 5 | 14 | 27 | 54 | 112 | HIGH — `LASER_DAMAGE_VALUES` in codebase |
| MissileDamage | 20 | 51 | 102 | 153 | 204 | HIGH — `SPECIAL_DAMAGE_VALUES` in codebase |
| MissileRecharge | 3780 | 1890 | 945 | 473 | 236 | HIGH — `RECHARGE_RATE_VALUES` (lower = faster) |
| BouncyDamage | 20 | 51 | 102 | 153 | 204 | MEDIUM — reuse SPECIAL_DAMAGE_VALUES; SEdit labeled bouncy as "special damage" |
| BouncyRecharge | 3780 | 1890 | 765 | 473 | 236 | MEDIUM — reuse RECHARGE_RATE_VALUES; snap-to for default 765 |
| NadeDamage | 10 | 26 | 51 | 102 | 153 | LOW — proportionally derived; SEdit source inaccessible |
| NadeRecharge | 7800 | 3900 | 1950 | 975 | 488 | LOW — proportionally derived (2x missile recharge; grenade default is 1950) |

**LOW confidence values** must be validated against SEdit behavior or user testing before shipping. Safest fallback: use `SPECIAL_DAMAGE_VALUES` for both BouncyDamage and NadeDamage and `RECHARGE_RATE_VALUES` for both recharge dropdowns. Users can override with sliders regardless.

---

## Sources

- `E:\NewMapEditor\src\core\map\settingsSerializer.ts` — serialization constants and pipeline (HIGH confidence)
- `E:\NewMapEditor\src\core\map\GameSettings.ts` — all 53 settings with defaults and ranges (HIGH confidence)
- `E:\NewMapEditor\src\components\MapSettingsDialog\MapSettingsDialog.tsx` — existing dropdown sync code, applySettings() path (HIGH confidence)
- `E:\NewMapEditor\src\components\Minimap\Minimap.css` — z-index: 100 (HIGH confidence)
- `E:\NewMapEditor\src\components\GameObjectToolPanel\GameObjectToolPanel.css` — z-index: 100 (HIGH confidence)
- `E:\NewMapEditor\src\core\editor\slices\windowSlice.ts` — BASE_Z_INDEX 1000, Z_INDEX_NORMALIZE_THRESHOLD 100000 (HIGH confidence)
- `E:\NewMapEditor\src\components\Workspace\Workspace.css` — minimized-bars z-index: 500 (HIGH confidence)
- `E:\NewMapEditor\src\components\ToolBar\ToolBar.css` — dropdown z-index: 200000 (HIGH confidence)
- `E:\NewMapEditor\src\components\MapCanvas\MapCanvas.tsx` — selection drag pattern, selectionDragRef, drawUiLayer (HIGH confidence)
- `E:\NewMapEditor\src\core\canvas\CanvasEngine.ts` — renderTile transparent-on-280 path, buffer architecture (HIGH confidence)
- `E:\NewMapEditor\AC_Setting_Info_25.txt` — AC game setting names, defaults, and ranges (HIGH confidence)
- SEdit source analysis — INACCESSIBLE during this research (permission denied on E:\AC-SEDIT-SRC-ANALYSIS); grenade/bouncy preset values are LOW confidence as a result
