# Project Research Summary: Animation Offset Control

**Project:** AC Map Editor v3.3 - Animation Offset Control
**Domain:** Tile Map Editor - Parameterized Tile Placement
**Researched:** 2026-02-15
**Confidence:** HIGH

## Executive Summary

The Animation Offset Control milestone adds picker synchronization and contextual offset UI to the AC Map Editor's existing animation placement system. The feature enables users to inspect animated tiles' offset values via the picker tool and place new tiles with precise offset control through tool-specific interfaces. This is a pure feature addition requiring zero new dependencies—all functionality can be implemented using the existing Electron/React/TypeScript/Zustand stack.

The core architectural insight is to lift the AnimationPanel's local `frameOffset` state into Zustand's GlobalSlice, enabling the picker tool (in MapCanvas) to update the offset UI when capturing animated tiles. Different game object tools (warp, spawn, conveyor) then provide contextual widgets that encode/decode this shared offset value according to tool-specific semantics: warps use Source/Dest dropdowns (offset = dest*10 + src), spawns use variant selectors, and general animations use direct numeric input. This unified-state-with-contextual-UI pattern avoids the state sync complexity of maintaining separate offset fields per tool.

The critical risk is maintaining state synchronization across three interaction points: (1) user changes offset in UI → must update selectedTile encoding, (2) picker captures tile → must decode and sync offset to UI, (3) tool switches → must preserve offset value. All three risks have proven mitigations from existing codebase patterns: AnimationPanel already updates selectedTile when animation selection changes (line 253-256), picker already captures full tile values (line 1951-1956), and GameObjectToolPanel already manages tool-specific state (warpSrc/warpDest). The implementation extends these established patterns rather than introducing new architectural concepts.

## Key Findings

### Recommended Stack

**Zero new dependencies required.** This milestone extends existing capabilities without adding libraries, frameworks, or external dependencies. All offset encoding/decoding utilities already exist in TileEncoding.ts (getFrameOffset, makeAnimatedTile). The UI uses native HTML inputs (text for numeric offset, select for warp dropdowns). State management uses the existing Zustand store structure.

**Core technologies:**
- **Zustand 4.x (existing)**: GlobalSlice stores shared `frameOffset` field (0-127) — already used for selectedTile, gameObjectToolState patterns
- **TileEncoding.ts (existing)**: Offset extraction via `getFrameOffset()`, encoding via `makeAnimatedTile()` — handles bit manipulation (bits 14-8 store offset)
- **React 18.x (existing)**: Conditional rendering for tool-specific widgets — AnimationPanel, GameObjectToolPanel, StatusBar components already exist
- **Native HTML inputs**: type="text" for numeric offset, select for warp Source/Dest dropdowns — already used throughout UI

**Why sufficient:** AnimationPanel already has offset input field (line 365-374) with validation (line 281-294). Picker already captures full tile values including offset bits. StatusBar already shows tile info on hover. The only missing piece is state synchronization—lifting `frameOffset` from AnimationPanel local state to Zustand enables cross-component access.

### Expected Features

Research confirms these features meet tile editor user expectations for parameterized tile placement workflows (Tiled, RPG Maker patterns).

**Must have (table stakes):**
- **Picker captures offset from tiles** — Eyedropper tools in all editors (Tiled, Photoshop) capture full tile/object state, not just visual appearance. Inspect-adjust-replace workflow is standard pattern.
- **Visual feedback for current offset** — Status bar or properties panel shows parameter values on hover. Users need to see what offset a tile has before picking it.
- **Offset persistence across placements** — Set offset once, place multiple tiles with same value. Standard pattern for parameter controls (brush size, opacity, etc.).
- **Valid range enforcement** — Prevent invalid offsets (0-127 for general animations, 0-99 for warp routing). UI shows error for out-of-range values.

**Should have (differentiators):**
- **Tool-specific offset UI** — Warp tool shows Source/Dest dropdowns (semantic), not raw offset number. Spawn tool shows Team/Variant selectors. Matches game design mental model.
- **Status bar offset display** — Show offset value when hovering animated tiles. Complements existing tile ID display (StatusBar.tsx line 46-52).
- **Offset increment/decrement hotkeys** — Arrow keys to adjust offset without clicking UI. Speeds up fine-tuning workflows (warp routing, spawn positioning).

**Defer (future consideration):**
- **Real-time offset preview in AnimationPanel** — Render animation at specific frame offset before placing. High complexity (performance cost, rendering coordination), low ROI (status bar preview sufficient).
- **Batch offset adjustment** — Select region, adjust all animated tiles' offsets. Advanced feature for mass edits, wait for user demand.
- **Per-tile offset editing post-placement** — Modify offset of existing tiles without re-placing. Requires new selection model, encourages sloppy workflows.

### Architecture Approach

The implementation follows the existing Zustand slice pattern and ref-based tool state management. All changes are modifications to existing files—no new components, no new architectural layers.

**Major components:**
1. **globalSlice.ts (extend)** — Add `frameOffset: number` field (0-127) and `setFrameOffset(offset: number)` action. Replaces AnimationPanel's local React state, enables cross-component access.
2. **AnimationPanel.tsx (modify)** — Replace local `frameOffset` useState with Zustand subscription. Update selectedTile when offset changes (extend existing pattern from line 253-256).
3. **MapCanvas.tsx (modify picker)** — Extract offset from picked tile using `getFrameOffset()`, call `setFrameOffset()` to sync to UI. Extends existing picker handler (line 1951-1956).
4. **GameObjectToolPanel.tsx (extend)** — Add contextual offset widgets per tool: Warp shows Source/Dest dropdowns (decode offset = dest*10 + src), Spawn shows variant selector, Conveyor shows numeric input.
5. **StatusBar.tsx (extend)** — Display offset value when hovering animated tiles. Extends existing tile info display pattern (line 46-52).

**Key pattern: Unified state, contextual UI** — Single `frameOffset` field in Zustand, tool-specific widgets encode/decode on read/write. Warp tool interprets offset as routing (dest*10 + src), spawn tool interprets as team/variant, general animations use raw value. Avoids state sync complexity of separate fields per tool (warpSrc/warpDest/spawnVariant/frameOffset would diverge when using picker or switching tools).

### Critical Pitfalls

**From PITFALLS.md, the top risks with proven mitigations:**

1. **Separate Offset State Per Tool (State Sync Hell)** — Creating separate Zustand fields for warp offset (warpSrc, warpDest), spawn offset (spawnTeam, spawnVariant), and general animation offset (frameOffset) causes picker sync bugs and tool-switching data loss. **Avoid:** Single `frameOffset` field (0-127), tool-specific widgets decode on read and encode on write. Picker always updates same field regardless of tile type.

2. **Not Updating selectedTile When Offset Changes** — User changes offset in AnimationPanel, but `selectedTile` Zustand field retains old offset bits. Next placement uses stale offset value. **Avoid:** Update selectedTile whenever offset changes using `makeAnimatedTile(animId, newOffset)`. Pattern already exists in AnimationPanel.tsx line 253-256 for animation selection changes, extend to offset changes.

3. **Picker Doesn't Sync Offset to UI** — Picker captures tile with offset 30, sets `selectedTile` to encoded value, but doesn't decode and update `frameOffset` field. UI still shows offset 0, breaking inspect-adjust-replace workflow. **Avoid:** In picker handler, call `setFrameOffset(getFrameOffset(tile))` after `setSelectedTile(tile)`. TileEncoding.ts already provides getFrameOffset() utility.

4. **Warp Offset Encoding Confusion** — Mixing up warp offset formula (dest*10 + src vs src*10 + dest). Both produce valid 0-99 range but route backwards. **Avoid:** Explicit formula in code comments, unit tests for encode/decode roundtrips. Existing code uses dest*10 + src (TileEncoding.ts line 48-50).

5. **No Visual Feedback for Invalid Offset** — User types offset 200, value silently clamped to 127, no error message. User confused why offset keeps resetting. **Avoid:** Show validation error message when input is out of range (0-127 for general animations, 0-99 for warp routing). Use error text and red border on input field.

## Implications for Roadmap

Based on research, recommend **single-phase implementation** with clear execution order following dependency chain.

### Phase 1: Animation Offset Control (Complete Feature)

**Rationale:** All features are tightly coupled—picker sync requires Zustand state, contextual UI requires picker sync, status bar requires offset extraction utilities. Splitting into sub-phases adds coordination overhead without reducing risk. Implementation follows established patterns (Zustand global state, conditional UI rendering, tile encoding utilities), so complexity is low despite feature coupling.

**Delivers:**
- Zustand `frameOffset` state field (GlobalSlice)
- AnimationPanel uses Zustand offset (replaces local state)
- Picker syncs offset to UI (decode tile, update frameOffset)
- Status bar shows offset on hover (extend existing tile info)
- Warp tool contextual UI (Source/Dest dropdowns)
- Offset validation with error messages
- selectedTile updates when offset changes

**Addresses:** All table stakes features from FEATURES.md (picker captures offset, visual feedback, persistence, validation) plus key differentiator (tool-specific offset UI for warps)

**Avoids:** All critical pitfalls from PITFALLS.md via architectural decisions:
- Pitfall #1: Single frameOffset field in Zustand (no separate tool-specific fields)
- Pitfall #2: Update selectedTile in offset change handler (extend existing pattern)
- Pitfall #3: Picker handler calls setFrameOffset(getFrameOffset(tile))
- Pitfall #4: Unit tests for warp encoding (dest*10 + src), explicit comments
- Pitfall #5: Validation error messages in UI

**Uses:** Existing stack elements from STACK.md:
- Zustand global state pattern (already used for selectedTile, gameObjectToolState)
- TileEncoding.ts utilities (getFrameOffset, makeAnimatedTile)
- React conditional rendering (already used in GameObjectToolPanel for warp controls)
- Native HTML inputs (already used throughout UI)

### Implementation Order (Within Phase)

**Dependency-respecting sequence:**

1. **Zustand state foundation** — Add `frameOffset` field and `setFrameOffset` action to GlobalSlice. No UI changes yet.
2. **AnimationPanel state migration** — Replace local `frameOffset` useState with Zustand subscription. Update selectedTile when offset changes.
3. **Picker offset sync** — Extract offset from picked tile, update Zustand frameOffset. Enables inspect-adjust-replace workflow.
4. **Status bar feedback** — Show offset value on hover. Validates offset extraction before complex UI.
5. **Warp contextual UI** — Add Source/Dest dropdowns to GameObjectToolPanel. Encode/decode offset for warp routing.
6. **Validation polish** — Add error messages for invalid offsets, input field error states.

**Rationale:** Step 1 enables steps 2-3 (can't migrate AnimationPanel or sync picker without Zustand field). Step 2 enables step 3 (picker syncs to same state AnimationPanel uses). Steps 4-5 are independent (can implement in parallel). Step 6 is polish after core workflow validated.

### Research Flags

**No phases need `/gsd:research-phase`** — All features use validated patterns from existing codebase:

- **Zustand global state:** AnimationPanel already reads `selectedTile` from Zustand (line 80-90), MapCanvas already writes `selectedTile` (line 1953). Adding `frameOffset` field follows identical pattern.
- **Picker tile decoding:** TileEncoding.ts already provides `getFrameOffset()` utility (line 30-33). Picker already captures full tile value (line 1951-1956).
- **Conditional UI rendering:** GameObjectToolPanel already conditionally renders warp controls (line 56-79). Extending to other tools follows same pattern.
- **Input validation:** AnimationPanel already validates offset range (line 281-294). Adding error messages is UI polish, not novel logic.

**Implementation risks are mitigated via proven architectural patterns** (unified state, encode/decode helpers, conditional rendering), not novel technology requiring research.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | Zero new dependencies. All features use existing Zustand store, TileEncoding.ts utilities, React components, native HTML inputs. Official MDN documentation for APIs. Existing codebase demonstrates all patterns (AnimationPanel offset input, picker tile capture, warp dropdown UI). |
| Features | **MEDIUM** | Table stakes features (picker captures parameters, offset persistence, validation) verified across tile editors (Tiled custom properties, RPG Maker event parameters). Contextual UI is differentiator but pattern exists in GameObjectToolPanel warp controls. Limited SubSpace/Continuum editor documentation, but game's tile encoding is well-understood. |
| Architecture | **HIGH** | Extends existing 3-layer architecture (Zustand state, React components, core utilities) with proven patterns. Unified-state-with-contextual-UI pattern avoids state sync complexity. AnimationPanel already updates selectedTile on animation changes (line 253-256), picker already captures full tiles (line 1951-1956), GameObjectToolPanel already has tool-specific widgets (warp controls line 56-79). No new architectural concepts. |
| Pitfalls | **HIGH** | All pitfalls identified from existing codebase analysis (state sync bugs, picker sync gaps, validation UX). Official React and Zustand documentation for state management patterns. Warp encoding formula verified in TileEncoding.ts (line 48-50). All pitfalls have documented solutions with implementation examples. |

**Overall confidence:** **HIGH**

Research is comprehensive with direct codebase inspection as primary source. All patterns already exist in production code (AnimationPanel offset input, picker tile capture, GameObjectToolPanel warp controls, StatusBar tile info). Feature expectations validated across tile editor domain (Tiled, RPG Maker). Pitfalls identified from code analysis with proven mitigations from React/Zustand official docs.

### Gaps to Address

**No significant gaps.** Minor validations needed during implementation:

- **Warp encoding formula verification:** Code analysis shows `dest * 10 + src` (TileEncoding.ts line 48-50), but should verify via in-game testing that warp routing works as expected. **Resolution:** Add unit tests for encode/decode roundtrip, test in game client.

- **Offset range per tool:** General animations support 0-127 (7 bits), but warp routing only needs 0-99 (0-9 src, 0-9 dest). Should warp UI enforce stricter range? **Resolution:** Warp dropdowns naturally enforce 0-9 range (can't select invalid values). General offset input validates 0-127. Tool-specific validation emerges from UI design.

- **AnimationPanel selectedAnimId state:** Currently local React state (line 28). Picker may need to update both `frameOffset` and `selectedAnimId` when capturing animated tile. Should `selectedAnimId` also lift to Zustand? **Resolution:** Evaluate during picker implementation. If picker only updates selectedTile (full encoded value), AnimationPanel can derive animId from selectedTile. If picker needs to sync UI selection, lift to Zustand.

- **Status bar offset format:** Show raw offset value ("Offset: 30") or tool-specific interpretation ("Warp: 0→3")? **Resolution:** Start with raw offset (simpler, tool-agnostic). Can add tool-specific format in future if user feedback requests it.

None of these gaps block implementation. All have reasonable defaults with easy adjustment paths based on testing and user feedback.

## Sources

### Primary (HIGH confidence)
- **Existing codebase** — Direct file inspection:
  - `E:\NewMapEditor\src\components\AnimationPanel\AnimationPanel.tsx` — Offset input field (line 365-374), frameOffset state (line 26), selectedTile update pattern (line 253-256)
  - `E:\NewMapEditor\src\components\MapCanvas\MapCanvas.tsx` — Picker handler (line 1951-1956), hover event handling
  - `E:\NewMapEditor\src\core\map\TileEncoding.ts` — Offset encoding/decoding utilities (getFrameOffset line 30-33, makeAnimatedTile line 42-45), warp encoding formula (line 48-50)
  - `E:\NewMapEditor\src\components\GameObjectToolPanel\GameObjectToolPanel.tsx` — Warp Source/Dest dropdowns (line 56-79), tool-specific state management (line 36)
  - `E:\NewMapEditor\src\components\StatusBar\StatusBar.tsx` — Tile info display pattern (line 46-52)
  - `E:\NewMapEditor\src\core\editor\slices\globalSlice.ts` — Zustand state structure, existing patterns (selectedTile, gameObjectToolState)
- **Zustand Documentation** — [Official Zustand patterns](https://docs.pmnd.rs/zustand/getting-started/introduction) — State management best practices
- **React Documentation** — [Managing State](https://react.dev/learn/managing-state), [Conditional Rendering](https://react.dev/learn/conditional-rendering) — Component patterns

### Secondary (MEDIUM confidence)
- **Tiled Documentation** — [Custom Properties](https://doc.mapeditor.org/en/stable/manual/custom-properties/), [Working with Objects](https://doc.mapeditor.org/en/stable/manual/objects/) — How tile editors handle parameterized placement
- **Tiled Forum** — [Eyedropper Tool](https://discourse.mapeditor.org/t/eyedropper-tool/755), [Custom Properties on Tiles](https://discourse.mapeditor.org/t/custom-properties-to-tiles-on-tile-layer/3069) — User expectations for picker behavior and tile parameters
- **React Patterns** — [useState Pitfalls](https://react.dev/learn/state-a-components-memory#troubleshooting), [useEffect Dependencies](https://react.dev/reference/react/useEffect#specifying-reactive-dependencies) — Common state sync issues

### Tertiary (LOW confidence)
- **Continuum Level Editor** — [Manual](https://continuumlt.sourceforge.net/manual/) — Sparse documentation, no offset control features found (absence of feature confirms our approach is differentiator)

---
*Research completed: 2026-02-15*
*Ready for roadmap: yes*
