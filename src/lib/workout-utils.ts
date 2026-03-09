// src/lib/workout-utils.ts
// ─────────────────────────────────────────────────────────
// Helper functions for workout math.
// We keep all calculations HERE so if we ever need to fix
// a formula, there's only ONE place to change it.
// ─────────────────────────────────────────────────────────

// ── HEART RATE ZONES ─────────────────────────────────────
// Standard 5-zone model based on % of LTHR (Lactate Threshold HR)
// Zone 1 = very easy recovery
// Zone 2 = aerobic base (most of triathlon training)
// Zone 3 = tempo — "comfortably hard"
// Zone 4 = threshold — race pace effort  
// Zone 5 = VO2max — very hard, short bursts

export const HR_ZONES = [
  { zone: 1, label: 'Zone 1 — Recovery',   min: 0,   max: 80,  color: '#60a5fa', description: 'Very easy, active recovery' },
  { zone: 2, label: 'Zone 2 — Aerobic',    min: 81,  max: 89,  color: '#34d399', description: 'Comfortable, all-day pace' },
  { zone: 3, label: 'Zone 3 — Tempo',      min: 90,  max: 93,  color: '#fbbf24', description: 'Moderately hard, steady state' },
  { zone: 4, label: 'Zone 4 — Threshold',  min: 94,  max: 99,  color: '#f97316', description: 'Hard, race pace effort' },
  { zone: 5, label: 'Zone 5 — VO2 Max',   min: 100, max: 106, color: '#ef4444', description: 'Very hard, short intervals only' },
]
// min/max are percentages of LTHR

// ── POWER ZONES (BIKE) ────────────────────────────────────
// Based on % of FTP (Functional Threshold Power)
export const POWER_ZONES = [
  { zone: 1, label: 'Z1 — Active Recovery', min: 0,   max: 55,  color: '#60a5fa' },
  { zone: 2, label: 'Z2 — Endurance',       min: 56,  max: 75,  color: '#34d399' },
  { zone: 3, label: 'Z3 — Tempo',           min: 76,  max: 87,  color: '#fbbf24' },
  { zone: 4, label: 'Z4 — Sweet Spot',      min: 88,  max: 94,  color: '#fb923c' },
  { zone: 5, label: 'Z5 — Threshold',       min: 95,  max: 105, color: '#f97316' },
  { zone: 6, label: 'Z6 — VO2 Max',        min: 106, max: 120, color: '#ef4444' },
  { zone: 7, label: 'Z7 — Anaerobic',       min: 121, max: 999, color: '#a855f7' },
]

// ── FORMAT SECONDS → READABLE TIME ───────────────────────
// Converts a number of seconds into "1h 30m" or "45m" or "30s"
// Example: formatDuration(5400) → "1h 30m"
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  // Less than a minute — show seconds

  const hours = Math.floor(seconds / 3600)
  // Math.floor() rounds DOWN to nearest whole number
  // 5400 / 3600 = 1.5 → floor → 1 hour

  const minutes = Math.floor((seconds % 3600) / 60)
  // "%" is the remainder operator
  // 5400 % 3600 = 1800 remaining seconds → 1800/60 = 30 minutes

  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

// ── FORMAT YARDS → READABLE DISTANCE ─────────────────────
// Example: formatYards(1760) → "1 mile"
// Example: formatYards(400) → "400 yds"
export function formatYards(yards: number): string {
  if (yards >= 1760) {
    const miles = (yards / 1760).toFixed(1)
    // toFixed(1) = round to 1 decimal place
    return `${miles} mi`
  }
  return `${yards} yds`
}

// ── CALCULATE ESTIMATED TSS ───────────────────────────────
// TSS = Training Stress Score — a number representing workout load
// 100 TSS = 1 hour at threshold effort
// This is a simplified estimate — real TSS needs power data
export function estimateTSS(durationSeconds: number, hrZone: number): number {
  // Each zone has a different "intensity factor"
  const intensityByZone: Record<number, number> = {
    1: 0.55,  // Zone 1 = 55% of threshold
    2: 0.72,  // Zone 2 = 72% of threshold
    3: 0.85,  // Zone 3 = 85% of threshold
    4: 0.95,  // Zone 4 = 95% of threshold
    5: 1.05,  // Zone 5 = 105% of threshold
  }

  const IF = intensityByZone[hrZone] || 0.75
  // IF = Intensity Factor. Default to 0.75 if zone not found.

  const hours = durationSeconds / 3600
  // Convert seconds to hours for the TSS formula

  const tss = (hours * IF * IF) * 100
  // TSS formula: hours × IF² × 100
  // Squaring IF means hard efforts score disproportionately more

  return Math.round(tss)
  // Round to nearest whole number
}

// ── INTERVAL TYPES ────────────────────────────────────────
// The different types of blocks in a workout
export const INTERVAL_TYPES = [
  { value: 'warmup',   label: 'Warm Up',   color: '#60a5fa' },
  { value: 'work',     label: 'Work',      color: '#f97316' },
  { value: 'rest',     label: 'Rest',      color: '#34d399' },
  { value: 'cooldown', label: 'Cool Down', color: '#a78bfa' },
]

// ── SPORT CONFIG ──────────────────────────────────────────
// Each sport has different measurement options
export const SPORT_CONFIG = {
  swim: {
    label: 'Swim',
    icon: '🏊',
    color: '#00b4d8',
    measureBy: ['distance', 'time'],
    // Swim workouts are usually measured by distance (yards)
    distanceUnit: 'yards',
    distanceOptions: [25, 50, 75, 100, 150, 200, 300, 400, 500, 600, 800, 1000, 1500, 1760, 2000],
    // Common swim distances in yards
  },
  bike: {
    label: 'Bike',
    icon: '🚴',
    color: '#ff6b35',
    measureBy: ['time', 'distance'],
    // Bike workouts are usually measured by time
    distanceUnit: 'miles',
    distanceOptions: [1, 2, 3, 5, 6, 10, 12, 15, 20, 25, 30, 40, 50, 56, 70, 100, 112],
  },
  run: {
    label: 'Run',
    icon: '🏃',
    color: '#06d6a0',
    measureBy: ['time', 'distance'],
    distanceUnit: 'miles',
    distanceOptions: [0.25, 0.5, 1, 1.5, 2, 3, 3.1, 4, 5, 6, 6.2, 8, 10, 13.1, 26.2],
    // Includes common race distances: 5K=3.1mi, 10K=6.2mi, HM=13.1mi
  },
}