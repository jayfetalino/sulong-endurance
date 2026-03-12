# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start local dev server
npm run build    # Production build
npm run lint     # Run ESLint
```

No test framework is currently configured.

## Architecture Overview

**TriCoach** is a Next.js 16 App Router endurance coaching platform (triathlon/multisport) with a luxury gold/obsidian design system.

### Route Groups

- `src/app/(auth)/` — Login, signup pages (public)
- `src/app/(dashboard)/` — Protected routes with sticky navbar
  - `coach/` — Coach dashboard
  - `athlete/` — Athlete views, activity log, Strava sync
  - `workouts/` — Workout templates (`/new`, `/[id]`)
  - `calendar/` — Training calendar
- `src/app/api/strava/callback/` — Strava OAuth redirect handler

### Supabase Client Split

Two separate Supabase clients — never mix them:
- `src/lib/supabase-server.ts` — Server Components and API routes (uses cookies)
- `src/lib/supabase-browser.ts` — Client Components with `'use client'`
- `src/lib/supabase.ts` — Re-exports the browser client

### Key Domain Types (`src/types/index.ts`)

| Type | Purpose |
|------|---------|
| `Profile` | User account with role (`coach`/`athlete`) and fitness metrics (FTP, CSS, threshold pace) |
| `Workout` | Template created by coaches with sport and intervals |
| `Interval` | Block within a workout (duration, zone targets) |
| `ScheduledWorkout` | Assignment of a workout to an athlete on a date |
| `Activity` | Completed workout (from Strava or manual entry) |
| `Race` | Goal event with A/B/C priority |

### Integrations

- **Supabase** — Database + auth (email/password, role-based routing)
- **Strava** — OAuth via `src/lib/strava.ts` (`getStravaAuthUrl`, `exchangeStravaCode`, `fetchStravaActivities`)
- **Training math** — Zone calculation, TSS, duration formatting in `src/lib/workout-utils.ts`

### Design System

Tailwind CSS 4 + CSS custom properties defined in `src/app/globals.css`.

**Color tokens:** `--obsidian` (dark bg), `--gold` (#C9A84C, primary accent), `--platinum` (headings), `--silver` (body text)

**Reusable classes:** `.btn-gold`, `.btn-ghost`, `.input-luxury`, `.card-luxury`, `.fade-up*`

**Fonts:** Cormorant Garant (headings, serif italic), DM Sans (body), DM Mono (monospace)

### Data Fetching Pattern

Data is fetched client-side via `useEffect` + browser Supabase client directly in page components. No abstraction layer or global state library — just `useState` + `useEffect`.

### Path Alias

`@/*` maps to `src/*` — use for all internal imports.

### Environment Variables (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
STRAVA_CLIENT_ID
STRAVA_CLIENT_SECRET
NEXT_PUBLIC_APP_URL
```

## Workflow
- When I ask for a new feature, ALWAYS enter plan mode first.
- Show me the plan and wait for my approval before writing any code.
- Plan should include: files to create/edit, what changes, any database changes needed.
- Only proceed after I say "yes", "approved", "go ahead", or "looks good".
- After writing code, always run `npm run build` to check for errors and fix them.
- Never push to git unless I explicitly say "deploy", "push", or "looks good deploy it".

## Local Preview
- After making changes, remind me to check localhost:3000 before deploying.
- Run `npm run dev` if the dev server is not already running.

## Git Rules
- Always commit with a descriptive message explaining what changed
- Never force push
- Never push directly without running npm run build first
- Always tell me what you committed and pushed
- Always `git push` immediately after committing, so changes appear on GitHub