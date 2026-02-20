---
phase: 91-overlay-z-order-minimap-size
verified: 2026-02-20T07:20:00Z
status: human_needed
score: 3/4 must-haves verified
human_verification:
  - test: Resize the canvas/tileset split panel to its minimum (40% canvas) at the default 1024x768 window size, then activate the Turret tool. Observe whether the minimap (top-right, 160px tall) and game object tool panel (bottom-right) overlap.
    expected: The two panels do not overlap -- they remain visually separated at extreme panel resize
    why_human: Panel height is determined at runtime by the resizable split. Calculated worst case leaves marginal space. Cannot confirm without running the app.
---

# Phase 91: Overlay Z-Order and Minimap Size Verification Report

**Phase Goal:** Minimap and game object tool panel are always visible above maximized MDI windows, and the minimap is 160x160 pixels
**Verified:** 2026-02-20T07:20:00Z
**Status:** human_needed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Maximizing any MDI child window no longer covers the minimap or game object tool panel | VERIFIED | Both panels have z-index: 200000 in CSS. MDI windows max out at 99999 before normalization (Z_INDEX_NORMALIZE_THRESHOLD = 100000 in windowSlice.ts line 15). Both panels are position: absolute siblings of .workspace inside .main-area (position: relative), the stacking context root. .workspace has no z-index so MDI windows participate in .main-area context and are beaten by 200000. |
| 2 | The minimap renders at 160x160 pixels across all three themes (Light, Dark, Terminal) | VERIFIED | MINIMAP_SIZE = 160 at Minimap.tsx line 29. Canvas element uses width={MINIMAP_SIZE} and height={MINIMAP_SIZE} (lines 478-479). All 25,600 pixels filled by pixel-first rendering loop (lines 317-374). No old x%2/y%2 subsampling guards remain. All three themes define --surface and --border-default variables used by Minimap.css. |
| 3 | At minimum window size (800x600), the minimap and tool panel do not overlap each other | UNCERTAIN | Electron enforces minWidth: 1024, minHeight: 768 (electron/main.ts lines 269-270), so 800x600 is not reachable. At 1024x768 with default 75% canvas panel split, main-area height is ~527px -- ample space. However, if user drags tileset panel to minimum (40% canvas), main-area shrinks to ~281px. Minimap requires 168px from top, worst-case GameObjectToolPanel ~120px from bottom = ~288px combined vs ~281px. Cannot confirm without running the app. |
| 4 | The z-index budget is documented in a CSS comment so future developers understand the stacking context boundaries | VERIFIED | App.css lines 10-22 contain the Z-INDEX BUDGET comment block with all layers (1-2, 500, 1000-99999, 5000-99999, 200000). Positioned between @import (line 8) and base styles comment (line 24) exactly as specified. |

**Score:** 3/4 truths verified (1 requires human confirmation)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| src/components/Minimap/Minimap.css | .minimap z-index: 200000 | VERIFIED | Line 5: z-index: 200000. Has position: absolute; top: 8px; right: 8px. |
| src/components/GameObjectToolPanel/GameObjectToolPanel.css | .game-object-tool-panel z-index: 200000 | VERIFIED | Line 5: z-index: 200000. Has position: absolute; bottom: 8px; right: 8px. |
| src/App.css | Z-INDEX BUDGET comment between @import and Base Styles | VERIFIED | Lines 10-22 contain the complete budget comment block. |
| src/components/Minimap/Minimap.tsx | MINIMAP_SIZE = 160, pixel-first rendering loop | VERIFIED | Line 29: const MINIMAP_SIZE = 160. Lines 317-374: pixel-first loop. No subsampling guards. Canvas uses MINIMAP_SIZE for both dimensions. Farplane cache scales to MINIMAP_SIZE x MINIMAP_SIZE. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| Minimap.css z-index: 200000 | MDI window ceiling | 200000 > Z_INDEX_NORMALIZE_THRESHOLD (100000) | WIRED | windowSlice.ts line 15 sets ceiling at 100000. MDI windows normalize back to BASE_Z_INDEX=1000 when exceeded, never reaching 200000. |
| GameObjectToolPanel.css z-index: 200000 | MDI window ceiling | Same normalization | WIRED | All MDI windows share the same normalization logic in windowSlice.ts. |
| Minimap.tsx MINIMAP_SIZE | Canvas element | width={MINIMAP_SIZE} height={MINIMAP_SIZE} | WIRED | App.tsx line 489 renders Minimap inside .main-area. Canvas props at lines 478-479 use the constant directly. |
| Pixel-first rendering loop | createImageData buffer | Loop bounds match image buffer dimensions | WIRED | Line 314: createImageData(MINIMAP_SIZE, MINIMAP_SIZE). Loop iterates exactly those bounds. Index formula (py * MINIMAP_SIZE + px) * 4 addresses all pixels. |
| Farplane useEffect | Farplane cache rebuild | [farplaneImage] dependency, no stale guard | WIRED | useEffect (lines 222-237) depends on [farplaneImage] only. Stale lastFarplaneRef guard removed in deviation fix (commit d3b5e39). |
| .main-area stacking context | Overlay panels above MDI | .workspace has position: relative but no z-index | WIRED | Workspace.css confirms no z-index on .workspace. MDI windows participate in .main-area stacking context. Overlays at 200000 beat them. |

### Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| OVRL-01: Overlays always visible above maximized MDI windows | SATISFIED | Both panels at z-index 200000, MDI ceiling at 100000, stacking context chain verified |
| OVRL-02: Minimap 160x160 pixels | SATISFIED | MINIMAP_SIZE=160, pixel-first loop fills all 25,600 pixels, canvas dimensions use constant |

### Anti-Patterns Found

None found. No TODO/FIXME/placeholder comments, no empty returns, no stub patterns in any of the four modified files. TypeScript compiles clean with zero errors.

### Human Verification Required

#### 1. No overlap at extreme panel resize

**Test:** Open the app. Activate the Turret tool so the GameObjectToolPanel shows its maximum content (title + Weapon + Team + Fire Rate fields). Drag the tileset/canvas split handle toward its minimum to reduce canvas panel height. Confirm the minimap (top-right, 160px tall, 8px from top and right) and game object tool panel (bottom-right, 8px from bottom and right) remain visually separated with no overlap.

**Expected:** The two panels remain distinct with visible space between them. No pixel overlap between minimap bottom edge and game object panel top edge.

**Why human:** The available main-area height is determined at runtime by the resizable PanelGroup. At Electron minimum (1024x768) with canvas panel at 40% minimum (minSize={40}), calculated main-area height is approximately 281px. Minimap requires 168px from top (8 margin + 160 canvas), GameObjectToolPanel in Turret mode approximately 120px from bottom (title ~28px + 3 fields ~28px each + 8px margin). Combined need ~288px vs ~281px gives a potential ~7px deficit. Cannot confirm without running the app.

**Mitigating context:** At the default panel split (75% canvas at 1024x768), main-area is ~527px and there is no overlap risk. The problematic scenario requires deliberate extreme panel resize while using a game object tool. The stated success criterion referenced 800x600 but Electron enforces 1024x768 as its minimum window size.

### Gaps Summary

No gaps found. All four artifacts exist, are substantive, and are correctly wired. OVRL-01 and OVRL-02 are both satisfied. The single human_needed item is a precautionary edge case (extreme panel resize at Electron minimum window) that does not block the stated phase goal.

---

_Verified: 2026-02-20T07:20:00Z_
_Verifier: Claude (gsd-verifier)_
