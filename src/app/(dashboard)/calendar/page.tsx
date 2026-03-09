// src/app/(dashboard)/calendar/page.tsx
// ─────────────────────────────────────────────────────────
// The TRAINING CALENDAR — the heart of the coaching experience.
//
// Features:
// - Toggle between WEEK view and MONTH view
// - See all scheduled workouts per day
// - Click a day to assign a workout to an athlete
// - Each workout card shows: name, sport icon, duration, 
//   HR zone color, and coach notes preview
// ─────────────────────────────────────────────────────────
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import type { Workout, ScheduledWorkout, Profile } from '@/types'

// ── TYPES ─────────────────────────────────────────────────
type CalendarView = 'week' | 'month'

// A day cell in the calendar holds a date + any scheduled workouts
interface DayCell {
  date: Date
  isToday: boolean
  isCurrentMonth: boolean   // false = greyed out (prev/next month overflow)
  scheduledWorkouts: ScheduledWorkoutWithDetails[]
}

// Scheduled workout with the full workout details joined in
interface ScheduledWorkoutWithDetails extends ScheduledWorkout {
  workout: Workout
}

// ── CONSTANTS ─────────────────────────────────────────────
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]

// Sport colors for workout cards
const SPORT_STYLES: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  swim:  { bg: 'bg-cyan-500/15',   border: 'border-cyan-500/40',   text: 'text-cyan-300',   icon: '🏊' },
  bike:  { bg: 'bg-orange-500/15', border: 'border-orange-500/40', text: 'text-orange-300', icon: '🚴' },
  run:   { bg: 'bg-green-500/15',  border: 'border-green-500/40',  text: 'text-green-300',  icon: '🏃' },
  brick: { bg: 'bg-purple-500/15', border: 'border-purple-500/40', text: 'text-purple-300', icon: '🧱' },
}

// HR Zone colors — shown as a left border on each workout card
const HR_ZONE_BORDER: Record<number, string> = {
  1: 'border-l-blue-400',
  2: 'border-l-green-400',
  3: 'border-l-yellow-400',
  4: 'border-l-orange-400',
  5: 'border-l-red-400',
}

// Status styles
const STATUS_STYLES: Record<string, string> = {
  pending:   'bg-gray-700 text-gray-300',
  completed: 'bg-green-500/20 text-green-400',
  skipped:   'bg-red-500/20 text-red-400',
}

// ── HELPER FUNCTIONS ──────────────────────────────────────

// Format date as "YYYY-MM-DD" for database queries
function toDateString(date: Date): string {
  return date.toISOString().split('T')[0]
  // toISOString() = "2026-03-15T10:30:00.000Z"
  // split('T')[0] = "2026-03-15"
}

// Format seconds → "1h 23m"
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

// Get the dominant HR zone from a workout's intervals
function getDominantHRZone(workout: Workout): number {
  const intervals = workout.intervals as Array<{ hr_zone?: number; type?: string }>
  if (!intervals || intervals.length === 0) return 2
  
  // Find the "work" intervals and get their HR zone
  const workIntervals = intervals.filter(i => i.type === 'work' && i.hr_zone)
  if (workIntervals.length === 0) return 2
  
  // Return the most common HR zone among work intervals
  const zones = workIntervals.map(i => i.hr_zone as number)
  return zones.sort((a, b) =>
    zones.filter(v => v === b).length - zones.filter(v => v === a).length
  )[0]
}

// Get start of week (Sunday) for any given date
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  // d.getDay() = 0 (Sun) to 6 (Sat)
  // Subtracting it gives us the Sunday of that week
  d.setHours(0, 0, 0, 0)
  return d
}

// Build an array of 7 dates starting from a given Sunday
function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })
  // Array.from({ length: 7 }) creates [undefined × 7]
  // The (_, i) callback fills each slot with weekStart + i days
}

// Build a 6-week grid (42 cells) for the month view
function getMonthGrid(year: number, month: number): Date[] {
  // First day of the month
  const firstDay = new Date(year, month, 1)
  // Last day of the month
  const lastDay = new Date(year, month + 1, 0)
  
  // Start grid from the Sunday before (or on) the 1st
  const gridStart = new Date(firstDay)
  gridStart.setDate(firstDay.getDate() - firstDay.getDay())
  
  // Build 42 days (6 rows × 7 cols)
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    return d
  })
}

// ── WORKOUT CARD COMPONENT ────────────────────────────────
// One scheduled workout shown inside a calendar day cell
function WorkoutCard({
  sw,
  compact = false,
}: {
  sw: ScheduledWorkoutWithDetails
  compact?: boolean
  // compact = true in month view (less space), false in week view
}) {
  const style = SPORT_STYLES[sw.workout.sport] ?? SPORT_STYLES.bike
  const hrZone = getDominantHRZone(sw.workout)
  const hrBorder = HR_ZONE_BORDER[hrZone] ?? 'border-l-gray-400'

  return (
    <div
      className={`
        rounded-lg border border-l-4 px-2 py-1.5 text-left w-full
        ${style.bg} ${style.border} ${hrBorder}
        hover:brightness-125 transition-all cursor-pointer
      `}
      // border-l-4 = thick left border showing HR zone color
    >
      {/* Top row: icon + name */}
      <div className="flex items-center gap-1 min-w-0">
        <span className="text-xs flex-shrink-0">{style.icon}</span>
        <span className={`text-xs font-bold truncate ${style.text}`}>
          {sw.workout.name}
          {/* truncate = cut off with "..." if too long */}
        </span>
      </div>

      {/* Second row: duration + status */}
      {!compact && (
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-400">
            ⏱ {formatDuration(sw.workout.duration_seconds)}
          </span>
          <span className={`text-xs px-1.5 rounded-full ${STATUS_STYLES[sw.status]}`}>
            {sw.status}
          </span>
        </div>
      )}

      {/* Coach notes preview */}
      {!compact && sw.coach_notes && (
        <p className="text-xs text-gray-500 mt-1 truncate">
          📝 {sw.coach_notes}
        </p>
      )}
    </div>
  )
}

// ── ASSIGN WORKOUT MODAL ──────────────────────────────────
// Pops up when coach clicks a day to assign a workout
function AssignModal({
  date,
  athletes,
  workouts,
  onClose,
  onAssigned,
}: {
  date: Date
  athletes: Profile[]
  workouts: Workout[]
  onClose: () => void
  onAssigned: () => void
}) {
  const supabase = createSupabaseBrowserClient()
  const [selectedAthlete, setSelectedAthlete] = useState('')
  const [selectedWorkout, setSelectedWorkout] = useState('')
  const [coachNotes, setCoachNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAssign() {
    if (!selectedAthlete || !selectedWorkout) {
      setError('Please select both an athlete and a workout.')
      return
    }

    setSaving(true)
    setError(null)

    const { error: dbError } = await supabase
      .from('scheduled_workouts')
      .insert({
        athlete_id: selectedAthlete,
        workout_id: selectedWorkout,
        scheduled_date: toDateString(date),
        status: 'pending',
        coach_notes: coachNotes.trim() || null,
        athlete_notes: null,
      })

    if (dbError) {
      setError(dbError.message)
      setSaving(false)
      return
    }

    onAssigned()
    // Refresh the calendar after assigning
  }

  const selectedWorkoutDetails = workouts.find(w => w.id === selectedWorkout)

  return (
    // Modal backdrop — clicking outside closes it
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      {/* Modal box — stop click from bubbling to backdrop */}
      <div
        className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md"
        onClick={e => e.stopPropagation()}
        // stopPropagation() prevents the click from reaching the backdrop
      >
        <h2 className="text-xl font-bold mb-1">Assign Workout</h2>
        <p className="text-gray-400 text-sm mb-5">
          📅 {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>

        {error && (
          <div className="bg-red-950 border border-red-800 text-red-400 rounded-lg p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Athlete selector */}
        <div className="mb-4">
          <label className="block text-sm text-gray-300 mb-1">Athlete</label>
          {athletes.length === 0 ? (
            <p className="text-gray-500 text-sm bg-gray-800 rounded-lg p-3">
              No athletes yet. Athletes need to sign up and be assigned to you first.
            </p>
          ) : (
            <select
              value={selectedAthlete}
              onChange={e => setSelectedAthlete(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 focus:outline-none focus:border-cyan-500"
            >
              <option value="">Select an athlete...</option>
              {athletes.map(a => (
                <option key={a.id} value={a.id}>{a.full_name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Workout selector */}
        <div className="mb-4">
          <label className="block text-sm text-gray-300 mb-1">Workout</label>
          {workouts.length === 0 ? (
            <p className="text-gray-500 text-sm bg-gray-800 rounded-lg p-3">
              No workouts yet. Build some workouts first.
            </p>
          ) : (
            <select
              value={selectedWorkout}
              onChange={e => setSelectedWorkout(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 focus:outline-none focus:border-cyan-500"
            >
              <option value="">Select a workout...</option>
              {workouts.map(w => (
                <option key={w.id} value={w.id}>
                  {w.sport === 'swim' ? '🏊' : w.sport === 'bike' ? '🚴' : '🏃'} {w.name} — {formatDuration(w.duration_seconds)}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Preview selected workout */}
        {selectedWorkoutDetails && (
          <div className={`rounded-xl p-3 mb-4 border ${SPORT_STYLES[selectedWorkoutDetails.sport].bg} ${SPORT_STYLES[selectedWorkoutDetails.sport].border}`}>
            <div className="text-sm font-bold">{selectedWorkoutDetails.name}</div>
            <div className="text-xs text-gray-400 mt-1">
              ⏱ {formatDuration(selectedWorkoutDetails.duration_seconds)} &nbsp;·&nbsp;
              📊 {(selectedWorkoutDetails.intervals as unknown[])?.length} intervals
            </div>
            {selectedWorkoutDetails.description && (
              <div className="text-xs text-gray-400 mt-1">{selectedWorkoutDetails.description}</div>
            )}
          </div>
        )}

        {/* Coach notes */}
        <div className="mb-5">
          <label className="block text-sm text-gray-300 mb-1">
            Coach Notes (optional)
          </label>
          <textarea
            value={coachNotes}
            onChange={e => setCoachNotes(e.target.value)}
            placeholder="e.g. Keep cadence above 90, focus on form..."
            rows={2}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 resize-none"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl py-2.5 text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={saving || !selectedWorkout || athletes.length === 0}
            className="flex-1 bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 disabled:text-gray-500 text-gray-950 font-bold rounded-xl py-2.5 text-sm transition-colors"
          >
            {saving ? 'Assigning...' : 'Assign Workout'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// MAIN CALENDAR PAGE
// ─────────────────────────────────────────────────────────
export default function CalendarPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  // ── STATE ──────────────────────────────────────────────
  const [view, setView] = useState<CalendarView>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  // currentDate = the "anchor" date — week containing it, or month of it

  const [scheduledWorkouts, setScheduledWorkouts] = useState<ScheduledWorkoutWithDetails[]>([])
  const [athletes, setAthletes] = useState<Profile[]>([])
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [assignDate, setAssignDate] = useState<Date | null>(null)
  // assignDate = which day was clicked (opens the assign modal)

  // ── COMPUTE VISIBLE DATE RANGE ────────────────────────
  // We only fetch scheduled workouts for the dates currently visible
  const visibleDates = view === 'week'
    ? getWeekDays(getWeekStart(currentDate))
    : getMonthGrid(currentDate.getFullYear(), currentDate.getMonth())

  const rangeStart = toDateString(visibleDates[0])
  const rangeEnd = toDateString(visibleDates[visibleDates.length - 1])

  // ── FETCH DATA ────────────────────────────────────────
  const fetchData = useCallback(async () => {
    // useCallback = memoizes this function so it doesn't 
    // get recreated on every render (performance optimization)
    
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Fetch athletes belonging to this coach
    const { data: athleteData } = await supabase
      .from('profiles')
      .select('*')
      .eq('coach_id', user.id)
    if (athleteData) setAthletes(athleteData)

    // Fetch coach's workout library
    const { data: workoutData } = await supabase
      .from('workouts')
      .select('*')
      .eq('created_by', user.id)
      .order('name')
    if (workoutData) setWorkouts(workoutData)

    // Fetch scheduled workouts for visible date range
    // We join with workouts table to get full workout details
    if (athleteData && athleteData.length > 0) {
      const athleteIds = athleteData.map(a => a.id)
      // Extract just the IDs: ["uuid1", "uuid2", ...]

      const { data: swData } = await supabase
        .from('scheduled_workouts')
        .select(`
          *,
          workout:workouts(*)
        `)
        // This is a JOIN — "give me all scheduled_workouts 
        // AND the full workout object for each one"
        // Supabase does this automatically using foreign keys
        .in('athlete_id', athleteIds)
        // .in() = "where athlete_id is one of these values"
        .gte('scheduled_date', rangeStart)
        // .gte() = "greater than or equal to" start date
        .lte('scheduled_date', rangeEnd)
        // .lte() = "less than or equal to" end date

      if (swData) setScheduledWorkouts(swData as ScheduledWorkoutWithDetails[])
    } else {
      setScheduledWorkouts([])
    }

    setLoading(false)
  }, [rangeStart, rangeEnd])
  // Re-run fetchData whenever the visible date range changes

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── NAVIGATE PREV/NEXT ────────────────────────────────
  function navigate(direction: 'prev' | 'next') {
    setCurrentDate(prev => {
      const d = new Date(prev)
      if (view === 'week') {
        // Move 7 days forward or back
        d.setDate(d.getDate() + (direction === 'next' ? 7 : -7))
      } else {
        // Move 1 month forward or back
        d.setMonth(d.getMonth() + (direction === 'next' ? 1 : -1))
      }
      return d
    })
  }

  // ── GET WORKOUTS FOR A SPECIFIC DAY ──────────────────
  function getWorkoutsForDay(date: Date): ScheduledWorkoutWithDetails[] {
    const dateStr = toDateString(date)
    return scheduledWorkouts.filter(sw => sw.scheduled_date === dateStr)
    // Returns all scheduled workouts whose date matches this day
  }

  // ── HEADER TITLE ──────────────────────────────────────
  function getHeaderTitle(): string {
    if (view === 'week') {
      const weekStart = getWeekStart(currentDate)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      // Format: "Mar 1 – 7, 2026"
      return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    } else {
      return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // ── RENDER ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">

      {/* TOP NAV */}
      <nav className="border-b border-gray-800 bg-gray-900 px-6 py-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">

          {/* Left: back + title */}
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/coach')} className="text-gray-400 hover:text-white">
              ← Dashboard
            </button>
            <span className="text-gray-600">|</span>
            <span className="font-bold">Training Calendar</span>
          </div>

          {/* Center: prev / date title / next */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('prev')}
              className="bg-gray-800 hover:bg-gray-700 w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            >←</button>
            <span className="font-bold text-lg min-w-48 text-center">
              {getHeaderTitle()}
            </span>
            <button
              onClick={() => navigate('next')}
              className="bg-gray-800 hover:bg-gray-700 w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            >→</button>
          </div>

          {/* Right: view toggle + today button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentDate(new Date())}
              className="bg-gray-800 hover:bg-gray-700 text-sm px-3 py-1.5 rounded-lg transition-colors"
            >
              Today
            </button>
            <div className="flex bg-gray-800 rounded-lg p-1">
              {(['week', 'month'] as CalendarView[]).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    view === v
                      ? 'bg-cyan-500 text-gray-950'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* CALENDAR BODY */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 py-4">

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-gray-400">Loading calendar...</div>
            </div>
          ) : (
            <>
              {/* DAY NAME HEADERS */}
              <div className="grid grid-cols-7 mb-1">
                {DAY_NAMES.map(day => (
                  <div key={day} className="text-center text-xs font-bold text-gray-500 uppercase tracking-wider py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* ── WEEK VIEW ── */}
              {view === 'week' && (
                <div className="grid grid-cols-7 gap-2">
                  {getWeekDays(getWeekStart(currentDate)).map(date => {
                    const dayWorkouts = getWorkoutsForDay(date)
                    const isToday = toDateString(date) === toDateString(today)

                    return (
                      <div
                        key={date.toISOString()}
                        className={`
                          min-h-40 rounded-xl border p-2 cursor-pointer
                          hover:border-gray-600 transition-colors
                          ${isToday
                            ? 'border-cyan-500/50 bg-cyan-500/5'
                            : 'border-gray-800 bg-gray-900'}
                        `}
                        onClick={() => setAssignDate(date)}
                      >
                        {/* Date number */}
                        <div className={`
                          text-sm font-bold mb-2 w-7 h-7 flex items-center justify-center rounded-full
                          ${isToday ? 'bg-cyan-500 text-gray-950' : 'text-gray-300'}
                        `}>
                          {date.getDate()}
                        </div>

                        {/* Workout cards */}
                        <div className="space-y-1.5">
                          {dayWorkouts.map(sw => (
                            <WorkoutCard key={sw.id} sw={sw} compact={false} />
                          ))}
                        </div>

                        {/* "+" hint when empty */}
                        {dayWorkouts.length === 0 && (
                          <div className="text-gray-700 text-xs text-center mt-4">
                            + assign
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* ── MONTH VIEW ── */}
              {view === 'month' && (
                <div className="grid grid-cols-7 gap-1">
                  {getMonthGrid(currentDate.getFullYear(), currentDate.getMonth()).map(date => {
                    const dayWorkouts = getWorkoutsForDay(date)
                    const isToday = toDateString(date) === toDateString(today)
                    const isCurrentMonth = date.getMonth() === currentDate.getMonth()

                    return (
                      <div
                        key={date.toISOString()}
                        className={`
                          min-h-24 rounded-lg border p-1.5 cursor-pointer transition-colors
                          hover:border-gray-600
                          ${isToday ? 'border-cyan-500/50 bg-cyan-500/5'
                            : isCurrentMonth ? 'border-gray-800 bg-gray-900'
                            : 'border-gray-800/50 bg-gray-900/30'}
                        `}
                        onClick={() => setAssignDate(date)}
                      >
                        {/* Date number */}
                        <div className={`
                          text-xs font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full
                          ${isToday ? 'bg-cyan-500 text-gray-950'
                            : isCurrentMonth ? 'text-gray-300'
                            : 'text-gray-600'}
                        `}>
                          {date.getDate()}
                        </div>

                        {/* Compact workout cards */}
                        <div className="space-y-0.5">
                          {dayWorkouts.slice(0, 3).map(sw => (
                            <WorkoutCard key={sw.id} sw={sw} compact={true} />
                          ))}
                          {/* Show "+2 more" if there are more than 3 */}
                          {dayWorkouts.length > 3 && (
                            <div className="text-xs text-gray-500 pl-1">
                              +{dayWorkouts.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* HR ZONE LEGEND (bottom bar) */}
      <div className="border-t border-gray-800 bg-gray-900 px-6 py-2 flex items-center gap-6 text-xs text-gray-400 flex-shrink-0">
        <span className="font-bold text-gray-500 uppercase tracking-wider">HR Zones:</span>
        {[
          { zone: 1, color: 'bg-blue-400',   label: 'Z1 Recovery' },
          { zone: 2, color: 'bg-green-400',  label: 'Z2 Aerobic' },
          { zone: 3, color: 'bg-yellow-400', label: 'Z3 Tempo' },
          { zone: 4, color: 'bg-orange-400', label: 'Z4 Threshold' },
          { zone: 5, color: 'bg-red-400',    label: 'Z5 VO2 Max' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* ASSIGN WORKOUT MODAL */}
      {assignDate && (
        <AssignModal
          date={assignDate}
          athletes={athletes}
          workouts={workouts}
          onClose={() => setAssignDate(null)}
          onAssigned={() => {
            setAssignDate(null)
            fetchData()
            // Refresh calendar after assigning
          }}
        />
      )}
    </div>
  )
}