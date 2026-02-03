# Roadmap: AC Map Editor v1.3

**Milestone:** v1.3 Layout Fix
**Created:** 2026-02-03
**Phases:** 1 (continuing from v1.2 Phase 10)

## Overview

Fix the panel layout so the map canvas dominates the window like SEdit, with properly sized and draggable panels.

## Phase 11: Panel Layout Fix

**Goal:** Fix CSS flexbox sizing issues so canvas dominates window and dividers are draggable

**Plans:** 1 plan

Plans:
- [ ] 11-01-PLAN.md — Flexbox min-height fix + proportion verification

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
- Add min-height: 0 CSS fix on panel elements (root cause from research)
- Verify resize handle CSS has correct cursor properties
- Adjust default panel sizes if needed (current proportions already good)
- Visual verification checkpoint

---

## Milestone Success Criteria

- [ ] Layout matches SEdit reference screenshot proportions
- [ ] All panels are resizable via drag
- [ ] Map canvas is the dominant visual element
- [ ] No CSS layout bugs (thin strips, collapsed panels)

---
*Roadmap created: 2026-02-03*
*Updated: 2026-02-03 — Phase 11 planned*
