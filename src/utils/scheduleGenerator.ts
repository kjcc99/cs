// src/utils/scheduleGenerator.ts
import { ScheduleRequest } from '../components/CourseInput';


import { addDays, addWeeks, getDateString } from './dateUtils';

import { ScheduleBlock, ScheduleInfo, GeneratedSchedule, RuleAndTermContext } from '../types';



// --- Main Calculation Logic (Exported for UI consistency) ---
export function calculateTimeMetrics(dailyCH: number): { totalClockMinutes: number, numStandardBreaks: number, manualBreak: number } {
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
    daysOfWeek: string[],
    type: 'lecture' | 'lab',
    context: RuleAndTermContext,
    warnings: string[]
): { dailyBlocks: Omit<ScheduleBlock, 'dayOfWeek' | 'startTime' | 'endTime'>[], info: ScheduleInfo } | null {
    const { term, session, attendanceRules } = context;
    const { weeks } = session;

    let attendanceMethodKey = term.type.toUpperCase();
    if (term.type === 'semester' && session.method !== 'FULL_TERM') {
        attendanceMethodKey = 'SEMESTER_SHORT_TERM';
    }
    const accountingRule = attendanceRules[attendanceMethodKey] || attendanceRules['SEMESTER_FULL_TERM'];

    // 1. Calculate Session Start and End Dates
    const termStartDate = new Date(term.startDate + 'T00:00:00');
    const termEndDate = new Date(term.endDate + 'T00:00:00');
    let sessionStartDate = termStartDate;
    let sessionEndDate = termEndDate;

    if (session.method === 'EARLY_START') {
        sessionEndDate = addWeeks(sessionStartDate, weeks);
    } else if (session.method === 'LATE_START') {
        sessionStartDate = addDays(addWeeks(termEndDate, -weeks), 1);
    }

    // 2. Count the actual number of meeting days
    let actualMeetingDays = 0;
    const dayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const holidaySet = new Set(term.holidays);

    if (accountingRule.METHOD === 'COUNT_HOLIDAYS' && daysOfWeek.length > 0) {
        for (let d = new Date(sessionStartDate); d <= sessionEndDate; d.setDate(d.getDate() + 1)) {
            const dayStr = dayMap[d.getDay()];
            const dateStr = getDateString(d);
            if (daysOfWeek.includes(dayStr) && !holidaySet.has(dateStr)) {
                actualMeetingDays++;
            }
        }
    } else {
        actualMeetingDays = weeks * daysOfWeek.length;
    }

    // 3. Calculate Contact Hours
    const rate = type === 'lecture' ? 18 : 54;
    const contactHoursForTerm = units * rate;

    if (contactHoursForTerm === 0) {
        return { dailyBlocks: [], info: { contactHoursForTerm: 0, weeklyContactHours: 0, totalScheduledContactHours: 0, contactHoursPerDay: 0, totalBreakMinutesPerDay: 0, actualMeetingDays: 0 } };
    }

    if (actualMeetingDays === 0 && units > 0) {
        warnings.push(`The selected days for the ${type} do not occur in the chosen session.`);
        return null;
    }

    const idealContactHoursPerDay = contactHoursForTerm / actualMeetingDays;

    if (idealContactHoursPerDay < 1.0) {
        warnings.push(`ERROR: Minimum of 1.0 CH/day required. current: ${idealContactHoursPerDay.toFixed(2)}.`);
        return null;
    }

    const finalDailyContactHours = Math.round(idealContactHoursPerDay * 10) / 10;

    if (Math.abs(finalDailyContactHours - idealContactHoursPerDay) > 0.01) {
        warnings.push(`Ideal daily time of ${idealContactHoursPerDay.toFixed(2)} CH for the ${type} was rounded to ${finalDailyContactHours.toFixed(1)} CH/day.`);
    }

    // 4. Generate daily blocks
    const { totalClockMinutes, numStandardBreaks, manualBreak } = calculateTimeMetrics(finalDailyContactHours);
    const totalBreakMinutesPerDay = (numStandardBreaks * 10) + manualBreak;
    const instructionalMinutesPerDay = totalClockMinutes - totalBreakMinutesPerDay;
    const totalScheduledContactHours = finalDailyContactHours * actualMeetingDays;

    const dailyBlocks: Omit<ScheduleBlock, 'dayOfWeek' | 'startTime' | 'endTime'>[] = [];
    let remainingInstructional = instructionalMinutesPerDay;
    let remainingStdBreaks = numStandardBreaks;

    while (remainingInstructional > 0) {
        const isLastBlock = remainingStdBreaks <= 0;
        const blockInstruction = isLastBlock ? remainingInstructional : 50;
        const blockBreak = isLastBlock ? 0 : 10;

        dailyBlocks.push({
            type,
            durationMinutes: blockInstruction + blockBreak,
            instructionalMinutes: blockInstruction,
            breakMinutes: blockBreak,
        });
        remainingInstructional -= blockInstruction;
        if (!isLastBlock) remainingStdBreaks--;
    }
    if (manualBreak > 0 && dailyBlocks.length > 0) {
        dailyBlocks[dailyBlocks.length - 1].breakMinutes += manualBreak;
        dailyBlocks[dailyBlocks.length - 1].durationMinutes += manualBreak;
    }

    const info: ScheduleInfo = {
        contactHoursForTerm,
        weeklyContactHours: contactHoursForTerm / weeks,
        totalScheduledContactHours,
        contactHoursPerDay: finalDailyContactHours,
        totalBreakMinutesPerDay,
        actualMeetingDays
    };

    return { dailyBlocks, info };
}


// --- MAIN GENERATOR ---
export function generateSchedule(
    request: ScheduleRequest,
    context: RuleAndTermContext,
    startTime: string,
    labStartTime: string | null
): GeneratedSchedule {
    const warnings: string[] = [];
    const emptyInfo: ScheduleInfo = { contactHoursForTerm: 0, weeklyContactHours: 0, totalScheduledContactHours: 0, contactHoursPerDay: 0, totalBreakMinutesPerDay: 0, actualMeetingDays: 0 };
    const emptySchedule: GeneratedSchedule = { lectureInfo: emptyInfo, labInfo: emptyInfo, scheduleBlocks: [], warnings };

    if (request.lectureUnits === 0 && request.labUnits === 0) return emptySchedule;

    const lectureResult = calculateDailySchedule(request.lectureUnits, request.lectureDays, 'lecture', context, warnings);
    const labResult = calculateDailySchedule(request.labUnits, request.labDays, 'lab', context, warnings);

    if (!lectureResult || !labResult) {
        return { ...emptySchedule, lectureInfo: lectureResult?.info || emptyInfo, labInfo: labResult?.info || emptyInfo, warnings };
    }

    const { dailyBlocks: lectureDaily, info: lectureInfo } = lectureResult;
    const { dailyBlocks: labDaily, info: labInfo } = labResult;

    const finalBlocks: ScheduleBlock[] = [];
    const lecStartHour = parseInt(startTime.split(':')[0]);
    const lecStartMinute = parseInt(startTime.split(':')[1]);
    const initialLecTime = lecStartHour * 60 + lecStartMinute;

    const dailyEndTimes: { [key: string]: number } = {};

    // Process lecture days
    for (const day of request.lectureDays) {
        let currentTime = initialLecTime;
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
        let initialLabTime = initialLecTime;
        if (labStartTime) {
            const labStartHour = parseInt(labStartTime.split(':')[0]);
            const labStartMinute = parseInt(labStartTime.split(':')[1]);
            initialLabTime = labStartHour * 60 + labStartMinute;
        }

        let currentTime: number;

        if (labStartTime) {
            // User explicitly set a lab time, use it regardless of lecture presence
            currentTime = initialLabTime;
        } else if (dailyEndTimes[day] && request.lectureUnits > 0) {
            // No custom lab time, and there's a lecture today: start 10m after lecture
            currentTime = dailyEndTimes[day] + 10;
        } else {
            // No custom lab time, no lecture today: start at default time (initialLecTime)
            currentTime = initialLabTime;
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

    return {
        lectureInfo, labInfo, scheduleBlocks: finalBlocks.sort((a, b) => {
            const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            if (a.dayOfWeek !== b.dayOfWeek) {
                return days.indexOf(a.dayOfWeek) - days.indexOf(b.dayOfWeek);
            }
            // Sort by actual time (handling 24+ virtual hours correctly)
            return a.startTime.localeCompare(b.startTime);
        }), warnings
    };
}

// Utility for the UI to get the same "Official" end time without the full schedule context
export function calculateOfficialEndTime(
    units: number,
    daysCount: number,
    startTime: string,
    weeks: number,
    isLab: boolean = false
): string {
    if (!units || !daysCount || !weeks) return '';

    const rate = isLab ? 54 : 18;
    const contactHoursForTerm = units * rate;

    // Simple meeting day calculation for the summary label
    const actualMeetingDays = weeks * daysCount;
    const idealContactHoursPerDay = contactHoursForTerm / actualMeetingDays;
    const finalDailyContactHours = Math.round(idealContactHoursPerDay * 10) / 10;

    const { totalClockMinutes } = calculateTimeMetrics(finalDailyContactHours);

    const [h, m] = startTime.split(':').map(Number);
    const endTotal = h * 60 + m + totalClockMinutes;
    const endH = Math.floor(endTotal / 60); // Allow 24+
    const endM = Math.round(endTotal % 60);
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}
