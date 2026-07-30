# Progress & Streaks

Add a real progress layer to StudyVerse: daily streaks, study-time analytics, and completion stats surfaced on the dashboard.

## Blocker found while checking the database

The backend currently has **no tables**. A query against `study_sessions` returns "relation does not exist", and no tables exist in the public schema, even though migration files for `profiles`, `goals`, `roadmap_modules`, `roadmap_topics`, `notes`, and `study_sessions` are present in the project. The schema was never applied to the live database, which means onboarding, roadmap generation, and every read in the app fail today.

Step 1 is therefore to re-apply the full schema (same definitions already written, plus the profile-on-signup trigger) before any progress work.

## What gets built

### 1. Restore the schema
Re-run the existing schema as a migration so all six tables, their access rules, and the auto-create-profile trigger exist again.

### 2. Streak tracking
- New `daily_activity` table: one row per user per day with total minutes studied and topics completed.
- Ending a focus session or completing a topic upserts today's row (in addition to the existing `study_sessions` insert).
- Streak = consecutive days with any activity, computed from `daily_activity` in a small server function; returns current streak, longest streak, and the last 84 days of activity.

### 3. Dashboard progress section
- **Streak card**: current streak with flame, longest streak, "studied today" state.
- **Activity heatmap**: 12-week grid, one square per day, intensity by minutes studied.
- **Weekly bar chart**: minutes per day for the last 7 days against the user's daily target from the active goal.
- **Goal progress**: topics completed / total, percent ring, total hours invested, estimated days to finish at the current pace.

### 4. Focus session accuracy
Focus mode already logs sessions; wire it to also update the daily rollup so time counted in the timer shows in streaks and charts immediately.

## Technical notes

- New migration: `daily_activity` (user_id, day date, minutes int, topics_completed int, unique on user_id+day), GRANTs for `authenticated`/`service_role`, RLS scoped to `auth.uid()`.
- Streak/rollup logic in `src/lib/progress.functions.ts` using `createServerFn` + `requireSupabaseAuth`, called via `useQuery`/`useMutation`.
- Charts rendered with existing recharts + design tokens; no new color literals.
- Progress components split into `src/components/progress/` (StreakCard, ActivityHeatmap, WeeklyChart, GoalProgress) and composed into the dashboard.
