// src/App.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import CourseInput, { ScheduleRequest } from './components/CourseInput';
import ScheduleDisplay from './components/ScheduleDisplay';
import Settings, { TimeSelector } from './components/Settings';
import HelpModal from './components/HelpModal';
import SidebarItem from './components/SidebarItem';
import ConfirmModal from './components/ConfirmModal';
import { Reorder, motion } from 'framer-motion';
import { 
  Plus, 
  Save, 
  Copy, 
  ChevronDown, 
  Settings as SettingsIcon, 
  HelpCircle, 
  ExternalLink,
  Trash2,
  Lock,
  Unlock
} from 'lucide-react';
import { formatTime } from './utils/timeUtils';
import { useSections, SavedSection } from './hooks/useSections';
import { 
  parseContactHourCalculationRules, 
  ContactHourCalculationRules,
  parseAttendanceAccountingRules,
  AttendanceAccountingRules
} from './utils/ruleParser';
import { 
  generateSchedule, 
  GeneratedSchedule, 
  RuleAndTermContext,
  calculateOfficialEndTime 
} from './utils/scheduleGenerator';

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
  // --- Dashboard & UI State ---
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isConfirmNewOpen, setIsConfirmNewOpen] = useState(false);
  const [isCopyDropdownOpen, setIsCopyDropdownOpen] = useState(false);
  const [isStatusPopoverOpen, setIsStatusPopoverOpen] = useState(false);
  const copyDropdownRef = useRef<HTMLDivElement>(null);
  const settingsDropdownRef = useRef<HTMLDivElement>(null);
  const statusPopoverRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (copyDropdownRef.current && !copyDropdownRef.current.contains(target)) {
        setIsCopyDropdownOpen(false);
      }
      if (settingsDropdownRef.current && !settingsDropdownRef.current.contains(target)) {
        setIsSettingsOpen(false);
      }
      if (statusPopoverRef.current && !statusPopoverRef.current.contains(target)) {
        setIsStatusPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // DND Sensors (Temporarily disabled to debug)
  // const sensors = useSensors(
  //   useSensor(PointerSensor, {
  //     activationConstraint: {
  //       distance: 5,
  //     },
  //   }),
  //   useSensor(KeyboardSensor, {
  //     coordinateGetter: sortableKeyboardCoordinates,
  //   })
  // );
  
  const {
    savedSections,
    currentSectionId,
    setCurrentSectionId,
    saveSection,
    deleteSection,
    renameSection,
    reorderSections,
    clearAllSections
  } = useSections();

  // --- Current Working Section State ---
  // (We keep these as the "Active" state for the inputs)
  const [lectureUnits, setLectureUnits] = useState(0);
  const [lectureDays, setLectureDays] = useState<string[]>([]);
  const [labUnits, setLabUnits] = useState(0);
  const [labDays, setLabDays] = useState<string[]>([]);
  
  const [generatedSchedule, setGeneratedSchedule] = useState<GeneratedSchedule | null>(null);
  const [lastRequest, setLastRequest] = useState<ScheduleRequest | null>(null);
  
  // --- Global/Settings State ---
  const [contactHourRules, setContactHourRules] = useState<ContactHourCalculationRules | null>(null);
  const [attendanceRules, setAttendanceRules] = useState<AttendanceAccountingRules | null>(null);
  const [calendar] = useState<AcademicTerm[]>(academicCalendar);

  // These will eventually move into the main UI per your requirement
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

  // UI Preferences
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

  // Persist Global Settings
  useEffect(() => {
    const settings = { selectedTermId, selectedSessionId, startTime, labStartTime, theme, daySelectionMode, timeFormat };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(settings));
  }, [selectedTermId, selectedSessionId, startTime, labStartTime, theme, daySelectionMode, timeFormat]);

  // --- Logic Handlers ---

  const handleSaveSection = useCallback(() => {
    saveSection({
      lectureUnits,
      lectureDays,
      labUnits,
      labDays,
      startTime,
      labStartTime,
      selectedTermId,
      selectedSessionId,
    });
  }, [saveSection, lectureUnits, lectureDays, labUnits, labDays, startTime, labStartTime, selectedTermId, selectedSessionId]);

  const handleLoadSection = useCallback((section: SavedSection) => {
    setCurrentSectionId(section.id);
    setLectureUnits(section.lectureUnits);
    setLectureDays(section.lectureDays);
    setLabUnits(section.labUnits);
    setLabDays(section.labDays);
    setStartTime(section.startTime);
    setLabStartTime(section.labStartTime);
    setSelectedTermId(section.selectedTermId);
    setSelectedSessionId(section.selectedSessionId);
    
    // Auto-generate schedule when loading
    if (contactHourRules && attendanceRules) {
        const term = calendar.find(t => t.id === section.selectedTermId) || calendar[0];
        const session = term.sessions.find(s => s.id === section.selectedSessionId) || term.sessions[0];
        const context = { contactHourRules, attendanceRules, term, session };
        const request = { 
            lectureUnits: section.lectureUnits, 
            lectureDays: section.lectureDays, 
            labUnits: section.labUnits, 
            labDays: section.labDays 
        };
        setGeneratedSchedule(generateSchedule(request, context, section.startTime, section.labStartTime));
        setLastRequest(request);
    }
  }, [contactHourRules, attendanceRules, calendar, setCurrentSectionId]);

  const handleCopy = (summaryType: 'simple' | 'detailed') => {
    if (!generatedSchedule) return;

    let text = "";
    if (summaryType === 'simple') {
        const blocks = generatedSchedule.scheduleBlocks;
        const lectureBlocks = blocks.filter(b => b.type === 'lecture');
        const labBlocks = blocks.filter(b => b.type === 'lab');

        if (lectureBlocks.length > 0) {
            const days = Array.from(new Set(lectureBlocks.map(b => b.dayOfWeek))).join('/');
            const startTime = lectureBlocks.reduce((min, b) => b.startTime < min ? b.startTime : min, lectureBlocks[0].startTime);
            const endTime = lectureBlocks.reduce((max, b) => b.endTime > max ? b.endTime : max, lectureBlocks[0].endTime);
            text += `Lecture: ${days} (${formatTime(startTime, timeFormat)} - ${formatTime(endTime, timeFormat)})\n`;
        }
        if (labBlocks.length > 0) {
            const days = Array.from(new Set(labBlocks.map(b => b.dayOfWeek))).join('/');
            const startTime = labBlocks.reduce((min, b) => b.startTime < min ? b.startTime : min, labBlocks[0].startTime);
            const endTime = labBlocks.reduce((max, b) => b.endTime > max ? b.endTime : max, labBlocks[0].endTime);
            text += `Lab: ${days} (${formatTime(startTime, timeFormat)} - ${formatTime(endTime, timeFormat)})\n`;
        }
    } else {
        text = `--- Course Schedule: ${currentSectionId ? savedSections.find(s => s.id === currentSectionId)?.name : 'Current'} ---\n`;
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        days.forEach(day => {
            const dayBlocks = generatedSchedule.scheduleBlocks.filter(b => b.dayOfWeek === day);
            if (dayBlocks.length > 0) {
                text += `${day}:\n`;
                dayBlocks.forEach(b => {
                    text += `  ${formatTime(b.startTime, timeFormat)} - ${formatTime(b.endTime, timeFormat)} (${b.type})\n`;
                });
            }
        });
    }

    navigator.clipboard.writeText(text.trim()).then(() => {
      alert("Schedule copied to clipboard!");
    });
  };

  const clearWorkspace = () => {
    setCurrentSectionId(null);
    setLectureUnits(0);
    setLectureDays([]);
    setLabUnits(0);
    setLabDays([]);
    setGeneratedSchedule(null);
    setLastRequest(null);
    setIsConfirmNewOpen(false);
  };

  const handleScheduleNew = () => {
    // If there is an active section ID OR units are entered, prompt to save/discard
    if (currentSectionId || lectureUnits > 0 || labUnits > 0) {
      setIsConfirmNewOpen(true);
    } else {
      clearWorkspace();
    }
  };

  const handleConfirmSaveNew = () => {
    handleSaveSection();
    clearWorkspace();
  };

  const handleExportAll = () => {
    if (savedSections.length === 0) {
      alert("No sections to export!");
      return;
    }

    let exportText = "";
    savedSections.forEach((section, index) => {
      exportText += `======= ${section.name.toUpperCase()} =======\n`;
      exportText += `Term: ${calendar.find(t => t.id === section.selectedTermId)?.name}\n`;
      exportText += `Lecture: ${section.lectureUnits} units, Days: ${section.lectureDays.join('')}\n`;
      if (section.labUnits > 0) {
        exportText += `Lab: ${section.labUnits} units, Days: ${section.labDays.join('')}\n`;
      }
      exportText += `Start Time: ${section.startTime}${section.labStartTime ? ` (Lab: ${section.labStartTime})` : ''}\n\n`;
    });

    navigator.clipboard.writeText(exportText).then(() => {
      alert("All saved sections copied to clipboard!");
    });
  };

  const handleLabLockToggle = () => {
    setLabStartTime(labStartTime === null ? '13:00' : null);
  };

  const selectedTerm = calendar.find(t => t.id === selectedTermId) || calendar[0];
  const selectedSession = selectedTerm.sessions.find(s => s.id === selectedSessionId) || selectedTerm.sessions[0];

  const getStatusInfo = () => {
    if (!generatedSchedule) return { label: 'Idle', class: '' };
    
    // Check if any warnings are actual errors
    const hasError = generatedSchedule.warnings.some(w => w.startsWith('ERROR:'));
    if (hasError) return { label: 'Error', class: 'conflict' };
    
    if (generatedSchedule.warnings.length > 0) return { label: 'Adjusted', class: 'warning' };
    return { label: 'Valid', class: 'valid' };
  };

  const status = getStatusInfo();

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
    <div className={`App ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <a href="#results-header" className="skip-link">Skip to results</a>
      
      {/* Help Modal */}
      {isHelpOpen && <HelpModal onClose={() => setIsHelpOpen(false)} />}

      {/* Confirm New Section Modal */}
      {isConfirmNewOpen && (
        <ConfirmModal 
          title="Save Changes?"
          message="Would you like to save the current section before starting a new one?"
          onConfirm={handleConfirmSaveNew}
          onCancel={clearWorkspace}
          confirmText="Save"
          cancelText="Discard"
        />
      )}

      <div className="dashboard-container">
        <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                {!isSidebarCollapsed && <span className="sidebar-title">Sections</span>}
                <div className="sidebar-actions" ref={settingsDropdownRef}>
                    <button className="icon-btn-sm" onClick={handleExportAll} title="Export All Sections">
                        <ExternalLink size={18} />
                    </button>
                    <button className="icon-btn-sm" onClick={() => setIsHelpOpen(true)} title="Help">
                        <HelpCircle size={18} />
                    </button>
                    <div style={{ position: 'relative', display: 'flex' }}>
                        <button className="icon-btn-sm" onClick={() => setIsSettingsOpen(!isSettingsOpen)} title="Settings">
                            <SettingsIcon size={18} />
                        </button>
                        {isSettingsOpen && (
                            <div className="settings-popover">
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
                                    onClose={() => setIsSettingsOpen(false)}
                                />
                            </div>
                        )}
                    </div>
                    <button 
                        className="sidebar-toggle" 
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        {isSidebarCollapsed ? '→' : '←'}
                    </button>
                </div>
            </div>
            
                        <div className="sidebar-content">
            
                            <Reorder.Group 
            
                                axis="y" 
            
                                values={savedSections} 
            
                                onReorder={reorderSections}
            
                                className="reorder-group"
            
                                style={{ listStyle: 'none', padding: 0, margin: 0 }}
            
                            >
            
                                {savedSections.map(section => {
            
                                    const termForSection = calendar.find(t => t.id === section.selectedTermId);
            
                                    const sessionForSection = termForSection?.sessions.find(s => s.id === section.selectedSessionId);
            
                                    const weeks = sessionForSection?.weeks || 18;
            
            
            
                                    const rawLecEnd = calculateOfficialEndTime(section.lectureUnits, section.lectureDays.length, section.startTime, weeks, false);
            
                                    const rawLabEnd = calculateOfficialEndTime(section.labUnits, section.labDays.length, section.labStartTime || section.startTime, weeks, true);
            
            
            
                                    return (
            
                                        <SidebarItem 
            
                                            key={section.id}
            
                                            section={section}
            
                                            isActive={currentSectionId === section.id}
            
                                            isCollapsed={isSidebarCollapsed}
            
                                            onLoad={handleLoadSection}
            
                                            onDelete={deleteSection}
            
                                            onRename={renameSection}
            
                                            lecStart={formatTime(section.startTime, timeFormat)}
            
                                            lecEnd={formatTime(rawLecEnd, timeFormat)}
            
                                            labStart={formatTime(section.labStartTime || section.startTime, timeFormat)}
            
                                            labEnd={formatTime(rawLabEnd, timeFormat)}
            
                                        />
            
                                    );
            
                                })}
            
                            </Reorder.Group>
            
                        </div>
            
            

            <div className="sidebar-footer">
                {!isSidebarCollapsed && (
                    <button className="clear-all-sidebar-btn" onClick={() => {
                        if (window.confirm("Are you sure you want to clear ALL saved sections?")) {
                            clearAllSections();
                        }
                    }}>
                        Clear All
                    </button>
                )}
            </div>
        </aside>

        <main className="main-content">
            <div className="top-toolbar">
                <header className="dashboard-header">
                    <div className="header-left">
                        <img src={process.env.PUBLIC_URL + '/logo.svg'} className="app-logo" alt="logo" />
                        <h1>Course Scheduler</h1>
                        <div style={{ position: 'relative', display: 'flex' }} ref={statusPopoverRef}>
                            <span 
                                className={`status-badge ${status.class} clickable`} 
                                style={{ marginLeft: '8px' }}
                                onClick={() => generatedSchedule && setIsStatusPopoverOpen(!isStatusPopoverOpen)}
                            >
                                {status.label}
                            </span>
                            {isStatusPopoverOpen && generatedSchedule && (
                                <div className="status-popover">
                                    <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem' }}>Schedule Details</h4>
                                    <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: '0.85rem' }}>
                                        {generatedSchedule.warnings.length > 0 ? (
                                            generatedSchedule.warnings.map((w, i) => (
                                                <li key={i} style={{ marginBottom: '6px', color: w.startsWith('ERROR:') ? 'var(--danger-color)' : 'inherit' }}>
                                                    {w.replace('ERROR: ', '')}
                                                </li>
                                            ))
                                        ) : (
                                            <li>This schedule is fully rule-compliant.</li>
                                        )}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <div className="action-bar">
                    <motion.button 
                        className="secondary-button" 
                        onClick={handleScheduleNew}
                        whileTap={{ scale: 0.95 }}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Plus size={16} /> Schedule New Section
                    </motion.button>
                    <motion.button 
                        className="primary-button" 
                        onClick={handleSaveSection}
                        whileTap={{ scale: 0.95 }}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Save size={16} /> Save Current Section
                    </motion.button>
                    {generatedSchedule && (
                        <div className="split-button-container" ref={copyDropdownRef}>
                            <motion.button 
                                className="secondary-button split-left" 
                                onClick={() => handleCopy('simple')}
                                whileTap={{ scale: 0.95 }}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                <Copy size={16} /> Copy
                            </motion.button>
                            <motion.button 
                                className={`secondary-button split-right ${isCopyDropdownOpen ? 'active' : ''}`} 
                                onClick={() => setIsCopyDropdownOpen(!isCopyDropdownOpen)}
                                whileTap={{ scale: 0.95 }}
                            >
                                <ChevronDown size={14} />
                            </motion.button>
                            {isCopyDropdownOpen && (
                                <div className="dropdown-menu">
                                    <button 
                                        className="dropdown-item" 
                                        onClick={() => { handleCopy('detailed'); setIsCopyDropdownOpen(false); }}
                                        style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                                    >
                                        <Copy size={14} /> Copy Detailed Summary
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="scrollable-content">
                <div className="content-area">
                                                                    <div className="input-grid">
                                                                        <div className="context-card course-input-panel">
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                                                                <h3 style={{ margin: 0 }}>Academic Session</h3>
                                                                                <button 
                                                                                    onClick={handleLabLockToggle} 
                                                     
                                                                                className="secondary-button" 
                                                                                style={{ padding: '4px 8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                                                                                title="Set separate lab start time"
                                                                            >
                                                                                {labStartTime === null ? <><Lock size={12} /> Separate Lab Time</> : <><Unlock size={12} /> Unlink Lab Time</>}
                                                                            </button>
                                                
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                            <div className="setting-item">
                                <label>Term</label>
                                <select value={selectedTermId} onChange={(e) => setSelectedTermId(e.target.value)}>
                                    {calendar.map(term => <option key={term.id} value={term.id}>{term.name}</option>)}
                                </select>
                            </div>
                            <div className="setting-item">
                                <label>Session</label>
                                <select value={selectedSessionId} onChange={(e) => setSelectedSessionId(e.target.value)}>
                                    {selectedTerm.sessions.map(session => <option key={session.id} value={session.id}>{session.name}</option>)}
                                </select>
                            </div>
                            <div className="setting-item">
                                <label>{labStartTime === null ? 'Start Time' : 'Lec Start'}</label>
                                <TimeSelector time={startTime} onTimeChange={setStartTime} timeFormat={timeFormat} />
                            </div>
                            {labStartTime !== null && (
                                <div className="setting-item">
                                    <label>Lab Start Time</label>
                                    <TimeSelector time={labStartTime} onTimeChange={setLabStartTime} timeFormat={timeFormat} />
                                </div>
                            )}
                        </div>
                    </div>

                    <CourseInput 
                        onGenerate={handleGenerate} 
                        daySelectionMode={daySelectionMode}
                        // Passing state down to synchronize
                        lectureUnits={lectureUnits}
                        setLectureUnits={setLectureUnits}
                        lectureDays={lectureDays}
                        setLectureDays={setLectureDays}
                        labUnits={labUnits}
                        setLabUnits={setLabUnits}
                        labDays={labDays}
                        setLabDays={setLabDays}
                    />
                </div>
                
                <p className="disclaimer-text">
                    Generated schedules are estimates and may not be accurate due to holidays and other factors.
                </p>

                <ScheduleDisplay 
                    schedule={generatedSchedule} 
                    request={lastRequest} 
                    timeFormat={timeFormat} 
                    resultsHeadingRef={resultsHeadingRef} 
                />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
