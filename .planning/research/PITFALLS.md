# Domain Pitfalls

**Domain:** Settings Format Compliance, Save As, Animation Panel Independence, Image Trace Overlay
**Project:** AC Map Editor v1.0.4
**Researched:** 2026-02-17
**Confidence:** HIGH

## Executive Summary

This research identifies integration pitfalls when adding four features to an existing Electron/React tile map editor: settings format compliance (Format=1.1 prefix), Save As functionality, animation panel independence from component lifecycle, and image trace overlay. The pitfalls are specific to ADDING these to the existing architecture, not greenfield implementation.

**Critical insight:** The editor's existing architecture has three-layer settings merge (defaults < description < extendedSettings), direct Zustand subscriptions in CanvasEngine that bypass React, and MDI document state in a Map structure. New features must integrate carefully with these patterns to avoid breaking existing behavior.

**Highest-severity pitfalls:**
1. **Format=1.1 detection failure** — Maps without Format=1.1 prefix fail to parse, existing maps break
2. **Save As filePath desync** — Dirty flag and window title still reference old path after save-as
3. **Animation loop memory leak** — RAF continues after AnimationPanel unmounts when hidden
4. **Image overlay performance collapse** — Large PNGs (>2MB) cause 1-second render lag on pan/zoom

All pitfalls have proven mitigations documented with implementation examples.

---

## Critical Pitfalls

Mistakes that cause data loss, memory leaks, or major UX failures.

### Pitfall 1: Format Version Detection Failure (Settings Format Compliance)

**What goes wrong:** Parser assumes Format=1.1 always exists, fails to load maps created before format compliance was added. User opens existing map, gets blank settings or parse error. All pre-v1.0.4 maps become unreadable.

**Why it happens:** Settings serialization adds `Format=1.1` prefix automatically (MapSettingsDialog.tsx:33), but legacy maps don't have it. Parser checks for prefix presence without fallback. Developer assumes "we're adding this prefix now, so it's always there" but ignores backward compatibility.

**Consequences:**
- Data loss: Legacy maps fail to parse settings, revert to defaults
- UX failure: User edits map, settings silently reset on reload
- Breaking change: v1.0.4 can't open maps from v1.0.0-v1.0.3

**Prevention:**
```typescript
// BAD: Assumes Format=1.1 always exists
function parseSettings(description: string): Record<string, number> {
  if (!description.startsWith('Format=1.1')) {
    throw new Error('Invalid format version');
  }
  // ...parse settings...
}

// GOOD: Fallback to legacy parsing if Format=1.1 missing
function parseSettings(description: string): {
  settings: Record<string, number>;
  formatVersion: string | null;
} {
  const pairs = description.split(',').map(p => p.trim()).filter(Boolean);

  // Check for Format=X.Y prefix (optional)
  const formatPair = pairs.find(p => p.startsWith('Format='));
  const formatVersion = formatPair ? formatPair.split('=')[1] : null;

  // Parse settings with or without format prefix
  const settings: Record<string, number> = {};
  for (const pair of pairs) {
    if (pair.startsWith('Format=')) continue; // Skip format marker

    const match = pair.match(/^(\w+)=(.+)$/);
    if (match) {
      const [, key, valueStr] = match;
      const setting = GAME_SETTINGS.find(s => s.key === key);
      if (setting) {
        settings[key] = clampValue(parseInt(valueStr, 10), setting.min, setting.max);
      }
    }
  }

  return { settings, formatVersion };
}
```

**Detection (warning signs):**
- Legacy map opens, settings panel shows all defaults instead of custom values
- Console logs "Parse error: Invalid format version"
- Settings description field empty after loading pre-v1.0.4 map

**Mitigation strategy:**
1. Make Format=1.1 detection **optional**, not required
2. Add unit test: Load map without Format prefix, verify settings parse correctly
3. Document format evolution: v1.0.0-v1.0.3 (no prefix), v1.0.4+ (Format=1.1)
4. Add migration path: First save after v1.0.4 upgrade adds Format=1.1 prefix

**Phase that should address it:** Phase 1 (Settings Format Implementation) — must have backward compatibility from day one.

**Confidence:** HIGH — [Backward Compatibility in Schema Evolution](https://www.dataexpert.io/blog/backward-compatibility-schema-evolution-guide) confirms new fields must be optional or have defaults. MapSettingsDialog.tsx already handles unrecognized pairs, need to extend to handle missing format prefix.

---

### Pitfall 2: Save As File Path Desync (Save As Implementation)

**What goes wrong:** User does "Save As" to new path, but document still references old filePath internally. Dirty flag checks old path, window title shows old name, next "Save" writes to wrong location. User thinks they're editing "NewMap.map" but changes go to "OldMap.map".

**Why it happens:** Save As updates filePath in Electron IPC handler return value, but doesn't propagate to DocumentState.filePath in Zustand. Existing save() flow uses doc.filePath to determine destination. Developer adds Save As dialog but forgets to update document state after success.

**Consequences:**
- Data loss: User saves as "Backup.map", edits, hits Ctrl+S, overwrites original file
- UX confusion: Window title shows "OldMap.map" after saving as "NewMap.map"
- Dirty flag broken: modified=false set after Save As, but filePath still old

**Prevention:**
```typescript
// BAD: Save As doesn't update document filePath
async function handleSaveAs() {
  const newPath = await window.electron.saveMapDialog();
  if (!newPath) return;

  await saveMapToPath(newPath); // Writes file
  markSaved(); // Sets modified=false but filePath still old!
}

// GOOD: Update document state after successful Save As
async function handleSaveAs() {
  const { activeDocumentId, documents } = useEditorStore.getState();
  if (!activeDocumentId) return;

  const newPath = await window.electron.saveMapDialog();
  if (!newPath) return;

  const success = await saveMapToPath(newPath);
  if (!success) return;

  // Update document state with new path
  useEditorStore.setState((state) => {
    const newDocs = new Map(state.documents);
    const doc = newDocs.get(activeDocumentId);
    if (doc) {
      newDocs.set(activeDocumentId, {
        ...doc,
        filePath: newPath,
        modified: false
      });
    }
    return { documents: newDocs };
  });

  // Update window title to reflect new filename
  updateWindowTitle(activeDocumentId, extractFilename(newPath));
}
```

**Detection (warning signs):**
- After Save As, window title doesn't change to new filename
- Ctrl+S writes to original file instead of new save-as destination
- Developer console: filePath in DocumentState doesn't match last Save As path

**Mitigation strategy:**
1. Save As must update THREE things atomically: file on disk, DocumentState.filePath, window title
2. Add `updateFilePathForDocument(id, newPath)` action to documentsSlice
3. Test sequence: Open map → Save As → Edit → Ctrl+S → Verify writes to new path
4. Document state mutation order: Write file first (can fail), THEN update state (can't fail)

**Phase that should address it:** Phase 2 (Save As Implementation) — core requirement for feature correctness.

**Confidence:** HIGH — [Electron Save Dialog Documentation](https://www.electronjs.org/docs/latest/api/dialog) shows dialog.showSaveDialog returns `{ canceled, filePath }` but doesn't auto-update state. FileService.ts pattern already handles async dialog result, need to wire state update.

---

### Pitfall 3: Animation Loop Memory Leak (Animation Panel Independence)

**What goes wrong:** AnimationPanel starts RAF loop (requestAnimationFrame) to advance animation counter, but when panel is hidden (MDI window minimized or closed), RAF continues running. Memory leak grows as multiple RAF callbacks accumulate. Performance degrades, CPU usage spikes.

**Why it happens:** useEffect starts RAF loop, but cleanup function isn't called when component is hidden (only unmounted). React keeps component mounted for re-showing. Developer uses useEffect cleanup but doesn't account for visibility changes.

**Consequences:**
- Memory leak: RAF callback runs 60 FPS indefinitely, even when panel closed
- Performance degradation: Multiple panels opened/closed create multiple RAF loops
- Battery drain: Animation runs when app is in background
- Zombie subscriptions: CanvasEngine subscribes to animationFrame, never unsubscribes

**Prevention:**
```typescript
// BAD: RAF loop runs forever after panel mounts
useEffect(() => {
  let animationId: number;

  const animate = (timestamp: DOMHighResTimeStamp) => {
    advanceAnimationFrame();
    animationId = requestAnimationFrame(animate);
  };

  animationId = requestAnimationFrame(animate);

  return () => {
    cancelAnimationFrame(animationId); // Only runs on unmount!
  };
}, []);

// GOOD: Decouple animation from panel lifecycle
// 1. Move RAF loop to GlobalSlice (lives beyond component)
// 2. Use visibility-aware start/stop
// 3. Use Page Visibility API to pause when tab hidden

// In GlobalSlice:
startAnimationLoop: () => {
  const state = get();
  if (state.animationLoopId !== null) return; // Already running

  let lastFrameTime = 0;
  const FRAME_DURATION = 150; // ms per frame

  const animate = (timestamp: DOMHighResTimeStamp) => {
    if (timestamp - lastFrameTime >= FRAME_DURATION) {
      set((state) => ({ animationFrame: (state.animationFrame + 1) % 128 }));
      lastFrameTime = timestamp;
    }

    const state = get();
    if (state.animationLoopId === null) return; // Stopped
    state.animationLoopId = requestAnimationFrame(animate);
  };

  set({ animationLoopId: requestAnimationFrame(animate) });
},

stopAnimationLoop: () => {
  const { animationLoopId } = get();
  if (animationLoopId !== null) {
    cancelAnimationFrame(animationLoopId);
    set({ animationLoopId: null });
  }
},

// In App.tsx (top-level lifecycle):
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.hidden) {
      useEditorStore.getState().stopAnimationLoop();
    } else {
      useEditorStore.getState().startAnimationLoop();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  useEditorStore.getState().startAnimationLoop();

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    useEditorStore.getState().stopAnimationLoop();
  };
}, []);
```

**Detection (warning signs):**
- DevTools Performance profiler shows RAF callbacks after panel closed
- Task Manager: CPU usage stays high when animations hidden
- Console: "cancelAnimationFrame called with null" errors
- Multiple `animate()` functions in call stack after opening/closing panel repeatedly

**Mitigation strategy:**
1. **Never tie RAF loop to component lifecycle** — Move to global state (GlobalSlice)
2. Use Page Visibility API to pause when tab hidden (existing AnimationPanel.tsx:72-79 pattern)
3. Add conditional execution: Check `hasVisibleAnimatedTiles` before advancing frame (existing AnimationPanel.tsx:95)
4. Test sequence: Open panel → Close panel → Check RAF cancelled, Open 5 panels → Close all → Verify single RAF loop

**Phase that should address it:** Phase 3 (Animation Independence) — architectural change must be complete before adding image overlay (which also uses RAF).

**Confidence:** HIGH — [React useRequestAnimationFrame Hook](https://www.30secondsofcode.org/react/s/use-request-animation-frame/) and [Using requestAnimationFrame with React Hooks](https://css-tricks.com/using-requestanimationframe-with-react-hooks/) both emphasize cleanup function must call cancelAnimationFrame. AnimationPanel.tsx:90-109 already has RAF loop, need to move to app-level lifecycle.

---

### Pitfall 4: Image Overlay Performance Collapse (Large PNG Rendering)

**What goes wrong:** User loads 4K reference image (4096x4096 PNG, 8MB file) as trace overlay. Every pan/zoom triggers full image redraw via `ctx.drawImage()`. Frame rate drops from 60 FPS to <10 FPS. Editor becomes unusable.

**Why it happens:** Image overlay renders on every viewport change without caching. Canvas draws 16MP image at full resolution, scales on CPU. No layer separation, no GPU acceleration. Developer uses `ctx.drawImage(img, 0, 0)` in viewport change handler without debouncing.

**Consequences:**
- UX failure: Panning map lags 1 second per frame with large overlay
- Memory spike: 4096x4096 RGBA = 64MB per canvas layer
- Battery drain: Continuous CPU redraw kills laptop battery
- Editor hangs: 8K images (7680x4320) cause renderer process crash

**Prevention:**
```typescript
// BAD: Redraw full image on every viewport change
function drawOverlay(ctx: CanvasRenderingContext2D, image: HTMLImageElement, viewport: Viewport, opacity: number) {
  ctx.globalAlpha = opacity;
  ctx.drawImage(image, 0, 0); // Draws entire 4096x4096 image!
  ctx.globalAlpha = 1.0;
}

// GOOD: Use off-screen canvas caching + viewport clipping
class ImageOverlayEngine {
  private cachedCanvas: HTMLCanvasElement | null = null;
  private cachedImage: HTMLImageElement | null = null;

  // Pre-render image to off-screen canvas once
  cacheImage(image: HTMLImageElement) {
    if (this.cachedImage === image) return; // Already cached

    const canvas = document.createElement('canvas');
    const maxSize = 2048; // Clamp to reasonable size
    const scale = Math.min(1, maxSize / Math.max(image.width, image.height));

    canvas.width = image.width * scale;
    canvas.height = image.height * scale;

    const ctx = canvas.getContext('2d', { alpha: true })!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    this.cachedCanvas = canvas;
    this.cachedImage = image;
  }

  // Draw only visible portion (viewport culling)
  drawOverlay(
    screenCtx: CanvasRenderingContext2D,
    viewport: Viewport,
    opacity: number,
    overlayPosition: { x: number; y: number }
  ) {
    if (!this.cachedCanvas) return;

    // Calculate visible region in overlay space
    const srcX = Math.max(0, (viewport.x * 16) - overlayPosition.x);
    const srcY = Math.max(0, (viewport.y * 16) - overlayPosition.y);
    const srcW = Math.min(this.cachedCanvas.width - srcX, screenCtx.canvas.width / viewport.zoom);
    const srcH = Math.min(this.cachedCanvas.height - srcY, screenCtx.canvas.height / viewport.zoom);

    if (srcW <= 0 || srcH <= 0) return; // Overlay not in viewport

    screenCtx.globalAlpha = opacity;
    screenCtx.drawImage(
      this.cachedCanvas,
      srcX, srcY, srcW, srcH, // Source region (visible portion only)
      0, 0, srcW * viewport.zoom, srcH * viewport.zoom // Dest region (scaled)
    );
    screenCtx.globalAlpha = 1.0;
  }
}
```

**Additional optimizations:**
1. **Image size limit:** Warn if image >2048px, prompt to scale down
2. **Lazy loading:** Only render overlay if opacity >0 and visible in viewport
3. **RAF debouncing:** Batch viewport changes, redraw at 60 FPS max
4. **CSS transform alternative:** Use CSS `transform: translate()` for overlay positioning (GPU-accelerated) instead of canvas redraw

**Detection (warning signs):**
- DevTools Performance: `drawImage()` calls take >16ms per frame
- Frame rate drops below 30 FPS when overlay visible
- Memory usage spikes >500MB with overlay enabled
- Image loading triggers main thread jank (>100ms blocking)

**Mitigation strategy:**
1. **Phase 4A (Image Overlay Core):** Implement off-screen canvas caching, viewport culling
2. **Phase 4B (Image Overlay Optimization):** Add size limit warning, lazy rendering, RAF debouncing
3. Test with realistic images: 1024x1024 (ideal), 2048x2048 (acceptable), 4096x4096 (warning), 8192x8192 (reject)
4. Add performance budget: Overlay render must complete in <5ms at 1x zoom

**Phase that should address it:** Phase 4 (Image Trace Overlay) — performance optimization must be part of initial implementation, not retrofit.

**Confidence:** HIGH — [Optimizing Canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas) and [Optimize HTML5 Canvas Rendering with Layering](https://developer.ibm.com/tutorials/wa-canvashtml5layering/) both recommend off-screen canvas caching and viewport culling. [DrawOverlay GitHub](https://github.com/UrTexts/DrawOverlay) shows real-world pattern: pre-render to buffer, adjust opacity via globalAlpha.

---

## Moderate Pitfalls

Mistakes that cause bugs or poor UX, but not data loss or crashes.

### Pitfall 5: Dirty Flag Race Condition After Save As

**What goes wrong:** User edits map, does Save As, immediately closes window. Editor prompts "Save changes to NewMap.map?" even though Save As just succeeded. User confused whether changes were saved.

**Why it happens:** Save As sets modified=false, but close handler checks stale state. Zustand state update is asynchronous, close handler reads old value. Developer assumes setState is synchronous.

**Prevention:**
```typescript
// BAD: State update and close check race
async function handleSaveAs() {
  const newPath = await saveMapDialog();
  if (!newPath) return;

  await saveMapToPath(newPath);
  markSaved(); // Async setState

  // Close handler immediately checks modified flag — reads old value!
}

// GOOD: Use getState() after setState completes
async function handleSaveAs() {
  const { activeDocumentId } = useEditorStore.getState();
  if (!activeDocumentId) return;

  const newPath = await saveMapDialog();
  if (!newPath) return;

  const success = await saveMapToPath(newPath);
  if (!success) return;

  // Update state synchronously
  useEditorStore.setState((state) => {
    const newDocs = new Map(state.documents);
    const doc = newDocs.get(activeDocumentId);
    if (doc) {
      newDocs.set(activeDocumentId, { ...doc, filePath: newPath, modified: false });
    }
    return { documents: newDocs };
  });

  // Verify state update succeeded before proceeding
  const updatedDoc = useEditorStore.getState().documents.get(activeDocumentId);
  if (updatedDoc?.modified === false) {
    console.log('Save As succeeded, document marked clean');
  }
}
```

**Mitigation:** Use Zustand's synchronous setState, verify state after mutation, add integration test for Save As → Close sequence.

**Phase that should address it:** Phase 2 (Save As Implementation) — test close-after-save behavior explicitly.

---

### Pitfall 6: Window Title Stale After Save As (MDI State Desync)

**What goes wrong:** User saves map as "NewMap.map", window title still shows "OldMap.map". Window list shows duplicate "OldMap.map" entries. User can't tell which window is which.

**Why it happens:** Save As updates DocumentState.filePath but doesn't notify WindowSlice to update title. MDI window title stored separately in windowStates Map. Developer updates document state but forgets window state.

**Prevention:**
```typescript
// In documentsSlice.ts:
updateFilePathForDocument: (id, newPath) => {
  set((state) => {
    const newDocs = new Map(state.documents);
    const doc = newDocs.get(id);
    if (!doc) return state;

    // Update document filePath
    newDocs.set(id, { ...doc, filePath: newPath, modified: false });

    // Extract filename for window title
    const filename = newPath.split(/[\\/]/).pop() || 'Untitled';

    // Update window state title
    const newWindowStates = new Map(state.windowStates);
    const windowState = newWindowStates.get(id);
    if (windowState) {
      newWindowStates.set(id, { ...windowState, title: filename });
    }

    return { documents: newDocs, windowStates: newWindowStates };
  });
}
```

**Mitigation:** Add cross-slice state sync helper, update both DocumentState and WindowState atomically.

**Phase that should address it:** Phase 2 (Save As Implementation) — window title must update immediately after Save As.

---

### Pitfall 7: Animation Frame Counter Overflow

**What goes wrong:** Editor runs for hours, animationFrame counter reaches Number.MAX_SAFE_INTEGER, wraps to negative, animation indices break. Animated tiles freeze or flicker.

**Why it happens:** GlobalSlice increments animationFrame indefinitely without modulo. Counter used for array indexing without bounds checking. Developer doesn't expect long-running sessions.

**Prevention:**
```typescript
// BAD: Unbounded counter
advanceAnimationFrame: () => {
  set((state) => ({ animationFrame: state.animationFrame + 1 }));
}

// GOOD: Bounded counter with modulo
advanceAnimationFrame: () => {
  set((state) => ({ animationFrame: (state.animationFrame + 1) % 128 }));
}
```

**Mitigation:** Use modulo 128 (max animation frame count), matches existing AnimationPanel offset range (0-127).

**Phase that should address it:** Phase 3 (Animation Independence) — fix when moving RAF loop to GlobalSlice.

---

### Pitfall 8: Image Overlay Click-Through Breaks Tools

**What goes wrong:** User enables image overlay with 50% opacity, tries to paint tiles, clicks go to overlay window instead of map canvas. Tools don't respond. User can't edit map with overlay visible.

**Why it happens:** Image overlay MDI window renders on top of map window, captures all mouse events. react-rnd handles drag but doesn't forward clicks to layers below. Developer implements overlay without pointer-events CSS.

**Prevention:**
```typescript
// In ImageOverlayWindow.tsx:
<div
  className="image-overlay-window"
  style={{
    pointerEvents: isInteractive ? 'auto' : 'none', // Click-through when not dragging
    opacity: overlayOpacity
  }}
>
  <div
    className="overlay-drag-handle"
    style={{ pointerEvents: 'auto' }} // Only handle is interactive
  >
    {/* Drag handle always captures clicks */}
  </div>
  <img
    src={overlayImageUrl}
    style={{ pointerEvents: 'none' }} // Image never captures clicks
  />
</div>
```

**Mitigation:** Use CSS `pointer-events: none` on overlay image, `pointer-events: auto` only on drag handle. Add toggle button for "interactive mode" if user needs to reposition frequently.

**Phase that should address it:** Phase 4 (Image Trace Overlay) — click-through is core UX requirement.

---

### Pitfall 9: Format=1.1 Prefix Duplication on Repeated Saves

**What goes wrong:** User opens map, edits settings, saves, opens again, saves again. Description becomes "Format=1.1, Format=1.1, LaserDamage=27, ...". Settings fail to parse after 3rd save.

**Why it happens:** serializeSettings() adds Format=1.1 unconditionally, doesn't check if already present. Each save appends new prefix. Parser breaks when multiple Format entries exist.

**Prevention:**
```typescript
// BAD: Unconditional prefix injection
function serializeSettings(settings: Record<string, number>): string {
  const pairs = GAME_SETTINGS.map(s => `${s.key}=${settings[s.key] ?? s.default}`);
  return ['Format=1.1', ...pairs].join(', '); // Always adds prefix!
}

// GOOD: Idempotent serialization
function serializeSettings(settings: Record<string, number>, existingDescription?: string): string {
  // Check if Format=1.1 already exists in description
  const hasFormatPrefix = existingDescription?.includes('Format=1.1');

  const pairs = GAME_SETTINGS.map(s => `${s.key}=${settings[s.key] ?? s.default}`);

  if (hasFormatPrefix) {
    return pairs.join(', '); // Prefix already present, don't duplicate
  } else {
    return ['Format=1.1', ...pairs].join(', '); // Add prefix for first time
  }
}
```

**Mitigation:** Check existing description for Format prefix before adding, make serialization idempotent.

**Phase that should address it:** Phase 1 (Settings Format Implementation) — prevent corruption from repeated saves.

---

### Pitfall 10: Image Overlay Position Lost on Window Resize

**What goes wrong:** User positions overlay perfectly over map reference area, resizes main window, overlay jumps to (0,0). User has to reposition after every resize. Frustrating workflow.

**Why it happens:** Overlay position stored in pixel coordinates, window resize changes canvas dimensions, pixel coords no longer valid. react-rnd doesn't persist position across parent resize. Developer uses absolute positioning without percentage or anchor points.

**Prevention:**
```typescript
// Store overlay position as percentage of canvas OR tile coordinates
interface OverlayState {
  imageUrl: string;
  opacity: number;
  position: {
    tileX: number; // Anchor to tile coordinates (invariant to window size)
    tileY: number;
  };
  size: {
    width: number; // Pixels (for react-rnd)
    height: number;
  };
}

// Convert tile coords to screen coords on render
function getScreenPosition(tileX: number, tileY: number, viewport: Viewport): { x: number; y: number } {
  return {
    x: (tileX - viewport.x) * 16 * viewport.zoom,
    y: (tileY - viewport.y) * 16 * viewport.zoom
  };
}
```

**Mitigation:** Store position in tile coordinates (like game objects), convert to screen pixels on render.

**Phase that should address it:** Phase 4 (Image Trace Overlay) — position persistence is part of core feature.

---

## Minor Pitfalls

Small issues that cause confusion or minor bugs.

### Pitfall 11: Save As Default Filename Doesn't Match Current Map

**What goes wrong:** User opens "Arena.map", does Save As, dialog shows "Untitled.map" as default. User has to retype entire filename. Minor UX annoyance.

**Why it happens:** saveMapDialog() doesn't accept defaultName parameter. Electron dialog.showSaveDialog called without defaultPath. Developer didn't wire current filename to dialog.

**Prevention:**
```typescript
// In main.ts IPC handler:
ipcMain.handle('dialog:saveFile', async (_, defaultName?: string) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    defaultPath: defaultName, // Use current filename as default
    filters: [
      { name: 'Map Files', extensions: ['map'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  // ...
});

// In App.tsx:
async function handleSaveAs() {
  const { filePath } = useEditorStore.getState().documents.get(activeDocumentId)!;
  const currentName = filePath?.split(/[\\/]/).pop() || 'Untitled.map';
  const newPath = await window.electron.saveMapDialog(currentName);
  // ...
}
```

**Mitigation:** Pass current filename to saveMapDialog, use as defaultPath in Electron dialog.

**Phase that should address it:** Phase 2 (Save As Implementation) — small UX polish.

---

### Pitfall 12: Animation Stops When All Documents Closed

**What goes wrong:** User closes all map documents, opens AnimationPanel to preview animations, nothing animates. Panel shows static frames. User thinks panel is broken.

**Why it happens:** Animation loop checks hasVisibleAnimatedTiles (computed from documents Map), returns false when no documents open. RAF loop pauses. AnimationPanel itself has animated tiles but doesn't count.

**Prevention:**
```typescript
// In GlobalSlice animation loop:
const animate = (timestamp: DOMHighResTimeStamp) => {
  // Check if ANY component needs animation (maps OR panel)
  const hasVisibleAnimated = checkVisibleAnimatedTiles();
  const isPanelOpen = checkAnimationPanelOpen(); // New check

  if (!document.hidden && (hasVisibleAnimated || isPanelOpen)) {
    if (timestamp - lastFrameTime >= FRAME_DURATION) {
      advanceAnimationFrame();
      lastFrameTime = timestamp;
    }
  }

  requestAnimationFrame(animate);
};
```

**Mitigation:** Animation loop should run when AnimationPanel is open OR when animated tiles visible in any document.

**Phase that should address it:** Phase 3 (Animation Independence) — panel should work standalone.

---

### Pitfall 13: Image Overlay Opacity Slider Doesn't Update Live

**What goes wrong:** User drags opacity slider, overlay doesn't update until mouseup. User can't see effect of changes while dragging. Feels broken.

**Why it happens:** Overlay reads opacity from Zustand state, slider only updates state on onChange (mouseup). No onInput handler for live updates during drag.

**Prevention:**
```typescript
// BAD: Only update on mouseup
<input
  type="range"
  min={0}
  max={100}
  value={overlayOpacity}
  onChange={(e) => setOverlayOpacity(parseInt(e.target.value))} // Only fires on mouseup!
/>

// GOOD: Update on input for live preview
<input
  type="range"
  min={0}
  max={100}
  value={overlayOpacity}
  onInput={(e) => setOverlayOpacity(parseInt(e.currentTarget.value))} // Fires during drag
/>
```

**Mitigation:** Use onInput for live updates, debounce Zustand updates to avoid thrashing.

**Phase that should address it:** Phase 4 (Image Trace Overlay) — UX polish for overlay controls.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| **Phase 1: Settings Format=1.1** | Format detection failure (Pitfall 1), prefix duplication (Pitfall 9) | Make format detection optional, check existing description before adding prefix |
| **Phase 2: Save As Implementation** | File path desync (Pitfall 2), dirty flag race (Pitfall 5), window title stale (Pitfall 6) | Update filePath + modified + window title atomically, use getState() to verify, add Save As→Close integration test |
| **Phase 3: Animation Independence** | RAF memory leak (Pitfall 3), counter overflow (Pitfall 7), panel-closed animation stop (Pitfall 12) | Move RAF to GlobalSlice, use Page Visibility API, modulo counter to 128, run animation when panel OR documents have animated tiles |
| **Phase 4: Image Trace Overlay** | Performance collapse (Pitfall 4), click-through breaks tools (Pitfall 8), position lost on resize (Pitfall 10), opacity slider lag (Pitfall 13) | Off-screen canvas cache, viewport culling, pointer-events: none, tile-coordinate anchoring, onInput for live updates |

---

## Integration Pitfall Matrix

Cross-feature interactions and shared architectural concerns.

### Settings ↔ Save As
**Risk:** Save As doesn't trigger settings re-serialization, Format=1.1 prefix missing in new file.

**Mitigation:** Save As uses same serialization path as Save, buildDescription() always adds prefix.

---

### Animation ↔ Image Overlay
**Risk:** Two separate RAF loops (animation + overlay redraw) compete for frame budget, drop to 30 FPS.

**Mitigation:** Single RAF loop in GlobalSlice, both animation and overlay subscribe to same frame tick.

---

### Save As ↔ MDI Window Management
**Risk:** Save As creates new document ID, window state references old ID, window becomes orphaned.

**Mitigation:** Save As updates existing document, doesn't create new one. Same ID before and after.

---

### Image Overlay ↔ Canvas Rendering
**Risk:** Overlay renders on map buffer canvas, overwrites tile data, causes corruption.

**Mitigation:** Overlay renders on separate canvas layer (new MDI window), never touches map buffer.

---

## Pre-Implementation Checklist

Before starting each phase, verify:

**Phase 1 (Settings Format):**
- [ ] parseSettings() handles descriptions with AND without Format=1.1 prefix
- [ ] Unit test: Legacy map (no prefix) loads correctly
- [ ] serializeSettings() checks for existing prefix before adding
- [ ] Format version documented in MapHeader interface

**Phase 2 (Save As):**
- [ ] Save As updates DocumentState.filePath + modified + WindowState.title atomically
- [ ] Integration test: Save As → Ctrl+S → Verify writes to new path
- [ ] Integration test: Save As → Close → No "unsaved changes" prompt
- [ ] saveMapDialog() accepts defaultName parameter

**Phase 3 (Animation Independence):**
- [ ] RAF loop moved to GlobalSlice, not component lifecycle
- [ ] Page Visibility API pauses animation when tab hidden
- [ ] animationFrame counter uses modulo 128
- [ ] Animation runs when AnimationPanel open OR documents have animated tiles
- [ ] Cleanup on app unmount: stopAnimationLoop() called

**Phase 4 (Image Trace Overlay):**
- [ ] Off-screen canvas caching implemented for overlay image
- [ ] Viewport culling: Only render visible portion of overlay
- [ ] Image size limit: Warn if >2048px, prompt to scale
- [ ] Click-through: pointer-events: none on overlay image
- [ ] Position stored in tile coordinates, not pixels
- [ ] Opacity slider uses onInput for live updates
- [ ] Performance budget: Overlay render <5ms per frame at 1x zoom

---

## Testing Strategy by Pitfall

### Backward Compatibility Testing (Pitfall 1, 9)
1. Create test maps: v1.0.0 (no Format prefix), v1.0.4 (Format=1.1)
2. Load each map in v1.0.4, verify settings parse correctly
3. Edit settings, save, reload, verify Format=1.1 not duplicated
4. Roundtrip test: v1.0.0 map → load → save → verify Format=1.1 added once

### Save As State Consistency Testing (Pitfall 2, 5, 6, 11)
1. Open "TestMap.map" → Edit → Save As "NewMap.map"
2. Verify: Window title = "NewMap.map", filePath = "NewMap.map", modified = false
3. Edit map → Ctrl+S → Verify writes to "NewMap.map" not "TestMap.map"
4. Save As → Immediately close window → Verify no "unsaved changes" prompt
5. Save As with no edits → Verify defaultName = "TestMap.map" in dialog

### Animation Lifecycle Testing (Pitfall 3, 7, 12)
1. Open AnimationPanel → DevTools Performance → Verify single RAF loop
2. Close AnimationPanel → Verify RAF cancelled (no animate() in call stack)
3. Open panel → Close panel → Repeat 10x → Verify no RAF accumulation
4. Open panel with no documents → Verify animations play (counter advances)
5. Leave editor running 10 minutes → Verify animationFrame counter <128

### Image Overlay Performance Testing (Pitfall 4, 8, 10, 13)
1. Load 1024x1024 test image → Verify <5ms render time in DevTools
2. Load 4096x4096 test image → Verify warning shown, prompt to scale
3. Enable overlay at 50% opacity → Paint tiles → Verify clicks go to map, not overlay
4. Position overlay at (100, 100 tiles) → Resize window → Verify position preserved
5. Drag opacity slider → Verify overlay updates live during drag
6. Pan map with overlay visible → Verify 60 FPS maintained (DevTools FPS meter)

---

## Sources

### Official Documentation (HIGH confidence)
- [Electron Dialog API](https://www.electronjs.org/docs/latest/api/dialog) — Save dialog callback, file path handling
- [Canvas 2D API: globalAlpha](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalAlpha) — Opacity control for overlay rendering
- [Optimizing Canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas) — Off-screen canvas, layer caching, viewport culling

### Best Practices (MEDIUM confidence)
- [Using requestAnimationFrame with React Hooks](https://css-tricks.com/using-requestanimationframe-with-react-hooks/) — RAF cleanup patterns, memory leak prevention
- [React useRequestAnimationFrame Hook](https://www.30secondsofcode.org/react/s/use-request-animation-frame/) — Proper useEffect cleanup for RAF
- [Backward Compatibility in Schema Evolution](https://www.dataexpert.io/blog/backward-compatibility-schema-evolution-guide) — Optional fields, default values, migration strategies
- [Format Versioning — Apache Arrow](https://arrow.apache.org/docs/format/Versioning.html) — Major/minor version handling, forward/backward compatibility

### Real-World Patterns (LOW confidence)
- [DrawOverlay GitHub](https://github.com/UrTexts/DrawOverlay) — Transparent image overlay, opacity control, click-through mode
- [Optimize HTML5 Canvas Rendering with Layering](https://developer.ibm.com/tutorials/wa-canvashtml5layering/) — Multi-layer canvas architecture, performance optimization
- [Wplace Tracer Pro Chrome Extension](https://chromewebstore.google.com/detail/wplace-tracer-pro/eackhkbccjoheobjnkcnomknknnpihjl) — Image overlay with opacity, scaling, reference use case

### Codebase Analysis (HIGH confidence)
- E:\NewMapEditor\src\components\MapSettingsDialog\MapSettingsDialog.tsx — Current settings serialization (lines 15-100)
- E:\NewMapEditor\src\components\AnimationPanel\AnimationPanel.tsx — Existing RAF loop (lines 90-109), visibility handling (lines 72-79)
- E:\NewMapEditor\src\core\canvas\CanvasEngine.ts — Buffer architecture, viewport rendering, performance patterns
- E:\NewMapEditor\electron\main.ts — IPC handlers for file dialogs (lines 232-261), save dialog implementation
- E:\NewMapEditor\src\core\editor\slices\documentsSlice.ts — DocumentState structure, filePath tracking, modified flag

---

**Research completed:** 2026-02-17
**Ready for roadmap:** Yes
**Overall confidence:** HIGH (official docs + codebase analysis + real-world patterns)
