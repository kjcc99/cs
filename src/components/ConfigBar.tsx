// src/components/ConfigBar.tsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Lock, Unlock } from 'lucide-react';
import { TimeSelector } from './Settings';
import CoursePicker from './CoursePicker';
import CourseInput from './CourseInput';
import { formatTime } from '../utils/timeUtils';
import { AcademicTerm, TermSession } from '../types/calendar';
import { CatalogHierarchy, Course } from '../hooks/useCatalog';
import './ConfigBar.css';

interface ConfigBarProps {
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
    selectedCourseInfo: { sub: string, no: string, title?: string } | null;
    lectureUnits: number;
    setLectureUnits: (v: number) => void;
    lectureDays: string[];
    setLectureDays: (v: string[]) => void;
    labUnits: number;
    setLabUnits: (v: number) => void;
    labDays: string[];
    setLabDays: (v: string[]) => void;
    isLecFixed: boolean;
    isLabFixed: boolean;
    lecRange: { min: number; max: number };
    labRange: { min: number; max: number };
}

const ConfigBar: React.FC<ConfigBarProps> = ({
    isConfigExpanded, setIsConfigExpanded,
    selectedTerm, selectedSession,
    selectedTermId, setSelectedTermId,
    selectedSessionId, setSelectedSessionId,
    calendar,
    startTime, setStartTime,
    labStartTime, setLabStartTime,
    handleLabLockToggle,
    timeFormat,
    catalog, divisions, departments,
    handleCourseSelect,
    selectedCourseInfo,
    lectureUnits, setLectureUnits,
    lectureDays, setLectureDays,
    labUnits, setLabUnits,
    labDays, setLabDays,
    isLecFixed, isLabFixed,
    lecRange, labRange
}) => {
    return (
        <div className={`config-bar ${isConfigExpanded ? 'expanded' : 'collapsed'}`}>
            <AnimatePresence mode="wait">
                {!isConfigExpanded ? (
                    <motion.div
                        key="summary"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="config-summary-row"
                        onClick={() => setIsConfigExpanded(true)}
                    >
                        <div className="summary-sentence">
                            Scheduling <strong>{selectedTerm.name}</strong> ({selectedSession.name})
                            starting at <strong>{formatTime(startTime, timeFormat)}</strong>
                            {labStartTime && <> (Labs at <strong>{formatTime(labStartTime, timeFormat)}</strong>)</>}
                            • <strong>{lectureUnits}u</strong> Lec / <strong>{labUnits}u</strong> Lab
                        </div>
                        <div className="edit-pill">
                            <Edit2 size={12} /> Edit Configuration
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="edit"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="config-edit-container"
                    >
                        {/* Row 1: Session, Times, Catalog */}
                        <div className="config-edit-row">
                            <div className="config-section">
                                <label className="config-label">Academic Session</label>
                                <div className="config-controls">
                                    <div className="time-sub-group">
                                        <span className="micro-label">Term</span>
                                        <select value={selectedTermId} onChange={(e) => setSelectedTermId(e.target.value)}>
                                            {calendar.map(term => <option key={term.id} value={term.id}>{term.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="time-sub-group">
                                        <span className="micro-label">Weeks</span>
                                        <select value={selectedSessionId} onChange={(e) => setSelectedSessionId(e.target.value)}>
                                            {selectedTerm.sessions.map(session => <option key={session.id} value={session.id}>{session.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="config-divider" />

                            <div className="config-section">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label className="config-label">Start Times</label>
                                    <button onClick={handleLabLockToggle} className="icon-btn-xs" title="Toggle separate lab time">
                                        {labStartTime === null ? <Lock size={10} /> : <Unlock size={10} />}
                                    </button>
                                </div>
                                <div className="config-controls">
                                    <div className="time-sub-group">
                                        <span className="micro-label">{labStartTime === null ? <>&nbsp;</> : 'Lec'}</span>
                                        <TimeSelector time={startTime} onTimeChange={setStartTime} timeFormat={timeFormat} />
                                    </div>
                                    {labStartTime !== null && (
                                        <div className="time-sub-group">
                                            <span className="micro-label">Lab</span>
                                            <TimeSelector time={labStartTime} onTimeChange={setLabStartTime} timeFormat={timeFormat} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="config-divider" />

                            <div className="config-section">
                                <label className="config-label">Course Catalog</label>
                                <div className="config-controls">
                                    <div className="time-sub-group">
                                        <span className="micro-label">&nbsp;</span>
                                        <CoursePicker
                                            catalog={catalog}
                                            divisions={divisions}
                                            departments={departments}
                                            onSelect={handleCourseSelect}
                                            selectedCourse={selectedCourseInfo}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Course Input (Units/Days) */}
                        <div className="config-edit-row secondary-row">
                            <CourseInput
                                lectureUnits={lectureUnits}
                                setLectureUnits={setLectureUnits}
                                lectureDays={lectureDays}
                                setLectureDays={setLectureDays}
                                labUnits={labUnits}
                                setLabUnits={setLabUnits}
                                labDays={labDays}
                                setLabDays={setLabDays}
                                isLecFixed={isLecFixed}
                                isLabFixed={isLabFixed}
                                lecRange={lecRange}
                                labRange={labRange}
                            />

                            <button className="primary-button compact done-btn" onClick={() => setIsConfigExpanded(false)}>
                                Done
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ConfigBar;
