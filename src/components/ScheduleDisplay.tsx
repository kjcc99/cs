// src/components/ScheduleDisplay.tsx
import React, { useState } from 'react';
import { GeneratedSchedule, ScheduleBlock } from '../utils/scheduleGenerator';
import { ScheduleRequest } from './CourseInput';
import { formatTime } from '../utils/timeUtils';

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

const ScheduleDisplaySkeleton: React.FC = () => (
  <div className="schedule-display-container skeleton">
    <div className="minimal-summary-container" style={{ opacity: 0.5 }}>
      <div className="skeleton-line" style={{ width: '60%', height: '24px' }}></div>
    </div>
    <div className="weekly-grid">
      {FULL_DAYS_OF_WEEK.map(day => (
        <div key={day} className="day-column skeleton">
          <h4 className="weekly-view-header" style={{ opacity: 0.3 }}>{day}</h4>
          <div className="day-column-content">
            <div className="skeleton-block"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ScheduleDisplay: React.FC<ScheduleDisplayProps> = ({ schedule, request, timeFormat, resultsHeadingRef }) => {
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);

  if (!schedule) {
    return <ScheduleDisplaySkeleton />;
  }

  const hasLecture = schedule.lectureInfo.contactHoursForTerm > 0;
  const hasLab = schedule.labInfo.contactHoursForTerm > 0;
  
  const lectureBlocks = schedule.scheduleBlocks.filter(b => b.type === 'lecture');
  const labBlocks = schedule.scheduleBlocks.filter(b => b.type === 'lab');

  return (
    <div className="schedule-display-container">
      <div className="minimal-summary-container" aria-live="polite">
          <div style={{ flex: 1 }}>
            {hasLecture && <MinimalSummary blocks={lectureBlocks} type="lecture" timeFormat={timeFormat} />}
            {hasLab && <MinimalSummary blocks={labBlocks} type="lab" timeFormat={timeFormat} />}
          </div>
          <button onClick={() => setIsDetailsExpanded(!isDetailsExpanded)} className="details-toggle-btn" style={{ alignSelf: 'center' }}>
                {isDetailsExpanded ? 'Hide Details' : 'Show Details'}
          </button>
      </div>
      
      <div className={`details-container ${isDetailsExpanded ? 'expanded' : ''}`}>
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
               <h4 id="results-header" className="weekly-view-header">{day}</h4>
               <div className="day-column-content">
                 {blocksForDay.length > 0 ? (
                   blocksForDay.map((block: ScheduleBlock, index: number) => (
                     <div key={index} className={`schedule-block ${block.type}`}>
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
