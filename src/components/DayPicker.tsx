// src/components/DayPicker.tsx
import React from 'react';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface DayPickerProps {
  selectedDays: string[];
  onDayToggle: (day: string) => void;
}

const DayPicker: React.FC<DayPickerProps> = ({ selectedDays, onDayToggle }) => {
  return (
    <div className="day-picker-container">
      {DAYS.map(day => {
        const isSelected = selectedDays.includes(day);
        return (
          <div
            key={day}
            className={`day-picker-item ${isSelected ? 'selected' : ''}`}
            onClick={() => onDayToggle(day)}
          >
            {day}
          </div>
        );
      })}
    </div>
  );
};

export default DayPicker;
