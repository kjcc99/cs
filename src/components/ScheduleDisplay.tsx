// src/components/ScheduleDisplay.tsx
import React, { useState, useRef, useEffect } from 'react';
import { GeneratedSchedule, ScheduleBlock } from '../utils/scheduleGenerator';
import { ScheduleRequest } from './CourseInput';

interface ScheduleDisplayProps {
  schedule: GeneratedSchedule | null;
  request: ScheduleRequest | null;
  timeFormat: '12h' | '24h';
  resultsHeadingRef: React.RefObject<HTMLHeadingElement | null>;
}

const FULL_DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const formatMinutes = (totalMinutes: number) => {
    if (!totalMinutes || totalMinutes === 0) return '0m';
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    let result = '';
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m`;
    return result.trim();
};

const formatTime = (time: string, format: '12h' | '24h') => {
    if (format === '24h' || !time) return time;
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const convertedHour = ((hour + 11) % 12 + 1);
    return `${String(convertedHour).padStart(2, '0')}:${m} ${suffix}`;
};

const InfoCard: React.FC<{title: string, info: any, units: number | undefined, color: string}> = ({ title, info, units, color }) => (
    <div className="summary-details-card">
        <h4>
            <span className="summary-dot" style={{backgroundColor: color}}></span>
            <span style={{ verticalAlign: 'middle' }}>{title}</span>
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
    const days = Array.from(new Set(blocks.map(b => b.dayOfWeek))).sort((a,b) => FULL_DAYS_OF_WEEK.indexOf(a) - FULL_DAYS_OF_WEEK.indexOf(b)).join('/');
    const startTimes = blocks.map(b => b.startTime);
    const endTimes = blocks.map(b => b.endTime);
    const startTime = startTimes.reduce((min, t) => t < min ? t : min, startTimes[0]);
    const endTime = endTimes.reduce((max, t) => t > max ? t : max, endTimes[0]);
    return (
        <p className="minimal-summary-item">
            <span className="summary-dot" style={{backgroundColor: `var(--${type}-color)`}}></span>
            <strong>{type.charAt(0).toUpperCase() + type.slice(1)}:</strong> {days} ({formatTime(startTime, timeFormat)} - {formatTime(endTime, timeFormat)})
        </p>
    )
};

const ScheduleDisplay: React.FC<ScheduleDisplayProps> = ({ schedule, request, timeFormat, resultsHeadingRef }) => {
  const [copyButtonText, setCopyButtonText] = useState('Copy');
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const [showCopyOptions, setShowCopyOptions] = useState(false);
  const copyGroupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (copyGroupRef.current && !copyGroupRef.current.contains(event.target as Node)) {
        setShowCopyOptions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [copyGroupRef]);


  if (!schedule) {
    return (
      <div className="empty-schedule-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="empty-schedule-icon"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        <p className="empty-schedule-message">
          Enter course units and click 'Schedule Course' to generate your weekly schedule!
        </p>
        <p className="empty-schedule-subtext">
            Start by selecting a Term and entering Lecture and Lab units for your course.
        </p>
      </div>
    );
  }

  const generateSimpleSummaryText = () => {
    const lectureBlocks = schedule.scheduleBlocks.filter(b => b.type === 'lecture');
    const labBlocks = schedule.scheduleBlocks.filter(b => b.type === 'lab');

    let text = '';
    if (lectureBlocks.length > 0) {
        const days = Array.from(new Set(lectureBlocks.map(b => b.dayOfWeek))).sort((a,b) => FULL_DAYS_OF_WEEK.indexOf(a) - FULL_DAYS_OF_WEEK.indexOf(b)).join('/');
        const startTime = lectureBlocks.reduce((min, b) => b.startTime < min ? b.startTime : min, lectureBlocks[0].startTime);
        const endTime = lectureBlocks.reduce((max, b) => b.endTime > max ? b.endTime : max, lectureBlocks[0].endTime);
        text += `Lecture: ${days} (${formatTime(startTime, timeFormat)} - ${formatTime(endTime, timeFormat)})\n`;
    }
    if (labBlocks.length > 0) {
        const days = Array.from(new Set(labBlocks.map(b => b.dayOfWeek))).sort((a,b) => FULL_DAYS_OF_WEEK.indexOf(a) - FULL_DAYS_OF_WEEK.indexOf(b)).join('/');
        const startTime = labBlocks.reduce((min, b) => b.startTime < min ? b.startTime : min, labBlocks[0].startTime);
        const endTime = labBlocks.reduce((max, b) => b.endTime > max ? b.endTime : max, labBlocks[0].endTime);
        text += `Lab: ${days} (${formatTime(startTime, timeFormat)} - ${formatTime(endTime, timeFormat)})\n`;
    }
    return text.trim();
  };

  const generateDetailedSummaryText = () => {
    let summaryText = '--- Course Schedule Example ---\n';
    if (request) {
        if(request.lectureUnits > 0) summaryText += `Lecture: ${request.lectureUnits} units, ${request.lectureDays.length} day(s)/week (${request.lectureDays.join('/')})\n`;
        if(request.labUnits > 0) summaryText += `Lab: ${request.labUnits} units, ${request.labDays.length} day(s)/week (${request.labDays.join('/')})\n\n`;
    }

    const blocksByDay: { [key: string]: ScheduleBlock[] } = {};
    schedule.scheduleBlocks.forEach(block => {
        if (!blocksByDay[block.dayOfWeek]) {
            blocksByDay[block.dayOfWeek] = [];
        }
        blocksByDay[block.dayOfWeek].push(block);
    });

    FULL_DAYS_OF_WEEK.forEach(day => {
        if (blocksByDay[day] && blocksByDay[day].length > 0) {
            summaryText += `${day}:\n`;
            blocksByDay[day].forEach(block => {
                summaryText += `  ${formatTime(block.startTime, timeFormat)} - ${formatTime(block.endTime, timeFormat)} (${block.type})\n`;
            });
        }
    });
    return summaryText.trim();
  };


  const handleCopy = (summaryType: 'simple' | 'detailed') => {
    const textToCopy = summaryType === 'simple' ? generateSimpleSummaryText() : generateDetailedSummaryText();
    navigator.clipboard.writeText(textToCopy).then(() => {
        setCopyButtonText('Copied!');
        setShowCopyOptions(false);
        setTimeout(() => setCopyButtonText('Copy'), 2000);
    }, () => {
        setCopyButtonText('Error!');
        setShowCopyOptions(false);
        setTimeout(() => setCopyButtonText('Copy'), 2000);
    });
  };

  const hasLecture = schedule.lectureInfo.contactHoursForTerm > 0;
  const hasLab = schedule.labInfo.contactHoursForTerm > 0;
  
  const lectureBlocks = schedule.scheduleBlocks.filter(b => b.type === 'lecture');
  const labBlocks = schedule.scheduleBlocks.filter(b => b.type === 'lab');

  return (
    <div className="schedule-display-container">
      <div className="schedule-display-header">
        <h2 ref={resultsHeadingRef} tabIndex={-1}>Example Schedule</h2>
        <div className="header-buttons">
            <button onClick={() => setIsDetailsExpanded(!isDetailsExpanded)} className="details-toggle-btn">
                {isDetailsExpanded ? 'Hide Details' : 'Show Details'}
            </button>
            {schedule.scheduleBlocks.length > 0 && (
                <div className="copy-button-container" ref={copyGroupRef}>
                    <div className="copy-button-group">
                      <button onClick={() => handleCopy('simple')} className="copy-button main-copy-button">{copyButtonText}</button>
                      <button onClick={() => setShowCopyOptions(!showCopyOptions)} className="copy-button dropdown-toggle-button" aria-expanded={showCopyOptions}>
                          ▼
                      </button>
                    </div>
                    {showCopyOptions && (
                        <div className="copy-dropdown-content">
                            <button onClick={() => handleCopy('detailed')}>Copy Detailed Summary</button>
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
      
      <div className="minimal-summary-container" aria-live="polite">
          {hasLecture && <MinimalSummary blocks={lectureBlocks} type="lecture" timeFormat={timeFormat} />}
          {hasLab && <MinimalSummary blocks={labBlocks} type="lab" timeFormat={timeFormat} />}
      </div>
      
      {isDetailsExpanded && (
          <div className="details-container">
              {hasLecture && hasLab && (
                <div className="summary-card combined-summary-card">
                  <h4>Full Schedule Summary</h4>
                  <div className="summary-details combined-summary-details">
                    <p><strong>Total Contact Hours for Course:</strong> {(schedule.lectureInfo.contactHoursForTerm + schedule.labInfo.contactHoursForTerm).toFixed(2)}</p>
                    <p><strong>Total Scheduled Hours:</strong> {(schedule.lectureInfo.totalScheduledContactHours + schedule.labInfo.totalScheduledContactHours).toFixed(2)}</p>
                    <p style={{marginTop: '10px'}}><strong>Lecture Time Block Per Day:</strong> {formatMinutes(schedule.lectureInfo.totalBreakMinutesPerDay + (schedule.lectureInfo.contactHoursPerDay * 50))}</p>
                    <p><strong>Lab Time Block Per Day:</strong> {formatMinutes(schedule.labInfo.totalBreakMinutesPerDay + (schedule.labInfo.contactHoursPerDay * 50))}</p>
                  </div>
                </div>
              )}
              <div className="summary-card">
                {hasLecture && <InfoCard title="Lecture Summary" info={schedule.lectureInfo} units={request?.lectureUnits} color="var(--lecture-color)" />}
                {hasLab && <InfoCard title="Lab Summary" info={schedule.labInfo} units={request?.labUnits} color="var(--lab-color)" />}
              </div>
          </div>
      )}

      {schedule.warnings.length > 0 && (
        <div className="warning-card">
          <h3>Warnings</h3>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {schedule.warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {schedule.scheduleBlocks.length > 0 && (
         <div className="weekly-grid">
         {FULL_DAYS_OF_WEEK.map(day => {
           const blocksForDay = schedule.scheduleBlocks.filter(b => b.dayOfWeek === day);
           return (
             <div key={day} className="day-column">
               <h4 className="weekly-view-header">{day}</h4>
               <div className="day-column-content">
                 {blocksForDay.length > 0 ? (
                   blocksForDay.map((block: ScheduleBlock, index: number) => (
                     <div key={index} className="schedule-block" style={{ borderLeft: `5px solid ${block.type === 'lecture' ? 'var(--lecture-color)' : 'var(--lab-color)'}` }}>
                       <p><strong>{formatTime(block.startTime, timeFormat)} - {formatTime(block.endTime, timeFormat)}</strong></p>
                       <p className="schedule-block-description">
                           {block.instructionalMinutes > 0 && `${block.instructionalMinutes} min instruction`}
                           {block.breakMinutes > 0 && <span style={{color: 'var(--danger-color)'}}>{`, ${block.breakMinutes} min break`}</span>}
                       </p>
                     </div>
                   ))
                 ) : (
                   <p className="no-classes-text">No classes</p>
                 )}
               </div>
             </div>
           );
         })}
       </div>
      )}
    </div>
  );
};

export default React.memo(ScheduleDisplay);
