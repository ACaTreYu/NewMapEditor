# Phase 22: Canvas Rendering Optimization - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Reduce MapCanvas draw calls via layered rendering, batched grid, and debounced resize. Split the single monolithic canvas render into separate layers (static tiles, animated tiles, overlays) to eliminate redundant redraws. Fix existing visual bugs (phantom grid lines). Improve scroll/pan smoothness which is currently extremely choppy.

</domain>

<decisions>
## Implementation Decisions

### Layer Separation Strategy
- Claude's discretion on architecture approach (stacked canvases vs off-screen compositing)
- Claude's discretion on overlay layer grouping (separate vs combined)
- Claude's discretion on scroll redraw strategy (full redraw vs pixel shift + edge fill)
- Claude's discretion on paint latency (immediate vs batched to next frame)
- **Priority: Maximum optimization** — choose the approach that yields the best performance

### Phantom Grid Bug (MUST FIX)
- Faint lines appear between tiles at ALL zoom levels, even when grid is toggled OFF
- This is a visible bug that must be fixed as an explicit goal of this phase
- Likely caused by sub-pixel rendering gaps between tile drawImage calls

### Animation Rendering
- Animations must render exactly as they would in-game (preserve tick rate, don't reduce)
- Global animation sync — all instances of the same animation show the same frame simultaneously
- Off-screen animations always advance their frame counter (global clock, not visibility-based)
- Animated tiles inside selections continue playing (marching ants overlay on top)
- Floating paste preview (Phase 18) shows animated tiles as static (frame 0 only)
- Claude's discretion on animation layer redraw scope (full layer vs only animated cells)
- Claude's discretion on whether static layer draws frame 0 of animated tiles

### Grid Rendering
- Grid should default to OFF (currently defaults to on — change this)
- Grid always visible at all zoom levels when toggled on (no auto-hide at small zoom)
- Claude's discretion on rendering method (batched paths vs pre-rendered canvas)
- Claude's discretion on grid appearance tweaks

### Scroll/Pan Smoothness
- Current scrolling and panning is extremely choppy — improving this is a priority outcome
- Approach should be smooth AND highly optimized (not one or the other)
- Scrollbar controls should feel identical to right-click panning in smoothness
- Always maintain crisp pixel rendering (imageSmoothingEnabled=false) — no blur during resize

### Claude's Discretion
- Layer architecture approach (stacked canvases vs off-screen + composite)
- Overlay grouping strategy
- Scroll optimization technique
- Paint latency tradeoff
- Animation layer redraw scope
- Grid rendering method
- Grid appearance (keep or minor tweaks)

</decisions>

<specifics>
## Specific Ideas

- "Focus on max optimization" — user wants aggressive optimization, not conservative
- Current panning is "extremely choppy" — this phase should make a tangible difference users feel
- Phantom grid bug is the most important visual fix — faint lines between every tile at every zoom level
- Animation behavior must match in-game rendering exactly (tick rate, global sync, frame accuracy)
- Pixel-crisp rendering at all times — never blur tiles, not even momentarily during resize

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 22-canvas-rendering-optimization*
*Context gathered: 2026-02-05*
