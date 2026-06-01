# Schedule Splitter — Implementation Spec

## Context

The app schedules college courses with separate lecture and lab components. Currently, many courses in the registrar's database are scheduled as combined lecture+lab in a single meeting pattern. The Schedule Splitter lets users paste a registrar spreadsheet (TSV), automatically splits combined courses into proper lecture and lab components using the existing smart split algorithm, and outputs the result in the same spreadsheet format.

This is a new tab alongside the existing Scheduler, with a three-stage pipeline: Paste → Review → Results.

---

## Column Map (A–Z input, +AA output)

| Col | Idx | Field | Notes |
|-----|-----|-------|-------|
| A | 0 | id | |
| B | 1 | faculty | |
| C | 2 | crn | Primary grouping key |
| D | 3 | sub | Subject code |
| E | 4 | # | Course number |
| F | 5 | sec | Section number |
| G | 6 | days | Single-char: M=Mon T=Tue W=Wed R=Thu F=Fri S=Sat U=Sun |
| H | 7 | s time | Start time (may be 12h or 24h) |
| I | 8 | e time | End time (may be 12h or 24h) |
| J | 9 | ses # | Meeting pattern number |
| K | 10 | x | Crosslist group code |
| L | 11 | bldg | Building |
| M | 12 | rm | Room |
| N | 13 | s date | Session start date (MM/DD/YY or YYYY-MM-DD) |
| O | 14 | e date | Session end date (MM/DD/YY or YYYY-MM-DD) |
| P | 15 | hrs/d | Hours per day |
| Q | 16 | hrs/wk | Hours per week |
| R | 17 | hrs/ttl | Total hours |
| S | 18 | LHE | Faculty workload (blanked on split) |
| T | 19 | max | Enrollment cap |
| U | 20 | wait | Waitlist |
| V | 21 | ma | |
| W | 22 | mt | Meeting type code (A/L/B/G/Y/I/C/O/W) |
| X | 23 | comments | Notes for students |
| Y | 24 | ZTC/OER | Formula-based, won't round-trip |
| Z | 25 | initiatives | Formula-based, won't round-trip |
| AA | 26 | status | Output only: Split / OK / TBA / Error: [reason] |

## MT Code Actions

| Code | Meaning | Action |
|------|---------|--------|
| A | Lecture/Lab combined | **Split target** |
| L | Lecture | Check for "false acceptable" |
| B | Lab | Check for "false acceptable" |
| G | Clinical (lab) | Pass through OK |
| Y | Intercollegiate (lab) | Pass through OK |
| I | Online | Pass through OK |
| C/O/W | Tutor/Independent study/Work exp | Pass through OK |

---

## Processing Rules

### CRN Grouping
- Group all rows by CRN (col C, idx 2)
- Same CRN + different ses # = multiple meeting patterns for one section

### Mixed-MT Pre-filter
- Before classification, check if a CRN group has rows with **different** mt codes (e.g., mt=A on one row and mt=I on another)
- If mixed → skip the entire CRN, status OK (it's already been partially split by someone)
- This check happens BEFORE the main classification logic

### Catalog Lookup
- Catalog is nested: division → department → subject → courses[]
- Need flat index: build `Map<"SUB|NUM", Course>` at startup by iterating all levels
- Course not in catalog → Error
- Catalog selection: plurality of section start dates mapped to terms → pick `courses_2526` or `courses_2627` per existing `useCatalog` logic

### Variable Units
- Some courses: `lec: { min: 1, max: 8 }` (range instead of fixed number)
- If one component is fixed, derive the other: `variableUnits = (totalHours - fixedHours) / rate`
- Clamp to [min, max], round to nearest 0.25
- Both variable → Error (can't determine split)

### Classification (per CRN group)
For courses with BOTH lec > 0 AND lab > 0 in catalog:
1. Sum `hrs/ttl` across all rows for that CRN
2. Expected = `(lecUnits × 18) + (labUnits × 54)`
3. Tolerance = `(expected / weeks) × 1.2`
4. **Already split**: separate L and B rows on different days, total within tolerance → OK
5. **Split target**: mt=A with total within tolerance → Split
6. **False acceptable**: mt=L or mt=B only, but total ≈ expected combined total → Split (mt code is stale)
7. **Hours mismatch**: total outside tolerance → Error

Lecture-only or lab-only in catalog → OK
TBA/blank days → TBA status

### Multi-Row Split Targets
When a CRN classified as "split" has multiple rows (multiple mt=A rows, or multiple false-acceptable L rows):
- **Merge all days** from all rows in the group into a single deduplicated day set
- **Use the common start time** from the rows (they should share a start time)
- Run **one** `computeSmartSplit()` with the merged days
- The output lecture + lab rows replace ALL original rows for that CRN

### Crosslist Handling
- Group CRNs by shared crosslist code (col K)
- Crosslisted sections are different courses (leveled courses sharing time/faculty/room)
- Validate all siblings have: same faculty, same room, **same unit breakdown** (lec + lab units match across the group)
- If units mismatch → crosslist Error ("crosslist courses don't match units")
- If faculty/room mismatch → crosslist Error
- Process primary CRN, copy split result to siblings (replacing CRN/sec/id fields)

### Smart Split Execution
- Call existing `computeSmartSplit(lecUnits, labUnits, days, weeks)` from `src/utils/smartSplit.ts`
- Days come from original row(s) — same days preserved
- Smart split error (can't fit on those days) → Error status, continue processing others

### Output Row Generation (split rows)
- **Lecture row**: mt=L, days from smartSplit.lectureDays, start time preserved, end time recalculated, hrs recalculated
- **Lab row**: mt=B, days from smartSplit.labDays, lab start time = lecture end + 10 min passing time, end time recalculated, hrs recalculated
- **Sequential scheduling**: the lecture row keeps the original start time. The lab row starts after the lecture ends + 10-minute passing time (inter-component break). This mirrors the existing `clockMinutesForDay` logic in `smartSplit.ts`. Lecture and lab must never overlap — students cannot be in both simultaneously.
- **LHE**: blanked on both rows
- **ses #**: renumbered from 1 (lecture first, then lab)
- **All other fields**: copied from first row of the original CRN group
- **End time**: calculated via `calculateOfficialEndTime(units, daysCount, startTime, weeks, isLab)` — uses even per-day distribution. Smart split's rebalancing keeps per-day spread within ~5 min, so this is a close approximation.
- **hrs/d, hrs/wk, hrs/ttl**: recalculated from units using even formula (same as existing spreadsheet export)

### Output Row Ordering
- Maintain original paste order
- Split rows expand in-place: the original combined row(s) for a CRN are replaced at their position by the new lecture + lab rows
- Pass-through and error rows stay at their original positions

### Term/Session Matching
- Import rows have s date / e date
- Match against `academic-calendar.json` terms+sessions using `getSessionDates()` to find best fit
- Get `weeks` from matched session

---

## Input Parsing Details

### Header Row Detection
- `parseTsv` checks the first row: if the CRN column (idx 2) is non-numeric or matches known header labels (e.g., "crn", "CRN"), skip it as a header row

### Time Format Normalization
- Input may be 24-hour ("08:00", "13:30") or 12-hour ("8:00 AM", "1:30 PM", "8:00a", "1:30p")
- `parseTime(raw: string): string` normalizes to "HH:MM" 24-hour format
- Edge cases: 12:00 AM → 00:00, 12:00 PM → 12:00, 12:30 PM → 12:30
- Output times are always 24-hour HH:MM

### Date Format Normalization
- Input may be MM/DD/YY (American, 2-digit year) or YYYY-MM-DD (ISO)
- `parseFlexDate(raw: string): Date | null` handles both
- 2-digit years: interpret as 2000+YY (e.g., "26" → 2026)
- Returns null if unparseable

### Whitespace Handling
- Trim leading/trailing whitespace from each cell value
- Skip fully empty lines

---

## New Files

All splitter code in `src/splitter/` directory.

### `src/splitter/types.ts`
Constants and type definitions:
- `COL` — column index constants (0–26)
- `DAY_CHAR_TO_FULL` / `DAY_FULL_TO_CHAR` — day code mappings
- `SpreadsheetRow` — `{ cells: string[26], rowIndex: number }`
- `CRNGroup` — `{ crn, rows, sub, num, xlistCode }`
- `SectionClassification` — discriminated union: `split | already-split | pass-through | tba | error`
- `OutputRow` — `{ cells: string[27], status, sourceCRN }`
- `SplitterStage` — `'paste' | 'review' | 'results'`
- `ReviewSummary` — counts + error details + classifications map + groups
- `SplitterResults` — outputRows[] + summary counts

### `src/splitter/parseTsv.ts`
```
parseTsv(raw: string): { rows: SpreadsheetRow[]; warnings: string[] }
parseTime(raw: string): string          // "8:00 AM" → "08:00"
parseFlexDate(raw: string): Date | null // "06/15/26" → Date
```
- Split on `\n`, handle `\r\n`
- Detect and skip header row (non-numeric CRN field)
- Trim whitespace from cells
- Skip empty lines
- Pad short rows / truncate long rows to 26 cols
- Normalize time fields (cols 7, 8) to 24-hour HH:MM
- Warn on malformed rows

### `src/splitter/catalogLookup.ts`
```
buildCatalogIndex(catalog: CatalogHierarchy): Map<string, CatalogMatch>
lookupCourse(index, sub, num): CatalogMatch | null
```
- `CatalogMatch = { course: Course, division: string, department: string }`
- Flat index keyed by `"SUB|NUM"` (uppercase)
- Iterates all divisions → departments → subjects → courses

### `src/splitter/termMatcher.ts`
```
determineCatalogYear(startDates: string[], calendar: AcademicTerm[]): 'courses_2526' | 'courses_2627'
matchTermSession(sDate, eDate, calendar): { term, session, weeks } | null
```
- `determineCatalogYear`: count which term each start date falls into, majority wins → pick catalog per useCatalog logic (su2026 → 2526, terms with 2025 → 2526, else → 2627)
- `matchTermSession`: compute session date ranges via `getSessionDates()`, find smallest absolute date-range difference

### `src/splitter/classifier.ts`
```
resolveUnits(course, totalHours): { lecUnits, labUnits } | { error }
classifyCRNGroup(group, catalogMatch, weeks): SectionClassification
```
- Mixed-MT pre-filter: different mt codes across rows → `{ type: 'pass-through', reason: 'mixed mt codes' }`
- Implements the full classification logic described above
- Handles variable units, tolerance check, false acceptable detection, already-split detection

### `src/splitter/crosslistValidator.ts`
```
validateCrosslists(groups: CRNGroup[], catalogIndex): CrosslistError[]
buildCrosslistMap(groups: CRNGroup[]): Map<string, string>  // xlistCode → primary CRN
```
- Validates: same faculty, same room, same unit breakdown across crosslist group
- Unit mismatch → CrosslistError with "crosslist courses don't match units"
- Faculty/room mismatch → CrosslistError

### `src/splitter/rowGenerator.ts`
```
generateOutputRows(group, classification): OutputRow[]
calculateHoursFields(units, isLab, daysCount, weeks): { hrsPerDay, hrsPerWeek, hrsTotal }
daysToCharCodes(days: string[]): string
charCodesToDays(codes: string): string[]
renumberSessionNumbers(rows: OutputRow[]): void
```
- For split targets: merges all days from all rows in the group, runs one `computeSmartSplit()`, generates lecture + lab output rows
- Uses `calculateOfficialEndTime()` from `src/utils/scheduleGenerator.ts` for end time
- Preserves ses # format (zero-padding) from input
- Copies fields from first row of group for non-scheduling fields

### `src/splitter/pipeline.ts`
Orchestrator tying all stages together:
```
parseAndGroup(raw: string): { groups: CRNGroup[]; parseWarnings: string[] }
classifyGroups(groups: CRNGroup[]): ReviewSummary
processGroups(groups: CRNGroup[], summary: ReviewSummary): SplitterResults
outputToTsv(results: SplitterResults): string
```
- Imports catalog data and academic calendar directly
- Each function corresponds to a stage transition in the UI

### `src/splitter/SplitterView.tsx`
Main container component managing the three-stage state machine:
- Has its own header matching DashboardHeader layout: `[Logo] [Schedule Splitter] [Scheduler | Splitter tabs]`
- Tab switcher is in the same position as in DashboardHeader for consistent navigation
- State: `stage`, `rawInput`, `groups`, `reviewSummary`, `results`, `parseWarnings`
- Stage transitions: paste →[Parse]→ review →[Process]→ results, any →[Reset]→ paste
- Catches errors, shows toast on failure

### `src/splitter/PasteStage.tsx`
- Large textarea for TSV paste
- Info note: "Columns Y and Z (formula-based) will not round-trip cleanly"
- Row count indicator
- "Parse" button (disabled when empty)

### `src/splitter/ReviewStage.tsx`
- Summary bar with color-coded counts: "Found N sections — X to split, Y already split, Z pass-through, W TBA, E errors"
- Error section (expandable) with CRN + reason
- Expandable section list for spot-checking
- "Back" and "Process" buttons

### `src/splitter/ResultsStage.tsx`
- Summary of what was processed
- Scrollable table with key columns visible + color-coded status badges
- "Start Over" and "Copy to Spreadsheet" buttons
- Uses `copyToClipboard()` from `src/utils/copyUtils.ts`

### `src/splitter/SplitterView.css`
- Uses existing CSS variable system (`--bg-card`, `--text-main`, `--primary`, `--border-color`, etc.)
- Matches existing app styling (header height, border patterns, button styles)
- Status badge colors: split=primary, OK=green, TBA=yellow, error=red

---

## Modified Files

### `src/components/layout/AppViewProps.ts` (~2 lines)
Add to interface:
```typescript
appMode: 'scheduler' | 'splitter';
setAppMode: (mode: 'scheduler' | 'splitter') => void;
```

### `src/App.tsx` (~15 lines)
- Import `SplitterView`
- Add state: `const [appMode, setAppMode] = useState<'scheduler' | 'splitter'>('scheduler')`
- Add `appMode` + `setAppMode` to `appProps`
- Wrap existing view rendering in `appMode === 'scheduler'` conditional
- Add `SplitterView` branch for `appMode === 'splitter'`
- SplitterView renders inside `<ToastProvider>` (already wraps everything)

### `src/components/DashboardHeader.tsx` (~20 lines)
- Add optional `appMode` + `setAppMode` props
- Add tab switcher in `.header-left` after the `<h1>`: two buttons ("Scheduler" / "Splitter")
- Tab switcher position: `[Logo] [Course Scheduler] [Scheduler | Splitter]`

### `src/components/DashboardHeader.css` (~25 lines)
- `.mode-tabs` container and `.mode-tab` button styles
- Active state styling

### `src/components/layout/DesktopView.tsx` (~4 lines)
- Destructure `appMode`, `setAppMode` from props
- Pass to `<DashboardHeader>`

### `src/components/layout/MobileView.tsx` (~4 lines)
- Same as DesktopView (mobile splitter UI deferred to later)

---

## Existing Code Reused

| Function | File | Purpose |
|----------|------|---------|
| `computeSmartSplit()` | `src/utils/smartSplit.ts` | Core splitting algorithm |
| `calculateOfficialEndTime()` | `src/utils/scheduleGenerator.ts:348` | End time from units/days/start/weeks |
| `getSessionDates()` | `src/utils/dateUtils.ts:24` | Session date range computation |
| `copyToClipboard()` | `src/utils/copyUtils.ts:69` | Clipboard API with fallback |
| `useToast` / `ToastProvider` | `src/components/Toast.tsx` | Notification system |
| `Course` / `CatalogHierarchy` | `src/hooks/useCatalog.ts` | Types for catalog data |
| `AcademicTerm` / `TermSession` | `src/types/calendar.ts` | Calendar types |
| `academicCalendar` | `src/types/calendar.ts:21` | Pre-sorted calendar data |
| `courses_2526` / `courses_2627` | `src/data/` | Course catalogs |

---

## Implementation Order

**Phase 1 — Types + Pure Utilities** (no React, testable in isolation)
1. `src/splitter/types.ts`
2. `src/splitter/parseTsv.ts`
3. `src/splitter/catalogLookup.ts`
4. `src/splitter/termMatcher.ts`
5. `src/splitter/classifier.ts`
6. `src/splitter/crosslistValidator.ts`
7. `src/splitter/rowGenerator.ts`
8. `src/splitter/pipeline.ts`

**Phase 2 — UI Components**
9. `src/splitter/PasteStage.tsx`
10. `src/splitter/ReviewStage.tsx`
11. `src/splitter/ResultsStage.tsx`
12. `src/splitter/SplitterView.tsx` + `SplitterView.css`

**Phase 3 — Integration** (existing file modifications)
13. `src/components/layout/AppViewProps.ts`
14. `src/components/DashboardHeader.tsx` + `.css`
15. `src/components/layout/DesktopView.tsx`
16. `src/components/layout/MobileView.tsx`
17. `src/App.tsx`

---

## Verification

1. `npx tsc --noEmit` — type-check passes
2. `npm start` — app loads, tab switcher visible in header after title
3. Switch to Splitter tab — paste stage renders, scheduler hidden, splitter header has matching tab switcher
4. Switch back to Scheduler — normal functionality preserved
5. Paste sample TSV data (with header row) — header detected and skipped, row count shown, parse button works
6. Paste with 12-hour times — normalized correctly to 24-hour in parsed data
7. Review stage — shows correct summary counts, errors visible, expandable details work
8. Process — results table with status column, split rows have correct mt codes (L/B), days in single-char format, recalculated times/hours
9. Sequential scheduling — lecture starts at original time, lab starts after lecture end + 10 min passing time; no overlapping times
10. Copy to Spreadsheet — TSV on clipboard with 27 columns (26 data + status), tab-separated
11. Edge cases: TBA sections (TBA status), already-split L+B sections (OK), courses not in catalog (Error), crosslisted sections with matching units (same split), crosslisted sections with mismatched units (Error), variable-unit courses, mixed-MT CRNs (OK, skipped), multi-A-row CRNs (days merged, one split), false-acceptable L-only rows (split)
