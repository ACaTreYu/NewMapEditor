# Phase 5: Classic Scrollbars - Research

**Researched:** 2026-02-02
**Domain:** Custom scrollbar UI components with classic Windows interaction patterns
**Confidence:** MEDIUM

## Summary

Classic Windows-style scrollbars require custom implementation in web applications, as native browser scrollbars don't support arrow buttons or customizable track click behavior. The research reveals this is a well-understood domain with established patterns for:

1. **Custom scrollbar implementation** without external dependencies using React + TypeScript
2. **Arrow button interactions** using mousedown/mouseup events with setTimeout/setInterval for continuous scrolling
3. **Track click behavior** with two standard approaches: page jump (traditional) vs jump-to-position (modern)
4. **Visual styling** using CSS with SVG data URIs for arrow glyphs, integrated with the existing CSS variable theme system

The codebase already has scrollbar infrastructure (track, thumb, drag handlers) in MapCanvas.tsx. This phase extends it with arrow buttons and track click handlers.

**Primary recommendation:** Build custom arrow buttons and track click handlers directly in MapCanvas.tsx using React hooks (useRef, useCallback) with proper cleanup patterns. Avoid external scrollbar libraries as they're unnecessary for this focused enhancement.

## Standard Stack

The established approach for custom scrollbar controls in React applications:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 18 | 18.x | Component framework | Already in use, built-in synthetic events |
| TypeScript | 5.x | Type safety | Already in use, prevents event handler bugs |
| CSS Variables | N/A | Theme integration | Already established in Phase 4 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None required | - | Vanilla implementation | This use case doesn't need dependencies |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom implementation | react-scrollbars-custom | Adds 50KB+ dependency for features we don't need |
| Custom implementation | OverlayScrollbars | TypeScript support but overlay style doesn't match requirements |
| Custom implementation | SimpleBar | 6KB but hides native scroll, doesn't support arrow buttons |

**Installation:**
```bash
# No new dependencies required
# Existing dependencies sufficient:
# - React 18 (already installed)
# - TypeScript (already installed)
```

**Source confidence:** HIGH - Based on existing codebase analysis and library documentation from [npm](https://www.npmjs.com/) and GitHub repositories.

## Architecture Patterns

### Recommended Component Structure
```
src/components/MapCanvas/
├── MapCanvas.tsx           # Main component with scrollbar logic
├── MapCanvas.css           # Scrollbar styling with CSS variables
└── (no new files needed)
```

### Pattern 1: Custom Scrollbar with Arrow Buttons
**What:** Extend existing custom scrollbar with clickable arrow buttons at track ends
**When to use:** When native scrollbars lack required functionality (arrow buttons, custom track behavior)

**Current state (already implemented):**
- Horizontal/vertical scroll tracks (`.scroll-track-h`, `.scroll-track-v`)
- Draggable thumbs (`.scroll-thumb-h`, `.scroll-thumb-v`)
- Thumb drag handlers (`handleScrollMouseDown`, `handleScrollMouseMove`)

**What to add:**
- Arrow button elements at track ends (4 buttons total: up/down/left/right)
- Single-click handlers (scroll 1 tile = 16px)
- Continuous scroll on hold (initial delay → repeat)
- Track click handlers (page jump or position jump)

**Example structure:**
```typescript
// Arrow button placement (CSS)
.scroll-arrow-up {
  position: absolute;
  top: 0;
  right: 0;
  width: 14px;
  height: 14px;
  // SVG triangle as background-image
}

// Event handler pattern (React)
const handleArrowMouseDown = (direction: 'up' | 'down' | 'left' | 'right') => {
  // Immediate scroll (1 tile)
  scrollByAmount(direction, TILE_SIZE);

  // Delay before continuous scroll
  const initialTimeout = setTimeout(() => {
    // Start continuous scroll
    const interval = setInterval(() => {
      scrollByAmount(direction, TILE_SIZE);
    }, repeatDelay);
    intervalRef.current = interval;
  }, initialDelay);

  timeoutRef.current = initialTimeout;
};
```

### Pattern 2: Event Listener Cleanup with useEffect
**What:** Properly clean up global event listeners to prevent memory leaks
**When to use:** When adding document-level mouseup/mousemove listeners for interactions

**Example:**
```typescript
// Source: React best practices for event cleanup
useEffect(() => {
  if (scrollState) {
    const handleMouseMove = (e: MouseEvent) => { /* ... */ };
    const handleMouseUp = () => { /* cleanup */ };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }
}, [scrollState]);
```

### Pattern 3: Continuous Animation with useRef
**What:** Use useRef to store timer IDs that persist across renders without causing re-renders
**When to use:** For intervals/timeouts that need cleanup but shouldn't trigger component updates

**Example:**
```typescript
// Source: React hooks documentation
const intervalRef = useRef<number | null>(null);
const timeoutRef = useRef<number | null>(null);

const stopScrolling = useCallback(() => {
  if (timeoutRef.current) clearTimeout(timeoutRef.current);
  if (intervalRef.current) clearInterval(intervalRef.current);
  timeoutRef.current = null;
  intervalRef.current = null;
}, []);
```

### Pattern 4: SVG Triangles as CSS Background Images
**What:** Use inline SVG data URIs for arrow glyphs that respect CSS variables
**When to use:** For lightweight vector icons that need to match theme colors

**Example:**
```css
/* Source: CSS-Tricks CSS Triangle patterns */
.scroll-arrow-up {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'%3E%3Cpolygon points='5,2 2,8 8,8' fill='%23e0e0e0'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: center;
}

/* Theme integration - change fill color via CSS variable */
.scroll-arrow-up:hover {
  /* Re-encode SVG with different fill for hover state */
}
```

### Pattern 5: Smooth vs Instant Scroll Animation
**What:** Choice between instant position updates vs requestAnimationFrame-based animation
**When to use:** Smooth for single clicks (better UX), instant for continuous scroll (more responsive)

**Single click - smooth animation:**
```typescript
// Source: requestAnimationFrame best practices
const smoothScrollTo = (target: number, duration: number = 150) => {
  const start = viewport.x;
  const distance = target - start;
  const startTime = performance.now();

  const animate = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easeOutCubic(progress);

    setViewport({ x: start + distance * eased });

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };

  requestAnimationFrame(animate);
};

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
```

**Continuous hold - instant updates:**
```typescript
// Direct state updates, no animation
const scrollByAmount = (direction: string, amount: number) => {
  if (direction === 'up') {
    setViewport({ y: Math.max(0, viewport.y - amount / (TILE_SIZE * viewport.zoom)) });
  }
  // ... other directions
};
```

### Anti-Patterns to Avoid
- **Using setState inside setInterval callbacks without cleanup:** Causes memory leaks and state updates on unmounted components. Always store interval IDs in refs and clear them.
- **Adding arrow buttons as separate components:** Adds complexity. Keep scrollbar logic together in MapCanvas.tsx.
- **Using CSS `::-webkit-scrollbar-button`:** Browser-specific, doesn't work in Firefox, limited customization. Use custom HTML elements.
- **Animating continuous scroll with requestAnimationFrame:** Over-engineered for hold-to-scroll. Use setInterval for consistent timing.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Easing functions | Custom cubic bezier math | Built-in easing (`1 - (1-t)³`) | Standard algorithms, tested edge cases |
| Event listener cleanup | Manual tracking | useEffect cleanup return | React handles component lifecycle correctly |
| Timer ID storage | useState | useRef | Avoids unnecessary re-renders |
| SVG encoding for CSS | Manual hex encoding | Online tools or template literals | Correct URL encoding is tricky |

**Key insight:** React's hook system and browser APIs provide everything needed. External scrollbar libraries add weight without addressing the specific "classic Windows" requirements (arrow buttons, track click behavior).

## Common Pitfalls

### Pitfall 1: Memory Leaks from Uncleaned Intervals
**What goes wrong:** Setting intervals/timeouts on mousedown without clearing them on mouseup causes timers to run indefinitely, especially if the mouseup happens outside the component.
**Why it happens:** Mouse can leave component boundaries or page, preventing local mouseup handlers from firing.
**How to avoid:**
- Always add mouseup listener to `document`, not the button element
- Store timer IDs in refs, not state
- Clear timers in cleanup function returned from useEffect
**Warning signs:**
- Console warning: "Can't perform a React state update on an unmounted component"
- Scrolling continues after releasing mouse button
- Performance degradation over time

### Pitfall 2: Continuous Scroll Speed Inconsistency
**What goes wrong:** Scroll speed varies based on viewport zoom level if not accounting for tile-to-pixel ratio.
**Why it happens:** Viewport state stores position in tile coordinates, but setInterval fires at fixed millisecond intervals. At different zoom levels, the same tile increment covers different screen pixel distances.
**How to avoid:**
- Calculate scroll amount in tiles: `amount / (TILE_SIZE * viewport.zoom)`
- Use consistent time intervals (e.g., 125ms for 8 tiles/second = 1 tile per 125ms)
- Test at multiple zoom levels (0.25x, 1x, 4x)
**Warning signs:**
- Scrolling feels faster when zoomed out
- Can't traverse map at consistent speed

### Pitfall 3: Track Click Position Calculation Off-by-One
**What goes wrong:** Clicking near thumb edge causes unexpected jumps or no movement.
**Why it happens:** Not accounting for:
- Track area occupied by arrow buttons
- Thumb size in position calculations
- Border/padding in getBoundingClientRect
**How to avoid:**
- Subtract arrow button size from track length
- Use `event.target.getBoundingClientRect()` to get track coordinates, not container
- Account for thumb center vs edge when jumping to position
**Warning signs:**
- Clicking just above/below thumb doesn't move viewport
- Clicking at track edges jumps to wrong position

### Pitfall 4: SVG Arrow Colors Don't Update with Theme
**What goes wrong:** Arrow triangles stay same color when switching between light/dark themes.
**Why it happens:** SVG fill color is hardcoded in data URI, doesn't reference CSS variables.
**How to avoid:**
- Option 1: Use CSS mask-image instead of background-image, apply color via background-color
- Option 2: Generate separate SVG data URIs per theme in CSS (`.theme-light .scroll-arrow-up { ... }`)
- Option 3: Use inline SVG elements with `fill="currentColor"` and set `color` via CSS variable
**Warning signs:**
- Arrows visible in dark theme, invisible in light theme
- Arrows don't match theme color scheme

### Pitfall 5: Initial Delay Before Continuous Scroll Too Short/Long
**What goes wrong:** Continuous scroll starts immediately (feels too sensitive) or takes too long (feels unresponsive).
**Why it happens:** No established standard for web applications; need to balance between accidental triggers and responsiveness.
**How to avoid:**
- Start with Windows Forms standard: 250ms initial delay (5x the repeat rate)
- Test with users/yourself: hold button and count "one-Mississippi" - should start scrolling after 1 count
- Make delay configurable via constant at file top for easy tuning
**Warning signs:**
- Scroll starts on accidental brief clicks
- Users hold button wondering why nothing happens

## Code Examples

Verified patterns from research and existing codebase:

### Basic Arrow Button Structure
```tsx
// Add to MapCanvas.tsx return statement
// Horizontal scrollbar with arrow buttons
<div className="scroll-track-h">
  <button
    className="scroll-arrow-left"
    onMouseDown={() => handleArrowMouseDown('left')}
    onMouseUp={handleArrowMouseUp}
    onMouseLeave={handleArrowMouseUp}
    aria-label="Scroll left"
  />
  <div
    className="scroll-thumb-h"
    style={{
      left: `${scrollMetrics.thumbLeft}%`,
      width: `${scrollMetrics.thumbWidth}%`
    }}
    onMouseDown={(e) => handleScrollMouseDown('h', e)}
  />
  <button
    className="scroll-arrow-right"
    onMouseDown={() => handleArrowMouseDown('right')}
    onMouseUp={handleArrowMouseUp}
    onMouseLeave={handleArrowMouseUp}
    aria-label="Scroll right"
  />
</div>
```

### Arrow Button Click Handler with Continuous Scroll
```typescript
// Source: Windows Forms ScrollBar.Delay specification + React patterns
const INITIAL_SCROLL_DELAY = 250; // ms - matches Windows Forms standard
const SCROLL_REPEAT_RATE = 125;   // ms - gives 8 tiles/second at 16px/tile
const SINGLE_TILE_SCROLL = 1;     // tiles

const intervalRef = useRef<number | null>(null);
const timeoutRef = useRef<number | null>(null);

const handleArrowMouseDown = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
  // Immediate single-tile scroll
  scrollByTiles(direction, SINGLE_TILE_SCROLL);

  // Set up continuous scrolling after initial delay
  const timeout = window.setTimeout(() => {
    const interval = window.setInterval(() => {
      scrollByTiles(direction, SINGLE_TILE_SCROLL);
    }, SCROLL_REPEAT_RATE);
    intervalRef.current = interval;
  }, INITIAL_SCROLL_DELAY);

  timeoutRef.current = timeout;
}, [viewport]); // Include viewport in deps for current scroll position

const handleArrowMouseUp = useCallback(() => {
  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }
  if (intervalRef.current) {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }
}, []);

// Cleanup on unmount
useEffect(() => {
  return () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };
}, []);
```

### Scroll Helper Function
```typescript
const scrollByTiles = useCallback((direction: 'up' | 'down' | 'left' | 'right', tiles: number) => {
  const clampX = (x: number) => Math.max(0, Math.min(MAP_WIDTH - 10, x));
  const clampY = (y: number) => Math.max(0, Math.min(MAP_HEIGHT - 10, y));

  switch (direction) {
    case 'up':
      setViewport({ y: clampY(viewport.y - tiles) });
      break;
    case 'down':
      setViewport({ y: clampY(viewport.y + tiles) });
      break;
    case 'left':
      setViewport({ x: clampX(viewport.x - tiles) });
      break;
    case 'right':
      setViewport({ x: clampX(viewport.x + tiles) });
      break;
  }
}, [viewport, setViewport]);
```

### Track Click Handler (Page Jump Approach)
```typescript
// Traditional Windows behavior: jump by one visible page
const handleTrackClick = useCallback((axis: 'h' | 'v', event: React.MouseEvent) => {
  // Don't handle clicks on thumb (it has its own drag handler)
  if ((event.target as HTMLElement).classList.contains('scroll-thumb-h') ||
      (event.target as HTMLElement).classList.contains('scroll-thumb-v')) {
    return;
  }

  const container = containerRef.current;
  const canvas = canvasRef.current;
  if (!container || !canvas) return;

  const tilePixels = TILE_SIZE * viewport.zoom;

  if (axis === 'h') {
    const visibleTiles = canvas.width / tilePixels;
    const trackRect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - trackRect.left;
    const thumbLeft = (viewport.x / MAP_WIDTH) * trackRect.width;

    // Click left of thumb = scroll left (page up), right of thumb = scroll right (page down)
    if (clickX < thumbLeft) {
      setViewport({ x: Math.max(0, viewport.x - visibleTiles) });
    } else {
      setViewport({ x: Math.min(MAP_WIDTH - visibleTiles, viewport.x + visibleTiles) });
    }
  } else {
    const visibleTiles = canvas.height / tilePixels;
    const trackRect = event.currentTarget.getBoundingClientRect();
    const clickY = event.clientY - trackRect.top;
    const thumbTop = (viewport.y / MAP_HEIGHT) * trackRect.height;

    if (clickY < thumbTop) {
      setViewport({ y: Math.max(0, viewport.y - visibleTiles) });
    } else {
      setViewport({ y: Math.min(MAP_HEIGHT - visibleTiles, viewport.y + visibleTiles) });
    }
  }
}, [viewport, setViewport]);
```

### CSS Styling for Arrow Buttons
```css
/* Arrow button base styles */
.scroll-arrow-up,
.scroll-arrow-down,
.scroll-arrow-left,
.scroll-arrow-right {
  position: absolute;
  width: 10px;  /* Thin scrollbar constraint from CONTEXT */
  height: 10px;
  background-color: var(--scrollbar-track);
  border: none;
  cursor: pointer;
  transition: background-color 0.15s;
  background-repeat: no-repeat;
  background-position: center;
  background-size: 6px 6px; /* Triangle smaller than button */
}

.scroll-arrow-up:hover,
.scroll-arrow-down:hover,
.scroll-arrow-left:hover,
.scroll-arrow-right:hover {
  background-color: var(--bg-hover);
}

.scroll-arrow-up:active,
.scroll-arrow-down:active,
.scroll-arrow-left:active,
.scroll-arrow-right:active {
  background-color: var(--bg-active);
}

/* Vertical scrollbar arrows */
.scroll-arrow-up {
  top: 0;
  right: 0;
  /* SVG triangle pointing up - using mask for theme color support */
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'%3E%3Cpolygon points='5,3 2,7 8,7'/%3E%3C/svg%3E");
  background-color: var(--text-secondary);
}

.scroll-arrow-down {
  bottom: 0;
  right: 0;
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'%3E%3Cpolygon points='5,7 2,3 8,3'/%3E%3C/svg%3E");
  background-color: var(--text-secondary);
}

/* Horizontal scrollbar arrows */
.scroll-arrow-left {
  bottom: 0;
  left: 0;
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'%3E%3Cpolygon points='3,5 7,2 7,8'/%3E%3C/svg%3E");
  background-color: var(--text-secondary);
}

.scroll-arrow-right {
  bottom: 0;
  right: 0;
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'%3E%3Cpolygon points='7,5 3,2 3,8'/%3E%3C/svg%3E");
  background-color: var(--text-secondary);
}

/* Adjust track dimensions to account for arrow buttons */
.scroll-track-h {
  position: absolute;
  bottom: 0;
  left: 10px;      /* Account for left arrow */
  right: 24px;     /* Account for right arrow + vertical scrollbar */
  height: 10px;    /* Thin width from requirements */
  background: var(--scrollbar-track);
  border-top: 1px solid var(--border-default);
}

.scroll-track-v {
  position: absolute;
  top: 10px;       /* Account for top arrow */
  right: 0;
  bottom: 24px;    /* Account for bottom arrow + horizontal scrollbar */
  width: 10px;     /* Thin width from requirements */
  background: var(--scrollbar-track);
  border-left: 1px solid var(--border-default);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CSS `::-webkit-scrollbar-button` | Custom HTML button elements | 2020+ | Webkit-only pseudo-elements being phased out in favor of cross-browser custom implementations |
| `scrollbar-width: thin` | Pixel-exact sizing with custom elements | 2023+ | `scrollbar-width` only offers keywords (auto/thin/none), not pixel values; custom scrollbars give exact control |
| External scrollbar libraries | Vanilla JS implementations | 2024-2026 | Modern browsers have sufficient APIs; libraries add weight for features often not needed |
| setInterval for all scrolling | requestAnimationFrame for smooth, setInterval for continuous | 2020+ | rAF better for animations, but setInterval simpler for constant-rate actions like button hold |

**Deprecated/outdated:**
- **react-custom-scrollbars (unmaintained)**: Original library abandoned in 2020; fork react-custom-scrollbars-2 exists but still 50KB+ for features we don't need
- **jQuery scrollbar plugins**: Modern React applications don't need jQuery dependencies
- **CSS scrollbar-color with -webkit-scrollbar**: Mixing standards causes conflicts; choose one approach (custom elements preferred for arrow buttons)

## Open Questions

Things that couldn't be fully resolved:

1. **Track click behavior: page jump vs position jump**
   - What we know: Both behaviors exist in the wild. Windows traditionally uses page jump; some modern apps (GTK3, macOS) use position jump.
   - What's unclear: User preference for this specific editor context. Map navigation may benefit from position jump (quick access to map regions), or page jump may feel more natural for tile-by-tile work.
   - Recommendation: Implement page jump first (CONTEXT decision was "Claude's discretion"). Easy to swap behavior if testing reveals position jump is better. Add a single boolean constant `TRACK_CLICK_JUMPS_TO_POSITION` to make it configurable.

2. **Optimal arrow button size within 10px scrollbar**
   - What we know: Windows 95 used 16px scrollbars with 12px arrow glyphs. Phase 5 requirements specify ~10px thin scrollbars.
   - What's unclear: At 10px width, how large should clickable button area be vs visible triangle glyph?
   - Recommendation: 10x10px button area (fills scrollbar width), 6x6px triangle glyph (leaves 2px margin). Test in-browser for click target adequacy. Increase to 12x12px if 10px feels too small for mouse targeting.

3. **Single click animation: smooth vs instant**
   - What we know: Smooth scroll improves perceived polish (requestAnimationFrame with easing). Instant scroll feels more responsive. Continuous scroll should always be instant (not smooth).
   - What's unclear: User preference for single arrow clicks in tile editor context.
   - Recommendation: Start with instant (simpler, matches continuous scroll feel). If feels jarring in practice, add 100-150ms smooth animation with easeOutCubic. Can be added later without architectural changes.

4. **Track hold behavior (repeat like arrow buttons?)**
   - What we know: Windows scrollbars typically only do one page jump on track click, no repeat on hold. Some applications repeat page jumps if you continue holding after clicking track.
   - What's unclear: Whether users expect track hold to repeat page jumps.
   - Recommendation: Implement single jump only (standard Windows behavior). If users frequently hold track expecting repeat, add in a follow-up iteration with same interval pattern as arrow buttons (250ms delay + 125ms repeat).

## Sources

### Primary (HIGH confidence)
- Existing codebase: `E:\NewMapEditor\src\components\MapCanvas\MapCanvas.tsx` - Current scrollbar implementation
- Existing codebase: `E:\NewMapEditor\src\App.css` - CSS variable system from Phase 4
- Microsoft Learn VBA Documentation: [ScrollBar.Delay Property](https://learn.microsoft.com/en-us/office/vba/api/outlook.scrollbar.delay) - Official Windows scrollbar timing specifications (250ms initial, 50ms repeat)
- MDN Web Docs: [Window.setInterval()](https://developer.mozilla.org/en-US/docs/Web/API/Window/setInterval) - Standard API for continuous scroll
- React Documentation: [Built-in React Hooks](https://react.dev/reference/react/hooks) - useRef, useEffect, useCallback patterns

### Secondary (MEDIUM confidence)
- [This Dot Labs: Creating Custom Scrollbars with React](https://www.thisdot.co/blog/creating-custom-scrollbars-with-react) - Arrow button implementation patterns
- [CSS-Tricks: Using requestAnimationFrame with React Hooks](https://css-tricks.com/using-requestanimationframe-with-react-hooks/) - Animation patterns for smooth scroll
- [FreeCodeCamp: How to Fix Memory Leaks in React Applications](https://www.freecodecamp.org/news/fix-memory-leaks-in-react-apps/) - Event listener cleanup best practices
- [W3Schools: How To Create Arrows/Triangles with CSS](https://www.w3schools.com/howto/howto_css_arrows.asp) - SVG triangle patterns
- [CSS-Tricks: CSS Triangle](https://css-tricks.com/snippets/css/css-triangle/) - CSS/SVG triangle implementation
- [MDN: scrollbar-width](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/scrollbar-width) - Browser scrollbar styling capabilities
- [Chrome Developers: Scrollbar styling](https://developer.chrome.com/docs/css-ui/scrollbar-styling) - Modern scrollbar customization approaches

### Tertiary (LOW confidence)
- [GitHub Gist: Windows 95-era scrollbars](https://gist.github.com/Dakedres/0ccda599648833a1c2f65d3967aa131b) - Historical Windows scrollbar specifications (12px arrows in 16px scrollbar)
- [Arch Linux Forums: Scrollbar click behavior](https://bbs.archlinux.org/viewtopic.php?id=211415) - Discussion of page jump vs position jump UX tradeoffs
- [UX Booth: Best Practices for Scrolling](https://uxbooth.com/articles/best-practices-for-scrolling/) - General scrolling UX guidance
- WebSearch results for scrollbar libraries (SimpleBar, OverlayScrollbars) - Verified alternatives exist but not needed for this use case

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Codebase already has React 18 + TypeScript + CSS variables established
- Architecture: MEDIUM-HIGH - Patterns verified from React docs and existing codebase, but custom scrollbar arrow buttons require integration testing
- Common pitfalls: MEDIUM - Based on React best practices documentation and web development experience, not specific "classic scrollbar" pitfall documentation
- Code examples: MEDIUM - Synthesized from React patterns, Windows API specs, and CSS techniques; not tested in this specific codebase yet

**Research date:** 2026-02-02
**Valid until:** 2026-03-02 (30 days - stable domain, React patterns don't change rapidly)
