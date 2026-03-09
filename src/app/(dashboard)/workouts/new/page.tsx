// src/app/(dashboard)/workouts/new/page.tsx
// ─────────────────────────────────────────────────────────
// This is the WORKOUT BUILDER page.
// Coaches use this to create structured workouts.
// 
// A workout is made of "intervals" — blocks of effort.
// Example: Warmup 10min → 3x(8min hard + 3min easy) → Cooldown 10min
// ─────────────────────────────────────────────────────────
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import type { Sport, Interval } from '@/types'

// ── TYPES LOCAL TO THIS PAGE ──────────────────────────────
// These describe the shape of one interval block in the builder
type IntervalType = 'warmup' | 'work' | 'rest' | 'cooldown'
type DurationUnit = 'minutes' | 'seconds'
type DistanceUnit = 'yards' | 'miles' | 'meters'
type HRZone = 1 | 2 | 3 | 4 | 5

// What one row in our interval editor looks like
interface IntervalRow {
  id: string              // unique id for this row (for React's key prop)
  type: IntervalType      // warmup, work, rest, cooldown
  
  // Duration — time based
  duration_value: number        // e.g. 10
  duration_unit: DurationUnit   // 'minutes' or 'seconds'
  
  // Distance based (optional)
  use_distance: boolean         // true = use distance instead of time
  distance_value: number        // e.g. 400
  distance_unit: DistanceUnit   // 'yards', 'miles', 'meters'
  
  // Targets
  hr_zone: HRZone | null        // Heart rate zone 1-5
  power_pct: number | null      // % of FTP for bike (e.g. 88)
  pace_per_mile: string         // e.g. "8:30" for run
  
  label: string                 // Coach note e.g. "Hard effort"
}

// ── HELPER: generate a unique id ─────────────────────────
// We need a unique id for each interval row so React can
// track them when we add/remove/reorder
function makeId() {
  return Math.random().toString(36).slice(2, 9)
  // toString(36) converts to base-36 (letters+numbers)
  // slice(2,9) takes 7 characters — enough to be unique
}

// ── HELPER: convert interval row → seconds ───────────────
// We store everything in seconds in the database for easy math
function toSeconds(row: IntervalRow): number {
  if (row.use_distance) return 0
  // Duration = time-based
  return row.duration_unit === 'minutes'
    ? row.duration_value * 60
    : row.duration_value
}

// ── HELPER: calculate total workout duration ─────────────
function totalDurationSeconds(intervals: IntervalRow[]): number {
  return intervals.reduce((sum, row) => sum + toSeconds(row), 0)
  // reduce() loops through all intervals and adds up the seconds
}

// ── HELPER: format seconds → "1h 23m" display ────────────
function formatDuration(seconds: number): string {
  if (seconds === 0) return '0m'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

// ── HR ZONE COLORS ────────────────────────────────────────
// Each zone gets a color so the workout graph looks clear
const HR_ZONE_COLORS: Record<number, string> = {
  1: 'bg-blue-500',    // Easy / Recovery
  2: 'bg-green-500',   // Aerobic base
  3: 'bg-yellow-500',  // Tempo
  4: 'bg-orange-500',  // Threshold
  5: 'bg-red-500',     // VO2 Max
}

const HR_ZONE_LABELS: Record<number, string> = {
  1: 'Z1 — Recovery',
  2: 'Z2 — Aerobic',
  3: 'Z3 — Tempo',
  4: 'Z4 — Threshold',
  5: 'Z5 — VO2 Max',
}

// ── INTERVAL TYPE COLORS ──────────────────────────────────
const INTERVAL_TYPE_COLORS: Record<IntervalType, string> = {
  warmup:   'border-blue-500 bg-blue-500/10',
  work:     'border-orange-500 bg-orange-500/10',
  rest:     'border-green-500 bg-green-500/10',
  cooldown: 'border-purple-500 bg-purple-500/10',
}

// ── DEFAULT INTERVAL ──────────────────────────────────────
// When coach clicks "+ Add Interval", this is what appears
function defaultInterval(type: IntervalType = 'work'): IntervalRow {
  return {
    id: makeId(),
    type,
    duration_value: type === 'warmup' || type === 'cooldown' ? 10 : 5,
    duration_unit: 'minutes',
    use_distance: false,
    distance_value: 400,
    distance_unit: 'yards',
    hr_zone: 2,
    power_pct: null,
    pace_per_mile: '',
    label: '',
  }
}

// ─────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────
export default function NewWorkoutPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  // ── WORKOUT METADATA STATE ────────────────────────────
  const [name, setName] = useState('')
  const [sport, setSport] = useState<Sport>('bike')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── INTERVALS STATE ───────────────────────────────────
  // Start with 3 default intervals: warmup → work → cooldown
  const [intervals, setIntervals] = useState<IntervalRow[]>([
    defaultInterval('warmup'),
    defaultInterval('work'),
    defaultInterval('cooldown'),
  ])

  // ── ADD INTERVAL ──────────────────────────────────────
  function addInterval() {
    setIntervals(prev => [...prev, defaultInterval('work')])
    // "prev" = the current array
    // "[...prev, newItem]" = copy all existing items + add new one at end
    // "..." is the "spread operator" — it unpacks the array
  }

  // ── REMOVE INTERVAL ───────────────────────────────────
  function removeInterval(id: string) {
    setIntervals(prev => prev.filter(row => row.id !== id))
    // .filter() keeps only rows where id does NOT match
    // This creates a new array without the deleted row
  }

  // ── UPDATE INTERVAL FIELD ─────────────────────────────
  // This one function handles ALL field changes in ALL rows.
  // "id" = which row to update
  // "field" = which field in that row to change
  // "value" = the new value
  function updateInterval(id: string, field: keyof IntervalRow, value: unknown) {
    setIntervals(prev =>
      prev.map(row =>
        row.id === id
          ? { ...row, [field]: value }
          // If this is the row we want: copy it and update the field
          // { ...row } = copy all fields, [field]: value = override one
          : row
          // Otherwise return the row unchanged
      )
    )
  }

  // ── MOVE INTERVAL UP/DOWN ─────────────────────────────
  function moveInterval(id: string, direction: 'up' | 'down') {
    setIntervals(prev => {
      const index = prev.findIndex(row => row.id === id)
      // findIndex() returns the position of this row in the array
      if (direction === 'up' && index === 0) return prev
      // Can't move up if already first
      if (direction === 'down' && index === prev.length - 1) return prev
      // Can't move down if already last

      const newArr = [...prev]
      // Make a copy (never mutate state directly!)
      const swapIndex = direction === 'up' ? index - 1 : index + 1
      // Swap this row with the one above or below it
      ;[newArr[index], newArr[swapIndex]] = [newArr[swapIndex], newArr[index]]
      return newArr
    })
  }

  // ── SAVE WORKOUT ──────────────────────────────────────
  async function saveWorkout() {
    if (!name.trim()) {
      setError('Please give your workout a name.')
      return
    }
    if (intervals.length === 0) {
      setError('Add at least one interval.')
      return
    }

    setSaving(true)
    setError(null)

    // Get the logged-in coach's ID
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Convert our IntervalRow[] into the format we store in the DB
    const dbIntervals: Interval[] = intervals.map(row => ({
      id: row.id,
      type: row.type,
      duration_seconds: toSeconds(row),
      distance_meters: row.use_distance
        ? row.distance_unit === 'yards'
          ? Math.round(row.distance_value * 0.9144)
          // Convert yards → meters (1 yard = 0.9144 meters)
          : row.distance_unit === 'miles'
          ? Math.round(row.distance_value * 1609.34)
          // Convert miles → meters
          : row.distance_value
        : undefined,
      hr_zone: row.hr_zone ?? undefined,
      power_target_pct: row.power_pct ?? undefined,
      pace_target: row.pace_per_mile ? parseFloat(row.pace_per_mile) : undefined,
      label: row.label || HR_ZONE_LABELS[row.hr_zone ?? 2],
    }))

    // Calculate total duration in seconds
    const totalSeconds = totalDurationSeconds(intervals)

    // Save to Supabase
    const { error: dbError } = await supabase
      .from('workouts')
      .insert({
        name: name.trim(),
        sport,
        description: description.trim() || null,
        duration_seconds: totalSeconds,
        intervals: dbIntervals,
        created_by: user.id,
        is_public: false,
        tss_estimate: null,
      })

    if (dbError) {
      setError(dbError.message)
      setSaving(false)
      return
    }

    // Success! Go to workout library
    router.push('/workouts')
  }

  // ── RENDER ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* TOP NAV */}
      <nav className="border-b border-gray-800 bg-gray-900 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ← Back
            </button>
            <span className="text-gray-600">|</span>
            <span className="text-white font-bold">New Workout</span>
          </div>

          {/* Total duration preview */}
          <div className="text-gray-400 text-sm">
            Total:{' '}
            <span className="text-white font-bold">
              {formatDuration(totalDurationSeconds(intervals))}
            </span>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── LEFT: WORKOUT DETAILS ── */}
          <div className="space-y-4">

            {/* Workout name */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h2 className="font-bold text-sm text-gray-400 uppercase tracking-wider mb-4">
                Workout Details
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">
                    Workout Name *
                  </label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Sweet Spot 3x12"
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Sport selector */}
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Sport</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['swim', 'bike', 'run'] as Sport[]).map(s => (
                      <button
                        key={s}
                        onClick={() => setSport(s)}
                        className={`py-2 rounded-lg border text-sm font-medium transition-colors ${
                          sport === s
                            ? s === 'swim' ? 'bg-cyan-500 border-cyan-500 text-gray-950'
                              : s === 'bike' ? 'bg-orange-500 border-orange-500 text-gray-950'
                              : 'bg-green-500 border-green-500 text-gray-950'
                            : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
                        }`}
                      >
                        {s === 'swim' ? '🏊' : s === 'bike' ? '🚴' : '🏃'}{' '}
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm text-gray-300 mb-1">
                    Coach Notes (optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="What should the athlete focus on?"
                    rows={3}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-cyan-500 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* HR Zone legend */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h2 className="font-bold text-sm text-gray-400 uppercase tracking-wider mb-3">
                HR Zone Guide
              </h2>
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map(zone => (
                  <div key={zone} className="flex items-center gap-2 text-sm">
                    <div className={`w-3 h-3 rounded-full ${HR_ZONE_COLORS[zone]}`} />
                    <span className="text-gray-300">{HR_ZONE_LABELS[zone]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Save button */}
            {error && (
              <div className="bg-red-950 border border-red-800 text-red-400 rounded-lg p-3 text-sm">
                {error}
              </div>
            )}
            <button
              onClick={saveWorkout}
              disabled={saving}
              className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 disabled:text-gray-500 text-gray-950 font-bold rounded-xl py-3 transition-colors"
            >
              {saving ? 'Saving...' : '💾 Save Workout'}
            </button>
          </div>

          {/* ── RIGHT: INTERVAL BUILDER ── */}
          <div className="lg:col-span-2 space-y-3">

            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold">
                Intervals
                <span className="text-gray-500 font-normal text-sm ml-2">
                  {intervals.length} block{intervals.length !== 1 ? 's' : ''}
                </span>
              </h2>
              <button
                onClick={addInterval}
                className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-sm px-3 py-1.5 rounded-lg transition-colors"
              >
                + Add Interval
              </button>
            </div>

            {/* WORKOUT VISUAL BAR */}
            {/* Shows a color-coded bar proportional to each interval's duration */}
            <div className="flex h-4 rounded-full overflow-hidden gap-0.5 mb-4">
              {intervals.map(row => {
                const secs = toSeconds(row)
                const total = totalDurationSeconds(intervals)
                const pct = total > 0 ? (secs / total) * 100 : 100 / intervals.length
                const color = row.hr_zone ? HR_ZONE_COLORS[row.hr_zone] : 'bg-gray-600'
                return (
                  <div
                    key={row.id}
                    className={color}
                    style={{ width: `${pct}%` }}
                    title={row.label || row.type}
                  />
                )
              })}
            </div>

            {/* INTERVAL ROWS */}
            {intervals.map((row, index) => (
              <div
                key={row.id}
                className={`border rounded-xl p-4 ${INTERVAL_TYPE_COLORS[row.type]}`}
              >
                {/* Row header: type + move + delete */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-bold text-gray-400 w-5">{index + 1}</span>

                  {/* Interval type */}
                  <select
                    value={row.type}
                    onChange={e => updateInterval(row.id, 'type', e.target.value)}
                    className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-2 py-1.5 focus:outline-none"
                  >
                    <option value="warmup">Warmup</option>
                    <option value="work">Work</option>
                    <option value="rest">Rest</option>
                    <option value="cooldown">Cooldown</option>
                  </select>

                  {/* Label input */}
                  <input
                    value={row.label}
                    onChange={e => updateInterval(row.id, 'label', e.target.value)}
                    placeholder="Label (optional)"
                    className="flex-1 bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:border-cyan-500"
                  />

                  {/* Move up/down */}
                  <button
                    onClick={() => moveInterval(row.id, 'up')}
                    disabled={index === 0}
                    className="text-gray-500 hover:text-white disabled:opacity-20 text-sm px-1"
                  >↑</button>
                  <button
                    onClick={() => moveInterval(row.id, 'down')}
                    disabled={index === intervals.length - 1}
                    className="text-gray-500 hover:text-white disabled:opacity-20 text-sm px-1"
                  >↓</button>

                  {/* Delete */}
                  <button
                    onClick={() => removeInterval(row.id)}
                    className="text-gray-500 hover:text-red-400 text-sm px-1 transition-colors"
                  >✕</button>
                </div>

                {/* Row body: duration/distance + targets */}
                <div className="grid grid-cols-2 gap-3">

                  {/* Duration OR Distance toggle */}
                  <div>
                    <div className="flex gap-2 mb-2">
                      <button
                        onClick={() => updateInterval(row.id, 'use_distance', false)}
                        className={`text-xs px-2 py-1 rounded ${!row.use_distance ? 'bg-cyan-500 text-gray-950 font-bold' : 'bg-gray-700 text-gray-300'}`}
                      >
                        ⏱ Time
                      </button>
                      <button
                        onClick={() => updateInterval(row.id, 'use_distance', true)}
                        className={`text-xs px-2 py-1 rounded ${row.use_distance ? 'bg-cyan-500 text-gray-950 font-bold' : 'bg-gray-700 text-gray-300'}`}
                      >
                        📏 Distance
                      </button>
                    </div>

                    {!row.use_distance ? (
                      // TIME INPUT
                      <div className="flex gap-1">
                        <input
                          type="number"
                          value={row.duration_value}
                          onChange={e => updateInterval(row.id, 'duration_value', Number(e.target.value))}
                          min={1}
                          className="w-16 bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:border-cyan-500"
                        />
                        <select
                          value={row.duration_unit}
                          onChange={e => updateInterval(row.id, 'duration_unit', e.target.value)}
                          className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-2 py-1.5 focus:outline-none"
                        >
                          <option value="minutes">min</option>
                          <option value="seconds">sec</option>
                        </select>
                      </div>
                    ) : (
                      // DISTANCE INPUT
                      <div className="flex gap-1">
                        <input
                          type="number"
                          value={row.distance_value}
                          onChange={e => updateInterval(row.id, 'distance_value', Number(e.target.value))}
                          min={1}
                          className="w-20 bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:border-cyan-500"
                        />
                        <select
                          value={row.distance_unit}
                          onChange={e => updateInterval(row.id, 'distance_unit', e.target.value)}
                          className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-2 py-1.5 focus:outline-none"
                        >
                          <option value="yards">yards</option>
                          <option value="miles">miles</option>
                          <option value="meters">meters</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Targets: HR Zone + pace/power */}
                  <div className="space-y-2">
                    {/* HR Zone */}
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">HR Zone</label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(z => (
                          <button
                            key={z}
                            onClick={() => updateInterval(row.id, 'hr_zone', z)}
                            className={`w-7 h-7 rounded text-xs font-bold transition-colors ${
                              row.hr_zone === z
                                ? HR_ZONE_COLORS[z] + ' text-white'
                                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                            }`}
                          >
                            {z}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Pace (for run/swim) */}
                    {(sport === 'run' || sport === 'swim') && (
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">
                          {sport === 'run' ? 'Pace (min/mile)' : 'Pace (min/100y)'}
                        </label>
                        <input
                          value={row.pace_per_mile}
                          onChange={e => updateInterval(row.id, 'pace_per_mile', e.target.value)}
                          placeholder="8:30"
                          className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    )}

                    {/* Power % FTP (for bike) */}
                    {sport === 'bike' && (
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">
                          Power (% FTP)
                        </label>
                        <input
                          type="number"
                          value={row.power_pct ?? ''}
                          onChange={e => updateInterval(row.id, 'power_pct', e.target.value ? Number(e.target.value) : null)}
                          placeholder="88"
                          min={40}
                          max={150}
                          className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Add interval button at bottom */}
            <button
              onClick={addInterval}
              className="w-full border border-dashed border-gray-700 hover:border-gray-500 text-gray-500 hover:text-gray-300 rounded-xl py-3 text-sm transition-colors"
            >
              + Add Another Interval
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
