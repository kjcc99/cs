// src/components/UnitSelector.tsx
import React, { useState, useEffect } from 'react';

interface UnitSelectorProps {
  label: string;
  value: number;
  step: number;
  min?: number;
  max?: number;
  onChange: (newValue: number) => void;
}

const UnitSelector: React.FC<UnitSelectorProps> = ({ label, value, step, min = 0, max = 10, onChange }) => {
  const [inputValue, setInputValue] = useState(String(value));

  // This effect handles debouncing the text input
  useEffect(() => {
    // Don't run this effect if the prop and state are already in sync
    if (parseFloat(inputValue) === value) {
      return;
    }

    const handler = setTimeout(() => {
      const parsedValue = parseFloat(inputValue);
      if (!isNaN(parsedValue) && parsedValue >= min && parsedValue <= max) {
        onChange(parsedValue);
      } else if (inputValue === '' || inputValue === '.') {
        onChange(0);
      }
    }, 300); // 300ms debounce delay

    return () => {
      clearTimeout(handler);
    };
  }, [inputValue, onChange, min, max, value]);


  // This effect ensures that if the parent changes the value (e.g. +/- buttons), the input updates
  useEffect(() => {
    // Only update if the numeric value of the input string is different from the prop value
    // This prevents overwriting the input while the user is typing something like "3."
    if (parseFloat(inputValue) !== value) {
        setInputValue(String(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

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
    const validDecimalRegex = /^\d*\.?\d{0,2}$/; // Allow up to 2 decimal places

    if (validDecimalRegex.test(rawValue)) {
      setInputValue(rawValue); // Update local state immediately for responsive UI
    }
  };

  return (
    <div className="setting-item">
      <label htmlFor={label}>{label}:</label>
      <div className="unit-selector-container">
        <button type="button" onClick={handleDecrement} className="unit-selector-btn" aria-label={`Decrease ${label}`}>-</button>
        <input
          id={label}
          type="text"
          inputMode="decimal"
          value={inputValue}
          onChange={handleInputChange}
          className="unit-selector-input"
        />
        <button type="button" onClick={handleIncrement} className="unit-selector-btn" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
};

export default UnitSelector;
