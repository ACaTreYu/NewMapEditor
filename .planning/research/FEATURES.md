# Feature Landscape

**Domain:** Tile Map Editor Settings & Workflow Enhancements
**Researched:** 2026-02-17

## Table Stakes

Features users expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Save As** | Standard file operation in all desktop editors | Low | File > Save As menu item, Ctrl+Shift+S accelerator, shows save dialog with defaultPath set to original file's directory |
| **Settings format compliance (Format=1.1)** | Required for SEdit compatibility, turret support | Medium | Format=1.1 must appear in description after non-flagger settings, before flagger settings. Current code injects it correctly (line 33 of MapSettingsDialog.tsx) |
| **Animation rendering** | Animated tiles must animate regardless of panel state | Low | Currently animation only advances when `hasVisibleAnimated` is true (AnimationPanel.tsx:95). Animation should be decoupled from panel visibility |
| **Dirty state indicator** | Users need to know when changes are unsaved | Low | Visual indicator (asterisk in title bar, dot on document tab, disabled save button when clean) |
| **Settings persistence** | Game settings must survive save/load roundtrip | High | Currently serialized to description field (Key=Value format). Must preserve ordering: non-flagger → Format=1.1 → flagger → Author → unrecognized |
| **Slider-dropdown sync** | When header field changes, extended settings should update | Medium | LaserDamage dropdown (0-4) must map to LaserDamage extended setting (LASER_DAMAGE_VALUES array). Currently synced only on dialog open, not live |

## Differentiators

Features that set product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Image trace overlay** | Allows tracing reference images (screenshots, sketches) to create accurate maps | Medium-High | Load image, position/scale/rotate controls, opacity slider (0-100%), lock position toggle, render behind tiles but above background. Common in professional map editors (Tiled, Cities: Skylines mods) |
| **Deep settings audit** | Validate all 54 settings against SEdit behavior | High | Ensures 100% compatibility. Needs testing matrix: slider values → extended settings → description serialization → binary header → game behavior |
| **Settings preview** | Show calculated values as user adjusts sliders | Low-Medium | Display "LaserDamage: 27 (Normal)" next to slider. Helps users understand abstraction between header fields (0-4) and game values |
| **Animation-when-hidden optimization** | Smart animation pausing when no animated tiles visible | Low | Current implementation already has this (hasVisibleAnimated check). Document as feature, not bug |
| **Save As with auto-rename** | Suggest incremental names (map_v1, map_v2) | Low | When Save As from existing file, propose filename with version increment. Reduces cognitive load |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Autosave** | SubSpace maps are small (~50KB compressed). Explicit save is expected in desktop editors. Autosave risks corrupting working copies. | Keep explicit save. Add dirty state indicator and save reminders (dialog on close if dirty) |
| **Cloud storage** | AC is a desktop game with local map files. Cloud adds complexity with no user benefit. | Support local file system only. Users can use Dropbox/Google Drive manually if desired |
| **Settings wizard** | 54 settings is overwhelming, but wizard obscures relationships. SEdit uses tabbed dialog. | Keep tabbed dialog. Add tooltips with recommended values for common scenarios (e.g., "Normal CTF", "Low-damage Assassin") |
| **Multiple image overlays** | Adds UI complexity (layer panel, z-ordering). Single overlay covers 95% of use cases (tracing one reference). | Single overlay only. Users can composite externally if needed |
| **Image overlay export** | Overlay is workspace-only reference, not part of map format. Exporting adds confusion. | Overlay never saved to .map/.lvl file. Lives in separate workspace file or ephemeral state |

## Feature Dependencies

```
Save As → Dirty state tracking (need to know if changes exist)
Settings deep audit → Settings preview (audit reveals correct value mappings)
Image trace overlay → Opacity control (required for tracing workflow)
Image trace overlay → Lock position (prevents accidental movement during editing)
Slider-dropdown sync → Settings preview (preview shows sync is working)
Animation-when-hidden → hasVisibleAnimated calculation (already exists in AnimationPanel.tsx:39-66)
```

## MVP Recommendation

Prioritize (in order):

1. **Save As** - Table stakes, low complexity, high value. Add File > Save As menu item, Ctrl+Shift+S, use `dialog:saveFile` IPC handler with defaultPath option.

2. **Dirty state tracking** - Table stakes, prerequisite for Save As UX. Track document modification state, show asterisk in title bar, disable Save when clean.

3. **Animation-when-hidden fix** - Table stakes bug fix. Remove panel visibility dependency from animation advancement. Animation should advance when ANY document has visible animated tiles, regardless of which panel is open.

4. **Settings deep audit** - Differentiator, high complexity but essential for SEdit parity. Systematically validate all 54 settings against SEdit's behavior. Document findings in audit report.

5. **Slider-dropdown sync** - Table stakes, medium complexity. When user changes LaserDamage dropdown (0-4), immediately update LaserDamage extended setting (5/14/27/54/112). Bidirectional sync required.

Defer:

- **Image trace overlay**: Valuable differentiator but complex. Requires new UI (file picker, transform controls, opacity slider), render layer management, workspace persistence. Schedule for subsequent milestone after core settings work stabilizes.

- **Settings preview**: Nice-to-have enhancement. Add after slider-dropdown sync is working. Low-hanging fruit for polish phase.

- **Save As auto-rename**: Polish feature. Add after core Save As works.

## Feature Breakdown by Implementation Phase

### Phase 1: File Operations (Low risk, high value)
- Save As dialog with defaultPath
- Dirty state indicator (asterisk in title)
- Save button disable when clean
- Unsaved changes warning on close

**Dependencies:** None
**Risk:** Low - standard Electron patterns
**Sources:** [Electron dialog API](https://www.electronjs.org/docs/latest/api/dialog), [Electron showSaveDialog tutorial](https://www.christianengvall.se/electron-showsavedialog-tutorial/), [Oracle Save Model patterns](https://www.oracle.com/webfolder/ux/middleware/alta/patterns/SaveModel.html)

### Phase 2: Animation Independence (Low risk, medium value)
- Decouple animation advancement from panel visibility
- Animation advances when ANY document has visible animated tiles
- Page visibility API already prevents animation when tab backgrounded

**Dependencies:** None
**Risk:** Low - refactor existing AnimationPanel.tsx logic
**Current state:** Animation timer in AnimationPanel.tsx:82-109, hasVisibleAnimated check in line 95

### Phase 3: Settings Deep Audit (High risk, high value)
- Validate all 54 settings against SEdit behavior
- Test slider values → extended settings mapping
- Verify Format=1.1 injection (already correct in serializeSettings line 33)
- Document discrepancies and edge cases
- Create test map suite for regression testing

**Dependencies:** None (can run in parallel with other phases)
**Risk:** High - requires extensive testing, may reveal compatibility issues
**Sources:** AC_Setting_Info_25.txt, SEdit source analysis (main.h:60-110)

### Phase 4: Slider-Dropdown Sync (Medium risk, high value)
- Bidirectional sync: dropdown changes update extended settings
- Extended setting changes update dropdown selection
- Sync on dialog open (already implemented)
- Live sync as user changes dropdowns (missing)
- Use LASER_DAMAGE_VALUES, SPECIAL_DAMAGE_VALUES, RECHARGE_RATE_VALUES arrays (MapSettingsDialog.tsx:172-174)

**Dependencies:** Settings deep audit (to verify mapping correctness)
**Risk:** Medium - state management complexity, edge cases around manual extended setting overrides
**Sources:** [Slider-dropdown sync patterns](https://blog.logrocket.com/ux-design/designing-settings-screen-ui/), [Cascading dropdowns UX](https://www.uxpin.com/studio/blog/dropdown-interaction-patterns-a-complete-guide/)

### Phase 5: Image Trace Overlay (High risk, high value)
- File picker for image selection (PNG, JPG, BMP)
- Image layer rendered behind tiles, above background
- Opacity slider (0-100%, default 50%)
- Position/scale/rotate transform controls
- Lock position toggle (prevents accidental movement)
- Workspace persistence (not in .map file)
- Reset/clear overlay button

**Dependencies:** None (independent feature)
**Risk:** High - new rendering layer, transform UI, workspace file format
**Sources:** [Tiled background image forum](https://discourse.mapeditor.org/t/load-background-reference/168), [Cities: Skylines overlay mod](https://thunderstore.io/c/cities-skylines-ii/p/algernon/ImageOverlayLite/), [Image overlay transparency patterns](https://www.here.com/learn/blog/how-to-create-an-image-overlay-on-a-map)

## Technical Implementation Notes

### Save As Expected Behavior (Desktop Editors)

**Standard pattern:**
1. File > Save As opens dialog with defaultPath set to current file's directory
2. Filename pre-populated with current filename (or "Untitled" if new)
3. User can navigate, rename, change directory
4. On save: update document's filePath, clear dirty flag, update title bar
5. Subsequent File > Save uses new path (not original)

**Electron implementation:**
```typescript
ipcMain.handle('dialog:saveAsFile', async (_, currentPath?: string) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    defaultPath: currentPath, // Pre-populate with current file
    filters: [
      { name: 'Map Files', extensions: ['map'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  return result.canceled ? null : result.filePath;
});
```

**Sources:** [Electron save dialog tutorial](https://www.christianengvall.se/electron-showsavedialog-tutorial/), [Electron dialog API](https://www.electronjs.org/docs/latest/api/dialog)

### Settings Format Compliance (Format=1.1)

**Critical requirement:** Format=1.1 must appear in description for turrets to work in-game.

**Current implementation (CORRECT):**
```typescript
// MapSettingsDialog.tsx:32-34
const allPairs = [...nonFlaggerPairs, 'Format=1.1', ...flaggerPairs];
return allPairs.join(', ');
```

**Expected serialization order:**
1. Non-flagger settings (alphabetically sorted)
2. `Format=1.1`
3. Flagger settings (alphabetically sorted, must come AFTER non-flagger per AC_Setting_Info_25.txt:48)
4. `Author=...`
5. Unrecognized pairs (preserved verbatim)

**Parsing (line 71):** Filter out Format=X.X since serializeSettings always injects it. Prevents duplicate Format entries on save/load roundtrip.

**Sources:** AC_Setting_Info_25.txt, MapSettingsDialog.tsx:15-73

### Animation Independence Pattern

**Current behavior (WRONG):**
- Animation advances only when `hasVisibleAnimated` is true (AnimationPanel.tsx:95)
- `hasVisibleAnimated` checks if AnimationPanel is mounted AND has visible animated tiles
- Result: animations pause when panel hidden, even if tiles visible on map canvas

**Expected behavior (CORRECT):**
- Animation advances when ANY open document has animated tiles in viewport
- Panel visibility irrelevant
- Page visibility API already prevents animation when tab backgrounded (line 72)

**Implementation:**
- Move `hasVisibleAnimated` calculation to global store or CanvasEngine
- AnimationPanel subscribes to global animationFrame counter
- Animation timer checks global visibility, not panel-local visibility

**Sources:** AnimationPanel.tsx:39-109, CanvasEngine.ts:16-17, globalSlice.ts:31

### Slider-Dropdown Sync Patterns

**Current state:**
- Header fields (maxPlayers, laserDamage, specialDamage, rechargeRate) stored separately
- Extended settings (LaserDamage, MissileDamage, MissileRecharge, etc.) stored in localSettings
- Sync happens on dialog open: header fields populate from extended settings if present
- Dropdown changes do NOT update extended settings (one-way sync only)

**Required behavior:**
- Bidirectional sync
- When user changes LaserDamage dropdown (0-4), update localSettings.LaserDamage to LASER_DAMAGE_VALUES[index]
- When user manually edits LaserDamage extended setting, update dropdown selection to matching index
- Handle edge cases: manual value doesn't match any dropdown option → select "Custom" or nearest match

**UX pattern:** Real-time feedback, no latency. Dropdown change immediately updates extended setting value visible in Game Rules tab.

**Sources:** [Settings screen UI design](https://blog.logrocket.com/ux-design/designing-settings-screen-ui/), [Cascading dropdowns](https://www.uxpin.com/studio/blog/dropdown-interaction-patterns-a-complete-guide/), MapSettingsDialog.tsx:170-174

### Image Trace Overlay Architecture

**Rendering order (bottom to top):**
1. CSS background (`--color-canvas-bg`)
2. Image overlay (if loaded)
3. Map tiles
4. Grid (if enabled)
5. Selection marquee
6. UI overlay (tools, measurements)

**Transform controls:**
- Position: X/Y offset in pixels (stored in viewport coordinates, not tile coordinates)
- Scale: Width/height in pixels OR scale factor (1.0 = 100%)
- Rotation: Degrees (0-360)
- Lock toggle: When locked, transform controls hidden, image immovable

**Opacity control:**
- Slider (0-100%), default 50%
- Keyboard shortcuts: [ decreases, ] increases (10% increments)
- Applied via canvas globalAlpha or CSS opacity

**Workspace persistence:**
- NOT saved to .map/.lvl file (overlay is editor-only feature)
- Options:
  1. Separate `.workspace` JSON file alongside .map file
  2. Ephemeral state (lost on editor close)
  3. LocalStorage keyed by map file path
- Recommendation: Separate workspace file for portability

**Sources:** [Tiled background image discussion](https://discourse.mapeditor.org/t/load-background-reference/168), [Image overlay transparency](https://doc.arcgis.com/en/arcgis-online/reference/change-transparency.htm), [Transform controls UX predictions](https://jakobnielsenphd.substack.com/p/2026-predictions)

## Settings Audit Scope

### Settings Categories (54 total)

**Weapon Damage (15 settings):**
- LaserDamage, MissileDamage, BouncyDamage, NadeDamage
- FLaserDamage, FMissileDamage, FBouncyDamage, FNadeDamage
- Per AC_Setting_Info_25.txt:50: "Damage settings refer to the amount of damage received by the ship"

**Weapon Energy (15 settings):**
- LaserEnergy, MissileEnergy, BouncyEnergy, NadeEnergy
- FLaserEnergy, FMissileEnergy, FBouncyEnergy, FNadeEnergy
- Range 0-57. Value 57 effectively disables weapon (line 7)

**Weapon TTL (8 settings):**
- LaserTTL, MissileTTL, BouncyTTL, ShrapTTL
- FLaserTTL, FMissileTTL, FBouncyTTL, FShrapTTL
- Range 0-10000 milliseconds

**Weapon Speed (10 settings):**
- LaserSpeed, MissileSpeed, BouncySpeed, NadeSpeed, ShrapSpeed
- F-prefixed versions
- Range 0-100. Higher = faster (line 11)

**Weapon Recharge (6 settings):**
- MissileRecharge, BouncyRecharge, NadeRecharge
- F-prefixed versions
- Range 0-100000. Lower = faster (line 19)

**Ship/Health (6 settings):**
- ShipSpeed (0-200, normal 100), FShipSpeed (relative to ShipSpeed, line 52)
- HealthBonus (0-224, normal 60), FHealthBonus
- HealthDecay (0-224, line 56)
- RepairRate (0-244, default 2), FRepairRate (line 58)

**Holding Time (8 settings):**
- HoldingTime (0-255 seconds, line 78)
- DHT_players, DHT_time, DHT_deaths, DHT_score, DHT_turrets (-999999 to 999999 milliseconds, line 92)
- DHT_minimum, DHT_maximum (seconds, line 103)
- Note: Old DHT/MinDHT/MaxDHT deprecated (line 113)

**Game Mode (6 settings):**
- ElectionTime (assassin maps, seconds, default 50, line 54)
- DominationWin (default 9999999, line 66)
- SwitchWin (number of switches, line 68)
- TurretHealth (default 224, line 64)
- InvisibleMap (0 or 1, line 70)
- FogOfWar (0 or 1, line 72)
- FlagInPlay (0 or 1, extends game clock, line 74)
- DisableSwitchSound (0 or 1, line 62)
- Widescreen (1 on, 0 off, limits nade range, line 109)

### Audit Process

1. **Extract defaults:** Document default value for each setting (from AC_Setting_Info_25.txt and SEdit source)
2. **Test ranges:** Verify min/max bounds match SEdit behavior
3. **Test mappings:** Verify header field values (0-4) map to correct extended settings
4. **Test serialization:** Verify roundtrip: Zustand state → description → Zustand state preserves all values
5. **Test ordering:** Verify non-flagger before Format=1.1 before flagger (required per line 48)
6. **Test Format=1.1:** Verify presence required for turrets (line 64 context)
7. **Document discrepancies:** Any mismatches between AC Map Editor and SEdit

**Deliverable:** Settings audit report (Markdown table with all 54 settings, current vs expected behavior)

## Complexity Ratings Explained

**Low complexity:**
- Standard patterns (file dialogs, dirty state)
- Localized changes (single component)
- No new dependencies
- ~1-2 days work

**Medium complexity:**
- State management across components
- Bidirectional sync logic
- Edge case handling
- ~3-5 days work

**High complexity:**
- New subsystems (rendering layers, workspace persistence)
- Extensive testing required (54 settings audit)
- Cross-cutting concerns (animation independence affects multiple components)
- ~1-2 weeks work

## Sources

**Electron/Desktop Patterns:**
- [Electron dialog API](https://www.electronjs.org/docs/latest/api/dialog)
- [Electron showSaveDialog tutorial](https://www.christianengvall.se/electron-showsavedialog-tutorial/)
- [Essential desktop application attributes in Electron](https://medium.com/redblacktree/essential-desktop-application-attributes-in-electron-2118352cc3d5)
- [Oracle Alta UI: Save Model](https://www.oracle.com/webfolder/ux/middleware/alta/patterns/SaveModel.html)
- [GitHub Primer: Saving patterns](https://primer.style/ui-patterns/saving/)

**Settings UX Patterns:**
- [Designing settings screen UI](https://blog.logrocket.com/ux-design/designing-settings-screen-ui/)
- [Dropdown interaction patterns guide](https://www.uxpin.com/studio/blog/dropdown-interaction-patterns-a-complete-guide/)
- [Slider UI design best practices](https://mobbin.com/glossary/slider)
- [Slider design rules of thumb - Nielsen Norman Group](https://www.nngroup.com/articles/gui-slider-controls/)

**Image Overlay Features:**
- [Tiled: Load background reference forum discussion](https://discourse.mapeditor.org/t/load-background-reference/168)
- [Tiled: Working with Layers](https://doc.mapeditor.org/en/stable/manual/layers/)
- [Cities: Skylines ImageOverlayLite mod](https://thunderstore.io/c/cities-skylines-ii/p/algernon/ImageOverlayLite/)
- [ArcGIS: Change transparency](https://doc.arcgis.com/en/arcgis-online/reference/change-transparency.htm)
- [How to create image overlay on map](https://www.here.com/learn/blog/how-to-create-an-image-overlay-on-a-map)
- [Jakob Nielsen: 2026 UX predictions (transform controls)](https://jakobnielsenphd.substack.com/p/2026-predictions)

**Animation Patterns:**
- Current implementation: AnimationPanel.tsx, CanvasEngine.ts, globalSlice.ts
- Page Visibility API: MDN Web Docs (standard pattern for pausing animations when tab backgrounded)

**SEdit Compatibility:**
- AC_Setting_Info_25.txt (complete settings reference)
- E:\AC-SEDIT-SRC-ANALYSIS\SEDIT\SEdit-SRC-Analysis\SEDIT_Technical_Analysis.md (map format spec, animation system)
- MapSettingsDialog.tsx (current serialization implementation)
