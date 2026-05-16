// src/utils/smartSplit.ts

import { calculateTimeMetrics } from './scheduleGenerator';

export interface SmartSplitAllocation {
    day: string;
    lectureCH: number;
    labCH: number;
    clockMinutes: number;
}

export interface SmartSplitResult {
    allocations: SmartSplitAllocation[];
    lectureHoursPerDay: Record<string, number>;
    labHoursPerDay: Record<string, number>;
    lectureDays: string[];
    labDays: string[];
}

export interface SmartSplitError {
    error: string;
}

function roundCH(v: number): number {
    return Math.round(v * 10) / 10;
}

function clockMinutesForDay(lecCH: number, labCH: number): number {
    let total = 0;
    if (lecCH > 0) total += calculateTimeMetrics(lecCH).totalClockMinutes;
    if (labCH > 0) total += calculateTimeMetrics(labCH).totalClockMinutes;
    if (lecCH > 0 && labCH > 0) total += 10; // inter-component break
    return total;
}

function tryShift(
    allocations: SmartSplitAllocation[],
    maxIdx: number,
    minIdx: number,
    component: 'lecture' | 'lab'
): boolean {
    const field = component === 'lecture' ? 'lectureCH' : 'labCH';
    if (allocations[maxIdx][field] <= 0 || allocations[minIdx][field] <= 0) return false;
    if (allocations[maxIdx][field] <= 1.0) return false;

    const currentSpread = allocations[maxIdx].clockMinutes - allocations[minIdx].clockMinutes;
    const savedMax = allocations[maxIdx][field];
    const savedMin = allocations[minIdx][field];

    allocations[maxIdx][field] = roundCH(savedMax - 0.1);
    allocations[minIdx][field] = roundCH(savedMin + 0.1);
    allocations[maxIdx].clockMinutes = clockMinutesForDay(allocations[maxIdx].lectureCH, allocations[maxIdx].labCH);
    allocations[minIdx].clockMinutes = clockMinutesForDay(allocations[minIdx].lectureCH, allocations[minIdx].labCH);

    let newMax = 0, newMin = Infinity;
    for (const a of allocations) {
        if (a.clockMinutes > newMax) newMax = a.clockMinutes;
        if (a.clockMinutes < newMin) newMin = a.clockMinutes;
    }
    if (newMax - newMin >= currentSpread) {
        allocations[maxIdx][field] = savedMax;
        allocations[minIdx][field] = savedMin;
        allocations[maxIdx].clockMinutes = clockMinutesForDay(allocations[maxIdx].lectureCH, allocations[maxIdx].labCH);
        allocations[minIdx].clockMinutes = clockMinutesForDay(allocations[minIdx].lectureCH, allocations[minIdx].labCH);
        return false;
    }
    return true;
}

function balanceByClockMinutes(allocations: SmartSplitAllocation[]): void {
    if (allocations.length < 2) return;

    for (let iter = 0; iter < 200; iter++) {
        let maxIdx = 0, minIdx = 0;
        for (let i = 1; i < allocations.length; i++) {
            if (allocations[i].clockMinutes > allocations[maxIdx].clockMinutes) maxIdx = i;
            if (allocations[i].clockMinutes < allocations[minIdx].clockMinutes) minIdx = i;
        }
        if (maxIdx === minIdx) break;

        const spread = allocations[maxIdx].clockMinutes - allocations[minIdx].clockMinutes;
        if (spread <= 5) break;

        if (!tryShift(allocations, maxIdx, minIdx, 'lecture') &&
            !tryShift(allocations, maxIdx, minIdx, 'lab')) {
            break;
        }
    }
}

export function computeSmartSplit(
    lectureUnits: number,
    labUnits: number,
    days: string[],
    weeks: number
): SmartSplitResult | SmartSplitError {
    if (days.length === 0) return { error: 'Select meeting days to generate a Smart Split schedule.' };
    if (lectureUnits <= 0 || labUnits <= 0) return { error: 'Smart Split requires both lecture and lab units greater than zero.' };
    if (weeks <= 0) return { error: 'Invalid term length.' };

    const lecWeeklyCH = lectureUnits * 18 / weeks;
    const labWeeklyCH = labUnits * 54 / weeks;
    const numDays = days.length;

    // Happy path: both components on all days with identical per-day CH
    const evenLec = roundCH(lecWeeklyCH / numDays);
    const evenLab = roundCH(labWeeklyCH / numDays);

    if (evenLec >= 1.0 && evenLab >= 1.0) {
        const allocations: SmartSplitAllocation[] = days.map(day => ({
            day,
            lectureCH: evenLec,
            labCH: evenLab,
            clockMinutes: clockMinutesForDay(evenLec, evenLab)
        }));

        const lectureHoursPerDay: Record<string, number> = {};
        const labHoursPerDay: Record<string, number> = {};
        for (const day of days) {
            lectureHoursPerDay[day] = evenLec;
            labHoursPerDay[day] = evenLab;
        }
        return { allocations, lectureHoursPerDay, labHoursPerDay, lectureDays: [...days], labDays: [...days] };
    }

    // Fallback: determine how many days each component needs (1.0 CH minimum per meeting)
    const numLecDays = Math.min(numDays, Math.floor(lecWeeklyCH / 1.0));
    const numLabDays = Math.min(numDays, Math.floor(labWeeklyCH / 1.0));

    if (numLecDays === 0 || numLabDays === 0) {
        const shortComponent = numLecDays === 0 ? 'lecture' : 'lab';
        const shortCH = numLecDays === 0 ? lecWeeklyCH : labWeeklyCH;
        return {
            error: `Weekly ${shortComponent} is only ${shortCH.toFixed(1)} CH — not enough for even one meeting (1.0 CH minimum). Try a shorter session or more units.`
        };
    }

    // Lecture on first N days, lab on last M days (overlap in the middle)
    const lecDayIndices = Array.from({ length: numLecDays }, (_, i) => i);
    const labDayIndices = Array.from({ length: numLabDays }, (_, i) => numDays - 1 - i).reverse();

    // Distribute each component evenly across its assigned days
    const baseLecPerDay = roundCH(lecWeeklyCH / numLecDays);
    const baseLabPerDay = roundCH(labWeeklyCH / numLabDays);

    const allocations: SmartSplitAllocation[] = [];
    let assignedLec = 0;
    let assignedLab = 0;

    for (let i = 0; i < numDays; i++) {
        const hasLec = lecDayIndices.includes(i);
        const hasLab = labDayIndices.includes(i);
        const isLastLec = hasLec && i === lecDayIndices[lecDayIndices.length - 1];
        const isLastLab = hasLab && i === labDayIndices[labDayIndices.length - 1];

        let dayLec = 0;
        let dayLab = 0;

        if (hasLec) {
            dayLec = isLastLec ? roundCH(lecWeeklyCH - assignedLec) : baseLecPerDay;
            assignedLec += dayLec;
        }
        if (hasLab) {
            dayLab = isLastLab ? roundCH(labWeeklyCH - assignedLab) : baseLabPerDay;
            assignedLab += dayLab;
        }

        allocations.push({
            day: days[i],
            lectureCH: dayLec,
            labCH: dayLab,
            clockMinutes: clockMinutesForDay(dayLec, dayLab)
        });
    }

    // Phase 2: rebalance lecture to equalize clock minutes across days
    balanceByClockMinutes(allocations);

    // Validate 1.0 CH minimum per block
    for (const alloc of allocations) {
        if (alloc.lectureCH > 0 && alloc.lectureCH < 1.0) {
            return {
                error: `Can't split across ${numDays} day${numDays !== 1 ? 's' : ''} — lecture on ${alloc.day} would be ${alloc.lectureCH.toFixed(1)} CH, below the 1.0 CH minimum per meeting. Try fewer days.`
            };
        }
        if (alloc.labCH > 0 && alloc.labCH < 1.0) {
            return {
                error: `Can't split across ${numDays} day${numDays !== 1 ? 's' : ''} — lab on ${alloc.day} would be ${alloc.labCH.toFixed(1)} CH, below the 1.0 CH minimum per meeting. Try fewer days.`
            };
        }
    }

    const lectureHoursPerDay: Record<string, number> = {};
    const labHoursPerDay: Record<string, number> = {};
    const lectureDays: string[] = [];
    const labDays: string[] = [];

    for (const alloc of allocations) {
        if (alloc.lectureCH > 0) {
            lectureHoursPerDay[alloc.day] = alloc.lectureCH;
            lectureDays.push(alloc.day);
        }
        if (alloc.labCH > 0) {
            labHoursPerDay[alloc.day] = alloc.labCH;
            labDays.push(alloc.day);
        }
    }

    return { allocations, lectureHoursPerDay, labHoursPerDay, lectureDays, labDays };
}
