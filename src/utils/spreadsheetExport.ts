// src/utils/spreadsheetExport.ts
import { SavedSection, AcademicTerm } from '../types';

import { getSessionDates } from './dateUtils';
import { calculateOfficialEndTime } from './scheduleGenerator';

/**
 * Generates a Tab-Separated Values (TSV) string formatted for a specific
 * registrar spreadsheet layout (26 columns, A-Z).
 * 
 * Column Mapping:
 * D (3): sub
 * E (4): #
 * F (5): sec
 * G (6): days
 * H (7): s time
 * I (8): e time
 * N (13): s date
 * O (14): e date
 * P (15): hrs/d
 * Q (16): hrs/wk
 * R (17): hrs/ttl
 * X (23): Type (Lecture/Lab)
 * 
 * All other columns (A-C, J-M, S-W, Y-Z) are padded with empty strings.
 */
export function exportForSpreadsheet(sections: SavedSection[], calendar: AcademicTerm[]): string {
    const rows: string[][] = [];

    sections.forEach(section => {
        const term = calendar.find(t => t.id === section.selectedTermId) || calendar[0];
        const session = term.sessions.find(s => s.id === section.selectedSessionId) || term.sessions[0];
        const { startDate, endDate } = getSessionDates(term, session);

        // Attempt to parse sub/no/sec from the name if it follows the "SUB NO XX" pattern
        const nameParts = section.name.split(' ');
        const sub = nameParts[0] || '';
        const no = nameParts[1] || '';
        const secNo = nameParts[2] || '';

        // 1. Lecture Row
        if (section.lectureUnits > 0) {
            const lecEnd = calculateOfficialEndTime(
                section.lectureUnits,
                section.lectureDays.length,
                section.startTime,
                session.weeks,
                false
            );

            const totalHours = section.lectureUnits * 18;
            const hoursPerWeek = totalHours / session.weeks;
            const hoursPerDay = hoursPerWeek / section.lectureDays.length;

            const row = new Array(26).fill('');
            row[3] = sub;             // D: sub
            row[4] = no;              // E: #
            row[5] = secNo;           // F: sec
            row[6] = section.lectureDays.join(''); // G: days
            row[7] = section.startTime; // H: s time
            row[8] = lecEnd;          // I: e time
            row[13] = startDate;      // N: s date
            row[14] = endDate;        // O: e date
            row[15] = hoursPerDay.toFixed(1); // P: hrs/d
            row[16] = hoursPerWeek.toFixed(1); // Q: hrs/wk
            row[17] = totalHours.toFixed(1); // R: hrs/ttl
            row[23] = 'Lecture';      // X: Type (comments column)

            rows.push(row);
        }

        // 2. Lab Row
        if (section.labUnits > 0) {
            const labStart = section.labStartTime || section.startTime;
            const labEnd = calculateOfficialEndTime(
                section.labUnits,
                section.labDays.length,
                labStart,
                session.weeks,
                true
            );

            const totalHours = section.labUnits * 54;
            const hoursPerWeek = totalHours / session.weeks;
            const hoursPerDay = hoursPerWeek / section.labDays.length;

            const row = new Array(26).fill('');
            row[3] = sub;             // D: sub
            row[4] = no;              // E: #
            row[5] = secNo;           // F: sec
            row[6] = section.labDays.join(''); // G: days
            row[7] = labStart;        // H: s time
            row[8] = labEnd;          // I: e time
            row[13] = startDate;      // N: s date
            row[14] = endDate;        // O: e date
            row[15] = hoursPerDay.toFixed(1); // P: hrs/d
            row[16] = hoursPerWeek.toFixed(1); // Q: hrs/wk
            row[17] = totalHours.toFixed(1); // R: hrs/ttl
            row[23] = 'Lab';          // X: Type (comments column)

            rows.push(row);
        }
    });

    // Join rows with tabs and then with newlines
    return rows.map(r => r.join('\t')).join('\n');
}
