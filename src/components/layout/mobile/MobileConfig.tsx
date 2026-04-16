import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Lock, Unlock, CheckCircle2, CalendarDays, Clock } from 'lucide-react';
import { TimeMode, SplitMode } from '../../../types/section';
import CustomSplit from '../../CustomSplit';
import { TimeSelector } from '../../Settings';
import CoursePicker from '../../CoursePicker';
import CourseInput from '../../CourseInput';
import { formatTime } from '../../../utils/timeUtils';
import { AcademicTerm, TermSession } from '../../../types/calendar';
import { CatalogHierarchy, Course } from '../../../hooks/useCatalog';
import './MobileConfig.css';

interface MobileConfigProps {
    isConfigExpanded: boolean;
    setIsConfigExpanded: (v: boolean) => void;
    selectedTerm: AcademicTerm;
    selectedSession: TermSession;
    selectedTermId: string;
    setSelectedTermId: (v: string) => void;
    selectedSessionId: string;
    setSelectedSessionId: (v: string) => void;
    calendar: AcademicTerm[];
    startTime: string;
    setStartTime: (v: string) => void;
    labStartTime: string | null;
    setLabStartTime: (v: string | null) => void;
    handleLabLockToggle: () => void;
    timeFormat: '12h' | '24h';
    catalog: CatalogHierarchy;
    divisions: Record<string, string>;
    departments: Record<string, string>;
    handleCourseSelect: (sub: string, course: Course) => void;
    onClearCourse: () => void;
    selectedCourseInfo: { sub: string, no: string, title?: string } | null;
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
    isLecFixed: boolean;
    isLabFixed: boolean;
    lecRange: { min: number; max: number };
    labRange: { min: number; max: number };
    lectureTimeMode: TimeMode;
    setLectureTimeMode: (v: TimeMode) => void;
    labTimeMode: TimeMode;
    setLabTimeMode: (v: TimeMode) => void;
    lectureTimesPerDay: Record<string, string>;
    setLectureTimesPerDay: (v: Record<string, string>) => void;
    labTimesPerDay: Record<string, string>;
    setLabTimesPerDay: (v: Record<string, string>) => void;
    lectureSplitMode: SplitMode;
    setLectureSplitMode: (v: SplitMode) => void;
    labSplitMode: SplitMode;
    setLabSplitMode: (v: SplitMode) => void;
    lectureHoursPerDay: Record<string, number>;
    setLectureHoursPerDay: (v: Record<string, number>) => void;
    labHoursPerDay: Record<string, number>;
    setLabHoursPerDay: (v: Record<string, number>) => void;
}

export const MobileConfig: React.FC<MobileConfigProps> = ({
    isConfigExpanded, setIsConfigExpanded, selectedTerm, selectedSession,
    selectedTermId, setSelectedTermId, selectedSessionId, setSelectedSessionId,
    calendar, startTime, setStartTime, labStartTime, setLabStartTime,
    handleLabLockToggle, timeFormat, catalog, divisions, departments,
    handleCourseSelect, onClearCourse, selectedCourseInfo,
    lectureUnits, setLectureUnits, lectureDays, setLectureDays,
    lecTbaHours, setLecTbaHours,
    labUnits, setLabUnits, labDays, setLabDays,
    labTbaHours, setLabTbaHours,
    isLecFixed, isLabFixed, lecRange, labRange,
    lectureTimeMode, setLectureTimeMode,
    labTimeMode, setLabTimeMode,
    lectureTimesPerDay, setLectureTimesPerDay,
    labTimesPerDay, setLabTimesPerDay,
    lectureSplitMode, setLectureSplitMode,
    labSplitMode, setLabSplitMode,
    lectureHoursPerDay, setLectureHoursPerDay,
    labHoursPerDay, setLabHoursPerDay
}) => {
    const weeks = selectedSession.weeks || 1;
    const lecWeeklyCH = Math.max(0, (lectureUnits * 18 - (lecTbaHours || 0))) / weeks;
    const labWeeklyCH = Math.max(0, (labUnits * 54 - (labTbaHours || 0))) / weeks;
    const lecStartForDay = (day: string) => lectureTimeMode === 'perDay' ? (lectureTimesPerDay[day] ?? startTime) : startTime;
    const labEffectiveStart = labStartTime ?? startTime;
    const labStartForDay = (day: string) => labTimeMode === 'perDay' ? (labTimesPerDay[day] ?? labEffectiveStart) : labEffectiveStart;
    const toggleLectureTimeMode = () => {
        if (lectureTimeMode === 'shared') {
            const next: Record<string, string> = { ...lectureTimesPerDay };
            for (const d of lectureDays) if (next[d] === undefined) next[d] = startTime;
            setLectureTimesPerDay(next);
            setLectureTimeMode('perDay');
        } else {
            setLectureTimeMode('shared');
        }
    };
    const toggleLabTimeMode = () => {
        const labBaseTime = labStartTime ?? startTime;
        if (labTimeMode === 'shared') {
            const next: Record<string, string> = { ...labTimesPerDay };
            for (const d of labDays) if (next[d] === undefined) next[d] = labBaseTime;
            setLabTimesPerDay(next);
            setLabTimeMode('perDay');
        } else {
            setLabTimeMode('shared');
        }
    };
    const setLectureDayTime = (day: string, value: string) => {
        setLectureTimesPerDay({ ...lectureTimesPerDay, [day]: value });
    };
    const setLabDayTime = (day: string, value: string) => {
        setLabTimesPerDay({ ...labTimesPerDay, [day]: value });
    };
    return (
        <div className={`mobile-config ${isConfigExpanded ? 'expanded' : 'collapsed'}`}>
            <AnimatePresence mode="wait">
                {!isConfigExpanded ? (
                    <motion.div
                        key="summary"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mc-summary"
                        onClick={() => setIsConfigExpanded(true)}
                        role="button"
                        tabIndex={0}
                        aria-expanded={isConfigExpanded}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setIsConfigExpanded(true);
                            }
                        }}
                    >
                        <div className="mc-summary-text">
                            Scheduling <strong>{selectedTerm.name}</strong> ({selectedSession.name}) at <strong>{formatTime(startTime, timeFormat)}</strong>
                            {selectedCourseInfo ? ` • ${selectedCourseInfo.sub} ${selectedCourseInfo.no}` : ''}
                        </div>
                        <button className="mc-edit-btn">
                            <Edit2 size={16} /> Edit
                        </button>
                    </motion.div>
                ) : (
                    <motion.div
                        key="edit"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mc-edit"
                    >
                        <div className="mc-header">
                            <h3>Configuration</h3>
                            <button className="mc-done-btn" onClick={() => setIsConfigExpanded(false)}>
                                <CheckCircle2 size={18} /> Done
                            </button>
                        </div>

                        <div className="mc-section">
                            <label>Academic Session</label>
                            <div className="mc-row">
                                <select value={selectedTermId} onChange={(e) => setSelectedTermId(e.target.value)}>
                                    {calendar.map(term => <option key={term.id} value={term.id}>{term.name}</option>)}
                                </select>
                                <select value={selectedSessionId} onChange={(e) => setSelectedSessionId(e.target.value)}>
                                    {selectedTerm.sessions.map(session => <option key={session.id} value={session.id}>{session.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="mc-section">
                            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
                                <label>Start Times</label>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    <button
                                        onClick={toggleLectureTimeMode}
                                        className="mc-lock-btn"
                                        disabled={lectureDays.length === 0}
                                        title={lectureTimeMode === 'shared' ? 'Per-day Lec times' : 'Shared Lec time'}
                                    >
                                        {lectureTimeMode === 'shared' ? <Clock size={14} /> : <CalendarDays size={14} />}
                                        <span style={{ marginLeft: 4 }}>Lec</span>
                                    </button>
                                    <button onClick={handleLabLockToggle} className="mc-lock-btn">
                                        {labStartTime === null ? <Lock size={14} /> : <Unlock size={14} />}
                                        <span style={{ marginLeft: 4 }}>Separate</span>
                                    </button>
                                    {labStartTime !== null && (
                                        <button
                                            onClick={toggleLabTimeMode}
                                            className="mc-lock-btn"
                                            disabled={labDays.length === 0}
                                            title={labTimeMode === 'shared' ? 'Per-day Lab times' : 'Shared Lab time'}
                                        >
                                            {labTimeMode === 'shared' ? <Clock size={14} /> : <CalendarDays size={14} />}
                                            <span style={{ marginLeft: 4 }}>Lab</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="mc-row" style={{ flexWrap: 'wrap' }}>
                                {lectureTimeMode === 'shared' || lectureDays.length === 0 ? (
                                    <div className="mc-col">
                                        <span className="mc-micro">Local</span>
                                        <TimeSelector time={startTime} onTimeChange={setStartTime} timeFormat={timeFormat} />
                                    </div>
                                ) : (
                                    lectureDays.map(day => (
                                        <div key={`lec-${day}`} className="mc-col">
                                            <span className="mc-micro">Lec {day}</span>
                                            <TimeSelector
                                                time={lectureTimesPerDay[day] ?? startTime}
                                                onTimeChange={(v) => setLectureDayTime(day, v)}
                                                timeFormat={timeFormat}
                                            />
                                        </div>
                                    ))
                                )}
                                {labStartTime !== null && (
                                    labTimeMode === 'shared' || labDays.length === 0 ? (
                                        <div className="mc-col">
                                            <span className="mc-micro">Lab</span>
                                            <TimeSelector time={labStartTime} onTimeChange={setLabStartTime} timeFormat={timeFormat} />
                                        </div>
                                    ) : (
                                        labDays.map(day => (
                                            <div key={`lab-${day}`} className="mc-col">
                                                <span className="mc-micro">Lab {day}</span>
                                                <TimeSelector
                                                    time={labTimesPerDay[day] ?? labStartTime}
                                                    onTimeChange={(v) => setLabDayTime(day, v)}
                                                    timeFormat={timeFormat}
                                                />
                                            </div>
                                        ))
                                    )
                                )}
                            </div>
                        </div>

                        <div className="mc-section">
                            <label>Course Catalog</label>
                            <CoursePicker
                                catalog={catalog} divisions={divisions} departments={departments}
                                onSelect={handleCourseSelect} onClear={onClearCourse} selectedCourse={selectedCourseInfo}
                            />
                        </div>

                        <div className="mc-section mc-units-section">
                            <CourseInput
                                lectureUnits={lectureUnits} setLectureUnits={setLectureUnits}
                                lectureDays={lectureDays} setLectureDays={setLectureDays}
                                lecTbaHours={lecTbaHours} setLecTbaHours={setLecTbaHours}
                                labUnits={labUnits} setLabUnits={setLabUnits}
                                labDays={labDays} setLabDays={setLabDays}
                                labTbaHours={labTbaHours} setLabTbaHours={setLabTbaHours}
                                isLecFixed={isLecFixed} isLabFixed={isLabFixed}
                                lecRange={lecRange} labRange={labRange}
                            />
                        </div>

                        {((lectureUnits > 0 && lectureDays.length >= 2) || (labUnits > 0 && labDays.length >= 2)) && (
                            <div className="mc-section">
                                <label>Uneven Splits</label>
                                {lectureUnits > 0 && lectureDays.length >= 2 && (
                                    <CustomSplit
                                        label="Lecture"
                                        days={lectureDays}
                                        splitMode={lectureSplitMode}
                                        setSplitMode={setLectureSplitMode}
                                        hoursPerDay={lectureHoursPerDay}
                                        setHoursPerDay={setLectureHoursPerDay}
                                        startTimeForDay={lecStartForDay}
                                        weeklyRequiredCH={lecWeeklyCH}
                                        timeFormat={timeFormat}
                                    />
                                )}
                                {labUnits > 0 && labDays.length >= 2 && (
                                    <CustomSplit
                                        label="Lab"
                                        days={labDays}
                                        splitMode={labSplitMode}
                                        setSplitMode={setLabSplitMode}
                                        hoursPerDay={labHoursPerDay}
                                        setHoursPerDay={setLabHoursPerDay}
                                        startTimeForDay={labStartForDay}
                                        weeklyRequiredCH={labWeeklyCH}
                                        timeFormat={timeFormat}
                                    />
                                )}
                            </div>
                        )}

                    </motion.div>
                )}

            </AnimatePresence>
        </div>
    );
}
