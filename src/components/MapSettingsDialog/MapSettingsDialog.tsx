import { useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { GAME_SETTINGS, getSettingsByCategory, getSettingsBySubcategory, SETTING_SUBCATEGORIES, getDefaultSettings, ObjectiveType, createDefaultHeader } from '@core/map';
import { useEditorStore } from '@core/editor';
import { SettingInput } from './SettingInput';
import { CheckboxInput } from './CheckboxInput';
import { SelectInput, SelectOption } from './SelectInput';
import './MapSettingsDialog.css';

/**
 * Serializes game settings to comma-space delimited Key=Value pairs.
 * Non-flagger settings come first, then flagger settings, both sorted alphabetically.
 * @param settings - Record of setting key to value
 * @returns Serialized string like "BouncyDamage=48, LaserDamage=27, FBouncyDamage=48, ..."
 */
function serializeSettings(settings: Record<string, number>): string {
  // Split settings into non-flagger and flagger groups
  const nonFlaggerSettings = GAME_SETTINGS.filter(s => s.category !== 'Flagger');
  const flaggerSettings = GAME_SETTINGS.filter(s => s.category === 'Flagger');

  // Sort each group alphabetically by key (defensive copy to prevent mutation)
  const sortedNonFlagger = [...nonFlaggerSettings].sort((a, b) => a.key.localeCompare(b.key));
  const sortedFlagger = [...flaggerSettings].sort((a, b) => a.key.localeCompare(b.key));

  // Serialize each group
  const nonFlaggerPairs = sortedNonFlagger.map(setting =>
    `${setting.key}=${settings[setting.key] ?? setting.default}`
  );
  const flaggerPairs = sortedFlagger.map(setting =>
    `${setting.key}=${settings[setting.key] ?? setting.default}`
  );

  // Combine: non-flagger first, Format=1.1 (required for turrets), then flagger
  const allPairs = [...nonFlaggerPairs, 'Format=1.1', ...flaggerPairs];
  return allPairs.join(', ');
}

/**
 * Parses game settings from comma-delimited Key=Value pairs.
 * Values are clamped to min/max bounds. Unrecognized pairs are preserved.
 * @param description - The description string to parse
 * @returns Object with parsed settings and unrecognized pairs
 */
function parseSettings(description: string): { settings: Record<string, number>; unrecognized: string[] } {
  const settings: Record<string, number> = {};
  const unrecognized: string[] = [];

  // Split by comma and trim each part
  const pairs = description.split(',').map(p => p.trim()).filter(Boolean);

  for (const pair of pairs) {
    const match = pair.match(/^(\w+)=(.+)$/);
    if (match) {
      const [, key, valueStr] = match;
      const setting = GAME_SETTINGS.find(s => s.key === key);

      if (setting) {
        // Parse and clamp value to min/max bounds
        const value = parseInt(valueStr, 10);
        settings[key] = Math.max(setting.min, Math.min(setting.max, value));
      } else {
        // Preserve unrecognized Key=Value pairs
        unrecognized.push(pair);
      }
    } else {
      // Preserve non-Key=Value entries (legacy text)
      unrecognized.push(pair);
    }
  }

  // Filter out Format=1.1 since serializeSettings always injects it
  const filtered = unrecognized.filter(p => !p.match(/^Format=[\d.]+$/));
  return { settings, unrecognized: filtered };
}

/**
 * Builds complete description string from settings, author, and unrecognized pairs.
 * Order: [settings] [Author=...] [unrecognized...]
 * @param settings - Game settings record
 * @param author - Author name
 * @param unrecognized - Unrecognized pairs to preserve (optional)
 * @returns Complete description string
 */
function buildDescription(settings: Record<string, number>, author: string, unrecognized?: string[]): string {
  const parts: string[] = [];

  // Add serialized settings
  parts.push(serializeSettings(settings));

  // Add author if non-empty
  if (author.trim()) {
    parts.push(`Author=${author.trim()}`);
  }

  // Add unrecognized pairs
  if (unrecognized && unrecognized.length > 0) {
    parts.push(...unrecognized);
  }

  return parts.join(', ');
}

/**
 * Parses description string to extract settings, author, and unrecognized pairs.
 * @param description - The description string to parse
 * @returns Object with settings, author, and unrecognized pairs
 */
function parseDescription(description: string): { settings: Record<string, number>; author: string; unrecognized: string[] } {
  const { settings, unrecognized } = parseSettings(description);

  // Find and extract Author entry
  const authorPair = unrecognized.find(p => p.startsWith('Author='));
  const author = authorPair ? authorPair.slice('Author='.length).trim() : '';

  // Filter Author entry out of unrecognized array
  const filteredUnrecognized = unrecognized.filter(p => !p.startsWith('Author='));

  return { settings, author, unrecognized: filteredUnrecognized };
}

export interface MapSettingsDialogHandle {
  open: () => void;
}

// Dropdown option constants
const objectiveOptions: SelectOption[] = [
  { value: ObjectiveType.FRAG, label: 'Deathmatch' },
  { value: ObjectiveType.FLAG, label: 'Capture the Flag' },
  { value: ObjectiveType.SWITCH, label: 'Switches' },
  { value: ObjectiveType.ASSASSIN, label: 'Assassin' },
  { value: ObjectiveType.DOMINATION, label: 'Domination' },
  { value: ObjectiveType.FFA, label: 'Free-For-All' }
];

// Game mode tags appended to map name on save, stripped on load
const MODE_TAGS: Partial<Record<number, string>> = {
  [ObjectiveType.FRAG]: 'Deathmatch',
  [ObjectiveType.ASSASSIN]: 'Assassin',
  [ObjectiveType.DOMINATION]: 'Domination',
  [ObjectiveType.FFA]: 'FFA',
};

const MODE_TAG_PATTERN = /\((Deathmatch|Assassin|Domination|FFA)\)$/;

function stripModeTag(name: string): string {
  return name.replace(MODE_TAG_PATTERN, '').trimEnd();
}

function appendModeTag(name: string, objective: number): string {
  const tag = MODE_TAGS[objective];
  if (!tag) return name;
  return `${name}(${tag})`;
}

const maxPlayerOptions: SelectOption[] = Array.from({ length: 16 }, (_, i) => ({
  value: i + 1, label: String(i + 1)
}));

const teamOptions: SelectOption[] = Array.from({ length: 4 }, (_, i) => ({
  value: i + 1, label: String(i + 1)
}));

const damageRechargeOptions: SelectOption[] = [
  { value: 0, label: 'Very Low' },
  { value: 1, label: 'Low' },
  { value: 2, label: 'Normal' },
  { value: 3, label: 'High' },
  { value: 4, label: 'Very High' },
];

// Maps header level (0-4) to extended setting values
// These scale proportionally around the default "Normal" value
const LASER_DAMAGE_VALUES = [5, 14, 27, 54, 112];
const SPECIAL_DAMAGE_VALUES = [20, 51, 102, 153, 204]; // Maps to MissileDamage
const RECHARGE_RATE_VALUES = [3780, 1890, 945, 473, 236]; // Maps to MissileRecharge (lower = faster)

/**
 * Find the dropdown index (0-4) whose preset value is closest to the given
 * extended setting value. Handles custom values by snapping to nearest preset.
 */
function findClosestIndex(value: number, valueArray: number[]): number {
  let closestIdx = 0;
  let minDiff = Math.abs(value - valueArray[0]);
  for (let i = 1; i < valueArray.length; i++) {
    const diff = Math.abs(value - valueArray[i]);
    if (diff < minDiff) {
      minDiff = diff;
      closestIdx = i;
    }
  }
  return closestIdx;
}

export const MapSettingsDialog = forwardRef<MapSettingsDialogHandle>((_, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const unrecognizedRef = useRef<string[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [localSettings, setLocalSettings] = useState<Record<string, number>>(() => getDefaultSettings());
  const [mapName, setMapName] = useState('');
  const [mapAuthor, setMapAuthor] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  // Header field state for binary format compatibility
  const [headerFields, setHeaderFields] = useState({
    maxPlayers: 16,
    numTeams: 2,
    objective: ObjectiveType.FLAG as number,
    laserDamage: 2,
    specialDamage: 2,
    rechargeRate: 2,
    holdingTime: 15,
    missilesEnabled: true,
    bombsEnabled: true,
    bounciesEnabled: true,
    maxSimulPowerups: 12,
    powerupCount: 0,
    switchCount: 0
  });

  const updateMapHeader = useEditorStore((state) => state.updateMapHeader);

  useImperativeHandle(ref, () => ({
    open: () => {
      const { map } = useEditorStore.getState();
      if (map) {
        setMapName(stripModeTag(map.header.name));
        // Parse description to extract settings, author, and unrecognized pairs
        const { settings, author, unrecognized } = parseDescription(map.header.description);
        setMapAuthor(author);
        unrecognizedRef.current = unrecognized;
        // Merge priority: defaults < description parsed settings < stored extendedSettings
        const merged = { ...getDefaultSettings(), ...settings, ...map.header.extendedSettings };
        // Default SwitchWin to switch count if not explicitly set
        if (merged['SwitchWin'] === 0 && map.header.switchCount > 0) {
          merged['SwitchWin'] = map.header.switchCount;
        }
        setLocalSettings(merged);
        // Compute dropdown indices from merged extended settings (not stale header values)
        setHeaderFields({
          maxPlayers: map.header.maxPlayers,
          numTeams: map.header.numTeams,
          objective: map.header.objective,
          laserDamage: findClosestIndex(merged['LaserDamage'] ?? 27, LASER_DAMAGE_VALUES),
          specialDamage: findClosestIndex(merged['MissileDamage'] ?? 102, SPECIAL_DAMAGE_VALUES),
          rechargeRate: findClosestIndex(merged['MissileRecharge'] ?? 945, RECHARGE_RATE_VALUES),
          holdingTime: map.header.holdingTime,
          missilesEnabled: map.header.missilesEnabled,
          bombsEnabled: map.header.bombsEnabled,
          bounciesEnabled: map.header.bounciesEnabled,
          maxSimulPowerups: map.header.maxSimulPowerups,
          powerupCount: map.header.powerupCount,
          switchCount: map.header.switchCount
        });
      }
      setIsDirty(false);
      dialogRef.current?.showModal();
    }
  }));

  const updateSetting = (key: string, value: number) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const resetSetting = (key: string, defaultValue: number) => {
    setLocalSettings(prev => ({ ...prev, [key]: defaultValue }));
    setIsDirty(true);
  };

  const applySettings = () => {
    updateMapHeader({
      name: appendModeTag(stripModeTag(mapName), headerFields.objective),
      description: buildDescription(localSettings, mapAuthor, unrecognizedRef.current),
      extendedSettings: localSettings,
      ...headerFields  // Sync header fields for SEdit binary compatibility
    });
    setIsDirty(false);
  };

  const handleApply = () => {
    applySettings();
  };

  const handleOk = () => {
    applySettings();
    dialogRef.current?.close();
  };

  const tryClose = () => {
    if (isDirty) {
      if (!confirm('You have unsaved changes. Close without applying?')) {
        return; // User chose to stay
      }
    }
    setIsDirty(false);
    dialogRef.current?.close();
  };

  const handleDialogClose = (e: React.SyntheticEvent<HTMLDialogElement>) => {
    // Prevent Escape key from bypassing unsaved changes check
    if (isDirty) {
      e.preventDefault();
      dialogRef.current?.showModal();
      tryClose();
    }
  };

  // Dragging state
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const handleTitleBarMouseDown = useCallback((e: React.MouseEvent) => {
    // Only drag from title bar, not the close button
    if ((e.target as HTMLElement).closest('.dialog-close-button')) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const rect = dialog.getBoundingClientRect();
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: rect.left, origY: rect.top };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      dialog.style.margin = '0';
      dialog.style.left = `${dragRef.current.origX + dx}px`;
      dialog.style.top = `${dragRef.current.origY + dy}px`;
    };

    const handleMouseUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, []);

  const handleResetAll = () => {
    if (confirm('Reset ALL settings to their default values?')) {
      setLocalSettings(getDefaultSettings());
      const defaultHeader = createDefaultHeader();
      setHeaderFields(prev => ({
        ...prev,
        // Preserve: objective (game mode), name, author are NOT reset
        maxPlayers: defaultHeader.maxPlayers,
        numTeams: defaultHeader.numTeams,
        laserDamage: defaultHeader.laserDamage,
        specialDamage: defaultHeader.specialDamage,
        rechargeRate: defaultHeader.rechargeRate,
        holdingTime: defaultHeader.holdingTime,
        missilesEnabled: defaultHeader.missilesEnabled,
        bombsEnabled: defaultHeader.bombsEnabled,
        bounciesEnabled: defaultHeader.bounciesEnabled,
        maxSimulPowerups: defaultHeader.maxSimulPowerups,
        powerupCount: defaultHeader.powerupCount,
        switchCount: defaultHeader.switchCount
      }));
      setIsDirty(true);
    }
  };

  const setMapNameWithDirty = (name: string) => {
    setMapName(name);
    setIsDirty(true);
  };

  const setMapAuthorWithDirty = (author: string) => {
    setMapAuthor(author);
    setIsDirty(true);
  };

  return (
    <dialog ref={dialogRef} className="map-settings-dialog" onClose={handleDialogClose}>
      <div className="dialog-title-bar" onMouseDown={handleTitleBarMouseDown}>
        <span className="dialog-title-text">Map Settings</span>
        <button type="button" className="dialog-close-button" onClick={tryClose}>&times;</button>
      </div>
      <div className="dialog-content">
        <menu role="tablist" className="dialog-tabs">
          {['General', 'Weapons', 'Game Rules', 'Power Ups', 'Flagger', 'DHT'].map((tab, i) => (
            <li
              key={tab}
              role="tab"
              aria-selected={activeTab === i}
              onClick={() => setActiveTab(i)}
            >
              {tab}
            </li>
          ))}
        </menu>

        <div className="tab-content">
          {/* General tab - Map info + header fields + extended settings */}
          <div
            role="tabpanel"
            hidden={activeTab !== 0}
            className="tab-panel"
          >
            <div className="setting-group">
              <label className="setting-label">Map Name</label>
              <input
                type="text"
                value={mapName}
                onChange={(e) => setMapNameWithDirty(e.target.value)}
                className="text-input"
                maxLength={32}
              />
            </div>
            <div className="setting-group">
              <label className="setting-label">Author</label>
              <input
                type="text"
                value={mapAuthor}
                onChange={(e) => setMapAuthorWithDirty(e.target.value)}
                className="text-input"
                maxLength={32}
              />
            </div>

            <h3 className="section-heading">Game Setup</h3>

            <SelectInput
              label="Game Mode"
              value={headerFields.objective}
              options={objectiveOptions}
              onChange={(val) => { setHeaderFields(prev => ({ ...prev, objective: val })); setIsDirty(true); }}
            />
            <SelectInput
              label="Max Players"
              value={headerFields.maxPlayers}
              options={maxPlayerOptions}
              onChange={(val) => { setHeaderFields(prev => ({ ...prev, maxPlayers: val })); setIsDirty(true); }}
            />
            <SelectInput
              label="Num Teams"
              value={headerFields.numTeams}
              options={teamOptions}
              onChange={(val) => { setHeaderFields(prev => ({ ...prev, numTeams: val })); setIsDirty(true); }}
            />
            {headerFields.objective === ObjectiveType.ASSASSIN && (
              <SettingInput
                setting={{ key: 'ElectionTime', label: 'Election Time', min: 0, max: 255, default: 50, category: 'General' }}
                value={localSettings['ElectionTime'] ?? 50}
                onChange={(val) => updateSetting('ElectionTime', val)}
                onReset={() => resetSetting('ElectionTime', 50)}
              />
            )}
            {headerFields.objective === ObjectiveType.FLAG && (
              <CheckboxInput
                label="Flag In Play"
                checked={(localSettings['FlagInPlay'] ?? 1) !== 0}
                onChange={(checked) => updateSetting('FlagInPlay', checked ? 1 : 0)}
                description="Enables extension of the game clock if a flag is in play."
              />
            )}
            {headerFields.objective === ObjectiveType.DOMINATION && (
              <SettingInput
                setting={{ key: 'DominationWin', label: 'Domination Win', min: 0, max: 9999999, default: 9999999, category: 'General' }}
                value={localSettings['DominationWin'] ?? 9999999}
                onChange={(val) => updateSetting('DominationWin', val)}
                onReset={() => resetSetting('DominationWin', 9999999)}
              />
            )}
            {headerFields.objective === ObjectiveType.FRAG && (
              <SettingInput
                setting={{ key: 'DeathMatchWin', label: 'Deathmatch Win', min: 1, max: 999, default: 25, category: 'General' }}
                value={localSettings['DeathMatchWin'] ?? 25}
                onChange={(val) => updateSetting('DeathMatchWin', val)}
                onReset={() => resetSetting('DeathMatchWin', 25)}
              />
            )}
            {headerFields.objective === ObjectiveType.SWITCH && (
              <>
                <SettingInput
                  setting={{ key: 'SwitchWin', label: 'Switch Win', min: 0, max: 9999, default: headerFields.switchCount, category: 'General' }}
                  value={localSettings['SwitchWin'] ?? headerFields.switchCount}
                  onChange={(val) => updateSetting('SwitchWin', val)}
                  onReset={() => resetSetting('SwitchWin', headerFields.switchCount)}
                />
                <CheckboxInput
                  label="Disable Switch Sound"
                  checked={(localSettings['DisableSwitchSound'] ?? 0) !== 0}
                  onChange={(checked) => updateSetting('DisableSwitchSound', checked ? 1 : 0)}
                  description="Disables the switch notification sound."
                />
              </>
            )}
            <SettingInput
              setting={{ key: 'holdingTime', label: 'Holding Time', min: 0, max: 64, default: 15, category: 'General' }}
              value={headerFields.holdingTime}
              onChange={(val) => { setHeaderFields(prev => ({ ...prev, holdingTime: val })); setIsDirty(true); }}
              onReset={() => { setHeaderFields(prev => ({ ...prev, holdingTime: 15 })); setIsDirty(true); }}
            />

          </div>

          {/* Weapons tab - Header fields + subcategory grouped */}
          <div
            role="tabpanel"
            hidden={activeTab !== 1}
            className="tab-panel"
          >
            <div className="weapons-header-row">
              <div className="weapons-header-col">
                <h3 className="section-heading">Enabled Weapons</h3>
                <CheckboxInput
                  label="Missiles Enabled"
                  checked={headerFields.missilesEnabled}
                  onChange={(checked) => { setHeaderFields(prev => ({ ...prev, missilesEnabled: checked })); setIsDirty(true); }}
                />
                <CheckboxInput
                  label="Bombs Enabled"
                  checked={headerFields.bombsEnabled}
                  onChange={(checked) => { setHeaderFields(prev => ({ ...prev, bombsEnabled: checked })); setIsDirty(true); }}
                />
                <CheckboxInput
                  label="Bouncies Enabled"
                  checked={headerFields.bounciesEnabled}
                  onChange={(checked) => { setHeaderFields(prev => ({ ...prev, bounciesEnabled: checked })); setIsDirty(true); }}
                />
              </div>
              <div className="weapons-header-col">
                <h3 className="section-heading">Damage & Recharge</h3>
                <SelectInput
                  label="Laser Damage"
                  value={headerFields.laserDamage}
                  options={damageRechargeOptions}
                  onChange={(val) => {
                    setHeaderFields(prev => ({ ...prev, laserDamage: val }));
                    updateSetting('LaserDamage', LASER_DAMAGE_VALUES[val] ?? 27);
                    setIsDirty(true);
                  }}
                />
                <SelectInput
                  label="Special Damage"
                  value={headerFields.specialDamage}
                  options={damageRechargeOptions}
                  onChange={(val) => {
                    setHeaderFields(prev => ({ ...prev, specialDamage: val }));
                    updateSetting('MissileDamage', SPECIAL_DAMAGE_VALUES[val] ?? 102);
                    setIsDirty(true);
                  }}
                />
                <SelectInput
                  label="Recharge Rate"
                  value={headerFields.rechargeRate}
                  options={damageRechargeOptions}
                  onChange={(val) => {
                    setHeaderFields(prev => ({ ...prev, rechargeRate: val }));
                    updateSetting('MissileRecharge', RECHARGE_RATE_VALUES[val] ?? 945);
                    setIsDirty(true);
                  }}
                />
              </div>
            </div>

            {SETTING_SUBCATEGORIES['Weapons']?.map(sub => (
              <div key={sub}>
                <h3 className="section-heading">{sub}</h3>
                {getSettingsBySubcategory('Weapons', sub).map(setting => (
                  <SettingInput
                    key={setting.key}
                    setting={setting}
                    value={localSettings[setting.key] ?? setting.default}
                    onChange={(val) => updateSetting(setting.key, val)}
                    onReset={() => resetSetting(setting.key, setting.default)}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Game Rules tab - Mixed sliders + checkboxes by subcategory */}
          <div
            role="tabpanel"
            hidden={activeTab !== 2}
            className="tab-panel"
          >
            <h3 className="section-heading">Game</h3>
            {getSettingsBySubcategory('Game Rules', 'Game').map(setting => {
              const isPromoted =
                (setting.key === 'ElectionTime' && headerFields.objective === ObjectiveType.ASSASSIN) ||
                (setting.key === 'DominationWin' && headerFields.objective === ObjectiveType.DOMINATION) ||
                (setting.key === 'DeathMatchWin' && headerFields.objective === ObjectiveType.FRAG) ||
                (setting.key === 'SwitchWin' && headerFields.objective === ObjectiveType.SWITCH);
              return (
                <SettingInput
                  key={setting.key}
                  setting={setting}
                  value={localSettings[setting.key] ?? setting.default}
                  onChange={(val) => updateSetting(setting.key, val)}
                  onReset={() => resetSetting(setting.key, setting.default)}
                  disabled={isPromoted}
                />
              );
            })}
            <h3 className="section-heading">Toggles</h3>
            {getSettingsBySubcategory('Game Rules', 'Toggles').map(setting => {
              const isPromoted =
                (setting.key === 'FlagInPlay' && headerFields.objective === ObjectiveType.FLAG) ||
                (setting.key === 'DisableSwitchSound' && headerFields.objective === ObjectiveType.SWITCH);
              return (
                <CheckboxInput
                  key={setting.key}
                  label={setting.label}
                  checked={(localSettings[setting.key] ?? setting.default) !== 0}
                  onChange={(checked) => updateSetting(setting.key, checked ? 1 : 0)}
                  disabled={isPromoted}
                  description={setting.description}
                />
              );
            })}
          </div>

          {/* Power Ups tab */}
          <div
            role="tabpanel"
            hidden={activeTab !== 3}
            className="tab-panel"
          >
            <SettingInput
              setting={{ key: 'maxSimulPowerups', label: 'Max Simul Powerups', min: 0, max: 64, default: 12, category: 'General' }}
              value={headerFields.maxSimulPowerups}
              onChange={(val) => { setHeaderFields(prev => ({ ...prev, maxSimulPowerups: val })); setIsDirty(true); }}
              onReset={() => { setHeaderFields(prev => ({ ...prev, maxSimulPowerups: 12 })); setIsDirty(true); }}
            />
            <SettingInput
              setting={{ key: 'powerupCount', label: 'Powerup Count', min: 0, max: 64, default: 0, category: 'General' }}
              value={headerFields.powerupCount}
              onChange={(val) => { setHeaderFields(prev => ({ ...prev, powerupCount: val })); setIsDirty(true); }}
              onReset={() => { setHeaderFields(prev => ({ ...prev, powerupCount: 0 })); setIsDirty(true); }}
            />
          </div>

          {/* Flagger tab - Flat slider list */}
          <div
            role="tabpanel"
            hidden={activeTab !== 4}
            className="tab-panel"
          >
            {getSettingsByCategory('Flagger').map(setting => (
              <SettingInput
                key={setting.key}
                setting={setting}
                value={localSettings[setting.key] ?? setting.default}
                onChange={(val) => updateSetting(setting.key, val)}
                onReset={() => resetSetting(setting.key, setting.default)}
              />
            ))}
          </div>

          {/* DHT tab - Dynamic Holding Time settings */}
          <div
            role="tabpanel"
            hidden={activeTab !== 5}
            className="tab-panel"
          >
            <h3 className="section-heading">Dynamic Holding Time</h3>
            {getSettingsBySubcategory('Advanced', 'DHT').map(setting => (
              <SettingInput
                key={setting.key}
                setting={setting}
                value={localSettings[setting.key] ?? setting.default}
                onChange={(val) => updateSetting(setting.key, val)}
                onReset={() => resetSetting(setting.key, setting.default)}
              />
            ))}
          </div>
        </div>

        <div className="dialog-buttons">
          <button
            type="button"
            className="win95-button reset-all-button"
            onClick={handleResetAll}
          >
            Reset All
          </button>
          <button
            type="button"
            className="win95-button"
            onClick={handleApply}
            disabled={!isDirty}
          >
            Apply
          </button>
          <button
            type="button"
            className="win95-button"
            onClick={handleOk}
          >
            OK
          </button>
          <button
            type="button"
            className="win95-button"
            onClick={tryClose}
          >
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
});

MapSettingsDialog.displayName = 'MapSettingsDialog';
