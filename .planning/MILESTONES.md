# Project Milestones: AC Map Editor

## v1.5 Functional Tools (Shipped: 2026-02-04)

**Delivered:** All SEdit game object tools accessible via toolbar with variant dropdowns, plus new CONVEYOR tool with directional pattern fill and live preview

**Phases completed:** 14-15 (3 plans total)

**Key accomplishments:**

- Exposed SPAWN, SWITCH, BRIDGE tools via toolbar buttons with S/H/J keyboard shortcuts
- Implemented CONVEYOR tool with directional pattern fill (Left-Right / Up-Down) via rectangle drag
- Unified variant dropdown UX for all 6 game object tools (replaces separate panel controls)
- Live tile preview at 70% opacity during CONVEYOR drag for WYSIWYG placement
- Escape key cancellation for all rect drag and line drawing operations

**Stats:**

- 5 code files modified (+652 lines TypeScript/CSS)
- 2 phases, 3 plans, 4 tasks
- 1 day (same day as v1.4 ship)

**Git range:** `9301bf7` → `1183008`

**What's next:** TBD — SELECT tool, animation panel redesign, Win98 panel interiors, or tool behavior verification

---

## v1.4 Win98 Theme Overhaul (Shipped: 2026-02-04)

**Delivered:** Pixel-accurate Win98 aesthetic with CSS variable system, beveled chrome, and classic toolbar/status bar styling

**Phases completed:** 12-13 (10 plans total)

**Key accomplishments:**

- Win98 CSS variable system with two-tier primitives/semantic tokens and 3 color schemes
- Removed dark/light toggle — committed to single Win98 grey aesthetic
- Purged all modern CSS (border-radius, transitions, box-shadow blur, opacity) from 25+ components
- Win98 toolbar buttons with flat/raised/sunken states
- Win98 status bar with sunken fields and resize grip
- Win98 title bar gradients on inner window frame

**Stats:**

- 17+ files modified across 10 plans
- 2 phases, 10 plans
- 2 days from v1.3 to ship

**Git range:** `2808a48` → `1079391`

**What's next:** v1.5 Functional Tools — tool parity with SEdit

---

## v1.3 Layout Fix (Shipped: 2026-02-04)

**Delivered:** Fixed panel layout so map canvas dominates the window with proper flexbox sizing and draggable dividers

**Phases completed:** 11 (1 plan total)

**Key accomplishments:**

- Fixed flexbox min-height/min-width issue preventing proper panel shrinking
- Moved animations panel from left to right side (matching SEdit reference)
- Removed canvas centering constraint so map fills entire panel space
- Fixed animation previews to stay at 16x16 size (no stretching)
- Achieved 63.75% viewport canvas dominance with freely draggable dividers

**Stats:**

- 9 files created/modified
- +340/-57 lines of TypeScript/CSS
- 1 phase, 1 plan
- 3 days from v1.2 to ship

**Git range:** `84a6941` → `571999d`

**What's next:** v1.4 - TBD (animation panel redesign, Win95 theme, or other priorities)

---

## v1.2 SEdit-Style Layout (Shipped: 2026-02-02)

**Delivered:** SEdit-style UI with Win95 window frame, top-right minimap, compact panels, and comprehensive Map Settings dialog

**Phases completed:** 7-10 (9 plans total)

**Key accomplishments:**

- Win95/98 window frame aesthetic with sunken canvas border and gray workspace
- Minimap repositioned to top-right corner with click-to-navigate
- SEdit-style panel layout (left animations, bottom tileset)
- Compact 16x16 animation previews (2.5x density improvement)
- Icon-only Photoshop/GIMP-style toolbar maximizing canvas space
- Comprehensive Map Settings dialog with 53 game settings across 10 tabs
- Dashed selection outline for multi-tile stamp alignment

**Stats:**

- 52 files created/modified
- +7,142 net lines of TypeScript/CSS
- 4 phases, 9 plans
- 1 day from v1.1 to ship

**Git range:** `de22032` → `c8ce214`

**What's next:** v1.3 - TBD (user feedback will drive priorities)

---

## v1.1 Canvas & Polish (Shipped: 2026-02-02)

**Delivered:** Maximized canvas space with collapsible panels, classic scrollbars, and consistent CSS theming

**Phases completed:** 4-6 (3 plans total)

**Key accomplishments:**

- Two-tier CSS variable theme system with dark/light mode and FOUC prevention
- Classic Windows-style scrollbars with arrow buttons and continuous scroll on hold
- Collapsible bottom panel that maximizes canvas editing space
- CSS border triangle pattern for theme-aware glyphs (arrows, chevrons)
- Instant panel transitions for responsive feel
- Tab click auto-expands collapsed panels before switching

**Stats:**

- 59 files created/modified
- +5,826 net lines of TypeScript/CSS
- 3 phases, 3 plans
- 1 day from v1.0 to ship

**Git range:** `b055584` → `bc3bcaf`

**What's next:** v1.2 - TBD (user feedback will drive priorities)

---

## v1.0 UI Overhaul (Shipped: 2026-02-01)

**Delivered:** Professional editor UI with horizontal toolbar, tabbed panels, and fixed fill/animation bugs

**Phases completed:** 1-3 (5 plans total)

**Key accomplishments:**

- Pattern fill supports multi-tile selections with modulo-based tiling
- Animation loading from Gfx.dll with frame validation (filters garbage data)
- CSS custom properties theme system with OS dark/light mode support
- Horizontal toolbar with icon+label pattern and 3D pressed effect
- Vertical resizable panel layout with localStorage persistence
- ARIA-compliant tabbed bottom panel (Tiles/Animations/Settings)

**Stats:**

- 27 files created/modified
- ~2,750 lines of TypeScript/CSS
- 3 phases, 5 plans
- 2 days from start to ship

**Git range:** `76489c9` → `3c8ff55`

**What's next:** v1.1 - Polish and refinements (CSS variable consistency, keyboard shortcuts, minor UX improvements)

---
