import fs from 'fs';
import path from 'path';
import { parseAndGroup } from './pipeline';
import { rollGroups, rollTargetsFor, detectSourceTerm, rollToTsv, rollToHtml, ROLL_NOTES_COL } from './roll';
import { COL } from './types';
import { parseAttendanceAccountingRules } from '../utils/ruleParser';
import { academicCalendar } from '../types/calendar';

const rules = parseAttendanceAccountingRules(
    fs.readFileSync(path.join(__dirname, '../data/attendance-method.md'), 'utf8')
);
const term = (id: string) => academicCalendar.find(t => t.id === id)!;

interface R { crn: string; sub: string; num: string; days: string; s: string; e: string; ttl: string; mt: string;
    fac?: string; bldg?: string; rm?: string; sd?: string; ed?: string; lhe?: string; ses?: string }
const tsv = (rows: R[]) => rows.map(r => {
    const c = new Array(26).fill('');
    c[COL.FACULTY] = r.fac ?? ''; c[COL.CRN] = r.crn; c[COL.SUB] = r.sub; c[COL.NUM] = r.num; c[COL.SEC] = '01';
    c[COL.DAYS] = r.days; c[COL.S_TIME] = r.s; c[COL.E_TIME] = r.e; c[COL.SES_NUM] = r.ses ?? '01';
    c[COL.BLDG] = r.bldg ?? ''; c[COL.RM] = r.rm ?? ''; c[COL.S_DATE] = r.sd ?? '6/15/26'; c[COL.E_DATE] = r.ed ?? '8/7/26';
    c[COL.HRS_TTL] = r.ttl; c[COL.LHE] = r.lhe ?? ''; c[COL.MT] = r.mt;
    return c.join('\t');
}).join('\n');

const roll = (rows: R[], from = 'su2026', to = 'su2027') =>
    rollGroups(parseAndGroup(tsv(rows)).groups, term(from), term(to), rules);
const byCrn = (res: ReturnType<typeof roll>, crn: string) => res.outputRows.filter(r => r.sourceCRN === crn);

test('targets are like-to-like, later years only', () => {
    expect(rollTargetsFor(term('su2026'), academicCalendar).map(t => t.id)).toEqual(['su2027', 'su2028']);
    expect(rollTargetsFor(term('fa2026'), academicCalendar).map(t => t.id)).toEqual(['fa2027']);
    expect(rollTargetsFor(term('su2028'), academicCalendar)).toEqual([]);
});

test('source term detected from dates', () => {
    const { groups } = parseAndGroup(tsv([{ crn: '1', sub: 'ENGL', num: '101', days: 'MW', s: '10:00', e: '13:10', ttl: '54.4', mt: 'L' }]));
    expect(detectSourceTerm(groups, academicCalendar)?.id).toBe('su2026');
});

test('combined section re-dated and split, catalogs agree', () => {
    const res = roll([{ crn: '100', sub: 'AERO', num: '120', days: 'MTWRF', s: '08:00', e: '13:35', ttl: '224.2', mt: 'A' }]);
    const rows = byCrn(res, '100');
    expect(rows.map(r => [r.cells[COL.MT], r.cells[COL.S_TIME], r.cells[COL.E_TIME], r.cells[COL.S_DATE], r.cells[COL.E_DATE]])).toEqual([
        ['L', '08:00', '10:10', '6/14/27', '8/6/27'],
        ['B', '10:20', '13:40', '6/14/27', '8/6/27'],
    ]);
    expect(rows[0].flags).toEqual([]);
    expect(rows[0].cells[COL.STATUS]).toBe('Split');
    expect(res.summary.split).toBe(1);
});

test('unit change flagged and recomputed, LHE blanked', () => {
    const res = roll([
        { crn: '200', sub: 'ANDI', num: '115', days: 'MTWR', s: '08:00', e: '09:25', ttl: '54.4', mt: 'L', ses: '01', lhe: '3.2' },
        { crn: '200', sub: 'ANDI', num: '115', days: 'MW', s: '09:35', e: '11:40', ttl: '36.8', mt: 'B', ses: '02', lhe: '1.1' },
    ]);
    const [lec, lab] = byCrn(res, '200');
    expect(lab.cells[COL.E_TIME]).toBe('11:05');
    expect(lab.flags).toContain('UNITS');
    expect(lab.cells[ROLL_NOTES_COL]).toContain('UNITS: Lab units 0.67 → 0.5');
    expect(lab.cells[ROLL_NOTES_COL]).toContain('End 11:40 AM → 11:05 AM');
    expect(lab.cells[COL.LHE]).toBe('');
    expect(lec.cells[COL.E_TIME]).toBe('09:25');
    expect(lec.cells[COL.HRS_TTL]).toBe('52.7'); // Mon 7/5 holiday: 31 meetings
    expect(res.summary.unitsChanged).toBe(1);
});

test('holiday shift flags HOURS; room overlap flags CONFLICT on both', () => {
    const res = roll([
        { crn: '300', sub: 'ENGL', num: '102', days: 'MW', s: '10:00', e: '13:10', ttl: '54.4', mt: 'L', bldg: 'TA', rm: '100' },
        { crn: '200', sub: 'ANDI', num: '115', days: 'MTWR', s: '08:00', e: '09:25', ttl: '54.4', mt: 'L', bldg: 'TA', rm: '100' },
        { crn: '200', sub: 'ANDI', num: '115', days: 'MW', s: '09:35', e: '11:40', ttl: '36.8', mt: 'B', ses: '02', bldg: 'TA', rm: '100' },
    ]);
    const engl = byCrn(res, '300')[0];
    expect(engl.cells[COL.E_TIME]).toBe('13:20');
    expect(engl.flags).toEqual(expect.arrayContaining(['HOURS', 'CONFLICT']));
    expect(engl.cells[ROLL_NOTES_COL]).toContain('CONFLICT: Room overlap with CRN 200');
    const andiLab = byCrn(res, '200')[1];
    expect(andiLab.cells[ROLL_NOTES_COL]).toContain('Room overlap with CRN 300');
    expect(byCrn(res, '200')[0].flags).not.toContain('CONFLICT'); // lecture ends 9:25
    expect(res.summary.hoursChanged).toBe(1);
});

test('instructor overlap across rooms', () => {
    const res = roll([
        { crn: '400', sub: 'ENGL', num: '102', days: 'MW', s: '10:00', e: '13:10', ttl: '54.4', mt: 'L', fac: 'Lee', rm: '1' },
        { crn: '401', sub: 'ENGL', num: '101', days: 'W', s: '12:00', e: '13:00', ttl: '54.4', mt: 'L', fac: 'Lee', rm: '2' },
    ]);
    expect(byCrn(res, '400')[0].cells[ROLL_NOTES_COL]).toContain('Instructor overlap with CRN 401');
});

test('real catalog change: ENGL 101 3 → 4 units', () => {
    const res = roll([{ crn: '310', sub: 'ENGL', num: '101', days: 'MW', s: '10:00', e: '13:10', ttl: '54.4', mt: 'L' }]);
    const [row] = byCrn(res, '310');
    expect(row.cells[ROLL_NOTES_COL]).toBe('UNITS: Lec units 3 → 4; UNITS: End 1:10 PM → 2:30 PM');
});

test('dropped course goes to Can\'t roll', () => {
    const res = roll([{ crn: '500', sub: 'ART', num: '101', days: 'MW', s: '10:00', e: '13:10', ttl: '54.4', mt: 'L' }]);
    expect(byCrn(res, '500')).toEqual([]);
    expect(res.cantRoll[0].reason).toBe('Not in AY26-27 catalog');
    expect(res.cantRoll[0].cells[COL.S_DATE]).toBe('6/15/26'); // source dates untouched
});

test('end time past midnight is an error, old times kept', () => {
    const res = roll([{ crn: '600', sub: 'AERO', num: '121', days: 'MTWRF', s: '20:00', e: '23:55', ttl: '224.2', mt: 'A' }]);
    const [row] = byCrn(res, '600');
    expect(row.status).toBe('error');
    expect(row.cells[COL.STATUS]).toMatch(/crosses midnight/);
    expect([row.cells[COL.S_TIME], row.cells[COL.E_TIME], row.cells[COL.S_DATE]]).toEqual(['20:00', '23:55', '6/14/27']);
});

test('row outside source term is an error; online rows only get dates', () => {
    const res = roll([
        { crn: '700', sub: 'ENGL', num: '101', days: 'MW', s: '10:00', e: '13:10', ttl: '54.4', mt: 'L', sd: '9/1/26', ed: '12/5/26' },
        { crn: '701', sub: 'ENGL', num: '101', days: 'MW', s: '10:00', e: '13:10', ttl: '54.4', mt: 'I' },
    ]);
    expect(byCrn(res, '700')[0].cells[COL.STATUS]).toMatch(/isn't in Summer 2026/);
    const online = byCrn(res, '701')[0];
    expect([online.cells[COL.E_TIME], online.cells[COL.S_DATE], online.cells[COL.STATUS]]).toEqual(['13:10', '6/14/27', 'OK']);
});

test('fall to fall uses a stand-in catalog', () => {
    const res = roll([{ crn: '800', sub: 'ENGL', num: '101', days: 'MW', s: '10:00', e: '11:25', ttl: '54.0', mt: 'L', sd: '8/17/26', ed: '12/5/26' }], 'fa2026', 'fa2027');
    expect(res.targetCatalog).toMatchObject({ ay: '2728', catalogAy: '2627', isFallback: true });
    expect(byCrn(res, '800')[0].cells[COL.S_DATE]).toBe('8/16/27');
});

test('output has 28 columns; html highlights changed cells', () => {
    const res = roll([
        { crn: '200', sub: 'ANDI', num: '115', days: 'MTWR', s: '08:00', e: '09:25', ttl: '54.4', mt: 'L' },
        { crn: '200', sub: 'ANDI', num: '115', days: 'MW', s: '09:35', e: '11:40', ttl: '36.8', mt: 'B', ses: '02' },
    ]);
    expect(rollToTsv(res.outputRows).split('\n').map(l => l.split('\t').length)).toEqual([28, 28]);
    expect(rollToHtml(res.outputRows)).toContain('background-color:#fff2cc');
});
