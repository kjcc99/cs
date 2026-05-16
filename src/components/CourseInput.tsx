// src/components/CourseInput.tsx
import React, { useState } from 'react';
import DayPicker from './DayPicker';
import UnitSelector from './UnitSelector';
import './CourseInput.css';

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export interface ScheduleRequest {
  lectureUnits: number;
  lectureDays: string[];
  lecTbaHours?: number;
  labUnits: number;
  labDays: string[];
  labTbaHours?: number;
}

interface CourseInputProps {
  lectureUnits: number;
  setLectureUnits: (v: number) => void;
  lectureDays: string[];
  setLectureDays: (v: string[]) => void;
  lecTbaHours: number;
  setLecTbaHours: (v: number) => void;
  labUnits: number;
  setLabUnits: (v: number) => void;
  labDays: string[];
  setLabDays: (v: string[]) => void;
  labTbaHours: number;
  setLabTbaHours: (v: number) => void;
  isLecFixed?: boolean;
  isLabFixed?: boolean;
  lecRange?: { min: number, max: number };
  labRange?: { min: number, max: number };
  smartSplit?: boolean;
  smartSplitDays?: string[];
  setSmartSplitDays?: (v: string[]) => void;
}

const CourseInput: React.FC<CourseInputProps> = ({
  lectureUnits, setLectureUnits,
  lectureDays, setLectureDays,
  lecTbaHours, setLecTbaHours,
  labUnits, setLabUnits,
  labDays, setLabDays,
  labTbaHours, setLabTbaHours,
  isLecFixed = false,
  isLabFixed = false,
  lecRange = { min: 0, max: 10 },
  labRange = { min: 0, max: 10 },
  smartSplit = false,
  smartSplitDays = [],
  setSmartSplitDays
}) => {
  const maxLecContactHours = lectureUnits * 18;
  const maxLabContactHours = labUnits * 54;

  const [showLecTba, setShowLecTba] = useState(false);
  const [showLabTba, setShowLabTba] = useState(false);
  // State to track which panel is focused for transitions
  const [activePanel, setActivePanel] = useState<'lecture' | 'lab' | null>(null);

  const handleLectureDayToggle = (day: string) => {
    const newDays = lectureDays.includes(day) ? lectureDays.filter(d => d !== day) : [...lectureDays, day];
    newDays.sort((a, b) => WEEK_DAYS.indexOf(a) - WEEK_DAYS.indexOf(b));
    setLectureDays(newDays);
  };

  const handleLabDayToggle = (day: string) => {
    const newDays = labDays.includes(day) ? labDays.filter(d => d !== day) : [...labDays, day];
    newDays.sort((a, b) => WEEK_DAYS.indexOf(a) - WEEK_DAYS.indexOf(b));
    setLabDays(newDays);
  };

  const handleSmartSplitDayToggle = (day: string) => {
    if (!setSmartSplitDays) return;
    const newDays = smartSplitDays.includes(day) ? smartSplitDays.filter(d => d !== day) : [...smartSplitDays, day];
    newDays.sort((a, b) => WEEK_DAYS.indexOf(a) - WEEK_DAYS.indexOf(b));
    setSmartSplitDays(newDays);
  };

  if (smartSplit && setSmartSplitDays) {
    return (
      <div className="course-input-panel">
        <div className={`ci-panel lecture-panel ${activePanel === 'lecture' ? 'active' : ''}`}
          onFocus={() => setActivePanel('lecture')}
          onBlur={() => setActivePanel(null)}
        >
          <label className="ci-panel-label lec-label">Lecture Units</label>
          <div className="ci-controls">
            <div className="time-sub-group">
              <span className="micro-label">Units</span>
              <UnitSelector label="Units" value={lectureUnits} onChange={setLectureUnits} step={0.25} disabled={isLecFixed} min={lecRange.min} max={lecRange.max} />
            </div>
          </div>
        </div>

        <div className="config-divider" />

        <div className={`ci-panel lab-panel ${activePanel === 'lab' ? 'active' : ''}`}
          onFocus={() => setActivePanel('lab')}
          onBlur={() => setActivePanel(null)}
        >
          <label className="ci-panel-label lab-label">Lab Units</label>
          <div className="ci-controls">
            <div className="time-sub-group">
              <span className="micro-label">Units</span>
              <UnitSelector label="Units" value={labUnits} onChange={setLabUnits} step={0.25} disabled={isLabFixed} min={labRange.min} max={labRange.max} />
            </div>
          </div>
        </div>

        <div className="config-divider" />

        <div className="ci-panel smart-split-days-panel">
          <label className="ci-panel-label">Meeting Days</label>
          <div className="ci-controls">
            <div className="time-sub-group">
              <DayPicker selectedDays={smartSplitDays} onDayToggle={handleSmartSplitDayToggle} onSetDays={setSmartSplitDays} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="course-input-panel">
      {/* Lecture Column */}
      <div
        className={`ci-panel lecture-panel ${activePanel === 'lecture' ? 'active' : ''}`}
        onFocus={() => setActivePanel('lecture')}
        onBlur={() => setActivePanel(null)}
      >
        <label className="ci-panel-label lec-label">Lecture Component</label>
        <div className="ci-controls">
          <div className="time-sub-group">
            <span className="micro-label">Units</span>
            <UnitSelector
              label="Units"
              value={lectureUnits}
              onChange={setLectureUnits}
              step={0.25}
              disabled={isLecFixed}
              min={lecRange.min}
              max={lecRange.max}
            />
          </div>
          <div className="time-sub-group">
            <span className="micro-label">Meeting Days</span>
            <DayPicker selectedDays={lectureDays} onDayToggle={handleLectureDayToggle} onSetDays={setLectureDays} />
          </div>
        </div>
        {showLecTba ? (
          <div className="tba-input-container">
            <input
              type="number"
              min={0}
              step={0.1}
              className={`tba-number-input ${lecTbaHours > maxLecContactHours ? 'error' : ''}`}
              value={lecTbaHours}
              onChange={(e) => setLecTbaHours(parseFloat(e.target.value) || 0)}
              placeholder="Hrs"
            />
            <button className="tba-close-btn" onClick={() => { setShowLecTba(false); setLecTbaHours(0); }}>✕</button>
            <span className="tba-max-hint">(Max {maxLecContactHours} hrs per course)</span>
          </div>
        ) : (
          <div className="tba-input-container">
            <button className="add-tba-link" onClick={() => setShowLecTba(true)}>+ Add TBA Hours</button>
            <span className="tba-max-hint">(Max {maxLecContactHours} hrs per course)</span>
          </div>
        )}
        {lecTbaHours > maxLecContactHours && (
          <div className="tba-error-text">
            ⚠️ Max allowed TBA hours for {lectureUnits} units is {maxLecContactHours}.
          </div>
        )}
      </div>

      <div className="config-divider" />

      {/* Lab Column */}
      <div
        className={`ci-panel lab-panel ${activePanel === 'lab' ? 'active' : ''}`}
        onFocus={() => setActivePanel('lab')}
        onBlur={() => setActivePanel(null)}
      >
        <label className="ci-panel-label lab-label">Lab Component</label>
        <div className="ci-controls">
          <div className="time-sub-group">
            <span className="micro-label">Units</span>
            <UnitSelector
              label="Units"
              value={labUnits}
              onChange={setLabUnits}
              step={0.25}
              disabled={isLabFixed}
              min={labRange.min}
              max={labRange.max}
            />
          </div>
          <div className="time-sub-group">
            <span className="micro-label">Meeting Days</span>
            <DayPicker selectedDays={labDays} onDayToggle={handleLabDayToggle} onSetDays={setLabDays} />
          </div>
        </div>
        {showLabTba ? (
          <div className="tba-input-container">
            <input
              type="number"
              min={0}
              step={0.1}
              className={`tba-number-input ${labTbaHours > maxLabContactHours ? 'error' : ''}`}
              value={labTbaHours}
              onChange={(e) => setLabTbaHours(parseFloat(e.target.value) || 0)}
              placeholder="Hrs"
            />
            <button className="tba-close-btn" onClick={() => { setShowLabTba(false); setLabTbaHours(0); }}>✕</button>
            <span className="tba-max-hint">(Max {maxLabContactHours} hrs per course)</span>
          </div>
        ) : (
          <div className="tba-input-container">
            <button className="add-tba-link" onClick={() => setShowLabTba(true)}>+ Add TBA Hours</button>
            <span className="tba-max-hint">(Max {maxLabContactHours} hrs per course)</span>
          </div>
        )}
        {labTbaHours > maxLabContactHours && (
          <div className="tba-error-text">
            ⚠️ Max allowed TBA hours for {labUnits} units is {maxLabContactHours}.
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseInput;
