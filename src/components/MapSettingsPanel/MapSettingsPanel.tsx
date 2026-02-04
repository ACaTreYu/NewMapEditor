/**
 * MapSettingsPanel - Editable map settings with range sliders and text inputs
 */

import React, { useCallback } from 'react';
import { useEditorStore } from '@core/editor';
import { ObjectiveType } from '@core/map';
import { useTheme, Win98Scheme } from '../../hooks/useTheme';
import './MapSettingsPanel.css';

interface NumberInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

const NumberInput: React.FC<NumberInputProps> = ({ label, value, min, max, onChange }) => {
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
      <label className="setting-label">{label}</label>
      <div className="setting-controls">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={handleSliderChange}
          className="setting-slider"
        />
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={handleInputChange}
          className="setting-input"
        />
        <span className="setting-range">({min}-{max})</span>
      </div>
    </div>
  );
};

interface CheckboxInputProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const CheckboxInput: React.FC<CheckboxInputProps> = ({ label, checked, onChange }) => {
  return (
    <div className="setting-row setting-checkbox">
      <label className="setting-label">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        {label}
      </label>
    </div>
  );
};

interface Props {
  compact?: boolean;
}

export const MapSettingsPanel: React.FC<Props> = ({ compact = false }) => {
  const { map, updateMapHeader } = useEditorStore();
  const { scheme, setScheme } = useTheme();

  const handleChange = useCallback(<K extends keyof NonNullable<typeof map>['header']>(
    key: K,
    value: NonNullable<typeof map>['header'][K]
  ) => {
    updateMapHeader({ [key]: value } as any);
  }, [updateMapHeader]);

  if (!map) {
    return (
      <div className={`map-settings-panel ${compact ? 'compact' : ''}`}>
        <div className="panel-header">{compact ? 'Settings' : 'Map Settings'}</div>
        <div className="no-map">No map loaded</div>
      </div>
    );
  }

  const { header } = map;

  return (
    <div className={`map-settings-panel ${compact ? 'compact' : ''}`}>
      <div className="panel-header">{compact ? 'Settings' : 'Map Settings'}</div>

      <div className="settings-section">
        <div className="section-title">General</div>

        <div className="setting-row">
          <label className="setting-label">Name</label>
          <input
            type="text"
            value={header.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="setting-text-input"
            maxLength={32}
          />
        </div>

        <div className="setting-row">
          <label className="setting-label">Description</label>
          <textarea
            value={header.description}
            onChange={(e) => handleChange('description', e.target.value)}
            className="setting-textarea"
            rows={2}
            maxLength={256}
          />
        </div>
      </div>

      <div className="settings-section">
        <div className="section-title">Game Settings</div>

        <NumberInput
          label="Max Players"
          value={header.maxPlayers}
          min={1}
          max={16}
          onChange={(v) => handleChange('maxPlayers', v)}
        />

        <NumberInput
          label="Teams"
          value={header.numTeams}
          min={1}
          max={4}
          onChange={(v) => handleChange('numTeams', v)}
        />

        <div className="setting-row">
          <label className="setting-label">Objective</label>
          <select
            value={header.objective}
            onChange={(e) => handleChange('objective', parseInt(e.target.value) as ObjectiveType)}
            className="setting-select"
          >
            <option value={ObjectiveType.FRAG}>Frag (Deathmatch)</option>
            <option value={ObjectiveType.FLAG}>Flag (CTF)</option>
            <option value={ObjectiveType.SWITCH}>Switch (Control)</option>
          </select>
        </div>

        <NumberInput
          label="Holding Time"
          value={header.holdingTime}
          min={0}
          max={255}
          onChange={(v) => handleChange('holdingTime', v)}
        />
      </div>

      <div className="settings-section">
        <div className="section-title">Combat</div>

        <NumberInput
          label="Laser Damage"
          value={header.laserDamage}
          min={1}
          max={5}
          onChange={(v) => handleChange('laserDamage', v)}
        />

        <NumberInput
          label="Special Damage"
          value={header.specialDamage}
          min={1}
          max={5}
          onChange={(v) => handleChange('specialDamage', v)}
        />

        <NumberInput
          label="Recharge Rate"
          value={header.rechargeRate}
          min={1}
          max={5}
          onChange={(v) => handleChange('rechargeRate', v)}
        />
      </div>

      <div className="settings-section">
        <div className="section-title">Weapons</div>

        <CheckboxInput
          label="Missiles Enabled"
          checked={header.missilesEnabled}
          onChange={(v) => handleChange('missilesEnabled', v)}
        />

        <CheckboxInput
          label="Bombs Enabled"
          checked={header.bombsEnabled}
          onChange={(v) => handleChange('bombsEnabled', v)}
        />

        <CheckboxInput
          label="Bouncies Enabled"
          checked={header.bounciesEnabled}
          onChange={(v) => handleChange('bounciesEnabled', v)}
        />
      </div>

      <div className="settings-section">
        <div className="section-title">Powerups</div>

        <NumberInput
          label="Powerup Count"
          value={header.powerupCount}
          min={0}
          max={255}
          onChange={(v) => handleChange('powerupCount', v)}
        />

        <NumberInput
          label="Max Simultaneous"
          value={header.maxSimulPowerups}
          min={0}
          max={255}
          onChange={(v) => handleChange('maxSimulPowerups', v)}
        />
      </div>

      <div className="settings-section">
        <h3 className="section-title">Appearance</h3>
        <div className="setting-row">
          <label className="setting-label">Color Scheme</label>
          <select
            className="setting-select"
            value={scheme}
            onChange={(e) => setScheme(e.target.value as Win98Scheme)}
          >
            <option value="standard">Windows 98 Standard</option>
            <option value="high-contrast">High Contrast</option>
            <option value="desert">Desert</option>
          </select>
        </div>
      </div>
    </div>
  );
};
