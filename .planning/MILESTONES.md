# Project Milestones: AC Map Editor

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
