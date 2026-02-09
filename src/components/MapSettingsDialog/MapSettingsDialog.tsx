import { useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { SETTING_CATEGORIES, GAME_SETTINGS, getSettingsByCategory, getDefaultSettings } from '@core/map';
import { useEditorStore } from '@core/editor';
import { SettingInput } from './SettingInput';
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

export const MapSettingsDialog = forwardRef<MapSettingsDialogHandle>((_, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [localSettings, setLocalSettings] = useState<Record<string, number>>(() => getDefaultSettings());
  const [mapName, setMapName] = useState('');
  const [mapDescription, setMapDescription] = useState('');
  const [mapAuthor, setMapAuthor] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  const updateMapHeader = useEditorStore((state) => state.updateMapHeader);

  useImperativeHandle(ref, () => ({
    open: () => {
      const { map } = useEditorStore.getState();
      if (map) {
        setMapName(map.header.name);
        setMapDescription(map.header.description);
        setMapAuthor(parseAuthor(map.header.description));
        // Merge defaults with any extended settings from the map
        const defaults = getDefaultSettings();
        setLocalSettings({ ...defaults, ...map.header.extendedSettings });
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
      description: serializeAuthor(mapDescription, mapAuthor),
      extendedSettings: localSettings
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
      setIsDirty(true);
    }
  };

  const setMapNameWithDirty = (name: string) => {
    setMapName(name);
    setIsDirty(true);
  };

  const setMapDescriptionWithDirty = (desc: string) => {
    setMapDescription(desc);
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
          {/* Map tab - special case with name and description */}
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
            <div className="setting-group">
              <label className="setting-label">Description</label>
              <textarea
                value={mapDescription}
                onChange={(e) => setMapDescriptionWithDirty(e.target.value)}
                className="text-area"
                rows={3}
                maxLength={256}
              />
            </div>
          </div>

          {/* Other tabs - render game settings */}
          {SETTING_CATEGORIES.slice(1).map((category, i) => {
            const tabIndex = i + 1;
            const categorySettings = getSettingsByCategory(category);
            return (
              <div
                key={category}
                role="tabpanel"
                hidden={activeTab !== tabIndex}
                className="tab-panel"
              >
                {categorySettings.map(setting => (
                  <SettingInput
                    key={setting.key}
                    setting={setting}
                    value={localSettings[setting.key] ?? setting.default}
                    onChange={(val) => updateSetting(setting.key, val)}
                    onReset={() => resetSetting(setting.key, setting.default)}
                  />
                ))}
              </div>
            );
          })}
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
