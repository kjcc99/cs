// src/App.tsx
import React, { useState, useEffect } from 'react';
import './App.css';
import { useSections } from './hooks/useSections';
import { useRules } from './hooks/useRules';
import { useSettings } from './hooks/useSettings';
import { useCatalog } from './hooks/useCatalog';
import { useWorkspace } from './hooks/useWorkspace';
import { generateSchedule } from './utils/scheduleGenerator';
import { ScheduleRequest } from './components/CourseInput';
import { RuleAndTermContext, AcademicTerm } from './types';
import { academicCalendar } from './types/calendar';

import { useMediaQuery } from './hooks/useMediaQuery';
import { DesktopView } from './components/layout/DesktopView';
import { MobileView } from './components/layout/MobileView';
import { AppLoader } from './components/AppLoader';
import { ToastProvider } from './components/Toast';

function App() {
  const sectionsAPI = useSections();
  const rulesAPI = useRules();
  const settingsAPI = useSettings();
  const catalogAPI = useCatalog(settingsAPI.selectedTermId);
  const workspaceAPI = useWorkspace();
  const [calendar] = useState<AcademicTerm[]>(academicCalendar);

  // Destructure for the useEffect dependencies
  const { lectureUnits, lectureDays, labUnits, labDays, setGeneratedSchedule, setLastRequest, setIsCalculating } = workspaceAPI;
  const { startTime, labStartTime, selectedTermId, selectedSessionId } = settingsAPI;
  const { contactHourRules, attendanceRules } = rulesAPI;

  const selectedTerm = calendar.find(t => t.id === selectedTermId) || calendar[0];
  const selectedSession = selectedTerm.sessions.find(s => s.id === selectedSessionId) || selectedTerm.sessions[0];

  useEffect(() => {
    // Skip if everything is 0
    if (lectureUnits === 0 && labUnits === 0) {
      setGeneratedSchedule(null);
      setLastRequest(null);
      setIsCalculating(false);
      return;
    }

    setIsCalculating(true);
    const handler = setTimeout(() => {
      if (contactHourRules && attendanceRules) {
        const request: ScheduleRequest = { lectureUnits, lectureDays, labUnits, labDays };
        const context: RuleAndTermContext = { contactHourRules, attendanceRules, term: selectedTerm, session: selectedSession };
        const schedule = generateSchedule(request, context, startTime, labStartTime);
        setGeneratedSchedule(schedule);
        setLastRequest(request);
      }
      setIsCalculating(false);
    }, 500); // 500ms debounce

    return () => clearTimeout(handler);
  }, [
    lectureUnits, lectureDays, labUnits, labDays,
    startTime, labStartTime, selectedTermId, selectedSessionId,
    contactHourRules, attendanceRules, selectedTerm, selectedSession,
    setGeneratedSchedule, setLastRequest, setIsCalculating
  ]);

  const appProps = {
    sectionsAPI,
    rulesAPI,
    settingsAPI,
    catalogAPI,
    workspaceAPI,
    calendar
  };

  const isMobile = useMediaQuery('(max-width: 768px)');

  if (!contactHourRules || !attendanceRules) {
    return <AppLoader />;
  }

  return (
    <ToastProvider>
      {isMobile ? <MobileView {...appProps} /> : <DesktopView {...appProps} />}
    </ToastProvider>
  );
}

export default App;
