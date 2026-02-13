import React from 'react';

interface CheckboxInputProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const CheckboxInput: React.FC<CheckboxInputProps> = ({
  label,
  checked,
  onChange,
  disabled
}) => {
  return (
    <div className={`checkbox-input-row${disabled ? ' setting-input-disabled' : ''}`}>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="checkbox-input"
          disabled={disabled}
        />
        <span className="checkbox-label-text">{label}</span>
      </label>
    </div>
  );
};
