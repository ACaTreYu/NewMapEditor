# Phase 13: Application Chrome - Research

**Researched:** 2026-02-04
**Domain:** Windows XP Classic UI styling (toolbar buttons, status bar, dividers, title bars)
**Confidence:** HIGH

## Summary

Phase 13 implements Windows XP Classic mode application chrome on top of the Win98 foundation from Phase 12. The research focused on four key areas: toolbar button state transitions, status bar field styling, panel divider grips, and title bar gradients. XP Classic mode sits between Win98 (flat/beveled grey) and Luna (colorful/rounded) — it retains the grey/beveled foundation but with smoother rendering and slightly updated colors.

The codebase already uses `react-resizable-panels` v4.5.7 for layout, has Win98 CSS variables and bevels from Phase 12, and displays toolbar buttons with icons+labels. The status bar exists but needs XP Classic sunken field styling. Title bars exist (`.panel-title-bar`) with active blue gradients but need active/inactive state support.

**Primary recommendation:** Enhance existing components with XP Classic styling using Phase 12's bevel classes and CSS variables. Use CSS border-based bevels (no box-shadow per user requirement), implement button state transitions via CSS pseudo-classes, and add status bar field sections with sunken borders.

## Standard Stack

### Core (Already in Codebase)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18 | UI framework | Project foundation |
| TypeScript | Latest | Type safety | Project foundation |
| Zustand | Latest | State management | Already used for editor state |
| react-resizable-panels | 4.5.7 | Panel layout | Already installed and used in App.tsx |

### Supporting (Phase 12 Foundation)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| win98-variables.css | N/A | Two-tier CSS variable system | All color references |
| win98-bevels.css | N/A | Border-only bevel utilities | Button states, status fields, dividers |
| win98-typography.css | N/A | MS Sans Serif bitmap font | All text rendering |
| win98-schemes.css | N/A | Color scheme classes | Theme switching |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS-only buttons | XP.css library | XP.css targets Luna theme (rounded, colorful) not XP Classic (beveled, grey) |
| Border bevels | box-shadow bevels | User explicitly prohibited box-shadow — must use border-only |
| Custom dividers | Third-party grip | Already have react-resizable-panels, just need styling |

**Installation:**
```bash
# No new packages needed — all dependencies already installed
# Phase 12 CSS files already created in src/styles/
```

## Architecture Patterns

### Recommended Component Structure
```
src/
├── components/
│   ├── ToolBar/              # Enhance with button states
│   │   ├── Toolbar.tsx       # Add state classes
│   │   └── ToolBar.css       # XP Classic button styles
│   ├── StatusBar/            # Enhance with sunken fields
│   │   ├── StatusBar.tsx     # Add field wrappers, resize grip
│   │   └── StatusBar.css     # XP Classic field styles
│   └── [panels]/             # Add title bar active/inactive states
└── styles/
    └── [Phase 12 CSS]        # Use existing bevels/variables
```

### Pattern 1: Toolbar Button States (XP Classic)
**What:** Buttons start flat (no border), gain raised border on hover, sunken border on press/active.

**When to use:** All toolbar buttons (tools, file operations, settings).

**Example:**
```css
/* XP Classic toolbar button states */
.toolbar-button {
  /* Rest: flat, no border */
  border: 1px solid transparent;
  background: transparent;
}

.toolbar-button:hover:not(:disabled) {
  /* Hover: raised border appears */
  border-top: 1px solid var(--win98-ButtonHighlight);
  border-left: 1px solid var(--win98-ButtonHighlight);
  border-right: 1px solid var(--win98-ButtonDkShadow);
  border-bottom: 1px solid var(--win98-ButtonDkShadow);
  background: var(--win98-ButtonFace);
}

.toolbar-button:active:not(:disabled),
.toolbar-button.active {
  /* Active/toggled: sunken border */
  border-top: 1px solid var(--win98-ButtonDkShadow);
  border-left: 1px solid var(--win98-ButtonDkShadow);
  border-right: 1px solid var(--win98-ButtonHighlight);
  border-bottom: 1px solid var(--win98-ButtonHighlight);
  background: var(--win98-ButtonShadow);
}

.toolbar-button:disabled {
  /* Disabled: grey text with white emboss */
  color: var(--win98-GrayText);
  text-shadow: 1px 1px 0 var(--win98-ButtonHighlight);
}
```

**Sources:**
- XP.css documentation: "raised borders become sunken" on click
- Mozilla toolbar implementation: flat → hover outline → active sunken

### Pattern 2: Status Bar Sunken Fields
**What:** Status bar contains multiple fields, each with shallow sunken border (status-field-border style).

**When to use:** Status bar field sections for coordinates, tile ID, zoom, tool name, selection size.

**Example:**
```css
/* Status bar container */
.status-bar {
  display: flex;
  gap: 4px;
  padding: 2px 4px;
  background: var(--win98-ButtonFace);
  border-top: 1px solid var(--win98-ButtonHighlight);
}

/* Sunken field (shallow inset) */
.status-field {
  padding: 2px 6px;
  /* Use win98-sunken class from Phase 12 */
  border-top: 1px solid var(--win98-ButtonDkShadow);
  border-left: 1px solid var(--win98-ButtonDkShadow);
  border-right: 1px solid var(--win98-ButtonHighlight);
  border-bottom: 1px solid var(--win98-ButtonHighlight);
  background: var(--win98-Window);
}
```

**Sources:**
- 98.css: "status-field-border uses only the sunken outer basic border style"
- Microsoft docs: "used in status bars and other read-only fields where content can change dynamically"

### Pattern 3: Panel Divider Grip
**What:** Resize handles styled as thin (4-5px) raised bars with optional grip pattern.

**When to use:** All panel dividers (vertical and horizontal).

**Example:**
```css
/* Thin raised divider */
.resize-handle-vertical {
  width: 4px;
  background: var(--win98-ButtonFace);
  cursor: col-resize;
  /* Subtle raised border */
  border-left: 1px solid var(--win98-ButtonHighlight);
  border-right: 1px solid var(--win98-ButtonShadow);
}

/* Hover: cursor change only (per CONTEXT.md) */
.resize-handle-vertical:hover {
  cursor: col-resize;
  /* No visual highlight per user decision */
}

/* Optional: grip dots (9 dots in 3x3 grid) */
.resize-handle-vertical::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 3px;
  height: 9px;
  background-image: radial-gradient(circle, var(--win98-ButtonShadow) 1px, transparent 1px);
  background-size: 3px 3px;
  background-position: center;
  pointer-events: none;
}
```

**Sources:**
- Windows resize grip documentation: "small dots forming a right triangle" or "three parallel lines"
- Common pattern: 3x3 dot grid or diagonal ridges

### Pattern 4: Title Bar Active/Inactive States
**What:** Title bars use gradient backgrounds that change color based on focus state.

**When to use:** Inner panel title bars (not main window — this is Electron).

**Example:**
```css
/* Active title bar (blue gradient) */
.panel-title-bar.active {
  background: linear-gradient(
    to right,
    var(--win98-ActiveCaption),
    var(--win98-GradientActiveCaption)
  );
  color: var(--win98-CaptionText);
}

/* Inactive title bar (grey gradient) */
.panel-title-bar.inactive {
  background: linear-gradient(
    to right,
    var(--win98-InactiveCaption),
    var(--win98-GradientInactiveCaption)
  );
  color: var(--win98-InactiveCaptionText);
}
```

**Sources:**
- Windows XP Classic colors (GitHub gist): ActiveCaption #0A246A, GradientActiveCaption #A6CAF0, InactiveCaption #808080, GradientInactiveCaption #C0C0C0
- Phase 12 already defined these CSS variables in win98-variables.css

### Anti-Patterns to Avoid
- **Using box-shadow for bevels:** User explicitly prohibited this — use border-only approach from Phase 12
- **Deep bevels everywhere:** XP Classic uses shallow bevels for most UI chrome (1px borders), reserving 2px deep bevels for fields/wells
- **Transitions on state changes:** Classic Windows UI had instant state changes, no smooth transitions
- **Luna-style gradients:** XP Classic uses subtle left-to-right gradients, not the colorful vertical gradients from Luna theme

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Panel resizing | Custom drag handlers | react-resizable-panels (v4.5.7) | Already installed, handles all edge cases (constraints, keyboard, touch) |
| Bevel borders | Inline border styles | Phase 12 utility classes (.win98-raised, .win98-sunken) | Consistent depth, theme-aware colors |
| Color values | Hardcoded hex colors | Phase 12 CSS variables (--win98-*, Tier 2 semantic) | Color scheme switching, maintainability |
| Button state logic | JavaScript state | CSS :hover/:active pseudo-classes | Browser-native, accessible, performant |
| Resize grip dots | SVG/canvas | CSS radial-gradient background-image | No external assets, scalable, theme-aware |

**Key insight:** Phase 12 already solved bevels, colors, and typography. Phase 13 is about applying those foundations to UI chrome with XP Classic state behaviors.

## Common Pitfalls

### Pitfall 1: Confusing XP Classic with Luna
**What goes wrong:** Implementing rounded corners, colorful gradients, or glossy buttons.

**Why it happens:** "Windows XP" often refers to the default Luna theme, not Classic mode.

**How to avoid:** XP Classic = Win98 foundation + smoother rendering. No rounded corners, no blue/green color schemes, no plastic/glossy effects.

**Warning signs:**
- CSS border-radius appearing in toolbar/button styles
- Bright blue (#0066CC) or green (#73B973) backgrounds
- Vertical gradients on buttons
- Drop shadows or glow effects

### Pitfall 2: Over-using Deep Bevels
**What goes wrong:** Applying .win98-raised-deep or .win98-sunken-deep to everything.

**Why it happens:** Deep bevels look "more classic" so it's tempting to use them everywhere.

**How to avoid:**
- Toolbar buttons: 1px borders (simple .win98-raised/.win98-sunken)
- Status fields: 1px sunken (simple .win98-sunken)
- Input fields: 2px sunken (.win98-field)
- Canvas wells: 2px sunken (.win98-well)

**Warning signs:** Every UI element has 2px borders, interface looks "too heavy"

### Pitfall 3: Breaking Phase 12 Constraints
**What goes wrong:** Adding ::before pseudo-elements to elements that already use them for deep bevels.

**Why it happens:** Forgetting that .win98-*-deep classes consume ::before.

**How to avoid:** Check Phase 12 SUMMARY.md — elements using deep bevels can't use ::before for other purposes. Add wrapper div if needed.

**Warning signs:**
- Applying .win98-sunken-deep to status bar (which needs ::before for resize grip)
- Deep bevel utility class not rendering correctly
- Pseudo-element content disappearing

### Pitfall 4: Inconsistent Button Group Separators
**What goes wrong:** Some button groups use vertical lines, others use spacing.

**Why it happens:** CONTEXT.md marks this as "Claude's discretion" without researching authentic XP behavior.

**How to avoid:** Research shows XP Classic toolbars typically used thin etched vertical separators between logical groups (File/Edit/Tools). Use Phase 12's .win98-etched-v class.

**Warning signs:** Toolbar layout feels inconsistent or hard to scan visually.

## Code Examples

Verified patterns from official sources and Phase 12 foundation:

### Toolbar Button with Icon + Label
```tsx
// Toolbar.tsx - XP Classic icon-above-label layout
<button
  className={`toolbar-button ${currentTool === tool ? 'active' : ''}`}
  onClick={() => setTool(tool)}
  disabled={!map}
  title={`${tool} (${shortcut})`}
>
  <span className="toolbar-icon">{icon}</span>
  <span className="toolbar-label">{label}</span>
</button>
```

```css
/* ToolBar.css - XP Classic button states */
.toolbar-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px 6px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
}

.toolbar-icon {
  font-size: 16px;
  line-height: 1;
}

.toolbar-label {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* States: flat → hover raised → active sunken */
.toolbar-button:hover:not(:disabled) {
  border-top: 1px solid var(--win98-ButtonHighlight);
  border-left: 1px solid var(--win98-ButtonHighlight);
  border-right: 1px solid var(--win98-ButtonDkShadow);
  border-bottom: 1px solid var(--win98-ButtonDkShadow);
  background: var(--win98-ButtonFace);
}

.toolbar-button:active:not(:disabled),
.toolbar-button.active {
  border-top: 1px solid var(--win98-ButtonDkShadow);
  border-left: 1px solid var(--win98-ButtonDkShadow);
  border-right: 1px solid var(--win98-ButtonHighlight);
  border-bottom: 1px solid var(--win98-ButtonHighlight);
  background: var(--win98-ButtonShadow);
}

.toolbar-button:disabled {
  color: var(--win98-GrayText);
  text-shadow: 1px 1px 0 var(--win98-ButtonHighlight);
  cursor: not-allowed;
}
```

### Status Bar with Sunken Fields + Resize Grip
```tsx
// StatusBar.tsx - Field sections with resize grip
export const StatusBar: React.FC<Props> = ({ cursorX, cursorY, cursorTileId }) => {
  const { map, viewport, currentTool, tileSelection } = useEditorStore();

  return (
    <div className="status-bar">
      <div className="status-field">
        <span className="status-label">X:</span>
        <span className="status-value">{cursorX >= 0 ? cursorX : '--'}</span>
      </div>

      <div className="status-field">
        <span className="status-label">Y:</span>
        <span className="status-value">{cursorY >= 0 ? cursorY : '--'}</span>
      </div>

      <div className="status-field">
        <span className="status-label">Tile:</span>
        <span className="status-value">{cursorTileId ?? '--'}</span>
      </div>

      <div className="status-field">
        <span className="status-label">Zoom:</span>
        <span className="status-value">{Math.round(viewport.zoom * 100)}%</span>
      </div>

      <div className="status-field">
        <span className="status-label">Tool:</span>
        <span className="status-value">{currentTool}</span>
      </div>

      {tileSelection.width > 1 || tileSelection.height > 1 ? (
        <div className="status-field">
          <span className="status-label">Selection:</span>
          <span className="status-value">{tileSelection.width} × {tileSelection.height}</span>
        </div>
      ) : null}

      <div className="status-spacer" />

      <div className="status-resize-grip" />
    </div>
  );
};
```

```css
/* StatusBar.css - XP Classic status bar */
.status-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 4px;
  background: var(--win98-ButtonFace);
  border-top: 1px solid var(--win98-ButtonHighlight);
  font-size: 11px;
  min-height: 24px;
  position: relative;
}

/* Sunken field sections */
.status-field {
  display: flex;
  gap: 4px;
  padding: 2px 6px;
  min-width: 40px;
  /* Shallow sunken border */
  border-top: 1px solid var(--win98-ButtonDkShadow);
  border-left: 1px solid var(--win98-ButtonDkShadow);
  border-right: 1px solid var(--win98-ButtonHighlight);
  border-bottom: 1px solid var(--win98-ButtonHighlight);
  background: var(--win98-Window);
}

.status-label {
  color: var(--win98-GrayText);
  font-weight: normal;
}

.status-value {
  color: var(--win98-WindowText);
  font-weight: normal;
}

.status-spacer {
  flex: 1;
}

/* Diagonal resize grip (bottom-right corner) */
.status-resize-grip {
  width: 16px;
  height: 16px;
  position: relative;
  /* 3 diagonal lines pattern */
  background-image:
    linear-gradient(135deg, transparent 0px, transparent 4px, var(--win98-ButtonHighlight) 4px, var(--win98-ButtonHighlight) 5px, transparent 5px),
    linear-gradient(135deg, transparent 7px, transparent 8px, var(--win98-ButtonHighlight) 8px, var(--win98-ButtonHighlight) 9px, transparent 9px),
    linear-gradient(135deg, transparent 11px, transparent 12px, var(--win98-ButtonHighlight) 12px, var(--win98-ButtonHighlight) 13px, transparent 13px);
  background-size: 16px 16px;
  background-position: bottom right;
  background-repeat: no-repeat;
}
```

### Panel Title Bar Active/Inactive
```tsx
// Panel component with focus tracking
const [isFocused, setIsFocused] = useState(false);

return (
  <div
    className="panel-container"
    onFocus={() => setIsFocused(true)}
    onBlur={() => setIsFocused(false)}
    tabIndex={0}
  >
    <div className={`panel-title-bar ${isFocused ? 'active' : 'inactive'}`}>
      {title}
    </div>
    <div className="panel-content">
      {children}
    </div>
  </div>
);
```

```css
/* Panel title bars - XP Classic gradients */
.panel-title-bar {
  padding: 2px 8px;
  font-size: 11px;
  font-weight: bold;
  min-height: 18px;
  display: flex;
  align-items: center;
  user-select: none;
}

.panel-title-bar.active {
  background: linear-gradient(
    to right,
    var(--win98-ActiveCaption),
    var(--win98-GradientActiveCaption)
  );
  color: var(--win98-CaptionText);
}

.panel-title-bar.inactive {
  background: linear-gradient(
    to right,
    var(--win98-InactiveCaption),
    var(--win98-GradientInactiveCaption)
  );
  color: var(--win98-InactiveCaptionText);
}
```

### Panel Divider with Grip Pattern
```css
/* App.css - XP Classic divider styling */
.resize-handle-vertical {
  width: 4px;
  background: var(--win98-ButtonFace);
  cursor: col-resize;
  position: relative;
  /* Subtle raised appearance */
  border-left: 1px solid var(--win98-ButtonHighlight);
  border-right: 1px solid var(--win98-ButtonShadow);
}

/* Optional: dot grip pattern (3x3 grid of dots) */
.resize-handle-vertical::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 2px;
  height: 12px;
  background-image: radial-gradient(
    circle at center,
    var(--win98-ButtonShadow) 0.5px,
    transparent 0.5px
  );
  background-size: 2px 4px;
  background-repeat: repeat;
  pointer-events: none;
}

.resize-handle-horizontal {
  height: 4px;
  background: var(--win98-ButtonFace);
  cursor: row-resize;
  position: relative;
  border-top: 1px solid var(--win98-ButtonHighlight);
  border-bottom: 1px solid var(--win98-ButtonShadow);
}

/* Horizontal grip: dots in horizontal line */
.resize-handle-horizontal::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 12px;
  height: 2px;
  background-image: radial-gradient(
    circle at center,
    var(--win98-ButtonShadow) 0.5px,
    transparent 0.5px
  );
  background-size: 4px 2px;
  background-repeat: repeat;
  pointer-events: none;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| box-shadow for bevels | Pure CSS borders with ::before | Phase 12 (2026-02-04) | User requirement, more authentic to original Win98/XP rendering |
| Inline color values | Two-tier CSS variable system | Phase 12 (2026-02-04) | Color scheme switching, maintainability |
| Generic button styles | State-based pseudo-classes | Modern CSS best practice | Accessible, performant, no JS needed |
| JavaScript resize handlers | react-resizable-panels | Already installed v4.5.7 | Declarative, handles constraints/keyboard/touch |
| SVG icons | Unicode/emoji icons | Current implementation | No build step, instant rendering |

**Deprecated/outdated:**
- XP.css framework: Targets Luna theme (rounded, colorful), not XP Classic (beveled, grey)
- 98.css framework: Win98 only, missing XP Classic smoothness improvements
- Custom drag-to-resize: react-resizable-panels handles this better

## Open Questions

Things that couldn't be fully resolved:

1. **Toolbar button group separators: spacing vs etched lines**
   - What we know: CONTEXT.md marks as "Claude's discretion", authentic XP used thin etched separators
   - What's unclear: Whether user prefers strict historical accuracy or cleaner modern spacing
   - Recommendation: Implement etched separators (.win98-etched-v) between logical groups (File | Edit | Tools) per XP Classic conventions

2. **Status bar field sizing: fixed widths vs auto-sizing**
   - What we know: CONTEXT.md says "mixed fixed/auto recommended", need to display X, Y, Tile, Zoom, Tool, Selection
   - What's unclear: Optimal width allocation per field
   - Recommendation: Fixed widths for coordinate fields (X: 40px, Y: 40px, Tile: 60px), auto-sizing for tool name and selection dimensions

3. **Title bar content: what to display**
   - What we know: CONTEXT.md says "Claude's discretion — pick what's most useful for a map editor"
   - What's unclear: Panel-specific titles vs generic "Animations" / "Tileset"
   - Recommendation: Static panel names (already implemented in App.tsx: "Animations" title bar)

4. **Panel divider grip pattern: dots, ridges, or plain**
   - What we know: CONTEXT.md marks as "Claude's discretion", research shows dots and ridges both used in XP
   - What's unclear: User preference
   - Recommendation: Start with plain (no grip pattern) per "cursor change only" hover behavior — adding visual grip may feel too "busy"

## Sources

### Primary (HIGH confidence)
- Phase 12 SUMMARY.md - Win98 foundation CSS system already implemented
- EditorState.ts - Current tool state tracking, viewport, tile selection dimensions
- App.tsx - Existing panel layout with react-resizable-panels v4.5.7
- Toolbar.tsx - Current toolbar implementation with icon+label layout
- StatusBar.tsx - Existing status bar with cursor/tile/zoom display
- win98-variables.css - Canonical system colors and semantic aliases (Tier 1 + Tier 2)
- win98-bevels.css - Border-only bevel utility classes (.win98-raised, .win98-sunken, etc.)
- [Windows XP Classic color values (GitHub gist)](https://gist.github.com/zaxbux/64b5a88e2e390fb8f8d24eb1736f71e0) - ActiveCaption: #0A246A, GradientActiveCaption: #A6CAF0, InactiveCaption: #808080, GradientInactiveCaption: #C0C0C0

### Secondary (MEDIUM confidence)
- [Windows XP visual styles - Wikipedia](https://en.wikipedia.org/wiki/Windows_XP_visual_styles) - XP Classic vs Luna theme differences
- [XP.css framework](https://botoxparty.github.io/XP.css/) - Button states ("raised borders become sunken on click")
- [98.css framework](https://jdan.github.io/98.css/) - Status field border style documentation
- [Microsoft Size Grip docs](https://learn.microsoft.com/en-us/windows/win32/winauto/size-grip) - Resize grip visual patterns
- [react-resizable-panels GitHub](https://github.com/bvaughn/react-resizable-panels) - Panel resize library documentation
- [CSS Background Pattern Generator - Web ToolBox](https://web-toolbox.dev/en/tools/css-background-pattern-generator) - Radial gradient dot patterns
- [CSS :hover - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:hover) - Pseudo-class ordering (LVHA)
- [CSS :active - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:active) - Active state styling

### Tertiary (LOW confidence)
- Various blog posts about CSS button hover effects (2025) - Generic patterns, not XP-specific
- CodePen Windows XP implementations - Varied quality, not authoritative

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Existing Phase 12 foundation + installed dependencies verified
- Architecture: HIGH - Phase 12 CSS patterns well-documented, component structure clear
- Pitfalls: MEDIUM - Based on common CSS mistakes + Phase 12 constraints, not XP-specific issues
- Code examples: HIGH - Derived from Phase 12 foundation + verified CSS patterns + existing codebase structure

**Research date:** 2026-02-04
**Valid until:** 60 days (stable domain — Windows XP Classic UI patterns unchanged since 2001)

**Dependencies:**
- Phase 12 (Theme Foundation) must be complete — provides CSS variable system, bevel classes, typography
- react-resizable-panels v4.5.7 already installed
- No new npm packages required

**Key constraints from Phase 12:**
- Border-only bevels (no box-shadow)
- ::before pseudo-element consumed by deep bevel classes
- Two-tier CSS variable system (components use Tier 2 semantic aliases only)
- MS Sans Serif bitmap font at 11px
