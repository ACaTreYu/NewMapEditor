# Phase 10: Map Settings Dialog - Research

**Researched:** 2026-02-02
**Domain:** React modal dialogs with Win95 property sheet UI, controlled form components
**Confidence:** HIGH

## Summary

This research covers implementing a comprehensive modal dialog for map settings with Windows 95 property sheet aesthetics. The dialog will contain 40+ game settings organized in tabs, using synchronized slider/text inputs with clamping validation.

**Key findings:**
- Modern React favors HTML5 `<dialog>` element over portals for simpler z-index management
- Win95 property sheets use semantic HTML (`<menu role="tablist">`) with `aria-selected` for active tabs
- Controlled components with `useState` are standard for slider+input synchronization
- Unsaved changes detection uses "dirty flag" pattern with confirmation on close
- Value clamping on input is preferred over error messages for user-friendliness

**Primary recommendation:** Use HTML5 `<dialog>` element with `useRef` for show/hide control, implement Win95 tab styling with CSS box-shadow borders, and use controlled components with Math.min/max clamping for all numeric inputs.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 18 | 18.x | Component framework | Already in use, built-in hooks sufficient |
| HTML5 `<dialog>` | Native | Modal container | Modern standard, no library needed, automatic z-index |
| Zustand | 4.x | State management | Already in use for editor state |
| CSS box-shadow | Native | Win95 3D borders | Standard technique for raised/sunken effects |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TypeScript | 5.x | Type safety | Already in use for all components |
| CSS custom properties | Native | Theming | Already in use via App.css |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `<dialog>` | React Portal | Portal requires manual z-index management, more complex |
| Native `<dialog>` | react-modal library | Adds dependency, native `<dialog>` has 92% browser support |
| Controlled components | React Hook Form | Overkill for simple slider+input pairs |
| Custom tabs | 98.css framework | Importing full framework vs custom CSS for just tabs |

**Installation:**
```bash
# No new dependencies needed - all native/already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/components/
├── MapSettingsDialog/      # Dialog component folder
│   ├── MapSettingsDialog.tsx   # Main dialog component
│   ├── MapSettingsDialog.css   # Win95 property sheet styles
│   ├── SettingInput.tsx        # Reusable slider+input component
│   └── types.ts                # Setting definitions from AC_Setting_Info_25.txt
```

### Pattern 1: HTML5 Dialog with useRef Control
**What:** Use `<dialog>` element accessed via `useRef`, control with `showModal()` and `close()` methods
**When to use:** All modal dialogs in the application
**Example:**
```typescript
// Source: https://dev.to/elsyng/react-modal-dialog-using-html-dialog-element-5afk
const dialogRef = useRef<HTMLDialogElement>(null);

const openDialog = () => {
  dialogRef.current?.showModal();
};

const closeDialog = () => {
  dialogRef.current?.close();
};

return (
  <>
    <button onClick={openDialog}>Open Settings</button>
    <dialog ref={dialogRef}>
      <form method="dialog">
        {/* Content */}
        <button type="submit">Close</button>
      </form>
    </dialog>
  </>
);
```

### Pattern 2: Synchronized Slider + Text Input
**What:** Single state value controls both slider and number input, with clamping on text input change
**When to use:** All numeric range settings in the dialog
**Example:**
```typescript
// Source: https://www.freecodecamp.org/news/component-crafting-how-to-create-a-slider-with-a-linked-input-600d3438a050/
const [value, setValue] = useState(100);

const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setValue(parseInt(e.target.value));
};

const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const val = parseInt(e.target.value);
  if (!isNaN(val)) {
    // Clamp to nearest valid value
    setValue(Math.max(min, Math.min(max, val)));
  }
};

return (
  <>
    <input type="range" value={value} onChange={handleSliderChange} />
    <input type="number" value={value} onChange={handleInputChange} />
  </>
);
```

### Pattern 3: Win95 Property Sheet Tabs
**What:** Use semantic `<menu role="tablist">` with `<li role="tab">` and `aria-selected` for active state
**When to use:** Any tabbed interface needing Win95 aesthetics
**Example:**
```typescript
// Source: https://jdan.github.io/98.css/
const [activeTab, setActiveTab] = useState(0);

return (
  <>
    <menu role="tablist">
      <li role="tab" aria-selected={activeTab === 0} onClick={() => setActiveTab(0)}>
        <a>General</a>
      </li>
      <li role="tab" aria-selected={activeTab === 1} onClick={() => setActiveTab(1)}>
        <a>Weapons</a>
      </li>
    </menu>
    <div role="tabpanel" hidden={activeTab !== 0}>
      {/* Tab 0 content */}
    </div>
    <div role="tabpanel" hidden={activeTab !== 1}>
      {/* Tab 1 content */}
    </div>
  </>
);
```

### Pattern 4: Unsaved Changes with Dirty Flag
**What:** Track modified state separately from store, show confirmation on close if dirty
**When to use:** Any dialog with editable data and Apply/Cancel buttons
**Example:**
```typescript
// Source: https://medium.com/@ignatovich.dm/how-to-create-a-custom-hook-for-unsaved-changes-alerts-in-react-b1441f0ae712
const [localSettings, setLocalSettings] = useState(originalSettings);
const [isDirty, setIsDirty] = useState(false);

const handleChange = (key: string, value: any) => {
  setLocalSettings({ ...localSettings, [key]: value });
  setIsDirty(true);
};

const handleClose = () => {
  if (isDirty && !confirm('Discard unsaved changes?')) {
    return;
  }
  dialogRef.current?.close();
};

const handleApply = () => {
  updateMapHeader(localSettings);
  setIsDirty(false);
};
```

### Pattern 5: Win95 Raised Button Borders
**What:** Use CSS box-shadow with light/dark borders to create 3D raised effect
**When to use:** All buttons in Win95-styled UI
**Example:**
```css
/* Source: https://jdan.github.io/98.css/ */
.win95-button {
  background: #c0c0c0;
  border: none;
  box-shadow:
    inset -1px -1px 0px #808080,  /* Dark bottom-right */
    inset 1px 1px 0px #ffffff,    /* Light top-left */
    inset -2px -2px 0px #000000,  /* Darker outer bottom-right */
    inset 2px 2px 0px #dfdfdf;    /* Lighter outer top-left */
  padding: 4px 12px;
}

.win95-button:active {
  box-shadow:
    inset 1px 1px 0px #000000,    /* Inverted for pressed effect */
    inset -1px -1px 0px #ffffff;
}
```

### Pattern 6: Win95 Property Sheet Tab Styling
**What:** Use box-shadow and border-radius for raised selected tab appearance
**When to use:** Property sheet dialogs
**Example:**
```css
/* Source: https://jdan.github.io/98.css/ and research */
menu[role="tablist"] {
  display: flex;
  border-bottom: 2px solid #808080;
  padding: 0;
  margin: 0 0 -2px 0;
}

li[role="tab"] {
  list-style: none;
  padding: 4px 16px;
  background: #c0c0c0;
  border: 1px solid #808080;
  border-bottom: none;
  border-radius: 4px 4px 0 0;
  margin-right: 2px;
  cursor: pointer;
}

li[role="tab"][aria-selected="true"] {
  background: var(--bg-primary);
  border-top: 2px solid #ffffff;
  border-left: 2px solid #ffffff;
  border-right: 2px solid #808080;
  margin-bottom: -2px;
  padding-bottom: 6px;
  z-index: 1;
}
```

### Anti-Patterns to Avoid
- **React Portal for simple modals:** Native `<dialog>` eliminates z-index stacking context issues without portals
- **Uncontrolled components for settings:** Makes dirty-flag tracking difficult, causes sync issues between slider/input
- **Validation errors for numeric inputs:** Clamping provides better UX than showing error messages
- **Global modal state management:** Overkill for single dialog - local state with `useRef` is simpler

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal z-index management | Custom portal with manual z-index | HTML5 `<dialog>` element | Browser automatically layers dialogs above content, no stacking context issues |
| Unsaved changes confirmation | Custom window.beforeunload logic | Dirty flag + dialog.close() override | beforeunload is for page navigation; dialog closing needs different approach |
| Win95 3D borders | Custom border graphics/images | CSS box-shadow technique | Multiple inset shadows create perfect raised/sunken effects without images |
| Slider step validation | Custom range enforcement logic | Native `<input type="range" step={1}>` | Built-in browser validation, no custom code needed |
| Tab keyboard navigation | Custom focus/keyboard handlers | Semantic HTML with role attributes | Accessibility built-in with `role="tablist"` and `role="tab"` |

**Key insight:** Modern web standards (HTML5 dialog, semantic ARIA roles, CSS box-shadow) provide complete solutions for Win95-style dialogs without libraries or complex custom code.

## Common Pitfalls

### Pitfall 1: Dialog Close Without Unsaved Changes Check
**What goes wrong:** User closes dialog via Escape key or backdrop click, losing changes
**Why it happens:** `<dialog>` element closes on Escape by default, no interception
**How to avoid:** Override `onClose` event on dialog element to check dirty flag
**Warning signs:** Settings reset unexpectedly when Escape pressed
**Solution:**
```typescript
<dialog ref={dialogRef} onClose={(e) => {
  if (isDirty && !confirm('Discard unsaved changes?')) {
    e.preventDefault();
    dialogRef.current?.showModal(); // Reopen
  }
}}>
```

### Pitfall 2: Z-Index Conflicts with Existing Panels
**What goes wrong:** Dialog appears behind toolbar or panels despite high z-index
**Why it happens:** Dialog rendered inside stacking context of parent container
**How to avoid:** Ensure `<dialog>` is direct child of `<body>` or use createPortal
**Warning signs:** Modal backdrop visible but content behind other elements
**Solution:** Place dialog component at root level in App.tsx, not nested in panels

### Pitfall 3: Slider/Input Desync on Manual Type
**What goes wrong:** User types "200" but slider shows different value, or vice versa
**Why it happens:** Separate state for slider and input, or missing onChange handlers
**How to avoid:** Single state value for both controls, update on every change
**Warning signs:** Slider and input show different values after typing
**Solution:** Always use same state variable for both `value` props (Pattern 2 above)

### Pitfall 4: Invalid Input Crashes Number Parsing
**What goes wrong:** User types non-numeric characters, `parseInt` returns NaN, breaks rendering
**Why it happens:** No validation before `parseInt`, direct assignment to state
**How to avoid:** Check `isNaN()` before setting state, only update on valid input
**Warning signs:** Input field clears unexpectedly, console errors about NaN
**Solution:**
```typescript
const handleInputChange = (e) => {
  const val = parseInt(e.target.value);
  if (!isNaN(val)) {  // Critical check
    setValue(Math.max(min, Math.min(max, val)));
  }
};
```

### Pitfall 5: Tab Content Not Hidden Properly
**What goes wrong:** All tab panels render simultaneously, causing layout issues
**Why it happens:** Using CSS `display: none` instead of `hidden` attribute
**How to avoid:** Use `hidden={activeTab !== index}` attribute, not CSS classes
**Warning signs:** Multiple tabs visible at once, or empty space where hidden tabs are
**Solution:** React's `hidden` attribute completely removes from layout tree

### Pitfall 6: Clashing CSS Between Dialog and Main UI
**What goes wrong:** Dialog inputs styled incorrectly due to global CSS rules
**Why it happens:** CSS specificity issues, global styles override dialog-specific styles
**How to avoid:** Namespace dialog CSS with `.map-settings-dialog` prefix, increase specificity
**Warning signs:** Buttons or inputs look different in dialog vs main panels
**Solution:**
```css
.map-settings-dialog input[type="range"] {
  /* Dialog-specific slider styles */
}
```

### Pitfall 7: Apply Button Doesn't Update Store
**What goes wrong:** User clicks Apply, but changes don't appear in main editor
**Why it happens:** Updating local state instead of calling `updateMapHeader` action
**How to avoid:** Apply must call Zustand store action, not just update local state
**Warning signs:** Changes disappear when dialog reopened, map not marked modified
**Solution:**
```typescript
const handleApply = () => {
  updateMapHeader(localSettings); // Store action
  setIsDirty(false);
};
```

## Code Examples

Verified patterns from official sources:

### Dialog Component Structure
```typescript
// Source: HTML5 dialog best practices research
import { useRef, useState } from 'react';
import { useEditorStore } from '@core/editor';
import './MapSettingsDialog.css';

export const MapSettingsDialog = () => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { map, updateMapHeader } = useEditorStore();
  const [localSettings, setLocalSettings] = useState(map?.header || {});
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const openDialog = () => {
    setLocalSettings(map?.header || {});
    setIsDirty(false);
    dialogRef.current?.showModal();
  };

  const handleClose = () => {
    if (isDirty && !confirm('Discard unsaved changes?')) {
      return;
    }
    dialogRef.current?.close();
  };

  const handleApply = () => {
    updateMapHeader(localSettings);
    setIsDirty(false);
  };

  const updateSetting = (key: string, value: any) => {
    setLocalSettings({ ...localSettings, [key]: value });
    setIsDirty(true);
  };

  return (
    <>
      <button onClick={openDialog}>Map Settings</button>
      <dialog
        ref={dialogRef}
        className="map-settings-dialog"
        onClose={(e) => {
          if (isDirty && !confirm('Discard unsaved changes?')) {
            e.preventDefault();
            dialogRef.current?.showModal();
          }
        }}
      >
        <div className="dialog-content">
          <menu role="tablist">
            <li role="tab" aria-selected={activeTab === 0} onClick={() => setActiveTab(0)}>
              <a>General</a>
            </li>
            {/* More tabs */}
          </menu>

          <div role="tabpanel" hidden={activeTab !== 0}>
            {/* Tab content */}
          </div>

          <div className="button-row">
            <button onClick={handleApply}>Apply</button>
            <button onClick={handleClose}>Close</button>
          </div>
        </div>
      </dialog>
    </>
  );
};
```

### Reusable Setting Input Component
```typescript
// Source: MapSettingsPanel.tsx (existing pattern)
interface SettingInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  defaultValue: number;
  onChange: (value: number) => void;
  onReset: () => void;
}

export const SettingInput: React.FC<SettingInputProps> = ({
  label, value, min, max, defaultValue, onChange, onReset
}) => {
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseInt(e.target.value));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val)) {
      onChange(Math.max(min, Math.min(max, val)));
    }
  };

  return (
    <div className="setting-row">
      <label>{label}</label>
      <div className="setting-controls">
        <span className="min-label">{min}</span>
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={handleSliderChange}
        />
        <span className="max-label">{max}</span>
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={handleInputChange}
        />
        <button
          className="reset-button"
          onClick={onReset}
          title="Reset to default"
          aria-label={`Reset ${label} to default`}
        >
          ↺
        </button>
      </div>
    </div>
  );
};
```

### Win95 Dialog Styling
```css
/* Source: 98.css documentation and existing App.css patterns */
.map-settings-dialog {
  border: none;
  background: var(--bg-primary);
  color: var(--text-primary);
  padding: 0;
  max-width: 600px;
  max-height: 80vh;
  box-shadow:
    inset -1px -1px 0px #0a0a0a,
    inset 1px 1px 0px #dfdfdf,
    inset -2px -2px 0px #808080,
    inset 2px 2px 0px #fff,
    2px 2px 10px rgba(0,0,0,0.4);
}

.map-settings-dialog::backdrop {
  background: rgba(0, 0, 0, 0.5);
}

/* Property sheet tabs */
.map-settings-dialog menu[role="tablist"] {
  display: flex;
  padding: 0;
  margin: 0;
  list-style: none;
  border-bottom: 2px solid var(--border-default);
  background: var(--bg-secondary);
}

.map-settings-dialog li[role="tab"] {
  padding: 6px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-default);
  border-bottom: none;
  border-radius: 4px 4px 0 0;
  margin-right: 2px;
  cursor: pointer;
  color: var(--text-secondary);
}

.map-settings-dialog li[role="tab"]:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.map-settings-dialog li[role="tab"][aria-selected="true"] {
  background: var(--bg-primary);
  color: var(--text-primary);
  border-top: 2px solid #ffffff;
  border-left: 2px solid #ffffff;
  border-right: 2px solid #808080;
  margin-bottom: -2px;
  padding-bottom: 8px;
  z-index: 1;
  position: relative;
}

/* Win95 button styling */
.map-settings-dialog button {
  background: #c0c0c0;
  border: none;
  padding: 6px 20px;
  min-width: 75px;
  box-shadow:
    inset -1px -1px 0px #808080,
    inset 1px 1px 0px #ffffff,
    inset -2px -2px 0px #000000,
    inset 2px 2px 0px #dfdfdf;
  cursor: pointer;
  font-family: inherit;
  font-size: 11px;
}

.map-settings-dialog button:active {
  box-shadow:
    inset 1px 1px 0px #000000,
    inset -1px -1px 0px #ffffff;
  padding: 7px 19px 5px 21px; /* Shift content when pressed */
}

.button-row {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid var(--border-default);
}
```

### Setting Definitions from AC_Setting_Info_25.txt
```typescript
// Source: AC_Setting_Info_25.txt (provided in context)
export interface GameSetting {
  key: string;
  label: string;
  min: number;
  max: number;
  default: number;
  description?: string;
  category: string;
}

export const GAME_SETTINGS: GameSetting[] = [
  // Movement
  { key: 'ShipSpeed', label: 'Ship Speed', min: 0, max: 200, default: 100, category: 'Movement' },

  // Laser
  { key: 'LaserDamage', label: 'Laser Damage', min: 0, max: 225, default: 27, category: 'Weapons' },
  { key: 'LaserEnergy', label: 'Laser Energy', min: 0, max: 57, default: 12, category: 'Weapons' },
  { key: 'LaserTTL', label: 'Laser TTL', min: 0, max: 10000, default: 480, category: 'Weapons' },
  { key: 'LaserSpeed', label: 'Laser Speed', min: 0, max: 100, default: 50, category: 'Weapons' },

  // Missiles
  { key: 'MissileDamage', label: 'Missile Damage', min: 0, max: 225, default: 102, category: 'Weapons' },
  { key: 'MissileEnergy', label: 'Missile Energy', min: 0, max: 57, default: 37, category: 'Weapons' },
  { key: 'MissileTTL', label: 'Missile TTL', min: 0, max: 10000, default: 480, category: 'Weapons' },
  { key: 'MissileRecharge', label: 'Missile Recharge', min: 0, max: 100000, default: 945, category: 'Weapons' },
  { key: 'MissileSpeed', label: 'Missile Speed', min: 0, max: 100, default: 50, category: 'Weapons' },

  // Bouncy
  { key: 'BouncyDamage', label: 'Bouncy Damage', min: 0, max: 225, default: 48, category: 'Weapons' },
  { key: 'BouncyEnergy', label: 'Bouncy Energy', min: 0, max: 57, default: 12, category: 'Weapons' },
  { key: 'BouncyTTL', label: 'Bouncy TTL', min: 0, max: 10000, default: 970, category: 'Weapons' },
  { key: 'BouncyRecharge', label: 'Bouncy Recharge', min: 0, max: 100000, default: 765, category: 'Weapons' },
  { key: 'BouncySpeed', label: 'Bouncy Speed', min: 0, max: 100, default: 50, category: 'Weapons' },

  // Grenades
  { key: 'NadeDamage', label: 'Grenade Damage', min: 0, max: 225, default: 21, category: 'Weapons' },
  { key: 'NadeEnergy', label: 'Grenade Energy', min: 0, max: 57, default: 19, category: 'Weapons' },
  { key: 'ShrapTTL', label: 'Shrapnel TTL', min: 0, max: 10000, default: 128, category: 'Weapons' },
  { key: 'ShrapSpeed', label: 'Shrapnel Speed', min: 0, max: 100, default: 50, category: 'Weapons' },
  { key: 'NadeRecharge', label: 'Grenade Recharge', min: 0, max: 100000, default: 1950, category: 'Weapons' },
  { key: 'NadeSpeed', label: 'Grenade Speed', min: 0, max: 100, default: 50, category: 'Weapons' },

  // General
  { key: 'HealthBonus', label: 'Health Bonus', min: 0, max: 224, default: 60, category: 'General' },
  { key: 'HealthDecay', label: 'Health Decay', min: 0, max: 224, default: 0, category: 'General' },
  { key: 'RepairRate', label: 'Repair Rate', min: 0, max: 244, default: 2, category: 'General' },
  { key: 'ElectionTime', label: 'Election Time', min: 0, max: 255, default: 50, category: 'Game' },

  // Flags/Objectives
  { key: 'HoldingTime', label: 'Holding Time', min: 0, max: 255, default: 0, category: 'Game' },
  { key: 'SwitchWin', label: 'Switch Win Count', min: 0, max: 9999, default: 0, category: 'Game' },
  { key: 'DominationWin', label: 'Domination Win Points', min: 0, max: 9999999, default: 9999999, category: 'Game' },
  { key: 'TurretHealth', label: 'Turret Health', min: 0, max: 224, default: 224, category: 'General' },

  // Boolean toggles (0 or 1)
  { key: 'DisableSwitchSound', label: 'Disable Switch Sound', min: 0, max: 1, default: 0, category: 'UI' },
  { key: 'InvisibleMap', label: 'Invisible Map', min: 0, max: 1, default: 0, category: 'Game' },
  { key: 'FogOfWar', label: 'Fog of War', min: 0, max: 1, default: 0, category: 'Game' },
  { key: 'FlagInPlay', label: 'Flag In Play', min: 0, max: 1, default: 0, category: 'Game' },
  { key: 'Widescreen', label: 'Widescreen', min: 0, max: 1, default: 0, category: 'UI' },

  // Dynamic Holding Time (new settings)
  { key: 'DHT_players', label: 'DHT Per Player', min: -999999, max: 999999, default: 0, category: 'Advanced' },
  { key: 'DHT_time', label: 'DHT Per Minute', min: -999999, max: 999999, default: 0, category: 'Advanced' },
  { key: 'DHT_deaths', label: 'DHT Per Death', min: -999999, max: 999999, default: 0, category: 'Advanced' },
  { key: 'DHT_score', label: 'DHT Per Cap', min: -999999, max: 999999, default: 0, category: 'Advanced' },
  { key: 'DHT_turrets', label: 'DHT Per Dead Turret', min: -999999, max: 999999, default: 0, category: 'Advanced' },
  { key: 'DHT_minimum', label: 'DHT Minimum', min: 0, max: 255, default: 1, category: 'Advanced' },
  { key: 'DHT_maximum', label: 'DHT Maximum', min: 0, max: 255, default: 255, category: 'Advanced' },
];

// Flagger variants (F-prefixed)
export const FLAGGER_SETTINGS: GameSetting[] = GAME_SETTINGS
  .filter(s => ['ShipSpeed', 'LaserDamage', 'LaserEnergy', 'MissileDamage', 'HealthBonus', 'RepairRate'].some(prefix => s.key.startsWith(prefix)))
  .map(s => ({ ...s, key: `F${s.key}`, label: `Flagger ${s.label}`, category: 'Flagger' }));
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| React Portal for modals | HTML5 `<dialog>` element | 2022-2024 | No z-index issues, built-in backdrop, simpler code |
| External modal libraries | Native dialog with hooks | 2023-2025 | Zero dependencies, 92% browser support |
| Uncontrolled components | Controlled with useState | Standard since React 16.8 | Predictable state, easier validation |
| Global form libraries | Direct state management | 2024-2026 | Simpler for small forms like settings dialogs |
| Image-based Win95 borders | CSS box-shadow technique | Always current | Scalable, themeable, no image assets |

**Deprecated/outdated:**
- **react-modal library**: Native `<dialog>` element is now preferred (still maintained but unnecessary)
- **ReactDOM.createPortal for modals**: No longer needed with `<dialog>`, only use for non-modal tooltips/popovers
- **Old DHT settings**: AC_Setting_Info_25.txt deprecates DHT/MinDHT/MaxDHT in favor of DHT_players/DHT_time/etc

## Open Questions

Things that couldn't be fully resolved:

1. **Extended Setting Storage in MapHeader**
   - What we know: MapHeader currently stores basic settings (laserDamage, maxPlayers, etc.)
   - What's unclear: Where extended settings (ShipSpeed, LaserTTL, etc.) should be stored
   - Recommendation: Add `extendedSettings: Record<string, number>` field to MapHeader interface, or serialize into description field as per original AC format (e.g., "DHT=750, MinDHT=4")

2. **Per-Setting Reset vs Global Reset All**
   - What we know: User wants both per-setting reset icons AND global "Reset All" button
   - What's unclear: Should "Reset All" affect ALL 40+ settings or just visible tab's settings
   - Recommendation: Global "Reset All" should reset ALL settings in all tabs, show confirmation dialog before executing

3. **Tab Organization Strategy**
   - What we know: Settings from AC_Setting_Info_25.txt need organizing into tabs
   - What's unclear: Optimal tab grouping (by weapon type vs by setting type)
   - Recommendation: Suggest tabs: General (ship/health), Weapons (laser/missile/bouncy/nade), Flagger (F-prefixed), Advanced (DHT/boolean toggles), organized by frequency of use within tabs

4. **Default Value Display Method**
   - What we know: Each setting has a default value that should be visible
   - What's unclear: Show as tooltip, inline text, or placeholder in input
   - Recommendation: Show default inline next to min/max labels: "0 [Default: 100] 200" or as tooltip on reset button

## Sources

### Primary (HIGH confidence)
- HTML5 Dialog Element:
  - [React modal with "dialog" - DEV Community](https://dev.to/elsyng/react-modal-dialog-using-html-dialog-element-5afk)
  - [Modals with HTML dialog element in JavaScript and React](https://medium.com/@dimterion/modals-with-html-dialog-element-in-javascript-and-react-fb23c885d62e)
- Win95 CSS Frameworks:
  - [98.css - A design system for building faithful recreations of old UIs](https://jdan.github.io/98.css/)
  - [Windows 95 UI Kit Documentation](https://demo.themesberg.com/windows-95-ui-kit/docs/introduction.html)
- Microsoft Official Documentation:
  - [About Property Sheets - Win32 apps | Microsoft Learn](https://learn.microsoft.com/en-us/windows/win32/controls/property-sheets)
- Existing codebase patterns:
  - E:\NewMapEditor\src\components\MapSettingsPanel\MapSettingsPanel.tsx (slider+input pattern)
  - E:\NewMapEditor\src\App.css (Win95 styling variables)
  - E:\NewMapEditor\src\core\editor\EditorState.ts (Zustand store pattern)

### Secondary (MEDIUM confidence)
- React Best Practices:
  - [A Better Guide To Forms in React - DEV Community](https://dev.to/ajones_codes/a-better-guide-to-forms-in-react-47f0)
  - [Component crafting: how to create a slider with a linked input](https://www.freecodecamp.org/news/component-crafting-how-to-create-a-slider-with-a-linked-input-600d3438a050/)
- Unsaved Changes Pattern:
  - [How to Create a Custom Hook for Unsaved Changes Alerts in React](https://medium.com/@ignatovich.dm/how-to-create-a-custom-hook-for-unsaved-changes-alerts-in-react-b1441f0ae712)
  - [Communicating unsaved changes - Cloudscape Design System](https://cloudscape.design/patterns/general/unsaved-changes/)
- React Portals (for comparison):
  - [Master React Portals: Fix UI Clipping, Z-Index & Event Problems](https://www.spritle.com/blog/master-react-portals-fix-ui-clipping-z-index-event-problems/)

### Tertiary (LOW confidence)
- General UI patterns:
  - [Reset Button UI: What It Means and When to Use It](https://www.designmonks.co/blog/reset-button-ui)
  - [The best React modal dialog libraries of 2026 | Croct Blog](https://blog.croct.com/post/best-react-modal-dialog-libraries)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All native/already installed, proven in codebase
- Architecture: HIGH - Patterns verified from official docs and existing code
- Pitfalls: HIGH - Based on common React form issues and dialog gotchas
- Code examples: HIGH - Adapted from working MapSettingsPanel.tsx and official sources
- Open questions: MEDIUM - Implementation details dependent on data model decisions

**Research date:** 2026-02-02
**Valid until:** 60 days (2026-04-03) - React/HTML5 dialog patterns are stable
