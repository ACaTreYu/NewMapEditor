# Roadmap: AC Map Editor v1.0.2 Bug Fixes

**Depth:** Quick
**Requirements:** 3 (BUG-01, BUG-02, BUG-03)
**Phases:** 1
**Started:** 2026-02-16

## Overview

Fix two critical bugs affecting switch tool placement and animated tile erasure. Switch tool fails because custom.dat asset is not available to the fetch call (needs public path). Animation system has a timing issue where patchAnimatedTiles() re-renders old animated content after a tile has been overwritten with DEFAULT_TILE during erasure.

## Phases

### Phase 81: Bug Fixes

**Goal:** Switch tool places tiles correctly and animated tiles fully erase in one pass

**Dependencies:** None (bug fixes to existing systems)

**Requirements:** BUG-01, BUG-02, BUG-03

**Success Criteria:**
1. User clicks Switch tool on map → 3x3 tile pattern appears from custom.dat
2. User can place switch at any map location without console errors
3. User drags pencil with DEFAULT_TILE over animated tile → animation disappears immediately (no residual frames visible)
4. User paints DEFAULT_TILE over conveyor/spawn/warp → single pass removes all animation

**Tasks:**
- Copy custom.dat from assets/ to public/assets/ or update fetch path to assets/custom.dat
- Add animated→non-animated transition tracking in CanvasEngine buffer patching logic
- Test switch placement after custom.dat is accessible
- Test animated tile erasure with all animated game objects (spawn, warp, conveyor)

## Progress

| Phase | Goal | Status | Requirements |
|-------|------|--------|--------------|
| 81 - Bug Fixes | Switch tool places tiles and animated tiles erase correctly | Pending | BUG-01, BUG-02, BUG-03 |

**Overall:** 0/1 phases complete (0%)

---
*Created: 2026-02-16*
*Last updated: 2026-02-16*
