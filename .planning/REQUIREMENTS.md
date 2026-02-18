# Requirements: AC Map Editor

**Defined:** 2026-02-18
**Core Value:** The map editing experience should feel intuitive and professional -- tools work correctly, the layout maximizes the editing canvas, and workflows match what users expect from image editors.

## v1.1.2-linux Requirements

Requirements for Linux port and cross-platform architecture. Each maps to roadmap phases.

### Build & Packaging

- [ ] **BUILD-01**: App builds as Linux AppImage via electron-builder
- [ ] **BUILD-02**: Build scripts organized for cross-platform (win/linux flags, shared config)
- [ ] **BUILD-03**: electron-builder config structured for multi-OS targets (separate per-platform overrides)

### Platform Polish

- [ ] **PLAT-01**: File paths use XDG conventions on Linux (config, data, cache directories)
- [ ] **PLAT-02**: Auto-updater works on Linux via AppImage + latest-linux.yml on GitHub Releases
- [ ] **PLAT-03**: Platform-conditional code isolated (not scattered process.platform checks)
- [ ] **PLAT-04**: Electron menu adjusted for Linux conventions (no App menu, correct accelerators)

### Distribution

- [ ] **DIST-01**: GitHub Release includes Linux AppImage + latest-linux.yml alongside Windows assets
- [ ] **DIST-02**: Website archive page shows Linux download alongside Windows download
- [ ] **DIST-03**: Release workflow docs updated for dual-platform publish process

## Future Requirements

### Additional Platforms

- **PLAT-05**: macOS build (dmg) -- deferred, no current need
- **PLAT-06**: Snap/Flatpak packaging -- deferred, AppImage covers most users

## Out of Scope

| Feature | Reason |
|---------|--------|
| macOS build | No current need, can add later with same architecture |
| Snap/Flatpak packaging | AppImage is most universal, lower maintenance |
| CI/CD pipeline | Building locally for now, can add later |
| Linux-specific UI themes | Existing 3-theme system (Light/Dark/Terminal) works cross-platform |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| BUILD-01 | Phase 88 | Pending |
| BUILD-02 | Phase 88 | Pending |
| BUILD-03 | Phase 88 | Pending |
| PLAT-01 | Phase 89 | Pending |
| PLAT-02 | Phase 89 | Pending |
| PLAT-03 | Phase 88 | Pending |
| PLAT-04 | Phase 89 | Pending |
| DIST-01 | Phase 90 | Pending |
| DIST-02 | Phase 90 | Pending |
| DIST-03 | Phase 90 | Pending |

**Coverage:**
- v1.1.2-linux requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0

---
*Requirements defined: 2026-02-18*
*Last updated: 2026-02-18 -- traceability table populated after roadmap creation (phases 88-90)*
