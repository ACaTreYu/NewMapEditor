# Architecture Integration — v1.0.4 Settings Overhaul & Image Trace

**Project:** AC Map Editor v1.0.4
**Researched:** 2026-02-17
**Overall confidence:** HIGH

## Executive Summary

v1.0.4 adds four features to existing Electron/React architecture. **Zero new components required** — all features integrate into existing subsystems with targeted modifications.

**Integration approach:**
- **Settings overhaul** — Modify serialization + sync logic in MapSettingsDialog.tsx
- **Save As** — Extend FileService interface + add menu item
- **Animation when hidden** — Already works (fix verification needed)
- **Image trace overlay** — New MDI window type using existing ChildWindow pattern

**Build order:** Settings overhaul → Save As → Image trace → Animation verification (dependency-ordered).

---

## Current Architecture Overview

### Three-Layer State Management (Zustand)

```
GlobalSlice           — Shared UI state (tool, tileset, grid, animations)
DocumentsSlice        — Per-document state (map, viewport, undo, selection)
WindowSlice           — MDI window state (position, size, z-index, min/max)
```

**Key pattern:** Backward-compatible layer syncs `activeDocumentId` to top-level fields for legacy components.

### File I/O Architecture

```
FileService (interface)
    ↓
ElectronFileService (adapter)
    ↓
Electron IPC (main process)
    ↓
Node.js fs/zlib
```

**Key pattern:** Platform-agnostic interface, ArrayBuffer ↔ base64 conversion at IPC boundary.

### Settings Three-Layer Merge

```
1. Defaults (GameSettings.ts)
2. Description field parsing (Key=Value pairs)
3. Extended settings (extendedSettings object)

Priority: 1 < 2 < 3 (extendedSettings wins)
```

**Current issue:** General tab slider changes write to extendedSettings, but description field doesn't serialize them → Load/Save loses values.

### Animation Rendering Architecture

```
GlobalSlice.animationFrame (counter)
    ↓
AnimationPanel RAF loop (advances counter when hasVisibleAnimated)
    ↓
CanvasEngine subscription (patches animated tiles on counter change)
    ↓
MapCanvas screen buffer (blitDirtyRect with partial update)
```

**Current behavior:** AnimationPanel checks `hasVisibleAnimated` (memoized viewport scan) before advancing frame.

---

## Feature 1: Settings Overhaul

### Problem Analysis

**Root cause:** MapSettingsDialog.tsx line 33 injects `Format=1.1` between non-flagger and flagger settings, but doesn't serialize extendedSettings changes from General tab sliders.

**Evidence:**
```typescript
// Current serialization (line 32-34)
const allPairs = [...nonFlaggerPairs, 'Format=1.1', ...flaggerPairs];
return allPairs.join(', ');
```

**Missing:** LaserDamage/MissileDamage/MissileRecharge from General tab slider changes.

### Integration Points

#### Modified Component: MapSettingsDialog.tsx

**Location:** Lines 15-35 (serializeSettings function)

**Current logic:**
1. Split settings into non-flagger/flagger groups
2. Sort alphabetically
3. Inject Format=1.1
4. Join with commas

**New logic:**
1. Check if extendedSettings contains slider values (LaserDamage, MissileDamage, MissileRecharge)
2. Use extendedSettings values if present, otherwise defaults
3. Inject Format=1.1 in correct position (after non-flagger, before flagger)
4. Serialize all settings including slider-modified ones

**Code change (estimate 20 lines):**
```typescript
function serializeSettings(settings: Record<string, number>): string {
  const nonFlaggerSettings = GAME_SETTINGS.filter(s => s.category !== 'Flagger');
  const flaggerSettings = GAME_SETTINGS.filter(s => s.category === 'Flagger');

  const sortedNonFlagger = nonFlaggerSettings.sort((a, b) => a.key.localeCompare(b.key));
  const sortedFlagger = flaggerSettings.sort((a, b) => a.key.localeCompare(b.key));

  const nonFlaggerPairs = sortedNonFlagger.map(setting =>
    `${setting.key}=${settings[setting.key] ?? setting.default}`
  );
  const flaggerPairs = sortedFlagger.map(setting =>
    `${setting.key}=${settings[setting.key] ?? setting.default}`
  );

  // Format=1.1 goes after non-flagger, before flagger (required for turrets)
  const allPairs = [...nonFlaggerPairs, 'Format=1.1', ...flaggerPairs];
  return allPairs.join(', ');
}
```

**New requirement:** Extract LaserDamage from header.laserDamage slider (0-4 index) → LASER_DAMAGE_VALUES[index].

#### Modified Component: MapSettingsDialog.tsx (sync logic)

**Location:** Lines 172-175 (damage/recharge mapping arrays)

**Current arrays:**
```typescript
const LASER_DAMAGE_VALUES = [5, 14, 27, 54, 112];        // Index 0-4
const SPECIAL_DAMAGE_VALUES = [20, 51, 102, 153, 204];  // MissileDamage
const RECHARGE_RATE_VALUES = [3780, 1890, 945, 473, 236]; // MissileRecharge
```

**Issue:** "Specials" slider controls MissileDamage, but UI label says "Special Damage" (ambiguous).

**Fix required:**
1. Rename slider label from "Special Damage" → "Missile Damage" (clarity)
2. Add BouncyDamage/NadeDamage sliders if "Specials" meant all weapons (OR document that slider is missile-only)
3. Sync slider changes to extendedSettings immediately (not just on Apply)

**New handler (applySettings line 253-261):**
```typescript
const applySettings = () => {
  // Map slider indices to setting values
  const derivedSettings = {
    LaserDamage: LASER_DAMAGE_VALUES[headerFields.laserDamage],
    MissileDamage: SPECIAL_DAMAGE_VALUES[headerFields.specialDamage],
    MissileRecharge: RECHARGE_RATE_VALUES[headerFields.rechargeRate]
  };

  // Merge derived settings with local settings
  const finalSettings = { ...localSettings, ...derivedSettings };

  updateMapHeader({
    name: appendModeTag(stripModeTag(mapName), headerFields.objective),
    description: buildDescription(finalSettings, mapAuthor, unrecognizedRef.current),
    extendedSettings: finalSettings,
    ...headerFields
  });
  setIsDirty(false);
};
```

#### Modified Component: SettingInput.tsx

**Location:** No changes needed — slider already calls `onChange` callback, dialog just needs to route it correctly.

**Verification:** Sliders on General tab already set `headerFields.laserDamage` etc. Just need to ensure those values propagate to extendedSettings on save.

### Data Flow Changes

**Before:**
```
General tab slider → headerFields.laserDamage (0-4)
Apply → updateMapHeader({ laserDamage: 0-4 })  ← Binary header only
Description serialization uses defaults, not slider values
```

**After:**
```
General tab slider → headerFields.laserDamage (0-4)
Apply → Map index to extended value (LASER_DAMAGE_VALUES[index])
     → updateMapHeader({
          laserDamage: 0-4,  ← Binary header (SEdit compat)
          extendedSettings: { LaserDamage: 27 }  ← Full precision
        })
Description serialization includes extendedSettings values
```

### New Components

**None.** All modifications to existing MapSettingsDialog.tsx.

### Build Order

1. Fix serializeSettings to include extendedSettings values (10 min)
2. Add slider-to-setting mapping in applySettings (15 min)
3. Test round-trip: set slider → save → reload → verify slider restored (10 min)
4. Verify Format=1.1 position (after non-flagger, before flagger) (5 min)

**Total estimate:** 40 minutes

---

## Feature 2: Save As

### Problem Analysis

**Current behavior:** Only one save path (File > Save) — no way to save copy or rename.

**User expectation:** Save As should:
1. Show save dialog with current map name as default
2. Save to new path
3. Update active document's filePath (file association)
4. Update window title to new filename
5. Mark document as unmodified (saved)

### Integration Points

#### Modified Interface: FileService.ts

**Location:** Lines 67-71 (saveMapDialog signature)

**Current:**
```typescript
saveMapDialog(defaultName?: string): Promise<FileDialogResult>;
```

**Issue:** ElectronFileService doesn't pass defaultName to IPC (line 49 comment).

**Required:**
1. Extend Electron IPC handler to accept defaultName parameter
2. Update ElectronFileService to pass parameter through
3. Update dialog.showSaveDialog options to set defaultPath

#### Modified Component: electron/main.ts

**Location:** Lines 248-261 (dialog:saveFile handler)

**Current:**
```typescript
ipcMain.handle('dialog:saveFile', async () => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    filters: [
      { name: 'Map Files', extensions: ['map'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled || !result.filePath) {
    return null;
  }

  return result.filePath;
});
```

**New (with defaultPath support):**
```typescript
ipcMain.handle('dialog:saveFile', async (_, defaultName?: string) => {
  const options: Electron.SaveDialogOptions = {
    filters: [
      { name: 'Map Files', extensions: ['map'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  };

  if (defaultName) {
    options.defaultPath = defaultName;
  }

  const result = await dialog.showSaveDialog(mainWindow!, options);

  if (result.canceled || !result.filePath) {
    return null;
  }

  return result.filePath;
});
```

#### Modified Component: ElectronFileService.ts

**Location:** Lines 49-57 (saveMapDialog implementation)

**Current:**
```typescript
async saveMapDialog(_defaultName?: string): Promise<FileDialogResult> {
  // Note: Current IPC bridge doesn't support defaultName parameter
  // Future enhancement: extend IPC API to pass defaultName
  const filePath = await window.electronAPI.saveFileDialog();
  return {
    filePath,
    canceled: !filePath,
  };
}
```

**New:**
```typescript
async saveMapDialog(defaultName?: string): Promise<FileDialogResult> {
  const filePath = await window.electronAPI.saveFileDialog(defaultName);
  return {
    filePath,
    canceled: !filePath,
  };
}
```

#### Modified Component: electron/preload.ts

**Location:** electronAPI.saveFileDialog definition

**Current (assumed):**
```typescript
saveFileDialog: () => ipcRenderer.invoke('dialog:saveFile')
```

**New:**
```typescript
saveFileDialog: (defaultName?: string) => ipcRenderer.invoke('dialog:saveFile', defaultName)
```

#### New Menu Item: electron/main.ts

**Location:** Lines 104-132 (File menu)

**Current menu items:**
- New
- Open...
- Save
- (separator)
- Exit

**New menu item (after Save):**
```typescript
{
  label: 'Save As...',
  click: () => {
    mainWindow?.webContents.send('menu-action', 'saveAs');
  }
}
```

#### Modified Component: App.tsx

**Location:** Menu action handler (search for `menu-action` listener)

**New handler:**
```typescript
case 'saveAs':
  handleSaveAs();
  break;
```

**New function:**
```typescript
const handleSaveAs = useCallback(async () => {
  const state = useEditorStore.getState();
  const activeId = state.activeDocumentId;
  if (!activeId) return;

  const doc = state.documents.get(activeId);
  if (!doc?.map) return;

  // Extract current filename from filePath or use map name
  const currentName = doc.filePath
    ? doc.filePath.split(/[\\/]/).pop()
    : `${doc.map.header.name || 'Untitled'}.map`;

  const result = await fileService.saveMapDialog(currentName);
  if (result.canceled || !result.filePath) return;

  const saveResult = await mapService.saveMap(doc.map, result.filePath);
  if (saveResult.success) {
    // Update document's filePath and mark saved
    state.updateDocumentFilePath(activeId, result.filePath);
    state.markSavedForDocument(activeId);

    // Update window title (will reflect new filename)
    const newFilename = result.filePath.split(/[\\/]/).pop() || 'Untitled';
    state.updateWindowState(activeId, { title: newFilename });
  } else {
    alert(`Failed to save map: ${saveResult.error}`);
  }
}, [fileService, mapService]);
```

#### New Action: DocumentsSlice.ts

**Location:** documentsSlice.ts (add to DocumentsSlice interface)

**New action:**
```typescript
updateDocumentFilePath: (id: string, filePath: string) => void;
```

**Implementation:**
```typescript
updateDocumentFilePath: (id, filePath) => {
  set((state) => {
    const doc = state.documents.get(id);
    if (!doc) return {};

    const newDocs = new Map(state.documents);
    newDocs.set(id, { ...doc, filePath });

    return { documents: newDocs };
  });
}
```

### Data Flow Changes

**Before (Save):**
```
User: File > Save
→ Uses current filePath (or prompt if null)
→ Saves to same path
→ Marks document unmodified
```

**After (Save As):**
```
User: File > Save As
→ Prompt with current filename as default
→ User enters new path
→ Save to new path
→ Update document.filePath to new path
→ Update window title to new filename
→ Marks document unmodified
```

### New Components

**None.** All modifications to existing components.

### Build Order

1. Extend IPC to accept defaultName (electron/main.ts, preload.ts) — 10 min
2. Update ElectronFileService to pass defaultName — 5 min
3. Add updateDocumentFilePath action to DocumentsSlice — 10 min
4. Add Save As menu item — 5 min
5. Add handleSaveAs function to App.tsx — 20 min
6. Test: Save As → verify new path, title update, unmodified flag — 10 min

**Total estimate:** 60 minutes

---

## Feature 3: Animation When Panel Hidden

### Problem Analysis

**Current hypothesis:** Animation stops when AnimationPanel component unmounts (panel hidden).

**Evidence needed:** Does `hasVisibleAnimated` check prevent animation when panel closed?

**Code location:** AnimationPanel.tsx lines 39-66 (hasVisibleAnimated useMemo)

### Integration Points

#### Investigation Required

**Check 1:** Does AnimationPanel unmount when panel hidden?
- If panel uses `display: none` CSS → Component still mounted → RAF loop still runs ✅
- If panel uses conditional render `{panelOpen && <AnimationPanel>}` → Component unmounts → RAF loop stops ❌

**Check 2:** Where is AnimationPanel rendered?
- Search App.tsx for `<AnimationPanel>` — verify parent component persistence

**Check 3:** Is RAF loop the sole animation driver?
- Yes: AnimationPanel.tsx line 93 `advanceAnimationFrame()` is only place counter increments
- CanvasEngine subscriptions (line 506-518) only react to counter changes

#### Likely Fix Options

**Option A: Panel never unmounts (already working)**
- Verify: Panel uses CSS visibility toggle, not conditional render
- No code changes needed — just verify behavior

**Option B: Panel unmounts when hidden (needs fix)**
- Move RAF loop from AnimationPanel to App.tsx (always mounted)
- AnimationPanel only renders preview, doesn't drive animation
- hasVisibleAnimated check still applies (don't animate when nothing visible)

**Option C: Multiple animation drivers (anti-pattern)**
- Don't add second RAF loop — causes frame sync issues
- Stick with single source of truth for animationFrame counter

### Recommended Architecture (if fix needed)

**Move animation driver to App.tsx:**
```typescript
// App.tsx (new useEffect)
useEffect(() => {
  let animationId: number;
  const lastFrameTime = useRef(0);

  const animate = (timestamp: DOMHighResTimeStamp) => {
    const state = useEditorStore.getState();
    const hasVisibleAnimated = computeHasVisibleAnimated(state.documents);

    if (!document.hidden && hasVisibleAnimated) {
      if (timestamp - lastFrameTime.current >= 150) {
        state.advanceAnimationFrame();
        lastFrameTime.current = timestamp;
      }
    }

    animationId = requestAnimationFrame(animate);
  };

  animationId = requestAnimationFrame(animate);
  return () => cancelAnimationFrame(animationId);
}, []);
```

**Remove RAF loop from AnimationPanel.tsx** (lines 90-105).

### Data Flow Changes

**Before:**
```
AnimationPanel mounts → Start RAF loop
RAF checks hasVisibleAnimated → Advance counter if true
CanvasEngine subscription → Patch animated tiles
AnimationPanel unmounts → Stop RAF loop ← PROBLEM
```

**After (if fix needed):**
```
App.tsx mounts (always) → Start RAF loop
RAF checks hasVisibleAnimated → Advance counter if true
CanvasEngine subscription → Patch animated tiles
AnimationPanel open/close has no effect on animation
```

### New Components

**None.** Potential relocation of RAF loop if investigation reveals unmount issue.

### Build Order

1. Verify AnimationPanel mount/unmount behavior (check parent component) — 10 min
2. Test: Close panel → observe animations (if working, DONE) — 5 min
3. If broken: Move RAF loop to App.tsx — 30 min
4. Test: Animations run with panel closed — 10 min

**Total estimate:** 15-55 minutes (depends on verification outcome)

---

## Feature 4: Image Trace Overlay

### Problem Analysis

**User need:** Load reference image, display as semi-transparent overlay for tracing map tiles.

**Expected behavior:**
1. File > Load Trace Image → Opens file dialog (PNG, JPG, BMP)
2. New MDI window appears with trace image
3. Opacity slider (0-100%) controls transparency
4. Image scales with map zoom (or independent zoom option)
5. Window can be minimized/maximized/closed
6. Trace image doesn't save to map file (session-only)

### Integration Points

#### New Window Type: TraceImageWindow

**Pattern:** Reuse ChildWindow.tsx structure with custom content.

**Location:** src/components/TraceImageWindow/TraceImageWindow.tsx

**Structure:**
```typescript
export const TraceImageWindow: React.FC<{
  documentId: string;
  imageData: string; // base64 data URL
  onClose: () => void;
}> = ({ documentId, imageData, onClose }) => {
  const [opacity, setOpacity] = useState(50); // 0-100
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewport = useEditorStore((state) => state.documents.get(documentId)?.viewport);

  useEffect(() => {
    // Render trace image scaled by viewport.zoom
    const canvas = canvasRef.current;
    if (!canvas || !viewport) return;

    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = opacity / 100;
      // Draw image at viewport position/zoom
      ctx.drawImage(img, -viewport.x * 16 * viewport.zoom, -viewport.y * 16 * viewport.zoom,
                    img.width * viewport.zoom, img.height * viewport.zoom);
    };
    img.src = imageData;
  }, [imageData, viewport, opacity]);

  return (
    <div className="trace-image-window">
      <canvas ref={canvasRef} width={800} height={600} />
      <div className="opacity-control">
        <label>Opacity</label>
        <input type="range" min={0} max={100} value={opacity} onChange={(e) => setOpacity(+e.target.value)} />
        <span>{opacity}%</span>
      </div>
    </div>
  );
};
```

#### Modified Component: App.tsx

**New menu item handler:**
```typescript
const handleLoadTraceImage = useCallback(async () => {
  const result = await fileService.openImageDialog(); // New method
  if (result.canceled || !result.filePath) return;

  const readResult = await fileService.readFile(result.filePath);
  if (!readResult.success) {
    alert(`Failed to load image: ${readResult.error}`);
    return;
  }

  // Convert ArrayBuffer to base64 data URL
  const base64 = arrayBufferToBase64(readResult.data!);
  const mimeType = getMimeTypeFromExtension(result.filePath);
  const dataURL = `data:${mimeType};base64,${base64}`;

  // Create trace image "document" (no map, just image data)
  const id = `trace-${Date.now()}`;
  // ... create window state, render TraceImageWindow component
}, [fileService]);
```

#### Extended Interface: FileService.ts

**New method:**
```typescript
/**
 * Open an image file picker dialog
 * @returns FileDialogResult with selected path or canceled flag
 */
openImageDialog(): Promise<FileDialogResult>;
```

**Implementation (ElectronFileService):**
```typescript
async openImageDialog(): Promise<FileDialogResult> {
  const filePath = await window.electronAPI.openImageDialog();
  return {
    filePath,
    canceled: !filePath,
  };
}
```

**IPC handler (electron/main.ts):**
```typescript
ipcMain.handle('dialog:openImage', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: [
      { name: 'Image Files', extensions: ['png', 'jpg', 'jpeg', 'bmp', 'gif'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});
```

#### Modified Component: Workspace.tsx

**Current rendering:**
```typescript
{Array.from(windowStates.entries()).map(([id, ws]) => (
  <ChildWindow key={id} documentId={id} ... />
))}
```

**New rendering (discriminate window types):**
```typescript
{Array.from(windowStates.entries()).map(([id, ws]) => {
  if (id.startsWith('trace-')) {
    return <TraceImageWindow key={id} documentId={id} imageData={traceImages.get(id)} />;
  }
  return <ChildWindow key={id} documentId={id} ... />;
})}
```

#### New State: GlobalSlice or separate TraceSlice

**Option A: GlobalSlice (simple)**
```typescript
export interface GlobalSlice {
  // ... existing fields
  traceImages: Map<string, string>; // id → base64 data URL
  addTraceImage: (id: string, dataURL: string) => void;
  removeTraceImage: (id: string) => void;
}
```

**Option B: TraceSlice (cleaner separation)**
```typescript
export interface TraceSlice {
  traceImages: Map<string, {
    dataURL: string;
    opacity: number;
    visible: boolean;
  }>;
  createTraceImage: (dataURL: string) => string; // returns id
  updateTraceOpacity: (id: string, opacity: number) => void;
  toggleTraceVisibility: (id: string) => void;
  removeTraceImage: (id: string) => void;
}
```

### Data Flow Changes

**New flow:**
```
User: File > Load Trace Image
→ Open file dialog (image filter)
→ Read file as ArrayBuffer
→ Convert to base64 data URL
→ Create trace image window state
→ Render TraceImageWindow component
→ Subscribe to viewport changes
→ Redraw image at new zoom/pan
→ User adjusts opacity slider
→ Redraw with new globalAlpha
```

### New Components

1. **TraceImageWindow.tsx** — New component (150 lines)
   - Canvas rendering with opacity control
   - Viewport subscription for zoom/pan sync
   - Opacity slider (0-100%)

2. **TraceSlice.ts** (optional) — New Zustand slice (100 lines)
   - Trace image state management
   - Add/remove/update actions

### Build Order

1. Extend FileService with openImageDialog — 15 min
2. Add IPC handler for image dialog — 10 min
3. Create TraceImageWindow component — 60 min
4. Add trace image state (GlobalSlice or TraceSlice) — 20 min
5. Integrate TraceImageWindow into Workspace rendering — 20 min
6. Add menu item + handleLoadTraceImage — 20 min
7. Test: Load image → adjust opacity → zoom map → verify sync — 15 min

**Total estimate:** 160 minutes (2.5 hours)

---

## Component Modification Summary

| Component | Modification Type | Lines Changed | Risk |
|-----------|------------------|---------------|------|
| **MapSettingsDialog.tsx** | Modify serializeSettings, applySettings | ~40 | Low — isolated to serialization logic |
| **electron/main.ts** | Add defaultPath to save dialog, add image dialog | ~30 | Low — additive changes |
| **ElectronFileService.ts** | Pass defaultName parameter, add openImageDialog | ~20 | Low — interface expansion |
| **electron/preload.ts** | Update saveFileDialog signature, add openImageDialog | ~10 | Low — type update |
| **App.tsx** | Add saveAs + loadTraceImage handlers | ~60 | Medium — new file operations |
| **DocumentsSlice.ts** | Add updateDocumentFilePath action | ~15 | Low — standard slice action |
| **AnimationPanel.tsx** (maybe) | Remove RAF loop if investigation shows unmount | ~15 | Low — relocate existing code |
| **App.tsx** (maybe) | Add RAF loop if AnimationPanel unmount confirmed | ~30 | Low — copy existing logic |
| **TraceImageWindow.tsx** | New component | ~150 | Medium — new rendering logic |
| **GlobalSlice.ts** or **TraceSlice.ts** | Add trace image state | ~50 | Low — standard state slice |
| **Workspace.tsx** | Discriminate window types for rendering | ~15 | Low — conditional rendering |
| **FileService.ts** | Add openImageDialog interface | ~5 | Low — interface expansion |

**Total LOC estimate:** ~440 lines (including new component)

---

## New Components Created

| Component | Purpose | LOC | Dependencies |
|-----------|---------|-----|--------------|
| **TraceImageWindow.tsx** | MDI window for trace image overlay | ~150 | React, Zustand, HTML Canvas API |
| **TraceSlice.ts** (optional) | Trace image state management | ~50 | Zustand |

---

## Integration Dependency Graph

```
Settings Overhaul:
  MapSettingsDialog.tsx
    ↓
  No dependencies (isolated change)

Save As:
  FileService.ts → ElectronFileService.ts → electron/main.ts → electron/preload.ts
    ↓
  DocumentsSlice.ts (updateDocumentFilePath)
    ↓
  App.tsx (handleSaveAs)

Animation When Hidden:
  Investigation → AnimationPanel.tsx (mount behavior)
    ↓
  Option A: No changes (already working)
  Option B: Move RAF to App.tsx
    ↓
  Depends on: Investigation outcome

Image Trace Overlay:
  FileService.ts → ElectronFileService.ts → electron/main.ts
    ↓
  TraceSlice.ts (state)
    ↓
  TraceImageWindow.tsx (new component)
    ↓
  Workspace.tsx (rendering)
    ↓
  App.tsx (menu handler)
```

**Critical path:** Settings Overhaul (no deps) → Save As (FileService extension) → Image Trace (FileService + new component)

**Parallel path:** Animation verification (independent)

---

## Suggested Build Order

### Phase 1: Settings Overhaul (40 min)
1. Fix serializeSettings to include extendedSettings
2. Map slider indices to setting values in applySettings
3. Test round-trip save/load

**Rationale:** Zero dependencies, isolated change, high user impact.

### Phase 2: Save As (60 min)
1. Extend IPC + FileService for defaultName
2. Add updateDocumentFilePath action
3. Add menu item + handler
4. Test save as new filename

**Rationale:** Extends FileService used by Image Trace, common user request.

### Phase 3: Animation Verification (15-55 min)
1. Verify AnimationPanel mount behavior
2. Test animations with panel closed
3. If broken, relocate RAF loop to App.tsx

**Rationale:** Quick verification, potential zero-change if already working.

### Phase 4: Image Trace Overlay (160 min)
1. Extend FileService for image dialog
2. Create TraceImageWindow component
3. Add trace state (GlobalSlice or TraceSlice)
4. Integrate into Workspace
5. Add menu handler
6. Test load/opacity/zoom sync

**Rationale:** Most complex feature, builds on FileService extension from Phase 2.

**Total estimated effort:** 4.5-5 hours

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Settings serialization breaks existing maps | Low | High | Preserve Format=1.1 position, test with real maps before release |
| Save As overwrites without warning | Medium | Medium | Use Electron's native overwrite dialog confirmation |
| Animation stops when panel hidden | Medium | Low | Verify mount behavior first, relocate RAF if needed |
| Trace image doesn't scale with zoom | Low | Medium | Subscribe to viewport changes, redraw on zoom/pan |
| Trace image data URL too large for state | Low | Medium | Consider storing image in separate cache, not Zustand |
| IPC signature mismatch after preload update | Low | High | Test IPC calls in dev mode, TypeScript will catch type errors |

**Highest priority mitigation:** Test settings serialization with existing maps (ensure backward compatibility).

---

## Architecture Patterns to Follow

### 1. FileService Extension Pattern
- Add interface method to FileService.ts
- Implement in ElectronFileService.ts
- Add IPC handler in electron/main.ts
- Update preload.ts electronAPI
- **Precedent:** Existing openMapDialog, saveMapDialog, compress, decompress

### 2. Zustand Slice Pattern
- Define state interface
- Add to EditorState composition
- Implement actions with `set((state) => ({ ... }))`
- **Precedent:** GlobalSlice, DocumentsSlice, WindowSlice

### 3. MDI Window Pattern
- Create window state in WindowSlice
- Render with react-rnd for drag/resize
- Subscribe to Zustand for state sync
- **Precedent:** ChildWindow.tsx (map windows)

### 4. Canvas Rendering Pattern
- Use ref for canvas element
- Subscribe to viewport changes
- Redraw on state change (useEffect)
- Clear/redraw full canvas (no incremental patching for overlays)
- **Precedent:** MapCanvas.tsx, Minimap.tsx

---

## Success Criteria

### Settings Overhaul
- [ ] General tab sliders save to description field
- [ ] Format=1.1 appears in correct position (after non-flagger, before flagger)
- [ ] Load map → verify slider values restored
- [ ] SEdit can open saved maps without errors

### Save As
- [ ] File > Save As shows dialog with current filename
- [ ] Saves to new path
- [ ] Window title updates to new filename
- [ ] Document marked as unmodified after save
- [ ] Original file unchanged

### Animation When Hidden
- [ ] Animations continue when panel closed
- [ ] Animations pause when no animated tiles visible (performance)
- [ ] Animations pause when tab backgrounded (Page Visibility API)

### Image Trace Overlay
- [ ] File > Load Trace Image opens file dialog
- [ ] Image appears in new MDI window
- [ ] Opacity slider adjusts transparency (0-100%)
- [ ] Image scales with map zoom
- [ ] Window can be minimized/maximized/closed
- [ ] Trace image doesn't save to map file

---

## Sources

**Codebase Analysis (PRIMARY):**
- `src/core/canvas/CanvasEngine.ts` — Rendering engine, animation subscription
- `src/core/map/GameSettings.ts` — Settings definitions
- `src/components/MapSettingsDialog/MapSettingsDialog.tsx` — Serialization logic, slider sync
- `src/components/AnimationPanel/AnimationPanel.tsx` — Animation RAF loop
- `src/core/services/FileService.ts` — File I/O interface
- `src/adapters/electron/ElectronFileService.ts` — Electron IPC adapter
- `electron/main.ts` — Main process, IPC handlers, menu
- `src/components/Workspace/ChildWindow.tsx` — MDI window pattern
- `src/core/editor/EditorState.ts` — Zustand store composition
- `AC_Setting_Info_25.txt` — Settings reference documentation

**Confidence:** HIGH — All integration points identified from direct codebase inspection.
