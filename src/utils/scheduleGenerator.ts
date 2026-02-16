// src/utils/scheduleGenerator.ts
import { ScheduleRequest } from '../components/CourseInput';
import { ContactHourCalculationRules } from './ruleParser';

// --- INTERFACES ---
export interface ScheduleBlock {
  dayOfWeek: string;
  type: 'lecture' | 'lab';
  startTime: string;
  endTime: string;
  durationMinutes: number;
  instructionalMinutes: number;
  breakMinutes: number;
}

export interface ScheduleInfo {
    contactHoursForTerm: number;
    weeklyContactHours: number;
    totalScheduledContactHours: number;
    contactHoursPerDay: number;
    totalBreakMinutesPerDay: number;
}

export interface GeneratedSchedule {
  lectureInfo: ScheduleInfo;
  labInfo: ScheduleInfo;
  scheduleBlocks: ScheduleBlock[];
  warnings: string[];
}

// --- CONSTANTS ---
const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// --- HELPER FUNCTIONS ---
function calculateTimeMetrics(dailyCH: number): { totalClockMinutes: number, numStandardBreaks: number, manualBreak: number } {
    const dailyCHDecimal = parseFloat((dailyCH - Math.floor(dailyCH)).toFixed(1));
    const instructionalMinutes = dailyCH * 50;
    const numStandardBreaks = instructionalMinutes > 50 ? Math.floor(instructionalMinutes / 50) - 1 : 0;
    let manualBreak = 0;
    if (dailyCHDecimal === 0.1) manualBreak = 10;
    else if (dailyCHDecimal === 0.2) manualBreak = 5;
    const totalClockMinutes = Math.round(instructionalMinutes + (numStandardBreaks * 10) + manualBreak);
    return { totalClockMinutes, numStandardBreaks, manualBreak };
}

function calculateDailySchedule(
    units: number, 
    days: string[], // Now an array of strings
    type: 'lecture' | 'lab',
    weeks: number,
    warnings: string[]
): { dailyBlocks: Omit<ScheduleBlock, 'dayOfWeek' | 'startTime' | 'endTime'>[], info: ScheduleInfo } | null {
    const rate = type === 'lecture' ? 18 : 54;
    const contactHoursForTerm = units * rate;
    const rawWeeklyContactHours = contactHoursForTerm / weeks;
    const weeklyContactHours = Math.round(rawWeeklyContactHours * 10) / 10;
    
    if (weeklyContactHours === 0) {
        const totalScheduledContactHours = 0;
        return { dailyBlocks: [], info: { contactHoursForTerm: 0, weeklyContactHours: 0, totalScheduledContactHours, contactHoursPerDay: 0, totalBreakMinutesPerDay: 0 }};
    }
    
    const idealContactHoursPerDay = weeklyContactHours / days.length;

    if (idealContactHoursPerDay < 1.0) {
        warnings.push(`For the ${type}, scheduling for ${days.length} days results in ${idealContactHoursPerDay.toFixed(2)} CH/day, which is less than the minimum of 1.0. Please choose fewer days.`);
        return null;
    }

    const finalDailyContactHours = Math.round(idealContactHoursPerDay * 10) / 10;

    if (Math.abs(finalDailyContactHours - idealContactHoursPerDay) > 0.01) {
        warnings.push(`The ideal daily time of ${idealContactHoursPerDay.toFixed(2)} CH for the ${type} has been rounded to ${finalDailyContactHours.toFixed(1)} CH/day for scheduling purposes.`);
    }

    const { totalClockMinutes, numStandardBreaks, manualBreak } = calculateTimeMetrics(finalDailyContactHours);
    const totalBreakMinutesPerDay = (numStandardBreaks * 10) + manualBreak;
    const instructionalMinutesPerDay = totalClockMinutes - totalBreakMinutesPerDay;
    const totalScheduledContactHours = (finalDailyContactHours * days.length) * weeks;
    
    const consolidatedBlock = {
        type: type,
        durationMinutes: totalClockMinutes,
        instructionalMinutes: instructionalMinutesPerDay,
        breakMinutes: totalBreakMinutesPerDay,
    };

    const info: ScheduleInfo = { 
        contactHoursForTerm, 
        weeklyContactHours, 
        totalScheduledContactHours, 
        contactHoursPerDay: finalDailyContactHours, 
        totalBreakMinutesPerDay 
    };
    
    return { dailyBlocks: [consolidatedBlock], info };
}


// --- MAIN GENERATOR ---
export function generateSchedule(
  request: ScheduleRequest,
  contactHourRules: ContactHourCalculationRules | null,
  weeks: number,
  startTime: string
): GeneratedSchedule {
  const warnings: string[] = [];
  const emptyInfo: ScheduleInfo = { contactHoursForTerm: 0, weeklyContactHours: 0, totalScheduledContactHours: 0, contactHoursPerDay: 0, totalBreakMinutesPerDay: 0 };
  const emptySchedule: GeneratedSchedule = { lectureInfo: emptyInfo, labInfo: emptyInfo, scheduleBlocks: [], warnings };

  if (request.lectureUnits === 0 && request.labUnits === 0) return emptySchedule;

  const lectureResult = calculateDailySchedule(request.lectureUnits, request.lectureDays, 'lecture', weeks, warnings);
  const labResult = calculateDailySchedule(request.labUnits, request.labDays, 'lab', weeks, warnings);

  if (!lectureResult || !labResult) {
      return { ...emptySchedule, lectureInfo: lectureResult?.info || emptyInfo, labInfo: labResult?.info || emptyInfo, warnings };
  }
  
  const { dailyBlocks: lectureDaily, info: lectureInfo } = lectureResult;
  const { dailyBlocks: labDaily, info: labInfo } = labResult;
  
  const finalBlocks: ScheduleBlock[] = [];
  const startHour = parseInt(startTime.split(':')[0]);
  const startMinute = parseInt(startTime.split(':')[1]);
  const initialTime = startHour * 60 + startMinute;
  
  const dailyEndTimes: { [key: string]: number } = {}; // Use day string as key

  // Process lecture days
  for (const day of request.lectureDays) {
    let currentTime = initialTime;
    lectureDaily.forEach(block => {
        const endTime = currentTime + block.durationMinutes;
        finalBlocks.push({
            ...block,
            dayOfWeek: day,
            startTime: `${Math.floor(currentTime / 60).toString().padStart(2, '0')}:${(currentTime % 60).toString().padStart(2, '0')}`,
            endTime: `${Math.floor(endTime / 60).toString().padStart(2, '0')}:${(endTime % 60).toString().padStart(2, '0')}`,
        });
        currentTime = endTime;
    });
    dailyEndTimes[day] = currentTime;
  }

  // Process lab days
  for (const day of request.labDays) {
    let currentTime = dailyEndTimes[day] ? dailyEndTimes[day] : initialTime;

    if (dailyEndTimes[day] && request.lectureUnits > 0) {
        currentTime += 10; // 10 min passing time
    }
    
    labDaily.forEach(block => {
        const endTime = currentTime + block.durationMinutes;
        finalBlocks.push({
            ...block,
            dayOfWeek: day,
            startTime: `${Math.floor(currentTime / 60).toString().padStart(2, '0')}:${(currentTime % 60).toString().padStart(2, '0')}`,
            endTime: `${Math.floor(endTime / 60).toString().padStart(2, '0')}:${(endTime % 60).toString().padStart(2, '0')}`,
        });
        currentTime = endTime;
    });
  }

  return { lectureInfo, labInfo, scheduleBlocks: finalBlocks, warnings };
}
