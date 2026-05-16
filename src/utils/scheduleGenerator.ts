// src/utils/scheduleGenerator.ts
import { ScheduleRequest } from '../components/CourseInput';


import { addDays, addWeeks, getDateString } from './dateUtils';

import { ScheduleBlock, ScheduleInfo, GeneratedSchedule, RuleAndTermContext } from '../types';



// Given total clock minutes (end - start), compute contact hours using the official rules.
// Rounds to the nearest 0.1 CH. Returns null if the duration is less than 1 CH minimum (50 min).
export function contactHoursFromClockMinutes(totalClockMinutes: number): number | null {
    if (totalClockMinutes < 50) return null;
    const numBreaks = totalClockMinutes <= 95 ? 0 : Math.floor((totalClockMinutes - 50) / 60);
    const instructionalMinutes = totalClockMinutes - (numBreaks * 10);
    const ch = instructionalMinutes / 50;
    return Math.round(ch * 10) / 10;
}

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

// Build the per-day block template for a fixed number of contact hours.
// Mirrors the existing inline logic — extracted so it can run per-day or once.
function buildBlocksForContactHours(
    dailyCH: number,
    type: 'lecture' | 'lab'
): { blocks: Omit<ScheduleBlock, 'dayOfWeek' | 'startTime' | 'endTime'>[], totalBreakMinutes: number } {
    const { totalClockMinutes, numStandardBreaks, manualBreak } = calculateTimeMetrics(dailyCH);
    const totalBreakMinutes = (numStandardBreaks * 10) + manualBreak;
    const instructionalMinutes = totalClockMinutes - totalBreakMinutes;

    const blocks: Omit<ScheduleBlock, 'dayOfWeek' | 'startTime' | 'endTime'>[] = [];
    let remainingInstructional = instructionalMinutes;
    let remainingStdBreaks = numStandardBreaks;

    while (remainingInstructional > 0) {
        const isLastBlock = remainingStdBreaks <= 0;
        const blockInstruction = isLastBlock ? remainingInstructional : 50;
        const blockBreak = isLastBlock ? 0 : 10;

        blocks.push({
            type,
            durationMinutes: blockInstruction + blockBreak,
            instructionalMinutes: blockInstruction,
            breakMinutes: blockBreak,
        });
        remainingInstructional -= blockInstruction;
        if (!isLastBlock) remainingStdBreaks--;
    }
    if (manualBreak > 0 && blocks.length > 0) {
        blocks[blocks.length - 1].breakMinutes += manualBreak;
        blocks[blocks.length - 1].durationMinutes += manualBreak;
    }
    return { blocks, totalBreakMinutes };
}

type DailyBlocks = Omit<ScheduleBlock, 'dayOfWeek' | 'startTime' | 'endTime'>[];

interface DailyScheduleResult {
    // When splitMode === 'even', blocksPerDay[day] is the same template for every day.
    // When splitMode === 'custom', each day has its own template.
    blocksPerDay: Record<string, DailyBlocks>;
    info: ScheduleInfo;
}

function calculateDailySchedule(
    units: number,
    daysOfWeek: string[],
    type: 'lecture' | 'lab',
    tbaHours: number = 0,
    context: RuleAndTermContext,
    warnings: string[],
    customHoursPerDay?: Partial<Record<string, number>>
): DailyScheduleResult | null {
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
    const effectiveContactHoursForTerm = Math.max(0, contactHoursForTerm - tbaHours);

    if (tbaHours > contactHoursForTerm) {
        warnings.push(`ERROR: TBA hours (${tbaHours}) cannot exceed total required contact hours (${contactHoursForTerm}) for this ${type}.`);
        return null;
    }

    if (effectiveContactHoursForTerm === 0) {
        return { blocksPerDay: {}, info: { contactHoursForTerm, weeklyContactHours: contactHoursForTerm / weeks, totalScheduledContactHours: 0, contactHoursPerDay: 0, totalBreakMinutesPerDay: 0, actualMeetingDays: 0 } };
    }

    if (actualMeetingDays === 0 && effectiveContactHoursForTerm > 0) {
        warnings.push(`The selected days for the ${type} do not occur in the chosen session.`);
        return null;
    }

    const useCustomSplit = !!customHoursPerDay && daysOfWeek.some(d => customHoursPerDay[d] !== undefined);

    if (useCustomSplit) {
        // --- Custom (uneven) split path ---
        const weeklyRequiredCH = effectiveContactHoursForTerm / weeks;
        const blocksPerDay: Record<string, DailyBlocks> = {};
        let sumWeeklyCH = 0;
        let totalBreakMinutesSum = 0;

        for (const day of daysOfWeek) {
            const raw = customHoursPerDay![day];
            if (raw === undefined) {
                warnings.push(`ERROR: Custom split is missing a value for ${day} (${type}).`);
                return null;
            }
            const ch = Math.round(raw * 10) / 10;
            if (Math.abs(ch - raw) > 0.001) {
                warnings.push(`Custom ${type} hours for ${day} rounded from ${raw} to ${ch.toFixed(1)} CH.`);
            }
            if (ch < 1.0) {
                warnings.push(`ERROR: Minimum of 1.0 CH per meeting required. ${type} on ${day} is ${ch.toFixed(1)} CH.`);
                return null;
            }
            const { blocks, totalBreakMinutes } = buildBlocksForContactHours(ch, type);
            blocksPerDay[day] = blocks;
            totalBreakMinutesSum += totalBreakMinutes;
            sumWeeklyCH += ch;
        }

        const tolerance = Math.max(0.05, daysOfWeek.length * 0.05);
        if (Math.abs(sumWeeklyCH - weeklyRequiredCH) > tolerance) {
            warnings.push(`ERROR: Custom ${type} split sums to ${sumWeeklyCH.toFixed(1)} CH/week but requires ${weeklyRequiredCH.toFixed(1)} CH/week.`);
            return null;
        }

        // Totals: weekly sum × (actualMeetingDays / selectedDaysPerWeek) approximates term scheduled CH.
        const perWeekDayCount = daysOfWeek.length || 1;
        const totalScheduledContactHours = sumWeeklyCH * (actualMeetingDays / perWeekDayCount);

        const info: ScheduleInfo = {
            contactHoursForTerm,
            weeklyContactHours: contactHoursForTerm / weeks,
            totalScheduledContactHours,
            contactHoursPerDay: sumWeeklyCH / perWeekDayCount,
            totalBreakMinutesPerDay: totalBreakMinutesSum / perWeekDayCount,
            actualMeetingDays
        };

        return { blocksPerDay, info };
    }

    // --- Even split path (unchanged math) ---
    const idealContactHoursPerDay = effectiveContactHoursForTerm / actualMeetingDays;

    if (idealContactHoursPerDay < 1.0) {
        warnings.push(`ERROR: Minimum of 1.0 CH/day required. current: ${idealContactHoursPerDay.toFixed(2)}.`);
        return null;
    }

    const finalDailyContactHours = Math.round(idealContactHoursPerDay * 10) / 10;

    if (Math.abs(finalDailyContactHours - idealContactHoursPerDay) > 0.01) {
        warnings.push(`Ideal daily time of ${idealContactHoursPerDay.toFixed(2)} CH for the ${type} was rounded to ${finalDailyContactHours.toFixed(1)} CH/day.`);
    }

    const { blocks: dailyTemplate, totalBreakMinutes: totalBreakMinutesPerDay } = buildBlocksForContactHours(finalDailyContactHours, type);
    const totalScheduledContactHours = finalDailyContactHours * actualMeetingDays;

    const blocksPerDay: Record<string, DailyBlocks> = {};
    for (const day of daysOfWeek) {
        blocksPerDay[day] = dailyTemplate;
    }

    const info: ScheduleInfo = {
        contactHoursForTerm,
        weeklyContactHours: contactHoursForTerm / weeks,
        totalScheduledContactHours,
        contactHoursPerDay: finalDailyContactHours,
        totalBreakMinutesPerDay,
        actualMeetingDays
    };

    return { blocksPerDay, info };
}


export interface GenerateScheduleOverrides {
    lectureTimesPerDay?: Partial<Record<string, string>>;
    labTimesPerDay?: Partial<Record<string, string>>;
    lectureHoursPerDay?: Partial<Record<string, number>>;
    labHoursPerDay?: Partial<Record<string, number>>;
}

export function parseTimeToMinutes(t: string): number {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}

export function formatMinutes(total: number): string {
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// End time = start + clock-minutes(CH). Uses the same formula as the generator.
export function endTimeForContactHours(startTime: string, ch: number): string {
    const start = parseTimeToMinutes(startTime);
    const { totalClockMinutes } = calculateTimeMetrics(ch);
    return formatMinutes(start + totalClockMinutes);
}

// --- MAIN GENERATOR ---
export function generateSchedule(
    request: ScheduleRequest,
    context: RuleAndTermContext,
    startTime: string,
    labStartTime: string | null,
    overrides?: GenerateScheduleOverrides
): GeneratedSchedule {
    const warnings: string[] = [];
    const emptyInfo: ScheduleInfo = { contactHoursForTerm: 0, weeklyContactHours: 0, totalScheduledContactHours: 0, contactHoursPerDay: 0, totalBreakMinutesPerDay: 0, actualMeetingDays: 0 };
    const emptySchedule: GeneratedSchedule = { lectureInfo: emptyInfo, labInfo: emptyInfo, scheduleBlocks: [], warnings };

    if (request.lectureUnits === 0 && request.labUnits === 0) return emptySchedule;

    const lectureResult = calculateDailySchedule(request.lectureUnits, request.lectureDays, 'lecture', request.lecTbaHours || 0, context, warnings, overrides?.lectureHoursPerDay);
    const labResult = calculateDailySchedule(request.labUnits, request.labDays, 'lab', request.labTbaHours || 0, context, warnings, overrides?.labHoursPerDay);

    if (!lectureResult || !labResult) {
        return { ...emptySchedule, lectureInfo: lectureResult?.info || emptyInfo, labInfo: labResult?.info || emptyInfo, warnings };
    }

    const { blocksPerDay: lecBlocksPerDay, info: lectureInfo } = lectureResult;
    const { blocksPerDay: labBlocksPerDay, info: labInfo } = labResult;

    const finalBlocks: ScheduleBlock[] = [];
    const initialLecTime = parseTimeToMinutes(startTime);
    const initialLabTime = labStartTime ? parseTimeToMinutes(labStartTime) : initialLecTime;

    const dailyEndTimes: { [key: string]: number } = {};

    // Process lecture days
    for (const day of request.lectureDays) {
        const dayBlocks = lecBlocksPerDay[day];
        if (!dayBlocks) continue;

        const override = overrides?.lectureTimesPerDay?.[day];
        let currentTime = override ? parseTimeToMinutes(override) : initialLecTime;

        dayBlocks.forEach(block => {
            const endTime = currentTime + block.durationMinutes;
            finalBlocks.push({
                ...block,
                dayOfWeek: day,
                startTime: formatMinutes(currentTime),
                endTime: formatMinutes(endTime),
            });
            currentTime = endTime;
        });
        dailyEndTimes[day] = currentTime;
    }

    // Process lab days
    for (const day of request.labDays) {
        const dayBlocks = labBlocksPerDay[day];
        if (!dayBlocks) continue;

        const override = overrides?.labTimesPerDay?.[day];

        let currentTime: number;
        if (override) {
            currentTime = parseTimeToMinutes(override);
        } else if (labStartTime) {
            currentTime = initialLabTime;
        } else if (dailyEndTimes[day] && request.lectureUnits > 0) {
            currentTime = dailyEndTimes[day] + 10;
        } else {
            currentTime = initialLabTime;
        }

        dayBlocks.forEach(block => {
            const endTime = currentTime + block.durationMinutes;
            finalBlocks.push({
                ...block,
                dayOfWeek: day,
                startTime: formatMinutes(currentTime),
                endTime: formatMinutes(endTime),
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
    isLab: boolean = false,
    tbaHours: number = 0
): string {
    if (!units || !daysCount || !weeks) return '';

    const rate = isLab ? 54 : 18;
    const contactHoursForTerm = units * rate;
    const effectiveContactHoursForTerm = Math.max(0, contactHoursForTerm - tbaHours);

    // Simple meeting day calculation for the summary label
    const actualMeetingDays = weeks * daysCount;
    if (actualMeetingDays === 0 || effectiveContactHoursForTerm === 0) return '';
    const idealContactHoursPerDay = effectiveContactHoursForTerm / actualMeetingDays;
    const finalDailyContactHours = Math.round(idealContactHoursPerDay * 10) / 10;

    const { totalClockMinutes } = calculateTimeMetrics(finalDailyContactHours);

    const [h, m] = startTime.split(':').map(Number);
    const endTotal = h * 60 + m + totalClockMinutes;
    const endH = Math.floor(endTotal / 60); // Allow 24+
    const endM = Math.round(endTotal % 60);
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}
