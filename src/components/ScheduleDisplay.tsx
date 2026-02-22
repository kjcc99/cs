// src/components/ScheduleDisplay.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GeneratedSchedule, ScheduleBlock } from '../types';
import { ScheduleRequest } from './CourseInput';

import { formatTime } from '../utils/timeUtils';
import './ScheduleDisplay.css';

export interface OverlaidSchedule {
    id: string;
    name: string;
    schedule: GeneratedSchedule;
}

export interface ScheduleDisplayProps {
    schedule: GeneratedSchedule | null;
    request: ScheduleRequest | null;
    overlaidSchedules?: OverlaidSchedule[];
    timeFormat: '12h' | '24h';
    resultsHeadingRef: React.RefObject<HTMLHeadingElement | null>;
    isCalculating?: boolean;
}

const FULL_DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const PIXELS_PER_MINUTE = 1.2;
const START_HOUR = 6;
const END_HOUR = 24;

const formatMinutes = (totalMinutes: number) => {
    if (!totalMinutes || totalMinutes === 0) return '0m';
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    let result = '';
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m`;
    return result.trim();
};

const InfoCard: React.FC<{ title: string, info: any, units: number | undefined, color: string }> = ({ title, info, units, color }) => (
    <div className="summary-details-card">
        <h4>
            <span className="summary-dot" style={{ backgroundColor: color }}></span>
            <span className="summary-title">{title}</span>
        </h4>
        <div className="summary-details">
            {units !== undefined && units > 0 && <p><strong>Selected Units:</strong> {units}</p>}
            <p><strong>Contact Hours for Course:</strong> {info.contactHoursForTerm.toFixed(2)}</p>
            <p><strong>Actual Meeting Days:</strong> {info.actualMeetingDays}</p>
            <p><strong>Contact Hours Per Day:</strong> {info.contactHoursPerDay.toFixed(1)}</p>
            <p><strong>Time Block Per Day:</strong> {formatMinutes(info.totalBreakMinutesPerDay + (info.contactHoursPerDay * 50))}</p>
            <p><strong>Total Scheduled Hours:</strong> {info.totalScheduledContactHours.toFixed(2)}</p>
        </div>
    </div>
);

const MinimalSummary: React.FC<{ blocks: ScheduleBlock[], type: 'lecture' | 'lab', timeFormat: '12h' | '24h' }> = ({ blocks, type, timeFormat }) => {
    if (blocks.length === 0) return null;
    const days = Array.from(new Set(blocks.map(b => b.dayOfWeek))).sort((a, b) => FULL_DAYS_OF_WEEK.indexOf(a) - FULL_DAYS_OF_WEEK.indexOf(b)).join('/');
    const startTimes = blocks.map(b => b.startTime);
    const endTimes = blocks.map(b => b.endTime);
    const startTime = startTimes.reduce((min, t) => t < min ? t : min, startTimes[0]);
    const endTime = endTimes.reduce((max, t) => t > max ? t : max, endTimes[0]);
    return (
        <p className="minimal-summary-item">
            <span className="summary-dot" style={{ backgroundColor: `var(--${type}-color)` }}></span>
            <strong>{type.charAt(0).toUpperCase() + type.slice(1)}:</strong> {days} ({formatTime(startTime, timeFormat)} - {formatTime(endTime, timeFormat)})
        </p>
    )
};

const ScheduleDisplayEmpty: React.FC = () => (
    <div className="empty-hero-card">
        <div className="hero-icon-well">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="hero-svg"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        </div>
        <h2>Ready to schedule?</h2>
        <p>Configure your units and days above, then click <strong>Schedule Section</strong> to generate your visual timetable.</p>
        <div className="hero-hint">
            <span>Pro Tip: You can save multiple versions to the sidebar for easy comparison.</span>
        </div>
    </div>
);

const timeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
};

const getBlockStyle = (startTime: string, endTime: string, colIndex: number = 0, totalCols: number = 1) => {
    const startMins = timeToMinutes(startTime);
    const endMins = timeToMinutes(endTime);
    const duration = endMins - startMins;
    const top = (startMins - START_HOUR * 60) * PIXELS_PER_MINUTE;
    const height = duration * PIXELS_PER_MINUTE;

    return {
        top: `${top}px`,
        height: `${height}px`,
        left: `${(colIndex / totalCols) * 100}%`,
        width: `${(1 / totalCols) * 100}%`,
        position: 'absolute' as const
    };
};

const DayColumn = React.memo(({
    day,
    hours,
    schedule,
    overlaidSchedules,
    hoveredInfo,
    timeFormat,
    isDetailsExpanded,
    handleMouseEnter,
    handleMouseLeave
}: any) => {
    const currentBlocks = (schedule?.scheduleBlocks.filter((b: any) => b.dayOfWeek === day) || []).map((b: any) => ({ ...b, id: 'current', sectionName: 'Current', isMain: true }));
    const overlayDayBlocks = overlaidSchedules.flatMap((os: any) =>
        os.schedule.scheduleBlocks
            .filter((b: any) => b.dayOfWeek === day)
            .map((b: any) => ({ ...b, id: os.id, sectionName: os.name, isMain: false }))
    );
    const allDayBlocks = [...currentBlocks, ...overlayDayBlocks].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

    const columns: any[][] = [];
    allDayBlocks.forEach(block => {
        let placed = false;
        for (let i = 0; i < columns.length; i++) {
            const lastInCol = columns[i][columns[i].length - 1];
            if (timeToMinutes(block.startTime) >= timeToMinutes(lastInCol.endTime)) {
                columns[i].push(block);
                placed = true;
                break;
            }
        }
        if (!placed) columns.push([block]);
    });

    return (
        <div className="day-column timeline">
            <h4 className="weekly-view-header">{day}</h4>
            <div className="day-column-content timeline" style={{ height: `${(END_HOUR - START_HOUR) * 60 * PIXELS_PER_MINUTE}px` }}>
                {hours.map((h: number) => (
                    <div key={h} className="hour-grid-line" style={{ top: `${(h - START_HOUR) * 60 * PIXELS_PER_MINUTE}px` }}></div>
                ))}

                <AnimatePresence>
                    {columns.map((col, colIndex) =>
                        col.map((block, i) => {
                            const isRelated = hoveredInfo && hoveredInfo.id === block.id && hoveredInfo.type === block.type;
                            const isDimmed = hoveredInfo && !isRelated;

                            return (
                                <motion.div
                                    key={`${block.id}-${block.startTime}-${block.type}`}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{
                                        opacity: isDimmed ? 0.25 : (block.isMain ? 1 : 0.6),
                                        scale: isRelated ? 1.02 : 1,
                                        zIndex: isRelated ? 30 : 5
                                    }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className={`schedule-block ${block.type} ${!block.isMain ? 'overlay' : ''} timeline-block ${isRelated ? 'related-highlight' : ''}`}
                                    style={getBlockStyle(block.startTime, block.endTime, colIndex, columns.length)}
                                    onMouseEnter={() => handleMouseEnter(block, block.id, block.sectionName)}
                                    onMouseLeave={handleMouseLeave}
                                >
                                    <div className="block-content">
                                        <span className="block-time">
                                            {columns.length === 1
                                                ? `${formatTime(block.startTime, timeFormat)} - ${formatTime(block.endTime, timeFormat)}`
                                                : formatTime(block.startTime, timeFormat)
                                            }
                                        </span>
                                        {columns.length === 1 && !isDetailsExpanded && !isDimmed && (
                                            <span className="block-desc">{block.isMain ? '' : block.sectionName}</span>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
});


const ScheduleDisplay: React.FC<ScheduleDisplayProps> = ({ schedule, request, overlaidSchedules = [], timeFormat, resultsHeadingRef, isCalculating }) => {
    const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
    const [hoveredInfo, setHoveredInfo] = useState<{ id: string, type: string, name: string, fullSpan: string, days: string, totalInstr: number, totalBreak: number } | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [showNudge, setShowNudge] = useState(false);

    // Trigger nudge only once when a schedule is first displayed
    useEffect(() => {
        if (schedule && !showNudge) {
            const timer = setTimeout(() => setShowNudge(true), 1000);
            const clearTimer = setTimeout(() => setShowNudge(false), 2500);
            return () => {
                clearTimeout(timer);
                clearTimeout(clearTimer);
            };
        }
    }, [schedule]);

    const allBlocks = React.useMemo(() => {
        return [
            ...(schedule?.scheduleBlocks || []).map((b: any) => ({ ...b, id: 'current', sectionName: 'Current' })),
            ...overlaidSchedules.flatMap(os => os.schedule.scheduleBlocks.map((b: any) => ({ ...b, id: os.id, sectionName: os.name })))
        ];
    }, [schedule, overlaidSchedules]);

    const handleMouseEnterWrapper = React.useCallback((block: any, scheduleId: string, scheduleName: string) => {
        const relatedBlocks = allBlocks.filter((b: any) => b.type === block.type && (b.id === scheduleId || b.sectionName === scheduleName));
        const sameDayBlocks = relatedBlocks.filter((b: any) => b.dayOfWeek === block.dayOfWeek);

        const sorted = [...sameDayBlocks].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
        const startTime = sorted[0].startTime;
        const endTime = sorted[sorted.length - 1].endTime;

        const days = Array.from(new Set(relatedBlocks.map((b: any) => b.dayOfWeek)))
            .sort((a: any, b: any) => FULL_DAYS_OF_WEEK.indexOf(a) - FULL_DAYS_OF_WEEK.indexOf(b))
            .join('/');

        const totalInstr = sorted.reduce((sum: number, b: any) => sum + b.instructionalMinutes, 0);
        const totalBreak = sorted.reduce((sum: number, b: any) => sum + b.breakMinutes, 0);

        setHoveredInfo({
            id: scheduleId,
            type: block.type,
            name: scheduleName,
            fullSpan: `${formatTime(startTime, timeFormat)} – ${formatTime(endTime, timeFormat)}`,
            days,
            totalInstr,
            totalBreak
        });
    }, [allBlocks, timeFormat]);

    const handleMouseLeaveWrapper = React.useCallback(() => {
        setHoveredInfo(null);
    }, []);

    if (!schedule && overlaidSchedules.length === 0) {
        return (
            <div className={`schedule-display-container ${isCalculating ? 'is-calculating' : ''}`}>
                <ScheduleDisplayEmpty />
            </div>
        );
    }


    const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

    return (
        <div className={`schedule-display-container ${isCalculating ? 'is-calculating' : ''}`}>
            {schedule && (
                <div className="minimal-summary-container" aria-live="polite">
                    <div className="summary-left">
                        <MinimalSummary blocks={schedule.scheduleBlocks.filter(b => b.type === 'lecture')} type="lecture" timeFormat={timeFormat} />
                        <MinimalSummary blocks={schedule.scheduleBlocks.filter(b => b.type === 'lab')} type="lab" timeFormat={timeFormat} />
                    </div>
                    <button onClick={() => setIsDetailsExpanded(!isDetailsExpanded)} className="details-toggle-btn">
                        {isDetailsExpanded ? 'Hide Details' : 'Show Details'}
                    </button>
                </div>
            )}

            <div className={`details-container ${isDetailsExpanded ? 'expanded' : ''}`}>
                {schedule && (
                    <div className="summary-card">
                        {schedule.lectureInfo.contactHoursForTerm > 0 && <InfoCard title="Lecture Summary" info={schedule.lectureInfo} units={request?.lectureUnits} color="var(--lecture-color)" />}
                        {schedule.labInfo.contactHoursForTerm > 0 && <InfoCard title="Lab Summary" info={schedule.labInfo} units={request?.labUnits} color="var(--lab-color)" />}
                    </div>
                )}
            </div>

            <div
                className={`timeline-wrapper ${hoveredInfo ? 'has-hover' : ''} ${showNudge ? 'nudge-hint' : ''}`}
                onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
            >
                <div className="time-ruler">
                    {hours.map(h => (
                        <div key={h} className="time-label" style={{ height: `${60 * PIXELS_PER_MINUTE}px` }}>
                            {formatTime(`${h}:00`, timeFormat)}
                        </div>
                    ))}
                </div>

                <div className="weekly-grid timeline">
                    {FULL_DAYS_OF_WEEK.map(day => (
                        <DayColumn
                            key={day}
                            day={day}
                            hours={hours}
                            schedule={schedule}
                            overlaidSchedules={overlaidSchedules}
                            hoveredInfo={hoveredInfo}
                            timeFormat={timeFormat}
                            isDetailsExpanded={isDetailsExpanded}
                            handleMouseEnter={handleMouseEnterWrapper}
                            handleMouseLeave={handleMouseLeaveWrapper}
                        />
                    ))}
                </div>

                <AnimatePresence>
                    {hoveredInfo && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="timeline-popover"
                            style={{
                                position: 'fixed',
                                top: `${mousePos.y + 20}px`,
                                left: `${mousePos.x + 20}px`,
                                pointerEvents: 'none',
                                zIndex: 1000
                            }}
                        >
                            <div className="popover-inner">
                                <span className={`summary-dot ${hoveredInfo.type}`} style={{ backgroundColor: `var(--${hoveredInfo.type}-color)` }}></span>
                                <div className="popover-content">
                                    <div className="popover-title">{hoveredInfo.name}</div>
                                    <div className="popover-time">
                                        {hoveredInfo.fullSpan} ({hoveredInfo.days})
                                    </div>
                                    <div className="popover-meta">
                                        {hoveredInfo.type.toUpperCase()} • {hoveredInfo.totalInstr}m instr • {hoveredInfo.totalBreak}m break
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default React.memo(ScheduleDisplay);
