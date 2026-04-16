# Course Scheduler App

## Architecture
- React + TypeScript, CRA-based (not Vite)
- Desktop/Mobile split: `DesktopView.tsx` / `MobileView.tsx`, toggled via `useMediaQuery` at 768px
- State: `useSettings` (persisted to localStorage), `useWorkspace` (ephemeral per-session), `useSections` (saved sections in localStorage)
- Schedule generation: `src/utils/scheduleGenerator.ts` — pure function, takes request + context + overrides, returns blocks + warnings

## Key Data Flow
- `App.tsx` runs the generator in a debounced `useEffect` whenever units/days/times/term change
- `ConfigBar.tsx` (desktop) and `MobileConfig.tsx` (mobile) are the main config UIs
- `ScheduleDisplay.tsx` renders the weekly grid with drag-to-move support
- `academic-calendar.json` defines terms, sessions, holidays
- `courses_2526.json` / `courses_2627.json` are course catalogs keyed by AY

## Contact Hour Rules (DO NOT CHANGE without explicit confirmation)
- 1 lecture unit = 18 contact hours; 1 lab unit = 54 contact hours
- 1 contact hour = 50 instructional minutes + 10 min break per clock hour
- Minimum 1.0 CH per meeting (state regulation)
- 5-minute increments for all start/end times
- Rules live in `src/data/contact_hours_rules.md`, `course_rules.md`, `attendance-method.md`
- Existing calculation logic in `scheduleGenerator.ts` and `useRules.ts` is correct and validated

## Schema v2 (SavedSection)
Optional additive fields — missing = legacy behavior:
- `lectureTimeMode` / `labTimeMode`: `'shared'` | `'perDay'`
- `lectureSplitMode` / `labSplitMode`: `'even'` | `'custom'`
- `lectureTimesPerDay` / `labTimesPerDay`: `Record<Day, string>`
- `lectureHoursPerDay` / `labHoursPerDay`: `Record<Day, number>`

## Academic Calendar
- AY26-27: Fall 2026, Winter 2027, Spring 2027, Summer 2026
- AY27-28: Fall 2027, Winter 2028, Spring 2028, Summer 2028 (uses AY26-27 catalog as fallback)
- No Sunday holidays in any term

## Commands
- `npm start` — dev server on port 3000
- `npx tsc --noEmit` — typecheck
- `npm run build` — production build

## Conventions
- Per-component toggles (lecture and lab get independent controls)
- `clearWorkspace` must reset ALL state including v2 fields
- Drag-move auto-flips `timeMode` to `perDay`; day-change drags reset `splitMode` to `even`
