// src/App.tsx
import React, { useState, useEffect } from 'react';
import './App.css';
import CourseInput, { ScheduleRequest } from './components/CourseInput';
import ScheduleDisplay from './components/ScheduleDisplay';
import Settings from './components/Settings'; // Import the new component
import {
  parseContactHourCalculationRules,
  ContactHourCalculationRules
} from './utils/ruleParser';
import { generateSchedule, GeneratedSchedule } from './utils/scheduleGenerator';

// Import the paths to the markdown files
import contactHoursRulesPath from './data/contact_hours_rules.md';


function App() {
  const [generatedSchedule, setGeneratedSchedule] = useState<GeneratedSchedule | null>(null);
  const [contactHourRules, setContactHourRules] = useState<ContactHourCalculationRules | null>(null);
  const [lastRequest, setLastRequest] = useState<ScheduleRequest | null>(null);

  // New state for settings
  const [weeks, setWeeks] = useState<number>(17);
  const [startTime, setStartTime] = useState<string>('08:00');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [daySelectionMode, setDaySelectionMode] = useState<'simple' | 'advanced'>('simple');

  // Effect to load rules
  useEffect(() => {
    const fetchAndParseRules = async () => {
      try {
        const contactResponse = await fetch(contactHoursRulesPath);
        const contactText = await contactResponse.text();
        setContactHourRules(parseContactHourCalculationRules(contactText));
      } catch (error) {
        console.error("Error fetching or parsing rules:", error);
        alert("Failed to load scheduling rules.");
      }
    };
    fetchAndParseRules();
  }, []);

  // Effect to apply the theme
  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  const handleGenerate = (request: ScheduleRequest) => {
    if (contactHourRules) {
      // Pass the new settings to the generator
      const schedule = generateSchedule(request, contactHourRules, weeks, startTime);
      setGeneratedSchedule(schedule);
      setLastRequest(request);
    } else {
      alert("Rules have not been loaded yet, please wait a moment and try again.");
    }
  };

  return (
    <div className="App">
      <h1>Course Scheduler</h1>
      <div className="main-layout">
        <Settings 
            weeks={weeks}
            setWeeks={setWeeks}
            startTime={startTime}
            setStartTime={setStartTime}
            theme={theme}
            setTheme={setTheme}
            daySelectionMode={daySelectionMode}
            setDaySelectionMode={setDaySelectionMode}
        />
        <CourseInput onGenerate={handleGenerate} daySelectionMode={daySelectionMode} />
      </div>
      
      <p className="disclaimer-text">
        Generated schedules are examples only and may not be accurate due to holidays and other considerations.
      </p>
      <ScheduleDisplay schedule={generatedSchedule} request={lastRequest} />
    </div>
  );
}

export default App;





