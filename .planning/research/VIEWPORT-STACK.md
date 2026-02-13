# Technology Stack: Viewport Fixes & Zoom Controls

**Project:** AC Map Editor - Viewport Fixes Milestone
**Researched:** 2026-02-11
**Confidence:** HIGH

## Recommended Stack

### Core Technologies (NO NEW DEPENDENCIES)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Existing Zustand** | 5.0.3 (current) | Viewport state management | Already stores viewport: { x, y, zoom }. No changes needed. setViewport action works for all updates. |
| **Existing React** | 18.3.1 (current) | UI components | Standard HTML input elements. No library needed for zoom controls. |
| **Standard HTML5** | Built-in | Zoom input/slider | `<input type="number">` for zoom percentage, `<input type="range">` for slider. Zero dependencies. |
| **requestAnimationFrame** | Browser API | Animation timing | Already used correctly. Only fix needed: delta time calculation in frame counter. |
| **Canvas API** | Browser API | Tile rendering | 4-layer canvas stack is correct architecture. No changes to rendering pipeline. |

## Installation

**NO INSTALLATION REQUIRED**

```bash
# This milestone requires ZERO new dependencies
# All fixes use existing React, Zustand, Canvas API, and HTML5 input elements
```

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|------------|
| **Material UI Slider** | 500KB+ bloat, design system overhead | Standard HTML `<input type="range">` |
| **rc-slider** | 30KB for styled range input | Standard HTML input with custom CSS |
| **Yup / Zod** | Validation library overkill | Inline validation: `Math.max(25, Math.min(400, value))` |
| **GreenSock (GSAP)** | Animation library for complex tweens | requestAnimationFrame + delta time |
| **react-zoom-pan-pinch** | Designed for image viewers, not tile grids | Custom implementation (already exists) |

---

*Stack research for: Viewport fixes and zoom controls*
*Researched: 2026-02-11*
*Focus: Zero new dependencies, use existing stack*
