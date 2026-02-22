import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Lock, Unlock, CheckCircle2 } from 'lucide-react';
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

export const MobileConfig: React.FC<MobileConfigProps> = ({
    isConfigExpanded, setIsConfigExpanded, selectedTerm, selectedSession,
    selectedTermId, setSelectedTermId, selectedSessionId, setSelectedSessionId,
    calendar, startTime, setStartTime, labStartTime, setLabStartTime,
    handleLabLockToggle, timeFormat, catalog, divisions, departments,
    handleCourseSelect, selectedCourseInfo,
    lectureUnits, setLectureUnits, lectureDays, setLectureDays,
    labUnits, setLabUnits, labDays, setLabDays,
    isLecFixed, isLabFixed, lecRange, labRange
}) => {
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
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <label>Start Times</label>
                                <button onClick={handleLabLockToggle} className="mc-lock-btn">
                                    {labStartTime === null ? <Lock size={14} /> : <Unlock size={14} />}
                                    <span style={{ marginLeft: 4 }}>Separate</span>
                                </button>
                            </div>
                            <div className="mc-row">
                                <div className="mc-col">
                                    <span className="mc-micro">Local</span>
                                    <TimeSelector time={startTime} onTimeChange={setStartTime} timeFormat={timeFormat} />
                                </div>
                                {labStartTime !== null && (
                                    <div className="mc-col">
                                        <span className="mc-micro">Lab</span>
                                        <TimeSelector time={labStartTime} onTimeChange={setLabStartTime} timeFormat={timeFormat} />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mc-section">
                            <label>Course Catalog</label>
                            <CoursePicker
                                catalog={catalog} divisions={divisions} departments={departments}
                                onSelect={handleCourseSelect} selectedCourse={selectedCourseInfo}
                            />
                        </div>

                        <div className="mc-section mc-units-section">
                            <CourseInput
                                lectureUnits={lectureUnits} setLectureUnits={setLectureUnits}
                                lectureDays={lectureDays} setLectureDays={setLectureDays}
                                labUnits={labUnits} setLabUnits={setLabUnits}
                                labDays={labDays} setLabDays={setLabDays}
                                isLecFixed={isLecFixed} isLabFixed={isLabFixed}
                                lecRange={lecRange} labRange={labRange}
                            />
                        </div>

                    </motion.div>
                )}

            </AnimatePresence>
        </div>
    );
}
