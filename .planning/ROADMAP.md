# Roadmap: AC Map Editor

## Milestones

- ✅ **v1.0 MVP** - Phases 1-3 (shipped 2026-02-01)
- ✅ **v1.1 Canvas & Polish** - Phases 4-6 (shipped 2026-02-02)
- ✅ **v1.2 SEdit-Style Layout** - Phases 7-10 (shipped 2026-02-02)
- ✅ **v1.3 Layout Fix** - Phase 11 (shipped 2026-02-04)
- ✅ **v1.4 Win98 Theme Overhaul** - Phases 12-13 (shipped 2026-02-04)
- ✅ **v1.5 Functional Tools** - Phases 14-15 (shipped 2026-02-04)
- ✅ **v1.6 SELECT & Animation Panel** - Phases 16-20 (shipped 2026-02-08)
- ✅ **v1.7 Performance & Portability** - Phases 21-26 (shipped 2026-02-08)
- ✅ **v2.0 Modern Minimalist UI** - Phases 27-32 (shipped 2026-02-09)
- ✅ **v2.1 MDI Editor & Polish** - Phases 33-36 (shipped 2026-02-09)
- ✅ **v2.2 Transparency & Performance** - Phase 37 (shipped 2026-02-09)
- ✅ **v2.3 Minimap Independence** - Phase 38 (shipped 2026-02-10)
- ✅ **v2.4 MDI Window Controls** - Phases 39-40 (shipped 2026-02-10)
- ✅ **v2.5 Selection Transform Tools** - Phases 41-43 (shipped 2026-02-11)
- ✅ **v2.6 Viewport & Animation Fixes** - Phases 44-46 (shipped 2026-02-11)
- ✅ **v2.7 Rendering & Navigation** - Phases 47-50 (shipped 2026-02-12)
- ✅ **v2.8 Canvas Engine** - Phases 51-55 (shipped 2026-02-13)
- ✅ **v2.9 Measurement & Grid** - Phases 56-60 (shipped 2026-02-13)
- ✅ **v3.0 Panel Layout & Ruler Notes** - Phases 61-63 (shipped 2026-02-14)
- ✅ **v3.1 Rendering Fixes & UX Polish** - Phases 64-67 (shipped 2026-02-14)
- ✅ **v3.2 Animated Game Objects & Farplane Toggle** - Phases 68-69 (shipped 2026-02-15)
- 🚧 **v3.3 Animation Offset Control** - Phase 70 (in progress)

## Phases

<details>
<summary>✅ v1.0-v3.2 Phases 1-69 — SHIPPED 2026-02-15</summary>

Collapsed for brevity. See MILESTONES.md for full milestone history.

</details>

### 🚧 v3.3 Animation Offset Control (In Progress)

**Milestone Goal:** Enable user-controlled animation offsets for all game object tools, with persistent offset state and picker integration

#### Phase 70: Animation Offset Control

**Goal:** Users can control animation offsets for placed tiles with picker synchronization and contextual UI

**Depends on:** Phase 69 (completed)

**Requirements:** OFST-01, OFST-02, OFST-03, PICK-01, PICK-02, WARP-01, WARP-02, FDBK-01, FDBK-02

**Success Criteria** (what must be TRUE):
1. User can set animation offset (0-127) in the Animations panel when a game object tool is active, and the value persists across placements until changed
2. Placed animated tiles encode the current offset value and display it in status bar on hover (SEdit format: "Anim: XX Offset: Y")
3. Picker tool captures offset from existing animated tiles and syncs to Animations panel, enabling inspect-adjust-replace workflow
4. Warp tool shows Source/Dest dropdowns that encode routing as offset (dest*10 + src), and picking existing warps populates the dropdowns
5. Offset input validates range (0-127) with visual error feedback for out-of-range values

**Plans:** TBD

Plans:
- [ ] 70-01: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 70. Animation Offset Control | v3.3 | 0/0 | Not started | - |

---
*Last updated: 2026-02-15 after v3.3 roadmap creation*
