# Phase 96: Icon Animation - Research

**Researched:** 2026-02-20
**Domain:** React toolbar icon animation using existing Zustand animation timer
**Confidence:** HIGH

## Summary

Phase 96 adds looping animation to game object tool icons in the toolbar when hovered or active. The infrastructure is already fully in place: a global `animationFrame` counter in Zustand drives all animation in the app (map canvas tiles, AnimationPanel previews, AnimationPreview component). The pattern for consuming this counter is well-established and needs only to be applied to the toolbar's tileset-rendered icons.

The primary challenge is that the current `tilesetToolIcons` is a static `useMemo` that pre-renders single data URLs per icon. For animation, icons need to be redrawn each frame from the tileset using the `animationFrame` counter. This means switching from pre-computed static data URLs to per-frame canvas drawing, which will be triggered by subscribing to `animationFrame` in the ToolBar component.

A secondary challenge is that `useAnimationTimer` currently pauses when no animated tiles are visible on the map canvas. If toolbar icon animation should always run when hovering/active regardless of map contents, the smart-pause logic must be extended to also keep the timer alive when a game object tool is active or hovered. This is the most architecturally interesting decision point.

**Primary recommendation:** Subscribe to `animationFrame` in ToolBar and redraw animated icons to an offscreen canvas each frame, using a `useRef<HTMLCanvasElement>` per animated icon. The smart-pause in `useAnimationTimer` should be extended to also stay alive when any game-object tool is active.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 18 | 18.x | Component re-renders triggered by Zustand state | Already in use |
| Zustand | 4.x | `animationFrame` counter, `currentTool` | Already in use; the established state layer |
| Canvas API | native | Per-frame tileset tile blitting into icon | Already used for map rendering and AnimationPanel |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `useShallow` (zustand/react) | same | Efficient multi-key Zustand subscription | Already used in ToolBar |
| React `useRef` | 18.x | Stable canvas refs for offscreen drawing | Per-icon animated canvas |
| React `useEffect` | 18.x | Trigger redraw on `animationFrame` change | Already pattern in AnimationPreview |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Canvas-per-icon refs | CSS animation/GIF | CSS/GIFs can't pull from tileset; canvas gives pixel-exact control |
| Canvas-per-icon refs | Single shared canvas + `toDataURL` each frame | toDataURL is expensive (~1ms) per call; direct img src update OK but less clean |
| Extend smart-pause | Separate local timer per icon | Separate timers would drift from global counter; sync with map canvas is the requirement (ICON-08) |

**Installation:** No new packages. All needed libraries already in use.

## Architecture Patterns

### Recommended Project Structure

No new files needed. Changes are confined to:
```
src/
├── components/ToolBar/ToolBar.tsx   # Main change: animated icon rendering
├── components/ToolBar/ToolBar.css   # Minor: any canvas-based icon sizing tweaks
└── hooks/useAnimationTimer.ts       # Extend smart-pause to cover tool-active state
```

### Pattern 1: Zustand animationFrame Subscription in Component

**What:** Subscribe to `animationFrame` and redraw canvas on each change.
**When to use:** Any component that needs to show animated tileset tiles.
**Established in codebase:** `AnimationPreview.tsx` and `AnimationPanel.tsx` both use this exact pattern.

```typescript
// From AnimationPreview.tsx (verified from codebase)
const animationFrame = useEditorStore((state) => state.animationFrame);

const draw = useCallback(() => {
  const ctx = canvasRef.current?.getContext('2d');
  if (!ctx || !tilesetImage || !anim) return;
  const frameIdx = animationFrame % anim.frameCount;
  const tileId = anim.frames[frameIdx];
  const srcX = (tileId % TILES_PER_ROW) * TILE_SIZE;
  const srcY = Math.floor(tileId / TILES_PER_ROW) * TILE_SIZE;
  ctx.drawImage(tilesetImage, srcX, srcY, TILE_SIZE, TILE_SIZE, 0, 0, displayW, displayH);
}, [tilesetImage, animationFrame, anim]);

useEffect(() => { draw(); }, [draw]);
```

### Pattern 2: Hover State via React onMouseEnter/onMouseLeave

**What:** Track which tool button is hovered using React local state.
**When to use:** Controlling per-button animation on hover (ICON-07).

```typescript
// In ToolBar component
const [hoveredTool, setHoveredTool] = useState<string | null>(null);

// On the button element:
onMouseEnter={() => setHoveredTool(tool.icon)}
onMouseLeave={() => setHoveredTool(null)}
```

**Note:** `hoveredTool` only needs to be local component state, not Zustand. No cross-component sharing of hover is needed for this phase.

### Pattern 3: Animated Icon Canvas Element

**What:** Replace `<img src={dataUrl}>` with `<canvas ref={...}>` for animated icons, or keep `<img>` and update src via ref on each frame.
**When to use:** For the specific icons that have multi-frame animations.

Two sub-approaches exist:

**Option A: `<canvas>` element directly in JSX**
- Cleaner: no data URL serialization
- The canvas element IS the rendered output
- Works: canvas elements can be styled with `width`/`height` CSS

```typescript
// Animated icon rendered as canvas
const canvasRef = useRef<HTMLCanvasElement>(null);
// In button JSX:
<canvas ref={canvasRef} width={16} height={16} className="tileset-tool-icon" />
// In useEffect on animationFrame change, draw to canvasRef.current
```

**Option B: Offscreen canvas → `toDataURL` → `<img src>`**
- Currently used approach for static icons (tilesetToolIcons useMemo)
- Problematic for animation: `toDataURL()` is a blocking operation, adds latency per frame
- Should be avoided for frequent animation

**Recommendation: Option A** — use `<canvas>` elements directly for animated icons, keeping static icons as `<img>` with data URL (no change to existing static rendering path).

### Pattern 4: Separating Animated vs Static Icons

**What:** Only the icons that actually have multi-frame animations need canvas elements.
**Key discovery from codebase analysis:**

| Icon | Tile ID | Animation ID | Frame Count | Needs Animation? |
|------|---------|-------------|-------------|-----------------|
| `spawn` | 1223 | 0xA6 (Yellow OnMapSpawn) | 10 | YES |
| `flag` | 905 | 0x1C (Green Pad GreenFlag Sec) | 4 | YES |
| `conveyor` | 1717 | 0xB7 (Conveyor right TL) | 8 | YES |
| `turret` | 2728 | 0xBD (Turret) | 4 | YES |
| `warp` | 3x3 composite (0x9A-0xA2 center) | 0x9E (BigWarp MM) | 4 | YES (3x3 canvas) |
| `pole` | 1361 | 0x6A (Neutral Cap Pad MM) | 1 | NO — static |
| `switch` | 743 (center) | 0x7B (Switch Unflipped) | 1 | NO — but flipped states have 7 frames; toolbar shows unflipped so stays static |
| `bunker` | bunkericon.png | N/A | N/A | NO — PNG asset |

For pole and switch: they use single-frame animations, so their toolbar icon is already showing the correct "first frame" permanently. No animation needed.

For warp: the 3x3 composite icon uses tiles from BigWarp animation (0x9A frame 0 = tile 1347, etc). Each of the 9 tiles is a separate animation. The center tile (0x9E) has 4 frames. All 9 tiles cycle together. To animate the warp icon, all 9 tiles need to be updated each frame using their respective animation IDs.

### Pattern 5: Animation Timer Keepalive for Toolbar

**What:** The `useAnimationTimer` hook currently pauses when no animated tiles are visible on the map canvas. Toolbar icons need the timer to run even when:
- A game object tool is hovered (ICON-07)
- A game object tool is active (ICON-08)

**Current smart-pause logic (from codebase):**
```typescript
// useAnimationTimer.ts — only advances frame if hasVisibleAnimated
if (!isPausedRef.current && hasVisibleAnimatedRef.current) {
  if (timestamp - lastFrameTimeRef.current >= FRAME_DURATION) {
    advanceAnimationFrame();
  }
}
```

**Two options for extending:**

**Option A: Extend useAnimationTimer with a `forceActive` signal**
- Add a Zustand boolean `animationTimerForced: boolean`
- ToolBar sets it to true on hover of animated tools or when active tool is animated
- `useAnimationTimer` reads it via ref: `if (!isPausedRef.current && (hasVisibleAnimatedRef.current || forcedRef.current))`
- Clean separation; timer hook doesn't need to know about tools

**Option B: Extend hasVisibleAnimated logic inside useAnimationTimer**
- Check `currentTool` from Zustand; if it's an animated game object tool, return true
- Less separation of concerns but simpler, fewer moving parts

**Option C: ToolBar manages its own local animation state**
- When hovering/active, ToolBar runs its own `setInterval` or `requestAnimationFrame`
- Uses a local `localFrame` counter separate from global `animationFrame`
- Disadvantage: frames would drift from the map canvas animation, violating ICON-08's requirement that "The animation frame rate matches the global animation timer"

**Recommendation: Option A** — add a `toolbarAnimationActive: boolean` flag to Zustand GlobalSlice that ToolBar sets when any animated game-object tool is hovered or active. `useAnimationTimer` reads this flag and keeps advancing when true. This is the minimal change that preserves sync with the global timer.

### Anti-Patterns to Avoid

- **Converting canvas to data URL per frame:** `toDataURL()` blocks the main thread and is expensive. Do not update `<img src>` with fresh data URLs on every frame.
- **Separate animation timers per button:** Would drift from `animationFrame` counter and violate the requirement that toolbar animation matches the global timer speed.
- **Re-running `tilesetToolIcons` useMemo on each frame:** The useMemo should remain for static icons only. Animated icons bypass it entirely and draw directly to canvas refs.
- **Animating pole and switch icons:** They have 1-frame animations — no animation behavior needed or possible. Keep them as static images.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Frame rate | Custom timer | Existing `animationFrame` Zustand counter | Already synced, already throttled to 150ms |
| Tileset tile drawing | Custom image cropping | Existing `ctx.drawImage(tileset, srcX, srcY, 16, 16, ...)` pattern | Established pattern in CanvasEngine and AnimationPanel |
| Animation lookup | Custom frame logic | `ANIMATION_DEFINITIONS[animId].frames[frameIdx % frameCount]` | Already used everywhere |

**Key insight:** This phase is mostly wiring existing infrastructure together, not building new systems.

## Common Pitfalls

### Pitfall 1: Animation Timer Paused When Map Has No Animated Tiles
**What goes wrong:** User opens a map with no animated tiles (or no map open). Smart pause stops the timer. Hovering a spawn/warp button shows no animation.
**Why it happens:** `useAnimationTimer` has a smart-pause optimization specifically for performance.
**How to avoid:** Extend smart-pause to check toolbar animation state (see Pattern 5, Option A).
**Warning signs:** If testing with a blank map and hover shows no animation cycle.

### Pitfall 2: Re-render Storm on animationFrame Changes
**What goes wrong:** Every toolbar button re-renders every 150ms because `animationFrame` is subscribed globally.
**Why it happens:** If `animationFrame` is in the ToolBar's `useShallow` selector, every frame tick re-renders the entire toolbar.
**How to avoid:** Only subscribe `animationFrame` when at least one animated icon needs it (i.e., when hoveredTool is an animated tool, or currentTool is an animated game-object tool). Or, if subscribed always, ensure React.memo or minimal re-renders for button elements.
**Warning signs:** Performance degradation, 150ms flicker of non-animated buttons.
**Better approach:** Subscribe `animationFrame` unconditionally but only use it in draw callbacks; React reconciliation is efficient for canvas operations with no DOM changes.

### Pitfall 3: Canvas Width/Height vs CSS Width/Height
**What goes wrong:** Canvas appears blurry at small sizes (16x16 display but wrong buffer size).
**Why it happens:** HTML canvas has two sizes: the buffer (width/height attributes) and the display (CSS). For pixel-art tile rendering, the buffer must exactly match source tile size (16x16) and CSS scales it up.
**How to avoid:** Set `canvas.width = 16; canvas.height = 16;` as attributes and use CSS to display at 16x16 (or 48x48 for composite icons). Add `image-rendering: pixelated` CSS (already on `.tileset-tool-icon`).

### Pitfall 4: Composite Icon Animation (Warp 3x3)
**What goes wrong:** Warp uses a 3x3 canvas composite. Each of the 9 tiles has its own animation ID. Naively only updating the center frame produces incorrect partial animation.
**Why it happens:** Each tile in the BigWarp 3x3 is a separate animation sequence (0x9A-0xA2), cycling together.
**How to avoid:** On each frame, loop over all 9 tiles, look up each animation's current frame, and redraw the full 3x3 canvas.

### Pitfall 5: `imageSmoothingEnabled` Not Set
**What goes wrong:** Tile icons appear blurry due to browser interpolation.
**Why it happens:** Default canvas rendering interpolates when `drawImage` scales.
**How to avoid:** Always set `ctx.imageSmoothingEnabled = false` before drawing tileset tiles. (Already done in existing code.)

## Code Examples

Verified patterns from existing codebase:

### Animated Frame Index Calculation
```typescript
// From AnimationPreview.tsx and AnimationPanel.tsx — verified
const frameIdx = animationFrame % anim.frameCount;
const tileId = anim.frames[frameIdx] || 0;
const srcX = (tileId % TILES_PER_ROW) * TILE_SIZE;
const srcY = Math.floor(tileId / TILES_PER_ROW) * TILE_SIZE;
ctx.drawImage(tilesetImage, srcX, srcY, TILE_SIZE, TILE_SIZE, 0, 0, dstW, dstH);
```

### Zustand Subscription in ToolBar (existing pattern)
```typescript
// From ToolBar.tsx — verified
const { currentTool, showGrid, map, gameObjectToolState } = useEditorStore(
  useShallow((state) => ({
    currentTool: state.currentTool,
    // ...
  }))
);
```

### Animated Icon Canvas Setup
```typescript
// New pattern for Phase 96 — based on AnimationPreview canvas pattern
const iconCanvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});
// In JSX for animated icons:
<canvas
  ref={(el) => { iconCanvasRefs.current[tool.icon] = el; }}
  width={16} height={16}
  className="tileset-tool-icon"
  style={{ display: 'block' }}
/>
// In useEffect, redraw when animationFrame changes:
useEffect(() => {
  for (const [iconName, canvas] of Object.entries(iconCanvasRefs.current)) {
    if (!canvas || !tilesetImage) continue;
    const animDef = ANIMATED_ICON_DEFS[iconName];
    if (!animDef) continue;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 16, 16);
    const frameIdx = animationFrame % animDef.frameCount;
    const tileId = animDef.frames[frameIdx];
    const srcX = (tileId % TILES_PER_ROW) * TILE_SIZE;
    const srcY = Math.floor(tileId / TILES_PER_ROW) * TILE_SIZE;
    ctx.drawImage(tilesetImage, srcX, srcY, 16, 16, 0, 0, 16, 16);
  }
}, [animationFrame, tilesetImage, hoveredTool, currentTool]);
```

### Animation Timer Keepalive Extension
```typescript
// Proposed change to useAnimationTimer.ts
const toolbarAnimationActive = useEditorStore((state) => state.toolbarAnimationActive);
const toolbarAnimRef = useRef(toolbarAnimationActive);
toolbarAnimRef.current = toolbarAnimationActive;

// In RAF callback:
if (!isPausedRef.current && (hasVisibleAnimatedRef.current || toolbarAnimRef.current)) {
  if (timestamp - lastFrameTimeRef.current >= FRAME_DURATION) {
    advanceAnimationFrame();
    lastFrameTimeRef.current = timestamp;
  }
}
```

### ToolBar Keepalive Trigger
```typescript
// In ToolBar.tsx — set toolbarAnimationActive when needed
const setToolbarAnimationActive = useEditorStore((state) => state.setToolbarAnimationActive);

// When hoveredTool changes or currentTool changes:
useEffect(() => {
  const isHoverAnimated = hoveredTool !== null && ANIMATED_GAME_OBJECT_ICONS.has(hoveredTool);
  const isActiveAnimated = ANIMATED_GAME_OBJECT_TOOLS.has(currentTool);
  setToolbarAnimationActive(isHoverAnimated || isActiveAnimated);
}, [hoveredTool, currentTool, setToolbarAnimationActive]);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Static data URL icons | Static data URL icons (Phase 95) | Phase 95 | Phase 96 changes animated icons to canvas-rendered |
| No icon animation | Hover + active animation (Phase 96) | This phase | Small UX polish for game object tools |

**Deprecated/outdated:**
- Nothing in the stack is deprecated. All patterns are current React 18 + Zustand idioms.

## Open Questions

1. **Should the animation timer keepalive use Zustand or a simpler signal?**
   - What we know: `useAnimationTimer` pauses when no animated tiles visible; this breaks hover animation with empty maps.
   - What's unclear: Is there a cleaner way to signal "toolbar needs animation" without adding Zustand state?
   - Recommendation: Add `toolbarAnimationActive: boolean` to GlobalSlice. Simple, consistent with existing patterns. Alternatively, pass a callback from useAnimationTimer — but that's more complex.

2. **Which specific tools should animate on hover vs active?**
   - What we know from requirements: all game object tools animate on hover (ICON-07) and when active (ICON-08).
   - Clarification needed: bunker uses a PNG, not tileset. Can bunker animate? The source PNG (bunkericon.png) is a static image with no frames. Answer: NO — bunker does not animate. Only tileset-rendered icons with multi-frame animations animate.
   - Based on analysis: spawn (10f), flag (4f), conveyor (8f), turret (4f), warp (4f per tile in 3x3) animate. Pole (1f), switch (1f), bunker (PNG) do not.

3. **Should "active tool" animation run always or only when tilesetImage is loaded?**
   - What we know: tilesetImage may be null before tileset loads.
   - Recommendation: Guard all canvas draws with `if (!tilesetImage) return;` — same as existing patterns.

4. **Frame sync: should icon animation always match global animationFrame exactly?**
   - Requirements say "frame rate matches the global animation timer." This means the same counter, not an independent rate match.
   - This is already answered by the recommendation to subscribe to `animationFrame` directly.

## Sources

### Primary (HIGH confidence)
- Codebase: `E:/NewMapEditor/src/hooks/useAnimationTimer.ts` — animation timer implementation, smart-pause logic
- Codebase: `E:/NewMapEditor/src/core/editor/slices/globalSlice.ts` — `animationFrame`, `advanceAnimationFrame`
- Codebase: `E:/NewMapEditor/src/components/AnimationPreview/AnimationPreview.tsx` — reference pattern for canvas animation driven by `animationFrame`
- Codebase: `E:/NewMapEditor/src/components/AnimationPanel/AnimationPanel.tsx` — same pattern at larger scale
- Codebase: `E:/NewMapEditor/src/components/ToolBar/ToolBar.tsx` — current static icon implementation (tilesetToolIcons useMemo)
- Codebase: `E:/NewMapEditor/src/core/map/AnimationDefinitions.ts` — frame data for each animation ID
- Codebase: `E:/NewMapEditor/src/core/map/GameObjectData.ts` — WARP_STYLES, tile IDs for each game object

### Secondary (MEDIUM confidence)
- No external sources consulted; all findings directly verified from codebase.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries and versions confirmed from package.json and existing imports
- Architecture: HIGH — patterns directly verified from working code in AnimationPreview, AnimationPanel, and CanvasEngine
- Pitfalls: HIGH — all pitfalls identified from existing code behavior and established patterns
- Animation ID data: HIGH — cross-referenced AnimationDefinitions.ts with tile IDs used in tilesetToolIcons useMemo

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (stable codebase; patterns won't change)

## Appendix: Animated Icon Data Map

Quick reference for planner — which icons animate and what animation they use:

```typescript
// Icons that NEED animation (canvas-rendered, multi-frame)
const ANIMATED_ICON_DEFS = {
  spawn:    ANIMATION_DEFINITIONS[0xA6], // Yellow OnMapSpawn, 10 frames, tile 1223 = frame[1]
  flag:     ANIMATION_DEFINITIONS[0x1C], // Green Pad GreenFlag Sec, 4 frames, starts tile 905
  conveyor: ANIMATION_DEFINITIONS[0xB7], // Conveyor right TL, 8 frames, starts tile 1717
  turret:   ANIMATION_DEFINITIONS[0xBD], // Turret, 4 frames, starts tile 2728
  // warp: composite — 9 separate animation IDs (0x9A-0xA2), 3x3 canvas, 4 frames each
};

// Icons that stay STATIC (no animation needed):
// pole: anim 0x6A = 1 frame (tile 1361)
// switch: anim 0x7B = 1 frame (tile 743) — only "unflipped" state shown
// bunker: PNG asset, no tileset animation
```
