import { useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { SETTING_CATEGORIES, GAME_SETTINGS, getSettingsByCategory, getSettingsBySubcategory, SETTING_SUBCATEGORIES, getDefaultSettings, ObjectiveType, createDefaultHeader } from '@core/map';
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

  // Sort each group alphabetically by key
  const sortedNonFlagger = nonFlaggerSettings.sort((a, b) => a.key.localeCompare(b.key));
  const sortedFlagger = flaggerSettings.sort((a, b) => a.key.localeCompare(b.key));

  // Serialize each group
  const nonFlaggerPairs = sortedNonFlagger.map(setting =>
    `${setting.key}=${settings[setting.key] ?? setting.default}`
  );
  const flaggerPairs = sortedFlagger.map(setting =>
    `${setting.key}=${settings[setting.key] ?? setting.default}`
  );

  // Combine: non-flagger first, then flagger
  const allPairs = [...nonFlaggerPairs, ...flaggerPairs];
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

  return { settings, unrecognized };
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
  { value: ObjectiveType.SWITCH, label: 'Switches' }
];

const maxPlayerOptions: SelectOption[] = Array.from({ length: 16 }, (_, i) => ({
  value: i + 1, label: String(i + 1)
}));

const teamOptions: SelectOption[] = Array.from({ length: 4 }, (_, i) => ({
  value: i + 1, label: String(i + 1)
}));

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
    objective: ObjectiveType.FRAG as number,
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
        setMapName(map.header.name);
        // Parse description to extract settings, author, and unrecognized pairs
        const { settings, author, unrecognized } = parseDescription(map.header.description);
        setMapAuthor(author);
        unrecognizedRef.current = unrecognized;
        // Merge defaults with parsed settings and extendedSettings
        // Priority: defaults < parsed description < extendedSettings
        setLocalSettings({ ...getDefaultSettings(), ...settings, ...map.header.extendedSettings });
        // Populate header fields from loaded map
        setHeaderFields({
          maxPlayers: map.header.maxPlayers,
          numTeams: map.header.numTeams,
          objective: map.header.objective,
          laserDamage: map.header.laserDamage,
          specialDamage: map.header.specialDamage,
          rechargeRate: map.header.rechargeRate,
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

  const handleApply = () => {
    updateMapHeader({
      name: mapName,
      description: buildDescription(localSettings, mapAuthor, unrecognizedRef.current),
      extendedSettings: localSettings,
      ...headerFields  // Sync header fields for SEdit binary compatibility
    });
    setIsDirty(false);
  };

  const handleClose = () => {
    if (isDirty) {
      if (!confirm('You have unsaved changes. Discard them?')) {
        return;
      }
    }
    dialogRef.current?.close();
  };

  const handleDialogClose = (e: React.SyntheticEvent<HTMLDialogElement>) => {
    if (isDirty) {
      e.preventDefault();
      if (confirm('You have unsaved changes. Discard them?')) {
        setIsDirty(false);
        dialogRef.current?.close();
      } else {
        dialogRef.current?.showModal(); // Reopen
      }
    }
  };

  const handleResetAll = () => {
    if (confirm('Reset ALL settings to their default values?')) {
      setLocalSettings(getDefaultSettings());
      const defaultHeader = createDefaultHeader();
      setHeaderFields({
        maxPlayers: defaultHeader.maxPlayers,
        numTeams: defaultHeader.numTeams,
        objective: defaultHeader.objective,
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
      });
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
      <div className="dialog-title-bar">
        Map Settings
      </div>
      <div className="dialog-content">
        <menu role="tablist" className="dialog-tabs">
          {SETTING_CATEGORIES.map((cat, i) => (
            <li
              key={cat}
              role="tab"
              aria-selected={activeTab === i}
              onClick={() => setActiveTab(i)}
            >
              {cat}
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
              label="Objective"
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

            <h3 className="section-heading">Weapons</h3>

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

            <h3 className="section-heading">Combat & Powerups</h3>

            <SettingInput
              setting={{ key: 'laserDamage', label: 'Laser Damage', min: 0, max: 5, default: 2, category: 'General' }}
              value={headerFields.laserDamage}
              onChange={(val) => { setHeaderFields(prev => ({ ...prev, laserDamage: val })); setIsDirty(true); }}
              onReset={() => { setHeaderFields(prev => ({ ...prev, laserDamage: 2 })); setIsDirty(true); }}
            />
            <SettingInput
              setting={{ key: 'specialDamage', label: 'Special Damage', min: 0, max: 5, default: 2, category: 'General' }}
              value={headerFields.specialDamage}
              onChange={(val) => { setHeaderFields(prev => ({ ...prev, specialDamage: val })); setIsDirty(true); }}
              onReset={() => { setHeaderFields(prev => ({ ...prev, specialDamage: 2 })); setIsDirty(true); }}
            />
            <SettingInput
              setting={{ key: 'rechargeRate', label: 'Recharge Rate', min: 0, max: 5, default: 2, category: 'General' }}
              value={headerFields.rechargeRate}
              onChange={(val) => { setHeaderFields(prev => ({ ...prev, rechargeRate: val })); setIsDirty(true); }}
              onReset={() => { setHeaderFields(prev => ({ ...prev, rechargeRate: 2 })); setIsDirty(true); }}
            />
            <SettingInput
              setting={{ key: 'holdingTime', label: 'Holding Time', min: 0, max: 255, default: 15, category: 'General' }}
              value={headerFields.holdingTime}
              onChange={(val) => { setHeaderFields(prev => ({ ...prev, holdingTime: val })); setIsDirty(true); }}
              onReset={() => { setHeaderFields(prev => ({ ...prev, holdingTime: 15 })); setIsDirty(true); }}
            />
            <SettingInput
              setting={{ key: 'maxSimulPowerups', label: 'Max Simul Powerups', min: 0, max: 255, default: 12, category: 'General' }}
              value={headerFields.maxSimulPowerups}
              onChange={(val) => { setHeaderFields(prev => ({ ...prev, maxSimulPowerups: val })); setIsDirty(true); }}
              onReset={() => { setHeaderFields(prev => ({ ...prev, maxSimulPowerups: 12 })); setIsDirty(true); }}
            />
            <SettingInput
              setting={{ key: 'powerupCount', label: 'Powerup Count', min: 0, max: 255, default: 0, category: 'General' }}
              value={headerFields.powerupCount}
              onChange={(val) => { setHeaderFields(prev => ({ ...prev, powerupCount: val })); setIsDirty(true); }}
              onReset={() => { setHeaderFields(prev => ({ ...prev, powerupCount: 0 })); setIsDirty(true); }}
            />

            <h3 className="section-heading">Extended Settings</h3>

            {getSettingsByCategory('General').map(setting => (
              <SettingInput
                key={setting.key}
                setting={setting}
                value={localSettings[setting.key] ?? setting.default}
                onChange={(val) => updateSetting(setting.key, val)}
                onReset={() => resetSetting(setting.key, setting.default)}
              />
            ))}
          </div>

          {/* Weapons tab - Subcategory grouped */}
          <div
            role="tabpanel"
            hidden={activeTab !== 1}
            className="tab-panel"
          >
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
            {getSettingsBySubcategory('Game Rules', 'Game').map(setting => (
              <SettingInput
                key={setting.key}
                setting={setting}
                value={localSettings[setting.key] ?? setting.default}
                onChange={(val) => updateSetting(setting.key, val)}
                onReset={() => resetSetting(setting.key, setting.default)}
              />
            ))}
            <h3 className="section-heading">Toggles</h3>
            {getSettingsBySubcategory('Game Rules', 'Toggles').map(setting => (
              <CheckboxInput
                key={setting.key}
                label={setting.label}
                checked={(localSettings[setting.key] ?? setting.default) !== 0}
                onChange={(checked) => updateSetting(setting.key, checked ? 1 : 0)}
              />
            ))}
          </div>

          {/* Flagger tab - Flat slider list */}
          <div
            role="tabpanel"
            hidden={activeTab !== 3}
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

          {/* Advanced tab - DHT settings with section heading */}
          <div
            role="tabpanel"
            hidden={activeTab !== 4}
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
          <div className="button-spacer" />
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
            onClick={handleClose}
          >
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
});

MapSettingsDialog.displayName = 'MapSettingsDialog';
