// src/App.tsx
import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import CourseInput, { ScheduleRequest } from './components/CourseInput';
import ScheduleDisplay from './components/ScheduleDisplay';
import Settings from './components/Settings';
import { 
  parseContactHourCalculationRules, 
  ContactHourCalculationRules,
  parseAttendanceAccountingRules,
  AttendanceAccountingRules
} from './utils/ruleParser';
import { generateSchedule, GeneratedSchedule, RuleAndTermContext } from './utils/scheduleGenerator';

// Import data files
import contactHoursRulesPath from './data/contact_hours_rules.md';
import attendanceMethodRulesPath from './data/attendance-method.md';
import academicCalendarData from './data/academic-calendar.json';

// Define the types for our calendar data
export interface TermSession {
  id: string;
  name: string;
  weeks: number;
  method: 'FULL_TERM' | 'LATE_START' | 'EARLY_START';
}
export interface AcademicTerm {
  id: string;
  name: string;
  type: 'semester' | 'intersession';
  startDate: string;
  endDate: string;
  holidays: string[];
  sessions: TermSession[];
}

// Explicitly type and sort the imported JSON
const academicCalendar: AcademicTerm[] = (academicCalendarData as AcademicTerm[]).sort((a, b) => 
  new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
);

const LOCAL_STORAGE_KEY = 'cs-app-settings';

function App() {
  const [generatedSchedule, setGeneratedSchedule] = useState<GeneratedSchedule | null>(null);
  const [lastRequest, setLastRequest] = useState<ScheduleRequest | null>(null);
  
  // --- Rule and Data State ---
  const [contactHourRules, setContactHourRules] = useState<ContactHourCalculationRules | null>(null);
  const [attendanceRules, setAttendanceRules] = useState<AttendanceAccountingRules | null>(null);
  const [calendar] = useState<AcademicTerm[]>(academicCalendar);

  // --- Settings State (with Persistence) ---
  const [selectedTermId, setSelectedTermId] = useState<string>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    return saved ? JSON.parse(saved).selectedTermId : calendar[0].id;
  });
  const [selectedSessionId, setSelectedSessionId] = useState<string>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    return saved ? JSON.parse(saved).selectedSessionId : calendar[0].sessions[0].id;
  });
  const [startTime, setStartTime] = useState<string>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    return saved ? JSON.parse(saved).startTime : '08:00';
  });
  const [labStartTime, setLabStartTime] = useState<string | null>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    return saved ? JSON.parse(saved).labStartTime : null;
  });
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    return saved ? JSON.parse(saved).theme : 'light';
  });
  const [daySelectionMode, setDaySelectionMode] = useState<'simple' | 'advanced'>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    return saved ? JSON.parse(saved).daySelectionMode : 'simple';
  });
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    return saved ? JSON.parse(saved).timeFormat : '12h';
  });

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    const settings = {
      selectedTermId,
      selectedSessionId,
      startTime,
      labStartTime,
      theme,
      daySelectionMode,
      timeFormat
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(settings));
  }, [selectedTermId, selectedSessionId, startTime, labStartTime, theme, daySelectionMode, timeFormat]);

  // Find objects
  const selectedTerm = calendar.find(t => t.id === selectedTermId) || calendar[0];
  const selectedSession = selectedTerm.sessions.find(s => s.id === selectedSessionId) || selectedTerm.sessions[0];

  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchRules = async () => {
      try {
        const [contactRes, attendanceRes] = await Promise.all([
          fetch(contactHoursRulesPath),
          fetch(attendanceMethodRulesPath)
        ]);
        const contactText = await contactRes.text();
        const attendanceText = await attendanceRes.text();
        if (isMounted) {
            setContactHourRules(parseContactHourCalculationRules(contactText));
            setAttendanceRules(parseAttendanceAccountingRules(attendanceText));
        }
      } catch (error) { console.error(error); }
    };
    fetchRules();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);
  
  useEffect(() => {
    const term = calendar.find(t => t.id === selectedTermId);
    if (term && !term.sessions.find(s => s.id === selectedSessionId)) {
      setSelectedSessionId(term.sessions[0].id);
    }
  }, [selectedTermId, calendar, selectedSessionId]);


  const handleGenerate = (request: ScheduleRequest) => {
    if (contactHourRules && attendanceRules) {
      const context: RuleAndTermContext = { contactHourRules, attendanceRules, term: selectedTerm, session: selectedSession };
      const schedule = generateSchedule(request, context, startTime, labStartTime);
      setGeneratedSchedule(schedule);
      setLastRequest(request);
      resultsHeadingRef.current?.focus();
    }
  };

  return (
    <div className="App">
      <a href="#results-header" className="skip-link">Skip to results</a>
      <header className="app-header">
        <img src={process.env.PUBLIC_URL + '/logo.svg'} className="app-logo" alt="Course Scheduler logo" />
        <h1>Schedule a Course</h1>
      </header>
      <div className="main-layout">
        <Settings 
            calendar={calendar}
            selectedTerm={selectedTerm}
            selectedTermId={selectedTermId}
            setSelectedTermId={setSelectedTermId}
            selectedSessionId={selectedSessionId}
            setSelectedSessionId={setSelectedSessionId}
            startTime={startTime}
            setStartTime={setStartTime}
            labStartTime={labStartTime}
            setLabStartTime={setLabStartTime}
            theme={theme}
            setTheme={setTheme}
            daySelectionMode={daySelectionMode}
            setDaySelectionMode={setDaySelectionMode}
            timeFormat={timeFormat}
            setTimeFormat={setTimeFormat}
        />
        <CourseInput onGenerate={handleGenerate} daySelectionMode={daySelectionMode} />
      </div>
      
      <p className="disclaimer-text">
        Generated schedules are examples only and may not be accurate due to holidays and other considerations.
      </p>
      <ScheduleDisplay schedule={generatedSchedule} request={lastRequest} timeFormat={timeFormat} resultsHeadingRef={resultsHeadingRef} />
    </div>
  );
}

export default App;
