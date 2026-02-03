import { useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { SETTING_CATEGORIES, getSettingsByCategory, getDefaultSettings } from '@core/map';
import { SettingInput } from './SettingInput';
import './MapSettingsDialog.css';

export interface MapSettingsDialogHandle {
  open: () => void;
}

export const MapSettingsDialog = forwardRef<MapSettingsDialogHandle>((_, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [localSettings, setLocalSettings] = useState<Record<string, number>>(() => getDefaultSettings());
  const [mapName, setMapName] = useState('');
  const [mapDescription, setMapDescription] = useState('');

  useImperativeHandle(ref, () => ({
    open: () => dialogRef.current?.showModal()
  }));

  const updateSetting = (key: string, value: number) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const resetSetting = (key: string, defaultValue: number) => {
    setLocalSettings(prev => ({ ...prev, [key]: defaultValue }));
  };

  const handleClose = () => {
    dialogRef.current?.close();
  };

  return (
    <dialog ref={dialogRef} className="map-settings-dialog">
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
                onChange={(e) => setMapName(e.target.value)}
                className="text-input"
                maxLength={32}
              />
            </div>
            <div className="setting-group">
              <label className="setting-label">Description</label>
              <textarea
                value={mapDescription}
                onChange={(e) => setMapDescription(e.target.value)}
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
          <button className="win95-button" onClick={handleClose}>
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
});

MapSettingsDialog.displayName = 'MapSettingsDialog';
