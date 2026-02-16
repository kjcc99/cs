// src/components/Settings.tsx
import React from 'react';

interface SettingsProps {
  weeks: number;
  setWeeks: (weeks: number) => void;
  startTime: string; // e.g. "08:00"
  setStartTime: (time: string) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

interface SettingsProps {
  weeks: number;
  setWeeks: (weeks: number) => void;
  startTime: string;
  setStartTime: (time: string) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  daySelectionMode: 'simple' | 'advanced';
  setDaySelectionMode: (mode: 'simple' | 'advanced') => void;
}

const Settings: React.FC<SettingsProps> = ({ weeks, setWeeks, startTime, setStartTime, theme, setTheme, daySelectionMode, setDaySelectionMode }) => {
  
  const handleThemeToggle = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const handleHelpClick = () => {
    const helpText = `**How to Use the Course Scheduler**

1.  **Term Settings:** Use this panel to set the overall term length, start time, and day selection mode.
    - Simple Mode: Select the total number of days per week.
    - Advanced Mode: Click specific days of the week.

2.  **Enter Course Details:** Input the units for Lecture/Lab and choose the days.

3.  **Generate Example:** Click the button to see the schedule.`;
    alert(helpText);
  };

  const [startHour, startMinute] = startTime.split(':').map(Number);

  const handleHourChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newHour = parseInt(e.target.value);
    setStartTime(`${String(newHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`);
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMinute = parseInt(e.target.value);
    setStartTime(`${String(startHour).padStart(2, '0')}:${String(newMinute).padStart(2, '0')}`);
  };

  const minuteOptions = Array.from({ length: 12 }, (_, i) => i * 5);

  return (
    <div className="settings-panel">
      <h2>Term Settings</h2>
      <div className="setting-item">
        <label htmlFor="weeks">Term Length:</label>
        <select id="weeks" value={weeks} onChange={(e) => setWeeks(parseInt(e.target.value))}>
          <option value="17">Full Term (semester)</option>
          <option value="15">15 Weeks</option>
          <option value="12">12 Weeks</option>
          <option value="8">8 Weeks</option>
          <option value="5">5 Weeks</option>
        </select>
      </div>
      <div className="setting-item">
        <label htmlFor="startTimeHour">Start Time:</label>
        <div style={{ display: 'flex', gap: '5px' }}>
          <select id="startTimeHour" value={startHour} onChange={handleHourChange} style={{ flex: 1 }}>
            {Array.from({ length: 14 }, (_, i) => i + 6).map(hour => ( // 6 AM to 7 PM
              <option key={hour} value={hour}>{String(hour).padStart(2, '0')}</option>
            ))}
          </select>
          <span>:</span>
          <select id="startTimeMinute" value={startMinute} onChange={handleMinuteChange} style={{ flex: 1 }}>
            {minuteOptions.map(minute => (
              <option key={minute} value={minute}>
                {String(minute).padStart(2, '0')}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="setting-item">
        <label htmlFor="daySelectionMode">Advanced Day Selection:</label>
        <label className="switch">
            <input id="daySelectionMode" type="checkbox" checked={daySelectionMode === 'advanced'} onChange={(e) => setDaySelectionMode(e.target.checked ? 'advanced' : 'simple')} />
            <span className="slider round"></span>
        </label>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
          <div className="setting-item" style={{ marginBottom: 0 }}>
            <label htmlFor="themeToggle">Dark Mode:</label>
            <label className="switch">
                <input id="themeToggle" type="checkbox" checked={theme === 'dark'} onChange={handleThemeToggle} />
                <span className="slider round"></span>
            </label>
          </div>
          <button onClick={handleHelpClick} style={{ padding: '8px 12px', fontSize: '14px', backgroundColor: 'transparent', border: '1px solid var(--header-color)', color: 'var(--header-color)', borderRadius: '5px', cursor: 'pointer' }}>
            HELP!
          </button>
      </div>
    </div>
  );
};

export default Settings;
