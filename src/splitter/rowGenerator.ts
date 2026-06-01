import { CRNGroup, SectionClassification, OutputRow, SplitterStatus, COL,
    DAY_FULL_TO_CHAR, DAY_CHAR_TO_FULL, DAY_ORDER, OUTPUT_COL_COUNT } from './types';
import { computeSmartSplit } from '../utils/smartSplit';
import { calculateOfficialEndTime } from '../utils/scheduleGenerator';

export function daysToCharCodes(days: string[]): string {
    return DAY_ORDER
        .filter(d => days.includes(d))
        .map(d => DAY_FULL_TO_CHAR[d] || '')
        .join('');
}

export function charCodesToDays(codes: string): string[] {
    const days: string[] = [];
    for (const ch of codes) {
        const full = DAY_CHAR_TO_FULL[ch];
        if (full && !days.includes(full)) days.push(full);
    }
    return days.sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
}

export function calculateHoursFields(
    units: number,
    isLab: boolean,
    daysCount: number,
    weeks: number
): { hrsPerDay: string; hrsPerWeek: string; hrsTotal: string } {
    const rate = isLab ? 54 : 18;
    const totalHours = units * rate;
    const hrsPerWeek = weeks > 0 ? totalHours / weeks : 0;
    const hrsPerDay = daysCount > 0 ? hrsPerWeek / daysCount : 0;

    return {
        hrsPerDay: hrsPerDay > 0 ? hrsPerDay.toFixed(1) : '',
        hrsPerWeek: hrsPerWeek > 0 ? hrsPerWeek.toFixed(1) : '',
        hrsTotal: totalHours.toFixed(1)
    };
}

function detectSesFormat(group: CRNGroup): (n: number) => string {
    const sample = group.rows[0]?.cells[COL.SES_NUM]?.trim() || '1';
    if (sample.match(/^0\d+$/)) {
        const width = sample.length;
        return (n: number) => String(n).padStart(width, '0');
    }
    return (n: number) => String(n);
}

function makeOutputRow(
    cells: string[],
    status: SplitterStatus,
    statusDetail: string,
    sourceCRN: string,
    originalRowIndex: number
): OutputRow {
    const out = [...cells];
    while (out.length < OUTPUT_COL_COUNT - 1) out.push('');
    const statusText = status === 'error' ? `Error: ${statusDetail}` :
        status === 'split' ? 'Split' :
            status === 'already-split' ? 'OK' :
                status === 'tba' ? 'TBA' : 'OK';
    out.push(statusText);
    return { cells: out, status, statusDetail, sourceCRN, originalRowIndex };
}

export function generateOutputRows(
    group: CRNGroup,
    classification: SectionClassification
): OutputRow[] {
    const firstRowIdx = group.rows[0]?.rowIndex ?? 0;

    if (classification.type !== 'split') {
        const status: SplitterStatus = classification.type === 'error' ? 'error' :
            classification.type === 'tba' ? 'tba' :
                classification.type === 'already-split' ? 'already-split' : 'pass-through';
        const detail = classification.type === 'error' ? classification.message :
            classification.type === 'pass-through' ? classification.reason : '';

        return group.rows.map(row =>
            makeOutputRow(row.cells, status, detail, group.crn, row.rowIndex)
        );
    }

    // Split target
    const { lecUnits, labUnits, weeks, startTime, days } = classification;
    const result = computeSmartSplit(lecUnits, labUnits, days, weeks);

    if ('error' in result) {
        return group.rows.map(row =>
            makeOutputRow(row.cells, 'error', result.error, group.crn, row.rowIndex)
        );
    }

    const templateRow = group.rows[0].cells;
    const formatSes = detectSesFormat(group);
    const outputRows: OutputRow[] = [];
    let sesCounter = 1;

    // Lecture row
    if (lecUnits > 0 && result.lectureDays.length > 0) {
        const lecDaysStr = daysToCharCodes(result.lectureDays);
        const lecEnd = calculateOfficialEndTime(lecUnits, result.lectureDays.length, startTime, weeks, false);
        const lecHours = calculateHoursFields(lecUnits, false, result.lectureDays.length, weeks);

        const lecCells = [...templateRow];
        lecCells[COL.DAYS] = lecDaysStr;
        lecCells[COL.S_TIME] = startTime;
        lecCells[COL.E_TIME] = lecEnd;
        lecCells[COL.SES_NUM] = formatSes(sesCounter++);
        lecCells[COL.HRS_D] = lecHours.hrsPerDay;
        lecCells[COL.HRS_WK] = lecHours.hrsPerWeek;
        lecCells[COL.HRS_TTL] = lecHours.hrsTotal;
        lecCells[COL.LHE] = '';
        lecCells[COL.MT] = 'L';

        outputRows.push(makeOutputRow(lecCells, 'split', 'lecture', group.crn, firstRowIdx));
    }

    // Lab row — starts after lecture ends + 10 min passing time
    if (labUnits > 0 && result.labDays.length > 0) {
        const labDaysStr = daysToCharCodes(result.labDays);

        let labStart = startTime;
        if (lecUnits > 0 && result.lectureDays.length > 0) {
            const lecEnd = calculateOfficialEndTime(lecUnits, result.lectureDays.length, startTime, weeks, false);
            const [eh, em] = lecEnd.split(':').map(Number);
            const labStartMin = eh * 60 + em + 10;
            labStart = `${String(Math.floor(labStartMin / 60)).padStart(2, '0')}:${String(labStartMin % 60).padStart(2, '0')}`;
        }

        const labEnd = calculateOfficialEndTime(labUnits, result.labDays.length, labStart, weeks, true);
        const labHours = calculateHoursFields(labUnits, true, result.labDays.length, weeks);

        const labCells = [...templateRow];
        labCells[COL.DAYS] = labDaysStr;
        labCells[COL.S_TIME] = labStart;
        labCells[COL.E_TIME] = labEnd;
        labCells[COL.SES_NUM] = formatSes(sesCounter++);
        labCells[COL.HRS_D] = labHours.hrsPerDay;
        labCells[COL.HRS_WK] = labHours.hrsPerWeek;
        labCells[COL.HRS_TTL] = labHours.hrsTotal;
        labCells[COL.LHE] = '';
        labCells[COL.MT] = 'B';

        outputRows.push(makeOutputRow(labCells, 'split', 'lab', group.crn, firstRowIdx));
    }

    return outputRows;
}

export function generateCrosslistSiblingRows(
    primaryRows: OutputRow[],
    siblingGroup: CRNGroup
): OutputRow[] {
    return primaryRows.map(primaryRow => {
        const cells = [...primaryRow.cells];
        // Replace CRN-specific fields with sibling's values
        const sibRow = siblingGroup.rows[0]?.cells;
        if (sibRow) {
            cells[COL.ID] = sibRow[COL.ID];
            cells[COL.CRN] = sibRow[COL.CRN];
            cells[COL.SUB] = sibRow[COL.SUB];
            cells[COL.NUM] = sibRow[COL.NUM];
            cells[COL.SEC] = sibRow[COL.SEC];
            cells[COL.FACULTY] = sibRow[COL.FACULTY];
            cells[COL.MAX] = sibRow[COL.MAX];
            cells[COL.WAIT] = sibRow[COL.WAIT];
        }
        return {
            ...primaryRow,
            cells,
            sourceCRN: siblingGroup.crn,
            originalRowIndex: siblingGroup.rows[0]?.rowIndex ?? primaryRow.originalRowIndex
        };
    });
}
