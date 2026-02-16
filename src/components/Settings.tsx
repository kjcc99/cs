// src/components/Settings.tsx
import React from 'react';

interface SettingsProps {
  weeks: number;
  setWeeks: (weeks: number) => void;
  startTime: string;
  setStartTime: (time: string) => void;
  labStartTime: string | null;
  setLabStartTime: (time: string | null) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  daySelectionMode: 'simple' | 'advanced';
  setDaySelectionMode: (mode: 'simple' | 'advanced') => void;
  timeFormat: '12h' | '24h';
  setTimeFormat: (format: '12h' | '24h') => void;
}

const Settings: React.FC<SettingsProps> = ({ 
    weeks, setWeeks, 
    startTime, setStartTime, 
    labStartTime, setLabStartTime,
    theme, setTheme, 
    daySelectionMode, setDaySelectionMode,
    timeFormat, setTimeFormat
}) => {
  
  const handleLockToggle = () => {
    setLabStartTime(labStartTime === null ? '13:00' : null);
  };

  const handleHelpClick = () => {
    const helpText = `**How to Use Schedule Wizard**

1.  *Term Settings:* Use this panel to set the overall term length, start time, and selection modes.

2.  *Enter Course Details:* Input the units for Lecture/Lab and choose the days for each.

3.  *Advanced Mode:* Select individual days for each component. Click the lock for separate Lecture/Lab start times.

4.  *24-Hour:* Select 12 (default) or 24 hour clock.`;
    alert(helpText);
  };

  const formatHour12 = (hour: number) => {
    if (hour === 0 || hour === 24) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  };

  const TimeSelector: React.FC<{time: string, onTimeChange: (newTime: string) => void}> = ({ time, onTimeChange }) => {
    const [hour, minute] = time.split(':').map(Number);
    const minuteOptions = Array.from({ length: 12 }, (_, i) => i * 5);

    const handleHourChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      onTimeChange(`${e.target.value}:${String(minute).padStart(2, '0')}`);
    };
    const handleMinuteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      onTimeChange(`${String(hour).padStart(2, '0')}:${e.target.value}`);
    };

    return (
        <div style={{ display: 'flex', gap: '5px' }}>
            <select value={hour} onChange={handleHourChange} style={{ flex: 1 }}>
                {Array.from({ length: 15 }, (_, i) => i + 6).map(h => ( // 6 AM to 8 PM
                    <option key={h} value={h}>
                        {timeFormat === '12h' ? formatHour12(h) : String(h).padStart(2, '0')}
                    </option>
                ))}
            </select>
            <span>:</span>
            <select value={minute} onChange={handleMinuteChange} style={{ flex: 1 }}>
                {minuteOptions.map(m => (
                    <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                ))}
            </select>
        </div>
    );
  };

  return (
    <div className="settings-panel">
      <h2>Settings</h2>
      <div className="setting-item">
        <label>Term Length:</label>
        <select value={weeks} onChange={(e) => setWeeks(parseInt(e.target.value))}>
          <option value="17">Full Term (semester)</option>
          <option value="15">15 Weeks</option>
          <option value="12">12 Weeks</option>
          <option value="8">8 Weeks</option>
          <option value="5">5 Weeks</option>
        </select>
      </div>
      <div className="setting-item">
        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{labStartTime === null ? 'Start Time' : 'Lec Start'}</span>
            <button onClick={handleLockToggle} className="lock-button" title={labStartTime === null ? 'Set separate lab start time' : 'Lock lab start time to lecture'}>
                {labStartTime === null ? '🔒' : '🔓'}
            </button>
        </label>
        <TimeSelector time={startTime} onTimeChange={setStartTime} />
      </div>

      {labStartTime !== null && (
        <div className="setting-item">
            <label>Lab Start Time</label>
            <TimeSelector time={labStartTime} onTimeChange={setLabStartTime} />
        </div>
      )}

      <div className="setting-item">
        <label>Advanced Mode:</label>
        <label className="switch">
            <input type="checkbox" checked={daySelectionMode === 'advanced'} onChange={(e) => setDaySelectionMode(e.target.checked ? 'advanced' : 'simple')} />
            <span className="slider round"></span>
        </label>
      </div>
      
      <div className="setting-item-row">
          <div className="setting-item">
            <label>Dark Mode:</label>
            <label className="switch">
                <input type="checkbox" checked={theme === 'dark'} onChange={() => setTheme(theme === 'light' ? 'dark' : 'light')} />
                <span className="slider round"></span>
            </label>
          </div>
          <div className="setting-item">
            <label>24-Hour:</label>
            <label className="switch">
                <input type="checkbox" checked={timeFormat === '24h'} onChange={(e) => setTimeFormat(e.target.checked ? '24h' : '12h')} />
                <span className="slider round"></span>
            </label>
          </div>
      </div>
      <div style={{textAlign: 'center', marginTop: '20px'}}>
        <button onClick={handleHelpClick} className="help-button">
            HELP!
        </button>
      </div>
    </div>
  );
};

export default Settings;
