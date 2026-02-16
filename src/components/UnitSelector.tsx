// src/components/UnitSelector.tsx
import React from 'react';

interface UnitSelectorProps {
  label: string;
  value: number;
  step: number;
  min?: number;
  max?: number;
  onChange: (newValue: number) => void;
}

const UnitSelector: React.FC<UnitSelectorProps> = ({ label, value, step, min = 0, max = 10, onChange }) => {
  
  const handleDecrement = () => {
    const newValue = Math.max(min, value - step);
    onChange(newValue);
  };

  const handleIncrement = () => {
    const newValue = Math.min(max, value + step);
    onChange(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    if (rawValue === '') {
        onChange(0); // Or handle as an intermediate empty state
        return;
    }
    const parsedValue = parseFloat(rawValue);
    if (!isNaN(parsedValue) && parsedValue >= min && parsedValue <= max) {
        onChange(parsedValue);
    }
  };

  return (
    <div className="setting-item">
      <label htmlFor={label}>{label}:</label>
      <div className="unit-selector-container">
        <button type="button" onClick={handleDecrement} className="unit-selector-btn" aria-label={`Decrease ${label}`}>-</button>
        <input
          id={label}
          type="number"
          inputMode="numeric"
          value={value}
          onChange={handleInputChange}
          step={step}
          min={min}
          max={max}
          className="unit-selector-input"
        />
        <button type="button" onClick={handleIncrement} className="unit-selector-btn" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
};

export default UnitSelector;
