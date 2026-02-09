# Domain Pitfalls: v2.0 Modern Minimalist UI

**Domain:** Electron/React Tile Map Editor - Adding modern UI reskin, settings serialization, format parity, and TS error fixes to existing system
**Researched:** 2026-02-08

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: CSS Variable Cascade Blindness During Theme Replacement
**What goes wrong:** Replacing Win98 CSS variables with modern theme variables causes components to render with broken/missing styles because CSS variable inheritance and cascade order weren't properly mapped during migration.

**Why it happens:** The current codebase uses a two-tier CSS variable system (Tier 1: canonical Win98 colors like `--win98-ButtonFace`, Tier 2: semantic aliases like `--surface`). When replacing this system, developers assume they can just swap variable definitions in one central file, but components may have different cascade scopes, specificity conflicts, and inheritance chains that break when variable names or scoping changes.

**Consequences:**
- Components appear unstyled (transparent backgrounds, no borders, invisible text)
- Hover/active states fail silently
- Nested components lose inherited values
- Dialog overlays, scrollbars, and borders disappear
- Different browsers render differently due to cascade order bugs

**Prevention:**
1. **Map the dependency graph first:** Audit all 192+ `var(--win98-*)` references across 8 component CSS files before changing any variables
2. **Incremental replacement strategy:**
   - Phase 1: Add new modern variables ALONGSIDE existing Win98 variables (parallel system)
   - Phase 2: Replace variable references ONE COMPONENT AT A TIME, testing each
   - Phase 3: Remove old Win98 variables only after all references eliminated
3. **Visual regression testing:** Screenshot every component state (default, hover, active, disabled, focused) before and after each change
4. **Cascade order verification:** Test that child components properly inherit variables from parents (App.css → component CSS → inline styles)
5. **Avoid over-nesting:** Don't chain variables too deeply (modern palette → semantic tokens → component-specific → state-specific creates debugging nightmares)
6. **Use cascade layers (@layer) for specificity control:** Define explicit precedence order instead of specificity games

**Detection:**
- Warning sign 1: Component renders with default browser styles instead of themed styles
- Warning sign 2: Hover states work in isolation but break when nested in panels
- Warning sign 3: Different styles in dev vs production build
- Warning sign 4: Styles work in Chrome but break in Electron's Chromium version

**References:**
- [CSS Variables Gone Wrong: Pitfalls to Watch Out For](https://blog.pixelfreestudio.com/css-variables-gone-wrong-pitfalls-to-watch-out-for/)
- [CSS Custom Properties In The Cascade - Smashing Magazine](https://www.smashingmagazine.com/2019/07/css-custom-properties-cascade/)
- [Applying Inheritance in CSS (2026): Predictable Styling - TheLinuxCode](https://thelinuxcode.com/applying-inheritance-in-css-2026-predictable-styling-theming-and-safe-overrides/)

---

### Pitfall 2: Wrong Defaults = Wrong Serialization Output
**What goes wrong:** Auto-generating map settings into the description field produces incorrect output because the default values used for comparison don't match SEdit's actual defaults, causing settings to either be omitted when they should be included, or included when they should be omitted.

**Why it happens:**
1. **Source of truth mismatch:** Defaults defined in `GameSettings.ts` were transcribed from `AC_Setting_Info_25.txt`, but human transcription errors cause mismatches (e.g., `DHT_minimum` default is 1 in code but should match SEdit's binary defaults)
2. **Implicit vs explicit defaults:** SEdit may have defaults hardcoded in binary that differ from documentation
3. **Type conversion issues:** Number-to-string conversion in Key=Value format can introduce precision errors or formatting differences

**Prevention:**
1. **Binary validation:** Load a default map from SEdit, save it, and parse the description field to extract SEdit's true defaults
2. **Round-trip testing:** Create test maps with all combinations of default/non-default values, save with serialization, reload, verify no changes
3. **Comparison test harness:** For each setting in `SETTINGS_CONFIG`, create a test case that:
   - Sets value to default → verify NOT in description
   - Sets value to non-default → verify IS in description with correct format
4. **Version-specific defaults:** AC v25 may have different defaults than other versions - scope clearly which version you're targeting

**Detection:**
- Maps saved by editor can't be loaded by SEdit (parser rejects malformed settings)
- Settings appear changed after save-load roundtrip (default → non-default or vice versa)
- Description field contains redundant default values (bloat)
- Critical settings missing from description field (data loss)

---

### Pitfall 3: Settings Dialog Content Overflow
**What goes wrong:** Settings dialog with 50+ input fields (per `MapSettingsDialog.tsx`) doesn't scroll properly when content exceeds viewport height, causing controls to be cut off and inaccessible, especially at smaller window sizes or when adding new settings categories.

**Why it happens:** Fixed-height dialog without proper scrolling container. Common pattern: developer uses `overflow: hidden` on dialog wrapper to clip backdrop blur, which also clips dialog content. Or dialog uses flexbox without `min-height: 0` on scrollable child, preventing scroll container from shrinking.

**Prevention:**
1. **Scroll container pattern:**
   ```css
   .dialog-wrapper { /* Fixed overlay */
     position: fixed;
     inset: 0;
     overflow-y: auto; /* Scrolls entire dialog */
   }
   .dialog-content { /* Variable height */
     max-height: 90vh;
     overflow-y: auto; /* Scrolls content only */
   }
   ```
2. **Test at multiple viewport heights:** 768px (laptop), 1080px (desktop), 2160px (4K)
3. **Keyboard accessibility:** Ensure Tab key cycles through inputs even when scrolled
4. **Header/footer sticky positioning:** Keep dialog title and action buttons visible while scrolling settings

**Detection:**
- Dialog content cut off at bottom on small screens
- Scroll bar appears but doesn't allow scrolling to bottom inputs
- Dialog buttons (OK/Cancel) not visible on short viewports

---

## Moderate Pitfalls

Issues that cause bugs but can be fixed without major refactoring.

### Pitfall 4: Inconsistent Zero-Index vs One-Index Settings
**What goes wrong:** Some map settings use 0-based indexing (e.g., `Team` enum: 0=Green, 1=Red) while SEdit's serialized format uses 1-based indexing (1=Green, 2=Red). Mixing these causes off-by-one errors where saved settings load with wrong values.

**Prevention:**
- Document which settings use which indexing convention in `GameSettings.ts`
- Add explicit conversion functions: `toSerializedIndex()` and `fromSerializedIndex()`
- Test edge cases: Team 0 (Green) should serialize as 1, not 0

---

### Pitfall 5: TypeScript Errors Hidden by `any` Types
**What goes wrong:** "Fix TypeScript errors" task claims 0 errors but actually has errors masked by `any` types or `@ts-ignore` comments, creating runtime bugs that TypeScript should catch.

**Prevention:**
- Enable `noImplicitAny: true` in tsconfig
- Ban `@ts-ignore` — use `@ts-expect-error` with explanation instead
- Run `tsc --noEmit` in CI to catch type errors before merge

---

## Minor Pitfalls

Small issues that are easy to fix but easy to miss.

### Pitfall 6: OKLCH Browser Compatibility
**What goes wrong:** OKLCH color space (used for modern minimalist palette) not supported in older Chromium versions bundled with some Electron releases, causing colors to render as black or fallback to sRGB with different appearance.

**Prevention:**
- Check Electron's Chromium version supports OKLCH (Chromium 111+)
- Provide fallback: `background: rgb(26 26 46); background: oklch(22% 0.02 264);`
- Test in target Electron version, not just latest Chrome

---

### Pitfall 7: Dialog Z-Index Stacking
**What goes wrong:** Opening Map Settings Dialog while Animation Panel is expanded causes z-index conflict, making dialog appear behind panel or making backdrop click-outside logic fail.

**Prevention:**
- Use consistent z-index scale: base app (0), panels (10), dialogs (100), tooltips (1000)
- Dialog should render to `document.body` via React Portal, not nested in panel

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Copy-paste RGB values instead of CSS variables | Faster than defining variables | Changes require finding all copies; impossible to theme consistently | Never |
| Skip round-trip serialization tests | Saves test writing time | Silent data corruption; maps corrupt after save/load | Never |
| Hard-code default values in comparison logic | Avoids central config file | Defaults diverge across codebase; impossible to update consistently | Never |
| Use `flex: 1` without understanding flex behavior | Fixes layout in current viewport | Breaks at different sizes; content overflow hidden | Only for fixed-size panels that never resize |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Re-parse description field on every render | Lag when typing in settings dialog | Parse once on load, serialize once on save | 50+ settings in description |
| CSS variable inheritance through 5+ levels | Slow repaints, layout thrashing | Flatten to 2 levels: palette → semantic | Large component trees (100+ DOM nodes) |
| No debouncing on range slider inputs | Store update on every pixel dragged | Debounce store updates to 50ms | Range sliders for numeric settings |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No visual feedback that settings changed | User unsure if input was registered | Show dirty indicator (*) on dialog title when settings changed |
| Settings dialog blocks map view | Can't reference map while editing settings | Semi-transparent dialog or side panel instead of modal |
| No setting tooltips | User guesses what "DHT_minimum" means | Add tooltip on hover with explanation from `AC_Setting_Info_25.txt` |
| Reset button without confirm | Accidental clicks lose all setting changes | Confirm dialog: "Reset all settings to default?" |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **OKLCH theme:** Colors render correctly, but verify fallback for older Electron versions
- [ ] **Settings serialization:** Settings save/load, but verify round-trip test (save → load → no changes)
- [ ] **TypeScript zero errors:** `tsc --noEmit` passes, but verify no `any` types or `@ts-ignore` used
- [ ] **Dialog scrolling:** Dialog renders, but verify all settings accessible at 768px viewport height
- [ ] **SEdit parity:** Format matches SEdit output, but verify with binary comparison of saved files
- [ ] **CSS variable migration:** All components styled, but verify no leftover `--win98-*` references
- [ ] **Range slider inputs:** Inputs work, but verify debouncing prevents performance issues during drag
- [ ] **Status bar tile info:** Displays tile ID, but verify animated tiles show correct frame data

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| CSS cascade broken after variable migration | MEDIUM | 1. Revert to last working commit 2. Identify broken component via visual diff 3. Fix one component at a time with verification 4. Add regression test screenshots |
| Settings serialization produces invalid format | LOW | 1. User can manually edit description field 2. Deploy hotfix with correct format 3. Add round-trip test to prevent recurrence |
| Dialog overflow cuts off settings | LOW | 1. Add `overflow-y: auto` as hotfix 2. Test at 768px viewport 3. Deploy patch |
| TypeScript errors masked by `any` | HIGH | 1. Enable `noImplicitAny` 2. Fix all new errors (could be 50+) 3. Add to CI pipeline |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| CSS cascade blindness | Phase 1: OKLCH Theme Implementation | Visual regression: screenshot all components before/after |
| Wrong serialization defaults | Phase 2: Settings Serialization | Round-trip test: save default map, reload, verify no changes |
| Dialog overflow | Phase 1: OKLCH Theme Implementation | Manual test: resize window to 768px height, verify all settings accessible |
| TypeScript errors hidden | Phase 3: TypeScript Quality | `tsc --noEmit` in CI, ban `any` types |

## Sources

### v2.0 Milestone Research (2026-02-08)
- Current codebase: `App.css`, `MapSettingsDialog.tsx`, `GameSettings.ts`, `.planning/phases/32-*/`
- [CSS Variables Gone Wrong: Pitfalls to Watch Out For](https://blog.pixelfreestudio.com/css-variables-gone-wrong-pitfalls-to-watch-out-for/)
- [CSS Custom Properties In The Cascade - Smashing Magazine](https://www.smashingmagazine.com/2019/07/css-custom-properties-cascade/)
- [Applying Inheritance in CSS (2026) - TheLinuxCode](https://thelinuxcode.com/applying-inheritance-in-css-2026-predictable-styling-theming-and-safe-overrides/)

---

# Domain Pitfalls: MDI + Status Bar + Settings Dialog Scrolling

**Domain:** Adding MDI (Multiple Document Interface) to existing single-document React/Electron tile map editor
**Researched:** 2026-02-09
**Confidence:** MEDIUM

## Critical Pitfalls

### Pitfall 1: Shared Undo/Redo Stack Across Documents

**What goes wrong:**
Undo/redo operations in Document A accidentally affect Document B because they share the same undo/redo stack. This is the most common and severe pitfall when refactoring from single-document to MDI. User performs undo in the active document, but changes appear in a background document instead, or undo history becomes corrupted across documents.

**Why it happens:**
The existing `EditorState.ts` has a single global `undoStack` and `redoStack` at the store root level (lines 108-109). When multiple documents exist, all documents write to the same stacks. Developers often overlook this because undo/redo "just works" in single-document mode and the issue only manifests after MDI refactoring.

**How to avoid:**
- Move `undoStack`, `redoStack`, `pendingUndoSnapshot`, and `maxUndoLevels` into per-document state
- Create a document-level state container: `{ id, map, undoStack, redoStack, pendingUndoSnapshot, viewport, selection, ... }`
- Undo/redo actions must operate on `activeDocumentId` only
- Verify isolation: open Doc A, make changes, open Doc B, make changes, undo in B should NOT affect A

**Warning signs:**
- Undo in Document A shows changes from Document B
- Redo stack clears when switching documents
- Undo description doesn't match current document's actions
- Users report "undo went to wrong document"

**Phase to address:**
Phase 1: Document State Refactoring (before any UI work)

---

### Pitfall 2: Canvas Context Accumulation and Memory Leaks

**What goes wrong:**
Each document creates 4 canvas contexts (static, animation, overlay, grid layers per `MapCanvas.tsx`). With 5 documents open, that's 20 contexts. Browser limits WebGL/Canvas contexts (typically 8-16 depending on browser), causing new documents to fail rendering or existing documents to lose their contexts. Memory usage grows unbounded as documents accumulate because canvas contexts and tile data (256×256 Uint16Array per document = 128KB each, plus undo stacks) aren't properly cleaned up when documents close.

**Why it happens:**
Current architecture assumes single canvas lifetime = app lifetime. `MapCanvas.tsx` creates refs for 4 layers but has no cleanup logic. When implementing tabs/MDI, developers often mount/unmount canvas components per document without proper cleanup. Canvas element removal doesn't automatically free GPU resources. Animation frame requests (`advanceAnimationFrame` called via `useEffect`) continue running after document closes.

**How to avoid:**
- Implement per-document cleanup lifecycle:
  ```typescript
  // In document manager
  const closeDocument = (docId: string) => {
    const doc = documents.find(d => d.id === docId);
    if (doc && doc.canvasRefs) {
      // Clear animation frame requests
      cancelAnimationFrame(doc.animationFrameId);
      // Dispose canvas contexts (set width=0 forces context release)
      doc.canvasRefs.forEach(canvas => {
        if (canvas) canvas.width = 0;
      });
    }
    // Remove from documents array
    setDocuments(docs => docs.filter(d => d.id !== docId));
  };
  ```
- Use `display: none` for inactive tabs instead of unmount/remount (avoids context recreation)
- Implement document limit (e.g., max 8 open documents)
- Monitor memory: add DevTools heap snapshot tests in development

**Warning signs:**
- Console errors: "WebGL context lost" or "Failed to create canvas context"
- Memory usage increases linearly with opened documents (never decreases when closing)
- Performance degrades with each new document
- Blank canvases for newly opened documents while old ones still render
- Browser tab becomes unresponsive after opening/closing multiple documents

**Phase to address:**
Phase 2: Canvas Management & Lifecycle (after state refactoring, before full MDI UI)

---

### Pitfall 3: Active Document Ambiguity in Tool Operations

**What goes wrong:**
User has Document A active, starts drawing with pencil tool, switches to Document B mid-operation (e.g., during mouse drag), and the drawing operation completes in Document B instead of A. Or tool settings panel (Game Object Tool, Wall Type selector) changes affect the wrong document. Clipboard operations copy from Document A but paste preview appears in Document B.

**Why it happens:**
Current `EditorState.ts` stores tool state globally: `currentTool`, `selectedTile`, `tileSelection`, `wallType`, `gameObjectToolState`, `clipboard`, `isPasting`, `pastePreviewPosition` (lines 84-106). `MapCanvas.tsx` mouse handlers directly call store actions that operate on the implicit "current map" (line 647: `setTile(x, y, tile)` doesn't specify which document). When switching documents, these handlers don't check if they're still operating on the correct document.

**How to avoid:**
- Create explicit `activeDocumentId: string | null` in global store
- All mutation operations must validate: `if (docId !== activeDocumentId) return;`
- Split tool state:
  - **Per-document:** `viewport`, `selection`, `clipboard`, `isPasting`, `pastePreviewPosition` (different per doc)
  - **Global/Shared:** `currentTool`, `selectedTile`, `tileSelection`, `wallType`, `gameObjectToolState` (apply to active doc)
- Add document ID to all mouse event handlers:
  ```typescript
  const handleMouseDown = (e: MouseEvent) => {
    const docId = containerRef.current?.dataset.documentId;
    if (docId !== activeDocumentId) return; // Ignore events from inactive docs
    // ... rest of handler
  };
  ```
- Implement focus guards: only active document receives keyboard/mouse input

**Warning signs:**
- Operations complete in unexpected document
- Drawing starts in Doc A but continues in Doc B after tab switch
- Paste preview appears in wrong document
- Tool panel changes affect non-active document
- Undo description says "Paste" but user was drawing in different document

**Phase to address:**
Phase 1: Document State Refactoring (establish activeDocumentId pattern)

---

### Pitfall 4: Clipboard State Collision Across Documents

**What goes wrong:**
User copies tiles in Document A (stored in global `clipboard: ClipboardData`), switches to Document B, copies different tiles (overwrites global clipboard), switches back to Document A expecting to paste original tiles, but pastes Document B's tiles instead. Or worse: clipboard data contains raw tile IDs that are valid in one document's tileset but invalid/different in another document.

**Why it happens:**
`EditorState.ts` has single global `clipboard: ClipboardData | null` (line 101). Clipboard stores `Uint16Array` of raw tile values including animation flags and game object IDs. When user switches documents, the clipboard persists but loses its source document context. Paste operation (`pasteAt` line 404) blindly writes clipboard tiles to active document without validation.

**How to avoid:**
- Option A: **Per-document clipboard** (recommended for this editor):
  ```typescript
  // Each document has its own clipboard
  interface DocumentState {
    id: string;
    clipboard: ClipboardData | null;
    isPasting: boolean;
    pastePreviewPosition: PastePreviewPosition | null;
  }
  ```
  Pros: Matches user mental model (clipboard is per-document), simpler implementation
  Cons: Can't copy between documents (acceptable for tile editor)

- Option B: **Global clipboard with source validation**:
  ```typescript
  interface ClipboardData {
    sourceDocumentId: string;
    width: number;
    height: number;
    tiles: Uint16Array;
    // Validate tiles are compatible with target document
  }
  ```
  Pros: Enables cross-document copy/paste
  Cons: Complex validation, may paste invalid tile IDs if documents use different tilesets

**For this project: Use Option A** (per-document clipboard) because:
- All documents use same tileset (assets/tileset.png)
- Copy/paste between documents has no clear use case
- Simpler reasoning about clipboard state

**Warning signs:**
- Paste operation produces unexpected tiles
- Paste from Document A into Document B pastes tiles from Document C
- `isPasting` mode persists when switching documents (shows paste preview in wrong doc)
- Crash/corruption when pasting after closing source document

**Phase to address:**
Phase 1: Document State Refactoring (move clipboard into per-document state)

---

### Pitfall 5: Dirty Flag Synchronization with File Operations

**What goes wrong:**
User modifies Document A (dirty=true), switches to Document B, saves Document B, and the dirty indicator clears for Document A as well. Or user closes Document A without save prompt because `map.modified` flag wasn't checked correctly. Window close handler checks global dirty state instead of per-document, allowing unsaved changes to be lost. Save operation saves active document but clears dirty flags for all documents.

**Why it happens:**
Current `MapData` interface has `modified: boolean` at the map level (line 79 in `types.ts`), but `App.tsx` tracks single global map (line 22: `const map = useEditorStore(state => state.map)`). Actions like `markSaved()` and `markModified()` operate on the single global map (lines 846-860 in `EditorState.ts`). With MDI, each document has independent modification state, but file operations and close handlers don't iterate all documents.

**How to avoid:**
- Per-document dirty tracking:
  ```typescript
  interface DocumentState {
    id: string;
    map: MapData;
    filePath: string | null;
    isDirty: boolean; // Separate from map.modified for clarity
  }
  ```
- Save operation must specify document:
  ```typescript
  const handleSave = async (docId: string) => {
    const doc = documents.find(d => d.id === docId);
    if (!doc) return;
    const result = await mapService.saveMap(doc.map, doc.filePath);
    if (result.success) {
      setDocuments(docs => docs.map(d =>
        d.id === docId ? { ...d, isDirty: false, filePath: result.filePath } : d
      ));
    }
  };
  ```
- Window close handler must check ALL documents:
  ```typescript
  window.addEventListener('beforeunload', (e) => {
    const hasUnsaved = documents.some(doc => doc.isDirty);
    if (hasUnsaved) {
      e.preventDefault();
      e.returnValue = 'Unsaved changes';
    }
  });
  ```
- Tab close button must check individual document:
  ```typescript
  const handleCloseTab = (docId: string) => {
    const doc = documents.find(d => d.id === docId);
    if (doc?.isDirty) {
      if (!window.confirm(`Save changes to ${doc.displayName}?`)) return;
    }
    closeDocument(docId);
  };
  ```

**Warning signs:**
- Dirty indicator clears for all documents after saving one
- Can close document with unsaved changes without prompt
- Window close prompt doesn't appear when documents have unsaved changes
- Save operation writes wrong document's data to file
- Multiple documents show dirty indicator when only one was modified

**Phase to address:**
Phase 1: Document State Refactoring AND Phase 3: File Operations (split across both phases)

---

### Pitfall 6: Component State Coupling to Global Store

**What goes wrong:**
Components like `Minimap.tsx` (lines 42-47) and `MapCanvas.tsx` (lines 64-87) directly subscribe to global store state (`map`, `viewport`, `selection`). After refactoring to MDI, these components continue reading from global store instead of active document, causing:
- Minimap shows Document A's viewport while Document B is active
- Selection marquee renders in wrong position when switching documents
- Animation frame counter affects all documents simultaneously instead of per-document
- Components re-render when inactive document's state changes (performance issue)

**Why it happens:**
Current architecture uses single Zustand store with direct subscriptions: `useEditorStore(state => state.map)`. Over 20 components subscribe this way. When refactoring to MDI, developers often create per-document state but forget to update component subscriptions. Components implicitly assume "the map" exists without checking which document is active.

**How to avoid:**
- Create `useActiveDocument()` hook that abstracts active document selection:
  ```typescript
  const useActiveDocument = () => {
    const { documents, activeDocumentId } = useEditorStore(
      useShallow(state => ({
        documents: state.documents,
        activeDocumentId: state.activeDocumentId
      }))
    );
    return documents.find(d => d.id === activeDocumentId) || null;
  };
  ```
- Update all components to use active document pattern:
  ```typescript
  // Before (global)
  const map = useEditorStore(state => state.map);

  // After (per-document)
  const activeDoc = useActiveDocument();
  const map = activeDoc?.map || null;
  ```
- Conditional rendering: components should handle `activeDoc === null` (no documents open)
- Create document-scoped providers for canvas components to prevent cross-document interference

**Warning signs:**
- Components render data from wrong document
- Switching documents doesn't update component display
- Performance degrades (all components re-render when any document changes)
- Console errors: "Cannot read property 'tiles' of undefined" when closing last document
- Minimap doesn't track viewport of active document

**Phase to address:**
Phase 4: Component Refactoring (after document manager is stable)

---

### Pitfall 7: Animation Frame Broadcast Across Documents

**What goes wrong:**
Animation system (line 92 in `EditorState.ts`: `animationFrame: number`) uses global counter incremented via `advanceAnimationFrame()`. This causes ALL documents to animate in sync rather than independently. When one document is actively edited, background documents also animate continuously, wasting CPU/GPU. Animation can't be paused per-document (e.g., pause animations in background tabs).

**Why it happens:**
Current `App.tsx` runs animation loop at app level (not visible in provided code but implied by architecture). `useEffect` in `MapCanvas.tsx` and `Minimap.tsx` likely subscribe to global `animationFrame` state. Single animation loop broadcasts frame updates to entire store, triggering re-renders in all subscribed components regardless of document visibility.

**How to avoid:**
- Move animation state into per-document state:
  ```typescript
  interface DocumentState {
    id: string;
    animationFrame: number;
    animationEnabled: boolean; // Per-document animation toggle
  }
  ```
- Run animation loop per-document with visibility detection:
  ```typescript
  useEffect(() => {
    if (!isDocumentVisible || !doc.animationEnabled) return;

    const intervalId = setInterval(() => {
      updateDocument(doc.id, {
        animationFrame: doc.animationFrame + 1
      });
    }, 100); // 10 FPS

    return () => clearInterval(intervalId);
  }, [doc.id, isDocumentVisible, doc.animationEnabled]);
  ```
- Optimize: pause animations for inactive tabs using Page Visibility API
- Alternative: single global animation frame but per-document enabled flag

**Warning signs:**
- All document canvases re-render 10 times per second (even inactive ones)
- CPU usage high with multiple documents open even when idle
- Animation toggle affects all documents simultaneously
- Can't pause animations in background documents

**Phase to address:**
Phase 2: Canvas Management & Lifecycle (handle as part of per-document canvas setup)

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Keep global tool state (selectedTile, wallType) instead of per-document | Simpler refactoring, tools persist across document switches | User confusion when tool settings unexpectedly change, clipboard issues, race conditions in tool operations | Never (breaks user mental model) |
| Use single undo stack with document ID tags | Avoids refactoring undo/redo logic | Complex filtering, undo stack corruption, impossible to properly implement max undo levels per document | Never (known broken pattern) |
| Mount/unmount canvases when switching tabs | Simple React pattern, auto cleanup | Memory leaks, context limit issues, slow tab switches (canvas recreation) | Never (performance killer) |
| Skip cleanup for closed documents ("GC will handle it") | Saves implementation time | Memory grows unbounded, browser context limits hit, app becomes unusable after 10+ document opens/closes | Never (reliable reproduction of crashes) |
| Share clipboard across documents | Enables cross-document copy/paste | Tile ID validation complexity, clipboard state confusion, crash potential | Only if tilesets differ per document AND cross-doc copy is required feature |
| Global dirty flag OR gate (any document dirty = app dirty) | Simple window close detection | Can't track which documents are dirty, save prompt doesn't list affected documents | Acceptable for MVP if max 3 documents enforced |

## Integration Gotchas

Common mistakes when connecting MDI to Electron file operations.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Electron IPC saveMap | Pass activeDocumentId but forget filePath, saving to wrong file | Always pass both documentId and explicit filePath from document state |
| Window close handler | Only check `map.modified` flag, missing other dirty documents | Iterate all documents in `beforeunload`: `documents.some(d => d.isDirty)` |
| File menu "Save" command | Save active document without updating recent files list per document | Maintain per-document metadata (filePath, lastSaved, displayName) and update all relevant state on successful save |
| Open file into existing window | Replace active document instead of opening new tab | Always create new document in tab list, let user close old one explicitly |
| Drag-drop file into window | No target document detection, randomly picks document | Detect which canvas received drop event, open in new tab adjacent to that document |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| All components subscribe to documents array | Every document state change triggers re-render in all components (Minimap, Canvas, StatusBar, Toolbar) | Use document selector hooks (`useActiveDocument`), split documents array updates with immer | 3+ documents with active editing (100+ re-renders/sec) |
| Storing full map snapshots in undo stack per document | 5 documents × 50 undo levels × 128KB = 32MB RAM minimum, grows to 100MB+ with metadata | Already using delta-based undo (lines 27-37 in EditorState.ts) — preserve this in per-document state | 5+ documents with heavy editing |
| Deep equality checks on Uint16Array tiles in useEffect dependencies | Canvas re-renders on every state change because arrays fail shallow comparison | Use viewport/animationFrame as effect deps, not map.tiles; rely on manual dirty tracking | Any multi-document scenario |
| Rendering hidden document canvases | All 4 canvas layers × N documents render continuously even when hidden | Use `display: none` for inactive tabs, pause animation loops for hidden documents | 4+ documents (60 FPS × 4 layers × 4 docs = 960 renders/sec) |
| Global Zustand store for all documents | Single store means single update queue, creates mutation bottleneck | Keep architecture (proven to work), but structure state hierarchically: `{ documents: DocumentState[], activeId }` | 8+ documents with simultaneous editing (unlikely scenario) |

## UX Pitfalls

Common user experience mistakes in MDI implementations.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No visual indicator of which document is active | User draws in wrong document, performs operations on wrong map | Active tab: bright accent color + border; Inactive tabs: muted colors (use existing OKLCH tokens --color-accent-500 vs --color-neutral-600) |
| Dirty indicator on tab vs window title only | Can't see at-a-glance which documents need saving | Show asterisk (*) on individual tab labels: "Map 1.lvl*" + count in window title: "AC Map Editor (2 unsaved)" |
| Switching documents loses scroll position and zoom | User zooms into corner at 4×, switches tabs, returns to find viewport reset to origin 1× | Per-document viewport state (already in architecture, just ensure persistence across switches) |
| No keyboard shortcuts for tab switching | Mouse-only tab switching is slow for power users | Ctrl+Tab / Ctrl+Shift+Tab for next/prev, Ctrl+1-9 for tab 1-9, Ctrl+W for close tab |
| Tab close button too close to tab label | Accidental closes when trying to switch tabs (Fitts's Law violation) | Separate close button (right side of tab bar) that acts on active tab, or require Ctrl+W, or close button appears only on hover |
| Paste mode persists when switching documents | User enters paste mode in Doc A (Ctrl+V), switches to Doc B, sees paste preview in Doc B with Doc A's clipboard data | Cancel paste mode on document switch: `useEffect(() => { if (isPasting) cancelPasting(); }, [activeDocumentId])` |
| No indication of unsaved changes on window close | User clicks X, gets generic "Unsaved changes" prompt without document names | List specific documents in dialog: "Save changes to: Map1.lvl, TestMap.lvl? [Save All] [Discard] [Cancel]" |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **MDI Tab Bar:** Tab rendering works, but verify close button checks dirty flag per document before closing (not just global dirty)
- [ ] **Document State:** Documents stored in array, but verify each document has full isolated state: undoStack, redoStack, viewport, selection, clipboard, animationFrame
- [ ] **Active Document Tracking:** activeDocumentId exists, but verify all mouse/keyboard handlers validate document ID before operations
- [ ] **Canvas Lifecycle:** Canvases render per document, but verify cleanup on close: cancel animation frames, dispose contexts, remove event listeners
- [ ] **File Operations:** Save/Load work, but verify filePath tracked per document and "Save" updates correct document's dirty flag only
- [ ] **Undo/Redo:** Undo operates on active document, but verify switching documents doesn't corrupt undo stacks or allow undo in wrong document
- [ ] **Clipboard:** Copy/paste work in single document, but verify isPasting mode cancels on document switch and clipboard is per-document
- [ ] **Window Close:** beforeunload handler exists, but verify it iterates ALL documents for dirty check and lists specific document names in prompt
- [ ] **Memory Management:** Documents close without errors, but verify with Chrome DevTools heap snapshots that memory is actually released (canvas contexts freed)
- [ ] **Status Bar:** Shows active document info, but verify it updates immediately on document switch (subscribes to activeDocumentId, not stale map ref)

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Shared undo stack already implemented | HIGH (requires state refactoring + testing all undo/redo code paths) | 1. Add `undoStack: UndoEntry[], redoStack: UndoEntry[]` to DocumentState interface 2. Update undo/redo actions to accept documentId parameter 3. Add migration to preserve undo history for currently open document 4. Test all tools (pencil, wall, fill, paste, rect tools) |
| Canvas context leaks in production | MEDIUM (requires app restart for users, patch deployment) | 1. Implement document limit (max 8 open) as hotfix 2. Add warning dialog: "Memory limit reached, close documents" 3. Deploy cleanup logic as patch 4. Document workaround: restart app after 10 document opens |
| Clipboard collision corrupting pastes | LOW (data not permanently lost, undo recovers) | 1. User can undo corrupted paste 2. Deploy per-document clipboard in patch 3. Add clipboard clear on document switch as interim fix |
| Dirty flag desync causing unsaved changes | MEDIUM (data loss potential, user frustration) | 1. Add redundant dirty check: compare map.tiles hash to last-saved hash on close 2. Deploy conservative prompts (prompt even if dirty flag unclear) 3. Fix dirty flag logic in next release |
| Components reading wrong document state | MEDIUM (requires systematic component audit) | 1. Add runtime assertions: `if (!activeDocumentId) throw` at component entry 2. Grep codebase for `useEditorStore(state => state.map)` — replace with useActiveDocument() 3. Test all panels with 2+ documents open |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Shared undo/redo stack | Phase 1: Document State Refactoring | Open 2 docs, make changes in each, undo in doc B should not affect doc A's visible state |
| Canvas context leaks | Phase 2: Canvas Management & Lifecycle | Open 10 documents sequentially (open, close, open, close...), heap snapshot shows memory returns to baseline |
| Active document ambiguity | Phase 1: Document State Refactoring | Start drag operation in doc A, switch to doc B mid-drag, operation should cancel (not complete in doc B) |
| Clipboard collision | Phase 1: Document State Refactoring | Copy in doc A, copy in doc B, paste in doc A should paste doc A's tiles (not B's) |
| Dirty flag desync | Phase 3: File Operations | Save doc A, verify doc B's dirty indicator unchanged; close window with dirty docs, verify all listed in prompt |
| Component state coupling | Phase 4: Component Refactoring | Switch between docs, verify Minimap viewport updates, StatusBar shows correct doc info, no console errors |
| Animation frame broadcast | Phase 2: Canvas Management & Lifecycle | Open 3 docs, pause animations in one, verify others still animate; measure CPU with 5 docs (should be <10% idle) |

## Sources

### HIGH Confidence (Verified Patterns)
- Current codebase analysis: `EditorState.ts`, `MapCanvas.tsx`, `Minimap.tsx`, `App.tsx` (direct inspection of single-document architecture)
- [MDX Editor Issue #554: Undo/Redo Stack shared between multiple editor instances](https://github.com/mdx-editor/editor/issues/554) - Real-world example of shared undo stack bug
- [Konva HTML5 Canvas: How to avoid Memory leaks](https://konvajs.org/docs/performance/Avoid_Memory_Leaks.html) - Canvas cleanup patterns
- [Leveraging Immutability for Undo/Redo in Document-Based Applications](https://blog.voyonic-systems.de/leveraging-immutability-and-observability-for-reliable-undo-redo-in-document-based-applications/) - Per-document undo architecture

### MEDIUM Confidence (General Patterns, Not Editor-Specific)
- [React & Next.js Best Practices 2026: Performance, Scale & Cleaner Code](https://fabwebstudio.com/blog/react-nextjs-best-practices-2026-performance-scale) - useEffect cleanup patterns
- [Debugging Memory Leaks in React: Tools, Fixes & Tips](https://www.mbloging.com/post/debugging-memory-leaks-in-react) - Detection strategies
- [How to Debug Memory Leaks in React Native Applications](https://oneuptime.com/blog/post/2026-01-15-react-native-memory-leaks/view) - Cleanup functions
- [State Management in 2026: Redux, Context API, Modern Patterns](https://www.nucamp.co/blog/state-management-in-2026-redux-context-api-and-modern-patterns) - Multi-instance state patterns
- [Zustand Architecture Patterns at Scale](https://brainhub.eu/library/zustand-architecture-patterns-at-scale) - State organization
- [The secret of successfully using multi window WebGL Canvas](https://itnext.io/the-secret-of-successfully-using-multi-window-webgl-canvas-5a2d05555ad1) - Context limits

### LOW Confidence (Indirect References, Needs Validation)
- [WebGL context memory usage vs Canvas 2D](https://webglfundamentals.org/webgl/lessons/webgl-qna-why-does-webgl-take-more-memory-than-canvas-2d.html) - Context limits (5-10× more memory than 2D)
- [Electron BrowserWindow MDI mode Issue #8820](https://github.com/electron/electron/issues/8820) - Electron doesn't natively support MDI
- [Avoiding State Inconsistencies with Multiple React Context Providers](https://dev.to/rakshyak/avoiding-state-inconsistencies-the-pitfall-of-multiple-react-context-providers-4e29) - Multiple provider instances break state sync

---
*Pitfalls research for: Adding MDI to existing AC Map Editor (single-document → multi-document refactoring)*
*Researched: 2026-02-09*
*Focus: Integration pitfalls specific to refactoring THIS codebase, not general MDI theory*
