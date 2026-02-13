import React from 'react';
import { GameSetting } from '@core/map';

interface SettingInputProps {
  setting: GameSetting;
  value: number;
  onChange: (value: number) => void;
  onReset: () => void;
  disabled?: boolean;
}

export const SettingInput: React.FC<SettingInputProps> = ({
  setting,
  value,
  onChange,
  onReset,
  disabled
}) => {
  const { label, min, max, default: defaultValue } = setting;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseInt(e.target.value, 10));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) {
      // Clamp to valid range
      onChange(Math.max(min, Math.min(max, val)));
    }
  };

  const isDefault = value === defaultValue;

  return (
    <div className={`setting-input-row${disabled ? ' setting-input-disabled' : ''}`}>
      <label className="setting-input-label">{label}</label>
      <div className="setting-input-controls">
        <span className="range-label min">{min}</span>
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={handleSliderChange}
          className="setting-slider"
          disabled={disabled}
        />
        <span className="range-label max">{max}</span>
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={handleInputChange}
          className="setting-number-input"
          disabled={disabled}
        />
        <button
          type="button"
          className="reset-button"
          onClick={onReset}
          disabled={disabled || isDefault}
          title={disabled ? 'Controlled from General tab' : `Reset to default (${defaultValue})`}
        >
          {/* Unicode reset/undo symbol */}
          &#8634;
        </button>
      </div>
    </div>
  );
};
