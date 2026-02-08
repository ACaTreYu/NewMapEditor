---
phase: 26
plan: 02
subsystem: portability-layer
tags: [refactor, architecture, dependency-injection]
dependency_graph:
  requires: [26-01]
  provides: [portable-map-io]
  affects: [app-component, main-entry-point]
tech_stack:
  added: [MapService]
  patterns: [service-layer, constructor-injection, react-context]
key_files:
  created:
    - src/core/services/MapService.ts
  modified:
    - src/App.tsx
    - src/main.tsx
decisions:
  - id: map-service-results
    summary: MapService returns Result objects matching FileService pattern
    rationale: Consistent error handling across abstraction layers
  - id: mapservice-ref
    summary: MapService created in useRef to avoid recreating on every render
    rationale: Service is stateless but heavy to instantiate
  - id: arraybuffer-cast
    summary: Explicit ArrayBuffer casts for Uint16Array.buffer.slice()
    rationale: TypeScript sees ArrayBuffer | SharedArrayBuffer, cast ensures type safety
metrics:
  duration: 4m
  completed: 2026-02-08T12:11:00Z
---

# Phase 26 Plan 02: Component Migration Summary

**One-liner:** Extracted map I/O business logic into MapService, eliminated ALL direct Electron dependencies from components and core.

## Objectives Met

- [x] MapService created in src/core/services/ with loadMap() and saveMap()
- [x] App.tsx refactored to use FileService via useFileService() hook
- [x] FileServiceProvider wraps App in main.tsx with ElectronFileService
- [x] Zero window.electronAPI calls in src/components/ or src/core/
- [x] All file operations go through platform-agnostic adapter interface

## Implementation

### Task 1: Create MapService and refactor App.tsx

**MapService (src/core/services/MapService.ts):**

Created service layer that encapsulates all map file I/O business logic:

**loadMap() method:**
1. Opens file dialog via FileService
2. Reads file as ArrayBuffer
3. Parses map header with MapParser
4. For v3 maps: extracts compressed data slice and decompresses via FileService
5. Returns Result object with loaded MapData or error

**saveMap() method:**
1. Shows save dialog if no filePath provided
2. Serializes header with MapParser
3. Compresses tile data via FileService
4. Combines header + compressed bytes into single buffer
5. Writes combined buffer to disk
6. Returns Result object with success/error

**Critical detail:** Used `buffer.slice()` to extract compressed data slice from raw file buffer (avoiding shared buffer issues), then cast to ArrayBuffer to satisfy TypeScript's strict type checking.

**App.tsx refactoring:**

Replaced 100+ lines of direct window.electronAPI calls with:
- `useFileService()` hook to get FileService from Context
- MapService instantiation in useRef (avoids recreation on re-render)
- handleOpenMap: 13 lines (was 68) - delegates to mapService.loadMap()
- handleSaveMap: 13 lines (was 56) - delegates to mapService.saveMap()
- Removed isElectron guard - platform differences handled by adapter

**Files modified:**
- src/core/services/MapService.ts (created, 130 lines)
- src/App.tsx (-114 lines, +35 lines)

**Commit:** a70ea33

### Task 2: Wire FileServiceProvider in main.tsx

**Updated main.tsx:**
- Instantiated ElectronFileService at app entry point
- Wrapped `<App />` with `<FileServiceProvider service={fileService}>`
- Makes FileService available to entire component tree via Context

**Files modified:**
- src/main.tsx (+7 lines)

**Commit:** a1d537b

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

1. **Typecheck passed:** No new TypeScript errors (pre-existing errors in MapParser.ts and WallSystem.ts unrelated to this plan)
2. **window.electronAPI audit:** ZERO references in src/components/ and src/core/
3. **Adapter isolation verified:** window.electronAPI only appears in:
   - src/adapters/electron/ElectronFileService.ts (the adapter)
   - src/vite-env.d.ts (type declaration)
   - electron/preload.ts (Electron main process)

## Architecture Impact

**Before:**
```
App.tsx
  └─> window.electronAPI (direct coupling)
```

**After:**
```
App.tsx
  └─> useFileService() hook
      └─> FileServiceContext
          └─> ElectronFileService (injected in main.tsx)
              └─> window.electronAPI (isolated)
```

**Portability achieved:**
- Components: Zero platform dependencies
- Core: Zero platform dependencies
- Adapters: All platform-specific code isolated
- Future: Swap ElectronFileService for WebFileService without touching components

## Key Files

| File | Role | Exports |
|------|------|---------|
| src/core/services/MapService.ts | Business logic layer | MapService, MapLoadResult, MapSaveResult |
| src/App.tsx | Main UI component | App (refactored to use FileService) |
| src/main.tsx | Entry point | - (provides FileService to App) |

## Dependencies

**Consumes:**
- Phase 26-01: FileService interface, FileServiceContext, ElectronFileService adapter

**Provides:**
- MapService: Reusable map I/O logic for future AC app integration
- Fully portable component tree (no Electron dependencies)

## Next Phase Readiness

**Phase 26 complete!** This was the final plan in the portability layer.

**v1.7 Performance & Portability milestone complete.**

**No blockers for:**
- Future AC React app integration (src/core/ is fully portable)
- Alternative platform implementations (Web, Tauri, etc.)
- Testing with mock FileService implementations

## Self-Check: PASSED

**Created files verified:**
```
FOUND: src/core/services/MapService.ts
```

**Commits verified:**
```
FOUND: a70ea33 (Task 1: MapService + App.tsx refactor)
FOUND: a1d537b (Task 2: FileServiceProvider wiring)
```

**Architecture verification:**
```
PASSED: Zero window.electronAPI in src/components/
PASSED: Zero window.electronAPI in src/core/
PASSED: window.electronAPI only in src/adapters/electron/
```
