# Roadmap: AC Map Editor v1.3

**Milestone:** v1.3 Layout Fix
**Created:** 2026-02-03
**Phases:** 1 (continuing from v1.2 Phase 10)

## Overview

Fix the panel layout so the map canvas dominates the window like SEdit, with properly sized and draggable panels.

## Phase 11: Panel Layout Fix

**Goal:** Fix CSS and panel configuration so layout matches SEdit proportions

**Requirements covered:**
- LAYOUT-01: Map canvas fills majority of window
- LAYOUT-02: Tileset panel adequate height
- LAYOUT-03: Animation panel adequate width
- LAYOUT-04: Panel dividers draggable
- LAYOUT-05: Default sizes match SEdit

**Success criteria:**
1. Map canvas visually dominates the window (>60% of viewport)
2. Tileset panel shows multiple rows of tiles without scrolling on 1080p display
3. Animation panel shows animation previews clearly (not cut off)
4. Dragging panel dividers resizes adjacent panels
5. Fresh app launch shows SEdit-like proportions

**Approach:**
- Debug why current react-resizable-panels dividers aren't draggable
- Fix CSS flexbox/sizing issues causing canvas to collapse
- Adjust default panel sizes (defaultSize props)
- Test resize behavior

---

## Milestone Success Criteria

- [ ] Layout matches SEdit reference screenshot proportions
- [ ] All panels are resizable via drag
- [ ] Map canvas is the dominant visual element
- [ ] No CSS layout bugs (thin strips, collapsed panels)

---
*Roadmap created: 2026-02-03*
