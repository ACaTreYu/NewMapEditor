# Project Milestones: AC Map Editor

## v2.6 Viewport & Animation Fixes (Shipped: 2026-02-11)

**Delivered:** Fixed animation visibility at all zoom levels, cursor-anchored panning for 1:1 mouse movement, and professional zoom controls (slider, input, presets, keyboard shortcuts)

**Phases completed:** 44-46 (3 plans total)

**Key accomplishments:**

- Fixed hasVisibleAnimatedTiles() coordinate math so animations render at all zoom levels (0.25x-4x)
- Replaced delta-based panning with cursor-anchored approach for true 1:1 screen movement at all zoom levels
- Added zoom slider and numeric percentage input in status bar for precise zoom control
- Added 5 preset zoom buttons (25%-400%) with active highlighting
- Added keyboard zoom shortcuts (Ctrl+0 reset, Ctrl+=/- in/out) with input focus guards

**Stats:**

- 4 files modified (+296/-19 lines TypeScript/CSS)
- 3 phases, 3 plans
- 1 day (2026-02-11)
- Codebase: ~13,486 LOC TypeScript/CSS

**Git range:** `8285de8` -> `372fad6`

**What's next:** Planning next milestone

---

## v2.5 Selection Transform Tools (Shipped: 2026-02-11)

**Delivered:** In-place selection transform tools (rotate CW/CCW, mirror in 4 directions) with restructured toolbar, disabled states, and complete removal of old clipboard-based transforms

**Phases completed:** 41-43 (4 plans total)

**Key accomplishments:**

- In-place rotation of selected map tiles (90° CW and CCW) with automatic selection bounds resize (3x5 becomes 5x3)
- Adjacent mirror-copy of selected tiles in 4 directions (Right, Left, Up, Down) with selection expansion
- Restructured toolbar: separate rotate CW/CCW action buttons, mirror dropdown, dedicated cut/copy/paste buttons
- Disabled states for transform and clipboard buttons when no selection or clipboard data exists
- Complete dead code removal: old clipboard transforms, ERASER tool, Ctrl+H/J/R shortcuts, redundant 180° rotation

**Stats:**

- 36 files changed (+4,848/-166 lines TypeScript/CSS)
- 3 phases, 4 plans, 7 tasks
- 2 days (2026-02-10 → 2026-02-11)
- Codebase: ~13,209 LOC TypeScript/CSS

**Git range:** `848c42a` → `ee1fa95`

**What's next:** Planning next milestone

---

## v2.4 MDI Window Controls (Shipped: 2026-02-10)

**Delivered:** Classic MDI window management with minimize to compact bars, maximize to fill workspace with hidden title bar, and restore to previous position/size

**Phases completed:** 39-40 (2 plans total)

**Key accomplishments:**

- Window state management with savedBounds pattern for minimize/maximize/restore
- CSS-drawn title bar buttons (minimize, maximize/restore, close) in Windows classic order
- MinimizedBar component — 160px compact bars at workspace top with drag support
- Maximize fills workspace with hidden title bar for maximum canvas space
- Double-click title bar toggles maximize/restore
- Arrangement and close behavior respect minimize/maximize state

**Stats:**

- 10 files changed (+780/-39 lines TypeScript/CSS)
- 2 phases, 2 plans, 4 tasks
- 1 day (2026-02-10)

**Git range:** `be58a9d` → `9ef3173`

**What's next:** Planning next milestone

---

## v2.3 Minimap Independence (Shipped: 2026-02-10)

**Delivered:** Always-visible minimap with Photoshop-style checkerboard empty state, locked sidebar with collapse toggle, and consistent 130px right column layout

**Phases completed:** 38 (1 plan total)

**Key accomplishments:**

- Minimap always renders on startup (never returns null), showing checkerboard + "Minimap" label when no map loaded
- Empty/DEFAULT_TILE areas show gray/white checkerboard pattern (8x8 blocks, #C0C0C0/#FFFFFF)
- Right sidebar locked at fixed 130px width (removed drag-resizable panel)
- Sidebar collapse toggle button for full-canvas editing mode
- Fixed requestIdleCallback cache-building bug (unstable refs causing idle callback cancellation)
- Fixed putImageData compositing bug (checkerboard colors computed inline in imageData)

**Stats:**

- 5 code files modified (+484/-87 lines TypeScript/CSS)
- 1 phase, 1 plan, 2 tasks
- 1 day (2026-02-10)

**Git range:** `b1fe354` → `3406696`

**What's next:** Planning next milestone

---

## v2.2 Transparency & Performance (Shipped: 2026-02-09)

**Delivered:** Tile transparency rendering fix and comprehensive render/state performance optimization eliminating idle CPU usage and cascading re-renders

**Phases completed:** 37 (3 plans total + 1 transparency feature)

**Key accomplishments:**

- Tile transparency: canvas shows tile-280 color for transparent pixels, tileset shows checkerboard, multi-tile stamp skips empty tiles
- Conditional animation loop with Page Visibility API — idle CPU drops from 60fps to <1% when no animated tiles visible
- Granular state sync in 22 wrapper actions — each syncs only 1-3 changed fields instead of all 8+
- Split MapCanvas 9-field mega-selector into 3 focused groups with conditional overlay animation
- Removed root-level map subscription from App.tsx — event handlers use getState() for one-time reads
- Deferred minimap tile color computation to requestIdleCallback with 2s timeout fallback

**Stats:**

- 9 code files modified (+348/-214 lines TypeScript/CSS)
- 1 phase, 3 plans, 7 tasks
- 1 day (2026-02-09)

**Git range:** `4b12583` → `3fec3b7`

**What's next:** Planning next milestone

---

## v2.1 MDI Editor & Polish (Shipped: 2026-02-09)

**Delivered:** Full MDI editor with multiple map child windows, per-document undo/redo, cross-document clipboard, status bar hover info, and scrollable settings dialog

**Phases completed:** 33-36 (6 plans total)

**Key accomplishments:**

- Per-document state isolation with GlobalSlice/DocumentsSlice architecture and independent undo/redo histories
- MDI workspace with react-rnd child windows supporting drag, resize, tile, and cascade arrangement
- Cross-document clipboard enabling copy/paste between open maps with full 16-bit tile encoding
- Source-aware status bar hover showing X/Y for map canvas and Col/Row for tileset panel
- Yes/No/Cancel unsaved changes dialog on window close
- Responsive scrollable settings dialog tabs (flexbox, no fixed pixel heights)

**Stats:**

- 27 files changed (+2,509/-864 lines TypeScript/CSS)
- 4 phases, 6 plans
- 1 day (2026-02-09)
- Codebase: ~12,211 LOC TypeScript/CSS

**Git range:** `9e981c9` → `76c4909`

**What's next:** Planning next milestone

---

## v2.0 Modern Minimalist UI (Shipped: 2026-02-09)

**Delivered:** Complete visual redesign from Win98 to modern minimalist aesthetic with OKLCH design tokens, settings-to-description serialization, SEdit format parity, and zero TypeScript errors

**Phases completed:** 27-32 (9 plans total)

**Key accomplishments:**

- Modern minimalist UI with OKLCH design tokens, 8px grid spacing, flat design, and subtle shadows (192 Win98 refs eliminated)
- Two-tier design token system (primitives + semantic aliases) with complete single-source-of-truth control
- All 53 game settings auto-serialize to description field with category-based ordering
- Author metadata via Author=name format in description field with parse/serialize helpers
- SEdit format parity: 7 default values corrected, binary format documented, 5-tab consolidated dialog
- Zero TypeScript errors with strict mode enforcement (6 pre-existing errors resolved)

**Stats:**

- 74 files changed (+11,497/-4,366 lines TypeScript/CSS)
- 6 phases, 9 plans
- 2 days (2026-02-08 to 2026-02-09)

**Git range:** `88d09ab` → `9ad313c`

**What's next:** Planning next milestone

---

## v1.7 Performance & Portability (Shipped: 2026-02-08)

**Delivered:** Optimized rendering pipeline, state management, and memory usage; extracted Electron dependencies behind adapter interfaces for web portability

**Phases completed:** 21-26 (9 plans total)

**Key accomplishments:**

- Granular Zustand selectors across all components — eliminated unnecessary re-renders from animationFrame
- 4-layer stacked canvas architecture with independent render triggers and pixel-perfect rendering
- Average-color minimap cache with debounced redraws — zero temporary canvas creation per draw
- Batched wall line/rect operations trigger single state update (10x-76x fewer updates)
- Delta-based undo/redo with 100x+ memory reduction (128KB to 12-1200 bytes per entry)
- FileService adapter interface + MapService extraction — src/core/ fully portable (zero Electron deps)

**Stats:**

- 134 files changed (+13,418/-1,156 lines TypeScript/CSS)
- 6 phases, 9 plans
- 4 days (2026-02-04 to 2026-02-08)

**Git range:** `929eae9` → `7e9df12`

**What's next:** Planning next milestone

---

## v1.6 SELECT & Animation Panel (Shipped: 2026-02-08)

**Delivered:** Full SELECT tool with SEdit parity (marquee selection, copy/paste/cut/delete, mirror H/V, rotate 90°, floating paste preview) and redesigned Animation Panel matching SEdit's vertical hex-numbered list

**Phases completed:** 16-20 (5 plans total)

**Key accomplishments:**

- SELECT tool with animated marching ants selection via drag-to-select
- Copy/cut/paste/delete with Ctrl+C/X/V/Delete keyboard shortcuts and undo/redo integration
- Floating paste preview at 70% opacity — follows cursor, commits on click, cancels on Escape
- Mirror H/V and rotate 90° transforms with SEdit shortcuts (Ctrl+H/J/R)
- SEdit-style narrow animation panel with hex-numbered 00-FF vertical list and Tile/Anim toggle

**Stats:**

- 126 files changed (+13,177/-2,459 lines TypeScript/CSS)
- 5 phases, 5 plans
- 4 days (2026-02-04 to 2026-02-08)

**Git range:** `eee3506` → `b57d8c6`

**What's next:** v1.7 Performance & Portability

---

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
