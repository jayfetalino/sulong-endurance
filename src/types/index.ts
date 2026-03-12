// src/types/index.ts
// ─────────────────────────────────────────────────────────
// These are our "data shapes" — like blank forms that 
// describe what every piece of data in our app looks like.
// TypeScript uses these to catch mistakes. If you try to put
// a word where a number should go, it will warn you instantly.
// ─────────────────────────────────────────────────────────

// ─── SPORT TYPE ───────────────────────────────────────────
// Instead of typing the string "bike" everywhere and risking
// a typo like "bkie", we define all valid sports once here.
// TypeScript will autocomplete these for us everywhere.
export type Sport = 'swim' | 'bike' | 'run' | 'brick'
// The "|" means "or" — so Sport can be swim OR bike OR run OR brick

// ─── USER ROLES ───────────────────────────────────────────
export type UserRole = 'coach' | 'athlete'

// ─── WORKOUT STATUS ───────────────────────────────────────
export type WorkoutStatus = 'pending' | 'completed' | 'skipped'

// ─── PROFILE ──────────────────────────────────────────────
// A Profile is a user in our system — either a coach or athlete.
// "interface" is like a blank form with named fields.
export interface Profile {
  id: string                    // Unique ID (uuid from Supabase)
  full_name: string             // "John Smith"
  role: UserRole                // 'coach' or 'athlete'
  coach_id: string | null       // If athlete, who is their coach? null if coach.
  ftp: number | null            // Cycling fitness number (watts). null until tested.
  css: number | null            // Swim speed (min per 100m). null until tested.
  threshold_pace: number | null // Run pace (min per km). null until tested.
  athlete_type: string | null   // 'Runner', 'Cyclist', 'Swimmer', 'Triathlete'
  race_distance: string | null  // e.g. '42K (26.2M / Marathon)', 'Full Ironman (140.6)'
  coaching_goals: string | null // Free-text goal description
  created_at: string            // When they joined (ISO date string)
}

// ─── INTERVAL ─────────────────────────────────────────────
// One block inside a workout. A workout is made of many intervals.
// Example: "3 minutes at 88% FTP" is one interval.
export interface Interval {
  id: string                     // Unique ID for this interval block
  type: 'warmup' | 'work' | 'rest' | 'cooldown' | 'repeat'
  duration_seconds: number       // How long: 180 = 3 minutes
  
  // Bike-specific targets
  power_target_pct?: number      // % of FTP. e.g. 88 = 88% of FTP
  // The "?" means this field is OPTIONAL — only bikes have power targets

  // Run-specific targets  
  pace_target?: number           // Target pace in min/km

  // Swim-specific targets
  distance_meters?: number       // e.g. 100 (for a 100m repeat)
  
  // Both run and swim
  heart_rate_zone?: number       // Zone 1-5
  
  label?: string                 // Description: "Hard effort", "Easy spin"
  
  // For repeat blocks (e.g. "do this 5 times")
  repeat_count?: number          // How many times to repeat
  steps?: Interval[]             // The intervals INSIDE the repeat
  // "Interval[]" means "an array (list) of Interval objects"
}

// ─── WORKOUT ──────────────────────────────────────────────
// A workout is a TEMPLATE created by the coach.
// Like a recipe — it doesn't belong to any athlete yet.
export interface Workout {
  id: string
  name: string                   // "Sweet Spot 3x12"
  sport: Sport                   // 'bike', 'swim', etc.
  description: string | null     // Optional coach notes about the workout
  tss_estimate: number | null    // Estimated Training Stress Score
  duration_seconds: number       // Total time in seconds
  intervals: Interval[]          // The list of interval blocks
  created_by: string             // Profile ID of the coach who made it
  is_public: boolean             // Can other coaches see this?
  created_at: string
}

// ─── SCHEDULED WORKOUT ────────────────────────────────────
// A scheduled workout is when a coach ASSIGNS a workout to 
// an athlete on a specific date. Like a homework assignment.
export interface ScheduledWorkout {
  id: string
  athlete_id: string             // Who needs to do it
  workout_id: string             // What workout they need to do
  scheduled_date: string         // When: "2026-03-15"
  status: WorkoutStatus          // 'pending', 'completed', or 'skipped'
  coach_notes: string | null     // Coach's instructions for this specific day
  athlete_notes: string | null   // Athlete's feedback after doing it
  created_at: string

  // These are "joined" fields — when we fetch a scheduled workout,
  // we often fetch the full workout details at the same time.
  // The "?" means they might not always be included in the response.
  workout?: Workout              // The full workout details
  athlete?: Profile              // The full athlete profile
}

// ─── ACTIVITY ─────────────────────────────────────────────
// An activity is a COMPLETED workout with real recorded data.
// Scheduled workout = the plan. Activity = what actually happened.
export interface Activity {
  id: string
  athlete_id: string
  scheduled_workout_id: string | null  // null if it was an unplanned workout
  sport: Sport
  started_at: string                   // When they started (full datetime)
  duration_seconds: number
  
  // Performance data
  tss: number | null                   // Actual Training Stress Score
  avg_power: number | null             // Average watts (bike)
  avg_heart_rate: number | null        // Average BPM
  avg_cadence: number | null           // Average RPM
  normalized_power: number | null      // Weighted average power (bike)
  avg_pace: number | null              // Min/km (run/swim)
  total_distance: number | null        // Meters
  
  // File references
  fit_file_url: string | null          // Link to the .FIT file
  strava_activity_id: number | null    // Strava's ID if synced from there
  
  created_at: string
}

// ─── RACE ─────────────────────────────────────────────────
// A goal race on the athlete's calendar
export type RaceDistance = 'sprint' | 'olympic' | '70.3' | '140.6'
export type RacePriority = 'A' | 'B' | 'C'
// A race = your #1 goal this season
// B race = good practice, but not the main event
// C race = just for fun / fitness

export interface Race {
  id: string
  athlete_id: string
  name: string                   // "Ironman Florida 2026"
  race_date: string              // "2026-11-07"
  distance: RaceDistance
  priority: RacePriority
  notes: string | null
  created_at: string
}

// ─── UTILITY TYPES ────────────────────────────────────────
// These are helper types used when CREATING new records.
// When creating, we don't have an ID yet (Supabase generates it),
// so we use "Omit" to remove certain fields from the type.
// "Omit<Workout, 'id' | 'created_at'>" means 
// "everything in Workout EXCEPT id and created_at"

export type CreateWorkout = Omit<Workout, 'id' | 'created_at'>
export type CreateScheduledWorkout = Omit<ScheduledWorkout, 'id' | 'created_at' | 'workout' | 'athlete'>
export type CreateActivity = Omit<Activity, 'id' | 'created_at'>
export type CreateRace = Omit<Race, 'id' | 'created_at'>