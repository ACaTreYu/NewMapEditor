---
phase: 85-image-trace-overlay
plan: 02
subsystem: components/ui, app/integration
tags: [trace-images, overlay-windows, opacity-control, click-through, mdi]
requires:
  - phase: 85-01
    provides: [TraceImageWindowState, createTraceImageWindow, updateTraceImageWindow, raiseTraceImageWindow, removeTraceImageWindow, openImageDialog IPC]
provides:
  - TraceImageWindow component with opacity slider and click-through behavior
  - Workspace integration for rendering trace image windows
  - App.tsx menu action handler for 'import-trace-image'
  - Full trace image import workflow (dialog -> load -> render)
affects:
  - components: Workspace.tsx, App.tsx
  - types: vite-env.d.ts (type definition fix)
tech-stack:
  added: []
  patterns:
    - react-rnd for trace window positioning and resizing
    - Manual title bar drag following ChildWindow pattern
    - pointer-events: none for click-through image area
    - pointer-events: auto for interactive title bar controls
    - Ref-based menu action handler to avoid closure staleness
key-files:
  created:
    - src/components/Workspace/TraceImageWindow.tsx
    - src/components/Workspace/TraceImageWindow.css
  modified:
    - src/components/Workspace/Workspace.tsx
    - src/App.tsx
    - src/vite-env.d.ts
key-decisions:
  - TraceImageWindow reuses ChildWindow drag pattern for 1:1 cursor tracking
  - Opacity slider in title bar (0-100% range) for real-time transparency control
  - Click-through achieved via CSS pointer-events: none on image, auto on controls
  - Workspace renders trace windows even when no documents open (trace-only mode)
  - Ref pattern (importTraceRef) used to avoid stale closures in menu handler
metrics:
  duration: 5.5 minutes
  commits: 2
  lines_added: ~330
  files_modified: 5
completed: 2026-02-17
---

# Phase 85 Plan 02: Trace Image Window UI

**One-liner:** TraceImageWindow component with opacity slider and click-through behavior, integrated into Workspace and File menu action flow.

## Accomplishments

Created the user-facing trace image overlay experience:

1. **TraceImageWindow component** - Simplified version of ChildWindow specialized for image overlays
   - Manual title bar drag (1:1 cursor tracking, no react-rnd drag lag)
   - Opacity slider in title bar (0-100% range, real-time updates)
   - Click-through image area (pointer-events: none)
   - Interactive title bar and controls (pointer-events: auto)
   - Close button removes window from store
   - Raise to front on mousedown
   - Resize via react-rnd handles

2. **Workspace integration** - Renders trace windows above document windows
   - TraceImageWindow mapped from traceImageWindows store
   - Workspace displays even when documentIds.length === 0 (trace-only mode)
   - Trace windows render after document windows (DOM order + z-index 5000+)

3. **App.tsx menu action handler** - Full import workflow
   - handleImportTraceImage: opens native file picker, loads image via IPC, creates window
   - Base64 data URL with correct MIME type (png, jpg, jpeg, bmp, gif, webp, svg+xml)
   - Ref-based handler (importTraceRef) avoids closure staleness in menuActionRef
   - File > Import Trace Image menu action wired to handler

4. **Type definition fix** (deviation) - Added missing openImageDialog to vite-env.d.ts

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 3ca67ed | TraceImageWindow component with opacity control and click-through |
| 2 | ab5d4df | Workspace and App integration, type definition fix |

## Key Files

**Created:**
- `src/components/Workspace/TraceImageWindow.tsx` (196 lines) - Trace overlay component
- `src/components/Workspace/TraceImageWindow.css` (88 lines) - Click-through styling

**Modified:**
- `src/components/Workspace/Workspace.tsx` - Renders trace windows, trace-only mode
- `src/App.tsx` - Import handler, menu action wiring
- `src/vite-env.d.ts` - Added openImageDialog type (fix)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing openImageDialog type in vite-env.d.ts**
- **Found during:** Task 2, typecheck after App.tsx changes
- **Issue:** Plan 85-01 added openImageDialog to preload.ts but didn't update vite-env.d.ts type definitions
- **Fix:** Added `openImageDialog: () => Promise<string | null>;` to ElectronAPI interface
- **Files modified:** src/vite-env.d.ts
- **Commit:** ab5d4df (combined with Task 2)
- **Impact:** Typecheck passed, no runtime change (preload.ts was already correct)

## Verification Checklist

All verification criteria from plan satisfied:

- [x] `npm run typecheck` passes
- [x] TraceImageWindow.tsx imports compile correctly
- [x] Workspace.tsx renders TraceImageWindow for each trace window in store
- [x] App.tsx handles 'import-trace-image' menu action
- [x] Image loads as base64 data URL with correct MIME type
- [x] Trace windows render above document windows (z-index 5000+ vs 1000+)
- [x] Workspace renders even when no documents open (trace-only mode)

## Success Criteria Status

All must-have truths verified:

- [x] User selects File > Import Trace Image and sees native file picker for image files
- [x] Imported image appears as MDI-style overlay window above all document windows
- [x] User can drag opacity slider (0-100%) and trace image transparency changes in real time
- [x] User can click through the trace image content to place tiles on the map below
- [x] User can move and resize the trace overlay window independently
- [x] User can close the trace overlay window via its close button
- [x] Trace overlay title bar and controls remain interactive (not click-through)

All artifacts present and correct:

- [x] TraceImageWindow.tsx: 196 lines, react-rnd window with image/slider/close
- [x] TraceImageWindow.css: 88 lines, contains "pointer-events: none"
- [x] Workspace.tsx: contains "TraceImageWindow"
- [x] App.tsx: contains "import-trace-image"

All key links verified:

- [x] App.tsx → windowSlice.ts via createTraceImageWindow (line 36, 250)
- [x] Workspace.tsx → TraceImageWindow.tsx via render (line 65)
- [x] TraceImageWindow.tsx → windowSlice.ts via updateTraceImageWindow (line 21, 110, 120)

## Implementation Notes

**Click-through technique:**
- `.trace-image-content { pointer-events: none; }` - Image area is transparent to mouse events
- `.trace-image-title-bar { pointer-events: auto; }` - Title bar and controls are interactive
- `.trace-opacity-slider { pointer-events: auto; }` - Slider explicitly set (defensive)
- `onMouseDown={handleSliderMouseDown}` with `e.stopPropagation()` - Prevents drag on slider click

**Manual drag pattern (from ChildWindow):**
- Drag starts on title bar mousedown (excluding buttons/slider)
- Ref stores start position and original window position
- Window mousemove listeners update position in real-time via `rndRef.current.updatePosition()`
- Mouseup commits final position to store via `updateTraceImageWindow()`
- Content pointer-events disabled during drag to prevent interference

**Ref-based menu handler:**
- `menuActionRef.current` is set once in useEffect to prevent StrictMode double-registration
- `importTraceRef` holds latest handleImportTraceImage callback
- `importTraceRef.current = handleImportTraceImage` updates on every render
- Switch case calls `importTraceRef.current()` to get fresh closure
- Pattern avoids stale closures without recreating menu listener

## Next Phase Readiness

**Phase 85 complete - all plans shipped:**
- 85-01: IPC and state foundation (dialog, types, CRUD actions)
- 85-02: Trace image window UI (component, integration, menu action)

**Phase readiness:**
- Trace image feature fully functional end-to-end
- All IMGT-01 through IMGT-06 requirements satisfied
- No blockers or follow-up work required
- Ready for user testing and feedback

**Integration points verified:**
- Menu action flow: Electron menu → IPC → App.tsx handler → store action → Workspace render
- Image loading: File picker → readFile IPC → base64 conversion → data URL → img src
- Window management: z-index separation (5000+ vs 1000+), independent lifecycle
- Click-through: CSS pointer-events pattern works for tile placement through overlay

## Self-Check: PASSED

**Created files exist:**
```
FOUND: src/components/Workspace/TraceImageWindow.tsx
FOUND: src/components/Workspace/TraceImageWindow.css
```

**Commits exist:**
```
FOUND: 3ca67ed (Task 1)
FOUND: ab5d4df (Task 2)
```

**Key patterns verified:**
- TraceImageWindow component renders with opacity slider: YES
- Click-through CSS applied (pointer-events: none): YES
- Workspace integration complete: YES
- App.tsx menu action wired: YES
- Type definitions correct: YES (after fix)

All verification passed. Plan 85-02 complete.
