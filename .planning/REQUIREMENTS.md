# Requirements: AC Map Editor

**Defined:** 2026-02-15
**Core Value:** The map editing experience should feel intuitive and professional — tools work correctly, the layout maximizes the editing canvas, and workflows match what users expect from image editors.

## v3.2 Requirements

Requirements for v3.2 Animated Game Objects & Farplane Toggle.

### Animated Spawn

- [ ] **ASPAWN-01**: Spawn tool has "Animated Spawn" variant in dropdown
- [ ] **ASPAWN-02**: Animated spawn places single animated tile for selected team color (green: 870-875, red: 976-979/1016-1017, blue: 1099-1102/1139-1140, yellow: 1222-1225/1262-1263)
- [ ] **ASPAWN-03**: Animated spawn tiles cycle through 6 frames on the map canvas

### Animated Warp

- [ ] **AWARP-01**: Warp tool has "Animated Warp" variant in dropdown
- [ ] **AWARP-02**: Animated warp places full 3x3 tile block centered on click position
- [ ] **AWARP-03**: Warp block animates through 4 frames (top row: 1347-1358, middle row: 1387-1398, bottom row: 1427-1438)
- [ ] **AWARP-04**: Center tile of 3x3 block is the actual warp tile location (frames: 1388, 1391, 1394, 1397)

### Conveyor Fix

- [ ] **CFIX-01**: Downward conveyor tiles animate correctly (matching other conveyor directions)

### Farplane Toggle

- [ ] **FARP-01**: User can toggle farplane color rendering on/off on the editing canvas
- [ ] **FARP-02**: Toggle state persists during the editing session

## Future Requirements

None — focused milestone.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Custom animation frame editor | Separate concern, not needed for predefined animations |
| Animated spawn from custom.dat | Using hardcoded hectic 5.0 tile IDs for now |
| Warp src/dest configuration for animated warp | Animated warp uses visual block only, existing warp handles routing |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ASPAWN-01 | Phase 68 | Pending |
| ASPAWN-02 | Phase 68 | Pending |
| ASPAWN-03 | Phase 68 | Pending |
| AWARP-01 | Phase 68 | Pending |
| AWARP-02 | Phase 68 | Pending |
| AWARP-03 | Phase 68 | Pending |
| AWARP-04 | Phase 68 | Pending |
| CFIX-01 | Phase 69 | Pending |
| FARP-01 | Phase 69 | Pending |
| FARP-02 | Phase 69 | Pending |

**Coverage:**
- v3.2 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0

**Coverage: 100% ✓**

---
*Requirements defined: 2026-02-15*
*Last updated: 2026-02-15 after roadmap creation*
