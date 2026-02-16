// src/App.tsx
import React, { useState, useEffect } from 'react';
import './App.css';
import CourseInput, { ScheduleRequest } from './components/CourseInput';
import ScheduleDisplay from './components/ScheduleDisplay';
import Settings from './components/Settings';
import { parseContactHourCalculationRules, ContactHourCalculationRules } from './utils/ruleParser';
import { generateSchedule, GeneratedSchedule } from './utils/scheduleGenerator';
import contactHoursRulesPath from './data/contact_hours_rules.md';

function App() {
  const [generatedSchedule, setGeneratedSchedule] = useState<GeneratedSchedule | null>(null);
  const [contactHourRules, setContactHourRules] = useState<ContactHourCalculationRules | null>(null);
  const [lastRequest, setLastRequest] = useState<ScheduleRequest | null>(null);

  // State for settings
  const [weeks, setWeeks] = useState<number>(17);
  const [startTime, setStartTime] = useState<string>('08:00');
  const [labStartTime, setLabStartTime] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [daySelectionMode, setDaySelectionMode] = useState<'simple' | 'advanced'>('simple');
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');

  useEffect(() => {
    const fetchAndParseRules = async () => {
      try {
        const res = await fetch(contactHoursRulesPath);
        const text = await res.text();
        setContactHourRules(parseContactHourCalculationRules(text));
      } catch (e) { console.error("Error fetching rules:", e); }
    };
    fetchAndParseRules();
  }, []);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  const handleGenerate = (request: ScheduleRequest) => {
    if (contactHourRules) {
      const schedule = generateSchedule(request, contactHourRules, weeks, startTime, labStartTime);
      setGeneratedSchedule(schedule);
      setLastRequest(request);
    } else {
      alert("Rules not loaded yet.");
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <img src={process.env.PUBLIC_URL + '/logo.svg'} className="app-logo" alt="logo" />
        <h1>Schedule Wizard</h1>
      </header>
      <div className="main-layout">
        <Settings 
            weeks={weeks} setWeeks={setWeeks}
            startTime={startTime} setStartTime={setStartTime}
            labStartTime={labStartTime} setLabStartTime={setLabStartTime}
            theme={theme} setTheme={setTheme}
            daySelectionMode={daySelectionMode} setDaySelectionMode={setDaySelectionMode}
            timeFormat={timeFormat} setTimeFormat={setTimeFormat}
        />
        <CourseInput onGenerate={handleGenerate} daySelectionMode={daySelectionMode} />
      </div>
      
      <p className="disclaimer-text">
        Generated schedules are examples only and may not be accurate due to holidays and other considerations.
      </p>
      <ScheduleDisplay schedule={generatedSchedule} request={lastRequest} timeFormat={timeFormat} />
    </div>
  );
}

export default App;
