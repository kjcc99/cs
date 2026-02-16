// src/components/CourseInput.tsx
import React, { useState, useEffect } from 'react';
import DayPicker from './DayPicker';
import UnitSelector from './UnitSelector';

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export interface ScheduleRequest {
  lectureUnits: number;
  lectureDays: string[];
  labUnits: number;
  labDays: string[];
}

interface CourseInputProps {
  onGenerate: (request: ScheduleRequest) => void;
  daySelectionMode: 'simple' | 'advanced';
}

const CourseInput: React.FC<CourseInputProps> = ({ onGenerate, daySelectionMode }) => {
  const [lectureUnits, setLectureUnits] = useState<number>(0);
  const [lectureDays, setLectureDays] = useState<string[]>([]);
  const [labUnits, setLabUnits] = useState<number>(0);
  const [labDays, setLabDays] = useState<string[]>([]);

  // State for simple mode number of days
  const [simpleLectureDays, setSimpleLectureDays] = useState<number>(1);
  const [simpleLabDays, setSimpleLabDays] = useState<number>(1);

  const resetToSimpleDefaults = () => {
    setSimpleLectureDays(1);
    setSimpleLabDays(1);
    setLectureDays(WEEK_DAYS.slice(0, 1));
    setLabDays(WEEK_DAYS.slice(0, 1));
  };

  const resetToAdvancedDefaults = () => {
    setLectureDays([]);
    setLabDays([]);
  }

  // When switching modes, reset the selections to avoid confusion
  useEffect(() => {
    if (daySelectionMode === 'advanced') {
      resetToAdvancedDefaults();
    } else { // switching back to simple
      resetToSimpleDefaults();
    }
  }, [daySelectionMode]);

  // Sync simple number change to advanced array (only in simple mode)
  useEffect(() => {
    if (daySelectionMode === 'simple') {
      setLectureDays(WEEK_DAYS.slice(0, simpleLectureDays));
    }
  }, [simpleLectureDays]);

  useEffect(() => {
    if (daySelectionMode === 'simple') {
      setLabDays(WEEK_DAYS.slice(0, simpleLabDays));
    }
  }, [simpleLabDays]);

  const handleLectureDayToggle = (day: string) => {
    const newDays = lectureDays.includes(day)
      ? lectureDays.filter(d => d !== day)
      : [...lectureDays, day];
    newDays.sort((a, b) => WEEK_DAYS.indexOf(a) - WEEK_DAYS.indexOf(b));
    setLectureDays(newDays);
  };

  const handleLabDayToggle = (day: string) => {
    const newDays = labDays.includes(day)
      ? labDays.filter(d => d !== day)
      : [...labDays, day];
    newDays.sort((a, b) => WEEK_DAYS.indexOf(a) - WEEK_DAYS.indexOf(b));
    setLabDays(newDays);
  };
  
  const handleClearAll = () => {
    setLectureUnits(0);
    setLabUnits(0);
    if (daySelectionMode === 'simple') {
      resetToSimpleDefaults();
    } else {
      resetToAdvancedDefaults();
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const totalUnits = lectureUnits + labUnits;
    if (totalUnits < 0.5) {
      alert('The total combined units must be 0.5 or greater.');
      return;
    }
    if (lectureUnits > 0 && lectureDays.length === 0) {
        alert('Please select at least one day for the lecture.');
        return;
    }
    if (labUnits > 0 && labDays.length === 0) {
        alert('Please select at least one day for the lab.');
        return;
    }
    onGenerate({ lectureUnits, lectureDays, labUnits, labDays });
  };

  const dayPatterns = [
    { label: 'M/W', days: ['Mon', 'Wed'] },
    { label: 'T/Th', days: ['Tue', 'Thu'] },
    { label: 'M/W/F', days: ['Mon', 'Wed', 'Fri'] },
    { label: 'T/Th/F', days: ['Tue', 'Thu', 'Fri'] },
    { label: 'F/Sa', days: ['Fri', 'Sat'] },
    { label: 'M-F', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  ];

  return (
    <form onSubmit={handleSubmit} className="course-input-panel">
      <div className="course-input-header">
        <h2>Enter Course Details</h2>
        <button type="button" onClick={handleClearAll} className="clear-all-btn">Clear All</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Lecture Column */}
        <div className="lecture-panel">
            <h4>Lecture</h4>
            <UnitSelector 
                label="Units"
                value={lectureUnits}
                onChange={setLectureUnits}
                step={0.25}
            />
            <div className="setting-item">
                <label>Days:</label>
                {daySelectionMode === 'simple' ? (
                    <select value={simpleLectureDays} onChange={(e) => setSimpleLectureDays(parseInt(e.target.value))}>
                        {[1, 2, 3, 4, 5, 6, 7].map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                ) : (
                    <>
                        <DayPicker selectedDays={lectureDays} onDayToggle={handleLectureDayToggle} />
                        <div className="pattern-buttons">
                            {dayPatterns.map(p => <button type="button" key={p.label} onClick={() => setLectureDays(p.days)}>{p.label}</button>)}
                        </div>
                    </>
                )}
            </div>
        </div>
        {/* Lab Column */}
        <div className="lab-panel">
            <h4>Lab</h4>
            <UnitSelector 
                label="Units"
                value={labUnits}
                onChange={setLabUnits}
                step={0.25}
            />
            <div className="setting-item">
                <label>Days:</label>
                {daySelectionMode === 'simple' ? (
                    <select value={simpleLabDays} onChange={(e) => setSimpleLabDays(parseInt(e.target.value))}>
                        {[1, 2, 3, 4, 5, 6, 7].map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                ) : (
                    <>
                        <DayPicker selectedDays={labDays} onDayToggle={handleLabDayToggle} />
                        <div className="pattern-buttons">
                            {dayPatterns.map(p => <button type="button" key={p.label} onClick={() => setLabDays(p.days)}>{p.label}</button>)}
                        </div>
                    </>
                )}
            </div>
        </div>
      </div>
      <button type="submit" style={{ padding: '12px 15px', backgroundColor: 'var(--lab-color)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px', marginTop: '10px' }}>
        Schedule Course
      </button>
    </form>
  );
};

export default CourseInput;
