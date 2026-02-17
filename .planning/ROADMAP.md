# Roadmap: AC Map Editor v1.0.2 Bug Fixes & Branding

**Depth:** Quick
**Requirements:** 5 (BUG-01, BUG-02, BUG-03, BRAND-01, BRAND-02)
**Phases:** 1
**Started:** 2026-02-16

## Overview

Fix two critical bugs (switch tool placement, animated tile erasure) and add branding (About dialog, splash screen with copyright). Switch tool fails because custom.dat asset is not served from the public path. Animation system has a timing issue where patchAnimatedTiles() re-renders old animated content after a tile has been overwritten with DEFAULT_TILE.

## Phases

### Phase 81: Bug Fixes

**Goal:** Switch tool places tiles correctly, animated tiles fully erase in one pass, and app has proper branding

**Dependencies:** None

**Requirements:** BUG-01, BUG-02, BUG-03, BRAND-01, BRAND-02

**Plans:** 2 plans

Plans:
- [ ] 81-01-PLAN.md — Fix custom.dat path and animated tile erasure bug
- [ ] 81-02-PLAN.md — Add Help/About dialog and splash screen branding

**Success Criteria:**
1. User clicks Switch tool on map → 3x3 tile pattern appears from custom.dat
2. User can place switch at any map location without console errors
3. User drags pencil with DEFAULT_TILE over animated tile → animation disappears immediately (no residual frames visible)
4. User paints DEFAULT_TILE over conveyor/spawn/warp → single pass removes all animation
5. Help → About opens dialog showing "© Arcbound Interactive 2026", "by aTreYu", and version number
6. App displays splash screen on startup with copyright, author, and version

**Tasks:**
- Copy custom.dat to public/assets/ so fetch can load it on startup
- Add animated→non-animated transition tracking in CanvasEngine buffer patching logic
- Add About dialog to Help menu with copyright/author/version
- Add splash screen on app startup with branding
- Test switch placement, animated tile erasure, about dialog, and splash screen

## Progress

| Phase | Goal | Status | Requirements |
|-------|------|--------|--------------|
| 81 - Bug Fixes & Branding | Switch tool + animation erase + About dialog + splash screen | Pending | BUG-01, BUG-02, BUG-03, BRAND-01, BRAND-02 |

**Overall:** 0/1 phases complete (0%)

---
*Created: 2026-02-16*
*Last updated: 2026-02-16*
