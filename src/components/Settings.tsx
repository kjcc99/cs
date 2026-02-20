// src/components/Settings.tsx
import React from 'react';
import { Lock, Unlock } from 'lucide-react';
import { AcademicTerm } from '../App';

interface SettingsProps {
  calendar: AcademicTerm[];
  selectedTerm: AcademicTerm;
  selectedTermId: string;
  setSelectedTermId: (id: string) => void;
  selectedSessionId: string;
  setSelectedSessionId: (id: string) => void;
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
  onClose?: () => void;
}

export const formatHour12 = (hour: number) => {
  if (hour === 0 || hour === 24) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
};

interface TimeSelectorProps {
    time: string;
    onTimeChange: (newTime: string) => void;
    timeFormat: '12h' | '24h';
}

export const TimeSelector: React.FC<TimeSelectorProps> = ({ time, onTimeChange, timeFormat }) => {
  const [hour, minute] = time.split(':').map(Number);
  const minuteOptions = Array.from({ length: 12 }, (_, i) => i * 5);

  const handleHourChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onTimeChange(`${String(e.target.value).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
  };
  const handleMinuteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onTimeChange(`${String(hour).padStart(2, '0')}:${String(e.target.value).padStart(2, '0')}`);
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
          <span style={{ alignSelf: 'center' }}>:</span>
          <select value={minute} onChange={handleMinuteChange} style={{ flex: 1 }}>
              {minuteOptions.map(m => (
                  <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
              ))}
          </select>
      </div>
  );
};

const Settings: React.FC<SettingsProps> = ({ 
    calendar, selectedTerm, selectedTermId, setSelectedTermId,
    selectedSessionId, setSelectedSessionId,
    startTime, setStartTime, 
    labStartTime, setLabStartTime,
    theme, setTheme, 
    daySelectionMode, setDaySelectionMode,
    timeFormat, setTimeFormat,
    onClose
}) => {
  
  const handleLockToggle = () => {
    setLabStartTime(labStartTime === null ? '13:00' : null);
  };

    return (

      <div className="settings-panel">

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>

          <h2 style={{ margin: 0 }}>Settings</h2>

          <button onClick={onClose} className="delete-item-btn" style={{ fontSize: '1.5rem' }}>×</button>

        </div>

  

        <div className="setting-item-row" style={{ flexDirection: 'column', gap: '20px', alignItems: 'flex-start' }}>

            <div className="setting-item" style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>

              <label>Advanced Day Picker</label>

                            <label className="switch">

                                <input type="checkbox" checked={daySelectionMode === 'advanced'} onChange={(e) => setDaySelectionMode(e.target.checked ? 'advanced' : 'simple')} />

                                <span className="slider"></span>

                            </label>

              

            </div>

            <div className="setting-item" style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>

              <label>Dark Mode</label>

                            <label className="switch">

                                <input type="checkbox" checked={theme === 'dark'} onChange={() => setTheme(theme === 'light' ? 'dark' : 'light')} />

                                <span className="slider"></span>

                            </label>

              

            </div>

            <div className="setting-item" style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>

              <label>Use 24-Hour Time</label>

                            <label className="switch">

                                <input type="checkbox" checked={timeFormat === '24h'} onChange={(e) => setTimeFormat(e.target.checked ? '24h' : '12h')} />

                                <span className="slider"></span>

                            </label>

              

            </div>

                </div>

        

              </div>

            );

          }

        

  ;

export default Settings;
