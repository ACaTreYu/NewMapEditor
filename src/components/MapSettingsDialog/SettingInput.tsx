import React from 'react';
import { GameSetting } from '@core/map';

/** Slider is capped at this value to prevent accidental extreme values (Safari midpoint bug).
 *  Number input still allows the full range for power users. */
const SLIDER_MAX_CAP = 10000;

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
  const sliderMax = Math.min(max, SLIDER_MAX_CAP);
  const exceedsSliderCap = value > sliderMax;

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
      <label className="setting-input-label" title={setting.description}>{label}</label>
      <div className="setting-input-controls">
        <span className="range-label min">{min}</span>
        <input
          type="range"
          min={min}
          max={sliderMax}
          step={1}
          value={Math.min(value, sliderMax)}
          onChange={handleSliderChange}
          className="setting-slider"
          disabled={disabled}
        />
        <span className="range-label max">{sliderMax}</span>
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
      {exceedsSliderCap && (
        <span className="setting-warning">Value exceeds slider range — extreme values may cause issues in-game</span>
      )}
    </div>
  );
};
