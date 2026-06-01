import { CRNGroup, SectionClassification, COL, DAY_CHAR_TO_FULL, DAY_ORDER,
    SPLIT_TARGET_MT, PASSTHROUGH_MTS } from './types';
import { CatalogMatch, getFixedUnits, getUnitRange } from './catalogLookup';

export function resolveUnits(
    course: CatalogMatch['course'],
    totalHours: number
): { lecUnits: number; labUnits: number } | { error: string } {
    const lecFixed = getFixedUnits(course.lec);
    const labFixed = getFixedUnits(course.lab);

    // Both fixed
    if (lecFixed !== null && labFixed !== null) {
        return { lecUnits: lecFixed, labUnits: labFixed };
    }

    // Both variable
    if (lecFixed === null && labFixed === null) {
        return { error: 'Both lecture and lab have variable units — cannot determine split automatically.' };
    }

    // One fixed, one variable — derive from total hours
    if (lecFixed !== null) {
        const lecHours = lecFixed * 18;
        const remainingHours = totalHours - lecHours;
        if (remainingHours <= 0) {
            return { error: `Total hours (${totalHours}) don't leave room for lab after lecture (${lecHours} hrs).` };
        }
        let labUnits = remainingHours / 54;
        labUnits = Math.round(labUnits * 4) / 4; // nearest 0.25
        const range = getUnitRange(course.lab);
        labUnits = Math.max(range.min, Math.min(range.max, labUnits));
        return { lecUnits: lecFixed, labUnits };
    }

    // labFixed !== null
    const labHours = labFixed! * 54;
    const remainingHours = totalHours - labHours;
    if (remainingHours <= 0) {
        return { error: `Total hours (${totalHours}) don't leave room for lecture after lab (${labHours} hrs).` };
    }
    let lecUnits = remainingHours / 18;
    lecUnits = Math.round(lecUnits * 4) / 4;
    const range = getUnitRange(course.lec);
    lecUnits = Math.max(range.min, Math.min(range.max, lecUnits));
    return { lecUnits, labUnits: labFixed! };
}

function parseDaysFromRow(daysStr: string): string[] {
    const days: string[] = [];
    for (const ch of daysStr) {
        const full = DAY_CHAR_TO_FULL[ch];
        if (full && !days.includes(full)) days.push(full);
    }
    return days.sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
}

function hasBothLAndB(group: CRNGroup): boolean {
    const mts = new Set(group.rows.map(r => r.cells[COL.MT].trim().toUpperCase()));
    return mts.has('L') && mts.has('B');
}

function hasMixedMT(group: CRNGroup): boolean {
    const mts = new Set(group.rows.map(r => r.cells[COL.MT].trim().toUpperCase()));
    return mts.size > 1;
}

function isPassthroughMT(mt: string): boolean {
    return PASSTHROUGH_MTS.includes(mt as any);
}

function allRowsArePassthrough(group: CRNGroup): boolean {
    return group.rows.every(r => isPassthroughMT(r.cells[COL.MT].trim().toUpperCase()));
}

function hasTBADays(group: CRNGroup): boolean {
    return group.rows.some(r => {
        const d = r.cells[COL.DAYS].trim();
        return !d || d.toUpperCase() === 'TBA';
    });
}

function sumHrsTotal(group: CRNGroup): number {
    return group.rows.reduce((sum, r) => {
        const val = parseFloat(r.cells[COL.HRS_TTL]);
        return sum + (isNaN(val) ? 0 : val);
    }, 0);
}

function collectAllDays(group: CRNGroup): string[] {
    const daySet = new Set<string>();
    for (const row of group.rows) {
        for (const d of parseDaysFromRow(row.cells[COL.DAYS])) {
            daySet.add(d);
        }
    }
    return DAY_ORDER.filter(d => daySet.has(d));
}

function getCommonStartTime(group: CRNGroup): string {
    for (const row of group.rows) {
        const t = row.cells[COL.S_TIME].trim();
        if (t) return t;
    }
    return '';
}

export function classifyCRNGroup(
    group: CRNGroup,
    catalogMatch: CatalogMatch | null,
    weeks: number
): SectionClassification {
    // TBA check first
    if (hasTBADays(group)) {
        return { type: 'tba' };
    }

    // Not in catalog
    if (!catalogMatch) {
        return { type: 'error', message: `Course ${group.sub} ${group.num} not found in catalog.` };
    }

    const course = catalogMatch.course;
    const lecRange = getUnitRange(course.lec);
    const labRange = getUnitRange(course.lab);
    const hasLec = lecRange.max > 0;
    const hasLab = labRange.max > 0;

    // Lecture-only or lab-only in catalog
    if (!hasLec || !hasLab) {
        return { type: 'pass-through', reason: hasLec ? 'lecture-only course' : 'lab-only course' };
    }

    // All rows are passthrough MT codes (G, Y, I, C, O, W)
    if (allRowsArePassthrough(group)) {
        return { type: 'pass-through', reason: 'all meeting types are passthrough' };
    }

    // Mixed MT pre-filter: different mt codes across rows → already worked on
    // Exception: L+B is "already split", not "mixed"
    if (hasMixedMT(group)) {
        if (hasBothLAndB(group)) {
            // Check if hours match — if so, properly split already
            const totalHours = sumHrsTotal(group);
            const resolved = resolveUnits(course, totalHours);
            if ('error' in resolved) {
                return { type: 'error', message: resolved.error };
            }
            const expected = resolved.lecUnits * 18 + resolved.labUnits * 54;
            const tolerance = weeks > 0 ? (expected / weeks) * 1.2 : expected * 0.1;
            if (Math.abs(totalHours - expected) <= tolerance) {
                return { type: 'already-split' };
            }
            return { type: 'error', message: `Already has L+B rows but total hours (${totalHours.toFixed(1)}) don't match expected (${expected.toFixed(1)}).` };
        }
        // Truly mixed (e.g., A+I) → skip
        return { type: 'pass-through', reason: 'mixed meeting types — already partially split' };
    }

    // From here, all rows have the same MT code
    const mt = group.rows[0].cells[COL.MT].trim().toUpperCase();

    // All passthrough
    if (isPassthroughMT(mt)) {
        return { type: 'pass-through', reason: `meeting type ${mt}` };
    }

    // Resolve units and check hours
    const totalHours = sumHrsTotal(group);
    const resolved = resolveUnits(course, totalHours);
    if ('error' in resolved) {
        return { type: 'error', message: resolved.error };
    }

    const { lecUnits, labUnits } = resolved;
    const expected = lecUnits * 18 + labUnits * 54;
    const tolerance = weeks > 0 ? (expected / weeks) * 1.2 : expected * 0.1;

    // mt=A → split target
    if (mt === SPLIT_TARGET_MT) {
        if (Math.abs(totalHours - expected) <= tolerance) {
            return {
                type: 'split',
                lecUnits,
                labUnits,
                weeks,
                startTime: getCommonStartTime(group),
                days: collectAllDays(group)
            };
        }
        return { type: 'error', message: `mt=A but total hours (${totalHours.toFixed(1)}) don't match expected (${expected.toFixed(1)}). Tolerance: ±${tolerance.toFixed(1)}.` };
    }

    // mt=L or mt=B only (no counterpart) — false acceptable check
    if (mt === 'L' || mt === 'B') {
        if (Math.abs(totalHours - expected) <= tolerance) {
            return {
                type: 'split',
                lecUnits,
                labUnits,
                weeks,
                startTime: getCommonStartTime(group),
                days: collectAllDays(group)
            };
        }
        // Hours only cover one component — it's genuinely just that component
        const singleExpected = mt === 'L' ? lecUnits * 18 : labUnits * 54;
        if (Math.abs(totalHours - singleExpected) <= tolerance) {
            return { type: 'pass-through', reason: `hours match ${mt === 'L' ? 'lecture' : 'lab'}-only portion` };
        }
        return { type: 'error', message: `mt=${mt} with hours (${totalHours.toFixed(1)}) — doesn't match combined (${expected.toFixed(1)}) or single-component (${singleExpected.toFixed(1)}).` };
    }

    return { type: 'pass-through', reason: `unhandled meeting type ${mt}` };
}
