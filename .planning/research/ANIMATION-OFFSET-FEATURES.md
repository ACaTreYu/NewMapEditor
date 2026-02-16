# Feature Research: Animation Offset Control

**Domain:** Tile Map Editor - Parameterized Tile Placement
**Researched:** 2026-02-15
**Confidence:** MEDIUM

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist when placing tiles with parameters. Missing these = workflow feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Offset input field | Standard UI pattern for numeric parameters | LOW | Already exists (AnimationPanel.tsx line 365-374), currently disabled in 'tile' mode |
| Visual feedback for current offset | Users need to see what value will be placed | LOW | Status bar could show offset value when hovering animated tiles |
| Offset persistence across placements | Set once, place many times with same value | LOW | Already implemented via frameOffset state in AnimationPanel |
| Picker captures full tile encoding | Eyedropper should grab offset, not just animation ID | MEDIUM | Current picker (MapCanvas.tsx:1953) captures full tile value but doesn't sync to AnimationPanel UI |
| Valid range enforcement | Prevent invalid offsets (0-127 for general animations) | LOW | Already implemented (AnimationPanel.tsx:283) |

### Differentiators (Competitive Advantage)

Features that set this editor apart. Not required, but valuable for power users.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Game-object-aware offset semantics | Understanding warp routing, spawn variants vs frame offsets | MEDIUM | Different tools interpret offset differently: warps=(dest*10+src), spawns=team/variant, general=frame offset |
| Contextual offset UI per tool | Show "Source/Dest" for warps, "Frame" for animations, "Variant" for spawns | MEDIUM | Requires different UI widgets per ToolType (dropdowns vs numeric input vs sliders) |
| Real-time preview in Animation Panel | See frame offset visually before placing | HIGH | Would require rendering animation at specific frame offset in preview canvas |
| Offset increment/decrement hotkeys | Arrow keys to adjust offset without UI interaction | MEDIUM | Useful for fine-tuning warp routing or spawn positions |
| Batch offset adjustment | Select region, adjust all animated tiles' offsets | HIGH | Advanced feature, likely defer to future milestone |
| Offset validation per animation type | Warn when offset doesn't make sense (e.g., offset on non-looping animation) | MEDIUM | Requires animation metadata about loop behavior |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Separate offset fields for every game object in toolbar | "Convenience" of not switching panels | UI clutter, state sync complexity, violates single-source-of-truth | Single offset control in GameObjectToolPanel/AnimationPanel that's context-aware |
| Auto-increment offset on each placement | "Speed up" placing sequential warp chains | Users lose control, hard to predict behavior, accidents common | Manual control with keyboard shortcuts for increment |
| Offset preview overlay on map canvas | "See exactly what you're placing" | Visual noise, performance cost (render all frames), conflicts with other overlays | Status bar tooltip + AnimationPanel preview sufficient |
| Per-tile-instance offset editing post-placement | "Fix mistakes without redrawing" | Requires new selection model, complex UI for mass edits, encourages sloppy workflows | Picker → adjust offset → re-place is cleaner pattern |

## Feature Dependencies

```
[Offset input field (AnimationPanel)]
    └──requires──> [Animation encoding system (existing)]
                       └──requires──> [16-bit tile format (existing)]

[Picker captures offset]
    └──requires──> [Offset input field]
    └──requires──> [AnimationPanel offset state sync]

[Contextual offset UI per tool]
    └──requires──> [GameObjectToolPanel expansion]
    └──requires──> [Tool-specific offset interpretation logic]

[Offset hotkeys]
    └──requires──> [Offset input field]
    └──enhances──> [Picker workflow]

[Visual feedback in status bar]
    └──requires──> [Tile hover detection (existing)]
    └──requires──> [Offset decoding (existing - TileEncoding.ts)]
```

### Dependency Notes

- **Picker captures offset requires AnimationPanel sync:** When picker grabs an animated tile, the offset value must update AnimationPanel's frameOffset state and UI
- **Contextual offset UI enhances game object tools:** Different tools (warp, spawn, conveyor) need different offset UIs but share the same underlying encoding
- **Offset hotkeys enhance picker workflow:** Quick adjust-and-replace pattern is faster than mouse-based workflows
- **Status bar feedback requires hover detection:** Already exists for showing coordinates/tile IDs, just needs offset extraction

## MVP Definition

### Launch With (Current Milestone)

Minimum viable offset control — what's needed to validate the workflow.

- [x] **Offset input field** — Already exists in AnimationPanel (line 365-374)
- [ ] **Picker syncs offset to AnimationPanel** — Critical for inspect-adjust-replace workflow
- [ ] **Status bar shows offset on hover** — Users need to see what offset a tile has before picking
- [ ] **Warp tool uses contextual offset UI** — Source/Dest dropdowns instead of raw offset number

### Add After Core Works (Future Milestone)

Features to add once basic offset control is validated.

- [ ] **Offset increment/decrement hotkeys** — Add once users confirm the workflow is sound
- [ ] **Offset validation warnings** — Add when users report confusion about invalid offset values
- [ ] **Contextual offset UI for all game objects** — Expand pattern from warps to spawns, conveyors, etc.

### Future Consideration (v4+)

Features to defer until product-market fit is established.

- [ ] **Real-time preview in AnimationPanel** — Performance cost, complex rendering, low ROI
- [ ] **Batch offset adjustment** — Advanced feature, niche use case, wait for user demand
- [ ] **Per-tile-instance offset editing** — Requires new interaction model, defer until requested

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Picker syncs offset to AnimationPanel | HIGH | LOW | P1 |
| Status bar shows offset on hover | HIGH | LOW | P1 |
| Warp tool contextual offset UI | HIGH | MEDIUM | P1 |
| Offset increment/decrement hotkeys | MEDIUM | LOW | P2 |
| Contextual offset UI for all game objects | MEDIUM | MEDIUM | P2 |
| Offset validation warnings | MEDIUM | MEDIUM | P2 |
| Real-time preview in AnimationPanel | LOW | HIGH | P3 |
| Batch offset adjustment | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch (current milestone)
- P2: Should have, add when possible (next 1-2 milestones)
- P3: Nice to have, future consideration (v4+)

## Competitor Feature Analysis

| Feature | Tiled (1.11.x) | Continuum Level Editor | AC Map Editor (Current) | Our Approach |
|---------|----------------|------------------------|-------------------------|--------------|
| Parameterized tile placement | Custom properties on tile objects (not tile layers) | No offset control visible in docs | Offset field exists but picker doesn't sync | Picker syncs offset, contextual UI per tool |
| Eyedropper captures parameters | Yes (object properties) | Unknown (docs silent) | Captures tile value but not UI state | Sync picker → AnimationPanel state |
| Per-placement parameter control | Yes (Properties panel) | No (fixed tile placement) | Partial (offset input exists) | Contextual controls in GameObjectToolPanel |
| Visual parameter feedback | Properties panel on selection | No | Status bar shows tile ID | Status bar shows offset, AnimationPanel shows value |
| Tool-specific parameter UI | Generic properties system | N/A | Warp has Source/Dest dropdowns | Expand pattern to all game objects |

### Analysis

**Tiled's approach:** Full flexibility via custom properties but only for tile objects (not tile layers). Overkill for fixed-encoding formats like SubSpace/Continuum.

**Continuum Level Editor:** Minimal documentation found. [Continuum Level Editor](https://continuumlt.sourceforge.net/manual/) mentions Pencil/Line/Square tools but no offset controls. Likely lacks parameterized placement.

**Our approach:** Hybrid — simpler than Tiled's properties system (no need for custom classes), more powerful than basic tile placement. Offset is first-class in the encoding, so UI should treat it as first-class too.

## Implementation Notes

### Existing Architecture Strengths

1. **Clean separation:** AnimationPanel owns offset state (line 26: `frameOffset` state). GameObjectToolPanel owns warp settings (line 36: `warpSrc`, `warpDest`). Just need to bridge them.

2. **Picker already captures full encoding:** MapCanvas.tsx:1953 does `setSelectedTile(map.tiles[y * MAP_WIDTH + x])`, which includes offset bits. Problem is it doesn't decode and sync to UI state.

3. **Tile encoding helpers exist:** TileEncoding.ts has `getFrameOffset()`, `getAnimationId()`, `makeAnimatedTile()`, etc. Decoding is trivial.

4. **Status bar already shows tile info:** StatusBar.tsx shows cursor position and tile ID. Adding offset is just extracting another field.

### Existing Architecture Gaps

1. **No picker → AnimationPanel sync:** Picker sets `selectedTile` (Zustand), but doesn't update `frameOffset` (React state local to AnimationPanel). Need to lift frameOffset to Zustand or add sync effect.

2. **GameObjectToolPanel doesn't own offset:** Warp tool has its own offset encoding (line 48: `makeWarpTile(warpSrc, warpDest)`), but doesn't coordinate with AnimationPanel's offset field. Need unified offset state per tool.

3. **No hover → offset extraction:** Status bar receives `cursorTileId` but it's just the raw tile value. Need to decode offset and pass to StatusBar as separate prop.

### Recommended Approach

**Phase 1: Picker Sync (P1)**
- Add `setFrameOffset` to AnimationPanel props or Zustand global slice
- In picker handler (MapCanvas.tsx:1951), decode tile and call `setFrameOffset(getFrameOffset(tile))`
- Update AnimationPanel to use Zustand offset state instead of local React state

**Phase 2: Status Bar Feedback (P1)**
- In MapCanvas hover handler, decode offset: `const offset = getFrameOffset(cursorTileId)`
- Pass offset to StatusBar as prop: `<StatusBar cursorTileOffset={offset} />`
- StatusBar displays offset when hovering animated tiles

**Phase 3: Contextual Offset UI (P1 for warps, P2 for others)**
- Move warp-specific offset logic from AnimationPanel to GameObjectToolPanel
- When ToolType.WARP active, show Source/Dest dropdowns (already exists)
- When ToolType.SPAWN active (future), show Team/Variant dropdowns
- When general animation tools active, show numeric offset input
- All variations write to same Zustand offset field, just with different UI widgets

## Sources

### Official Documentation
- [Tiled Custom Properties](https://doc.mapeditor.org/en/stable/manual/custom-properties/) — How Tiled handles per-tile parameters via properties system (MEDIUM confidence)
- [Tiled Working with Objects](https://doc.mapeditor.org/en/stable/manual/objects/) — Tile objects vs tile layers, when properties apply (MEDIUM confidence)
- [Tiled Editing Tilesets](https://doc.mapeditor.org/en/stable/manual/editing-tilesets/) — Animation frame control and duration (MEDIUM confidence)
- [Continuum Level Editor](https://continuumlt.sourceforge.net/manual/) — Basic tool palette, no offset controls documented (LOW confidence)

### Community Resources
- [Tiled Forum: Eyedropper Tool](https://discourse.mapeditor.org/t/eyedropper-tool/755) — Eyedropper selects tile in Tilesets window for inspection (MEDIUM confidence)
- [Tiled Forum: Custom Properties on Tiles](https://discourse.mapeditor.org/t/custom-properties-to-tiles-on-tile-layer/3069) — Discussion of per-tile vs per-object properties (MEDIUM confidence)
- [Tiled Forum: Per-Tile Custom Property](https://discourse.mapeditor.org/t/how-to-set-per-tile-custom-property-in-map/3883) — Limitations of tile layer properties (MEDIUM confidence)

### Existing Codebase
- `E:\NewMapEditor\src\components\AnimationPanel\AnimationPanel.tsx` — Offset input field (line 365-374), frameOffset state (line 26) (HIGH confidence)
- `E:\NewMapEditor\src\components\MapCanvas\MapCanvas.tsx` — Picker handler (line 1951-1956) (HIGH confidence)
- `E:\NewMapEditor\src\core\map\TileEncoding.ts` — Encoding/decoding helpers (`getFrameOffset`, `makeAnimatedTile`, etc.) (HIGH confidence)
- `E:\NewMapEditor\src\components\GameObjectToolPanel\GameObjectToolPanel.tsx` — Warp Source/Dest dropdowns (line 56-79) (HIGH confidence)
- `E:\NewMapEditor\src\components\StatusBar\StatusBar.tsx` — Cursor position and tile ID display (HIGH confidence)

### Confidence Assessment

**MEDIUM confidence overall** because:
- **HIGH:** Tiled's official docs clearly document custom properties and tile objects (verified current version 1.11.x, Nov 2025)
- **HIGH:** Existing codebase patterns are well-understood (direct file inspection)
- **LOW:** Continuum Level Editor documentation is sparse, no offset control features found
- **MEDIUM:** RPG Maker tile parameter controls documented but not deeply detailed
- **MEDIUM:** No SubSpace/ASSS-specific offset control documentation found (community tools may exist but not indexed)

Primary sources (Tiled docs, existing codebase) are authoritative. Continuum/SubSpace ecosystem research is incomplete but sufficient for feature landscape (we're not copying their approach, just understanding the domain).

---
*Feature research for: Animation Offset Control in Tile Map Editor*
*Researched: 2026-02-15*
