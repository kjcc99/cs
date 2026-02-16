// src/components/ScheduleDisplay.tsx
import React, { useState } from 'react';
import { GeneratedSchedule, ScheduleBlock } from '../utils/scheduleGenerator';
import { ScheduleRequest } from './CourseInput';

interface ScheduleDisplayProps {
  schedule: GeneratedSchedule | null;
  request: ScheduleRequest | null;
}

const FULL_DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Helper to convert minutes to a readable format
const formatMinutes = (totalMinutes: number) => {
    if (totalMinutes === 0) return '0 minutes';
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    let result = '';
    if (hours > 0) result += `${hours} hour${hours > 1 ? 's' : ''}`;
    if (minutes > 0) result += `${hours > 0 ? ', ' : ''}${minutes} minute${minutes > 1 ? 's' : ''}`;
    return result;
};


const InfoCard: React.FC<{title: string, info: any, units: number | undefined, color: string}> = ({ title, info, units, color }) => (
    <div style={{ flex: 1, minWidth: '250px' }}>
        <h4>
            <span style={{
                display: 'inline-block',
                width: '12px',
                height: '12px',
                backgroundColor: color,
                marginRight: '8px',
                borderRadius: '3px',
                verticalAlign: 'middle'
            }}></span>
            <span style={{ verticalAlign: 'middle' }}>{title}</span>
        </h4>
        <div className="summary-details">
            <p><strong>Time Block Per Day:</strong> {formatMinutes(info.totalBreakMinutesPerDay + (info.contactHoursPerDay * 50))}</p>
            {units !== undefined && units > 0 && <p><strong>Selected Units:</strong> {units}</p>}
            <p><strong>Contact Hours for Course:</strong> {info.contactHoursForTerm.toFixed(2)}</p>
            <p><strong>Total Scheduled Contact Hours:</strong> {info.totalScheduledContactHours.toFixed(2)}</p>
            <p><strong>Contact Hours Per Day:</strong> {info.contactHoursPerDay.toFixed(1)}</p>
            <p><strong>Break Minutes Per Day:</strong> {info.totalBreakMinutesPerDay}</p>
        </div>
    </div>
);


const ScheduleDisplay: React.FC<ScheduleDisplayProps> = ({ schedule, request }) => {
  const [copyButtonText, setCopyButtonText] = useState('Copy Summary');

  if (!schedule) {
    return (
      <div style={{ marginTop: '20px', padding: '20px', border: '1px solid #eee', borderRadius: '8px' }}>
        <p>Enter course units and click "Generate Example" to see a schedule.</p>
      </div>
    );
  }

  const handleCopyClick = () => {
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
        if (blocksByDay[day]) {
            summaryText += `${day}:\n`;
            blocksByDay[day].forEach(block => {
                summaryText += `  ${block.startTime} - ${block.endTime} (${block.type})\n`;
            });
        }
    });

    navigator.clipboard.writeText(summaryText).then(() => {
        setCopyButtonText('Copied!');
        setTimeout(() => setCopyButtonText('Copy Summary'), 2000);
    }, (err) => {
        console.error('Could not copy text: ', err);
        setCopyButtonText('Error!');
        setTimeout(() => setCopyButtonText('Copy Summary'), 2000);
    });
  };

  const hasLecture = schedule.lectureInfo.contactHoursForTerm > 0;
  const hasLab = schedule.labInfo.contactHoursForTerm > 0;
  const showCombinedSummary = hasLecture && hasLab;

  return (
    <div style={{ marginTop: '30px' }}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h2>Schedule Example</h2>
        {schedule.scheduleBlocks.length > 0 && <button onClick={handleCopyClick} className="copy-button">{copyButtonText}</button>}
      </div>

      {/* --- Combined, Lecture, and Lab Summaries --- */}
      {showCombinedSummary && (
        <div className="summary-card combined-summary-card">
          <h4>Full Schedule Summary</h4>
          <div className="summary-details combined-summary-details">
            <p><strong>Total Contact Hours for Course:</strong> {(schedule.lectureInfo.contactHoursForTerm + schedule.labInfo.contactHoursForTerm).toFixed(2)}</p>
            <p><strong>Total Scheduled Contact Hours:</strong> {(schedule.lectureInfo.totalScheduledContactHours + schedule.labInfo.totalScheduledContactHours).toFixed(2)}</p>
            <p style={{marginTop: '10px'}}><strong>Lecture Time Block Per Day:</strong> {formatMinutes(schedule.lectureInfo.totalBreakMinutesPerDay + (schedule.lectureInfo.contactHoursPerDay * 50))}</p>
            <p><strong>Lab Time Block Per Day:</strong> {formatMinutes(schedule.labInfo.totalBreakMinutesPerDay + (schedule.labInfo.contactHoursPerDay * 50))}</p>
          </div>
        </div>
      )}
      <div className="summary-card">
        {hasLecture && <InfoCard title="Lecture Summary" info={schedule.lectureInfo} units={request?.lectureUnits} color="var(--lecture-color)" />}
        {hasLab && <InfoCard title="Lab Summary" info={schedule.labInfo} units={request?.labUnits} color="var(--lab-color)" />}
      </div>

      {/* --- Warnings --- */}
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

      {/* --- Weekly Schedule View --- */}
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
                       <p><strong>{block.startTime} - {block.endTime}</strong> ({block.type})</p>
                       <p className="schedule-block-description">
                           {block.instructionalMinutes} min instruction
                           {block.breakMinutes > 0 && `, ${block.breakMinutes} min break`}
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

export default ScheduleDisplay;
