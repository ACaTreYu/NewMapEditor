import React from 'react';

export interface SelectOption {
  value: number;
  label: string;
}

interface SelectInputProps {
  label: string;
  value: number;
  options: SelectOption[];
  onChange: (value: number) => void;
}

export const SelectInput: React.FC<SelectInputProps> = ({
  label,
  value,
  options,
  onChange
}) => {
  return (
    <div className="select-input-row">
      <label className="select-input-label">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="select-input"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};
