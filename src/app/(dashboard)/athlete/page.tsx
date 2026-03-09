// src/app/(dashboard)/athlete/page.tsx
// ─────────────────────────────────────────────────────────
// The ATHLETE DASHBOARD — what athletes see when they log in.
//
// Shows all 4 sections:
// 1. Today's assigned workout (big + prominent)
// 2. This week's full schedule (7 day strip)
// 3. Last workout summary (what they just did)
// 4. Upcoming race countdown (motivation!)
// ─────────────────────────────────────────────────────────
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import type { Profile, Workout, ScheduledWorkout, Race } from '@/types'
import { getStravaAuthUrl } from '@/lib/strava'

// ── JOINED TYPES ──────────────────────────────────────────
interface ScheduledWorkoutFull extends ScheduledWorkout {
  workout: Workout
}

// ── CONSTANTS ─────────────────────────────────────────────
const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_NAMES_FULL  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

const SPORT_STYLES: Record<string, { bg: string; border: string; text: string; icon: string; bar: string }> = {
  swim:  { bg: 'bg-cyan-500/15',   border: 'border-cyan-500/40',   text: 'text-cyan-300',   icon: '🏊', bar: 'bg-cyan-500' },
  bike:  { bg: 'bg-orange-500/15', border: 'border-orange-500/40', text: 'text-orange-300', icon: '🚴', bar: 'bg-orange-500' },
  run:   { bg: 'bg-green-500/15',  border: 'border-green-500/40',  text: 'text-green-300',  icon: '🏃', bar: 'bg-green-500' },
  brick: { bg: 'bg-purple-500/15', border: 'border-purple-500/40', text: 'text-purple-300', icon: '🧱', bar: 'bg-purple-500' },
}

const HR_ZONE_INFO: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'Z1 · Recovery',   color: 'text-blue-400',   bg: 'bg-blue-400' },
  2: { label: 'Z2 · Aerobic',    color: 'text-green-400',  bg: 'bg-green-400' },
  3: { label: 'Z3 · Tempo',      color: 'text-yellow-400', bg: 'bg-yellow-400' },
  4: { label: 'Z4 · Threshold',  color: 'text-orange-400', bg: 'bg-orange-400' },
  5: { label: 'Z5 · VO2 Max',    color: 'text-red-400',    bg: 'bg-red-400' },
}

const RACE_DISTANCE_LABELS: Record<string, string> = {
  sprint: 'Sprint',
  olympic: 'Olympic',
  '70.3': 'Half Ironman 70.3',
  '140.6': 'Full Ironman 140.6',
}

// ── HELPER FUNCTIONS ──────────────────────────────────────

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h === 0) return `${m} min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

// Get all 7 days of the current week (Sun → Sat)
function getCurrentWeekDays(): Date[] {
  const today = new Date()
  const sunday = new Date(today)
  sunday.setDate(today.getDate() - today.getDay())
  sunday.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday)
    d.setDate(sunday.getDate() + i)
    return d
  })
}

// How many days until a future date
function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  const diff = target.getTime() - today.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
  // Convert milliseconds → days
}

// Get dominant HR zone from intervals
function getDominantHRZone(workout: Workout): number {
  const intervals = workout.intervals as Array<{ hr_zone?: number; type?: string }>
  if (!intervals?.length) return 2
  const workIntervals = intervals.filter(i => i.type === 'work' && i.hr_zone)
  if (!workIntervals.length) return 2
  const zones = workIntervals.map(i => i.hr_zone as number)
  return zones.sort((a, b) =>
    zones.filter(v => v === b).length - zones.filter(v => v === a).length
  )[0]
}

// Get a friendly time greeting
function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// ── WORKOUT INTERVAL PREVIEW ──────────────────────────────
// Shows a visual bar of the workout structure
function WorkoutIntervalBar({ workout }: { workout: Workout }) {
  const intervals = workout.intervals as Array<{
    type: string
    duration_seconds: number
    hr_zone?: number
    label?: string
  }>

  if (!intervals?.length) return null

  const totalSecs = intervals.reduce((sum, i) => sum + (i.duration_seconds || 0), 0)
  if (totalSecs === 0) return null

  return (
    <div className="flex h-3 rounded-full overflow-hidden gap-px mt-3">
      {intervals.map((interval, idx) => {
        const pct = (interval.duration_seconds / totalSecs) * 100
        const zone = interval.hr_zone ?? 2
        const colors: Record<number, string> = {
          1: 'bg-blue-500', 2: 'bg-green-500',
          3: 'bg-yellow-500', 4: 'bg-orange-500', 5: 'bg-red-500',
        }
        const color = interval.type === 'rest' || interval.type === 'warmup' || interval.type === 'cooldown'
          ? 'bg-gray-600'
          : colors[zone] ?? 'bg-gray-500'

        return (
          <div
            key={idx}
            className={`${color} transition-all`}
            style={{ width: `${pct}%` }}
            title={interval.label || interval.type}
          />
        )
      })}
    </div>
  )
}

// ── MARK COMPLETE BUTTON ──────────────────────────────────
function MarkCompleteButton({
  scheduledWorkout,
  onComplete,
}: {
  scheduledWorkout: ScheduledWorkoutFull
  onComplete: () => void
}) {
  const supabase = createSupabaseBrowserClient()
  const [loading, setLoading] = useState(false)
  const [note, setNote] = useState('')
  const [showNote, setShowNote] = useState(false)

  async function markComplete() {
    setLoading(true)
    await supabase
      .from('scheduled_workouts')
      .update({
        status: 'completed',
        athlete_notes: note.trim() || null,
      })
      .eq('id', scheduledWorkout.id)
    setLoading(false)
    onComplete()
    // Refresh parent data after marking complete
  }

  async function markSkipped() {
    setLoading(true)
    await supabase
      .from('scheduled_workouts')
      .update({ status: 'skipped' })
      .eq('id', scheduledWorkout.id)
    setLoading(false)
    onComplete()
  }

  if (scheduledWorkout.status === 'completed') {
    return (
      <div className="flex items-center gap-2 text-green-400 font-bold">
        <span className="text-xl">✅</span>
        <div>
          <div>Workout Complete!</div>
          {scheduledWorkout.athlete_notes && (
            <div className="text-sm text-gray-400 font-normal mt-0.5">
              "{scheduledWorkout.athlete_notes}"
            </div>
          )}
        </div>
      </div>
    )
  }

  if (scheduledWorkout.status === 'skipped') {
    return (
      <div className="flex items-center gap-2 text-gray-400">
        <span className="text-xl">⏭️</span>
        <span>Workout skipped</span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {showNote && (
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="How did it go? Any notes for your coach..."
          rows={2}
          className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500 resize-none"
        />
      )}
      <div className="flex gap-3">
        <button
          onClick={() => setShowNote(!showNote)}
          className="flex-shrink-0 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm px-4 py-2.5 rounded-xl transition-colors"
        >
          {showNote ? 'Hide note' : '📝 Add note'}
        </button>
        <button
          onClick={markComplete}
          disabled={loading}
          className="flex-1 bg-green-500 hover:bg-green-400 disabled:bg-gray-700 text-gray-950 font-bold rounded-xl py-2.5 transition-colors"
        >
          {loading ? 'Saving...' : '✅ Mark Complete'}
        </button>
        <button
          onClick={markSkipped}
          disabled={loading}
          className="flex-shrink-0 bg-gray-800 hover:bg-gray-700 text-gray-400 text-sm px-4 py-2.5 rounded-xl transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  )
}
// ── STRAVA CONNECT CARD ───────────────────────────────────
function StravaConnectCard({ profile }: { profile: Profile | null }) {
  const isConnected = !!(profile as any)?.strava_athlete_id

  // Read URL params to show success/error messages
  // (Strava redirects back with ?strava=connected)
  const params = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search)
    : null
  const stravaStatus = params?.get('strava')

  if (isConnected) {
    return (
      <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
            S
          </div>
          <div>
            <div className="font-bold text-orange-300">Strava Connected ✅</div>
            <div className="text-xs text-gray-400">
              Your activities are syncing automatically
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      {stravaStatus === 'error' && (
        <div className="bg-red-950 border border-red-800 text-red-400 rounded-lg p-3 mb-4 text-sm">
          Something went wrong connecting Strava. Please try again.
        </div>
      )}
      {stravaStatus === 'cancelled' && (
        <div className="bg-yellow-950 border border-yellow-800 text-yellow-400 rounded-lg p-3 mb-4 text-sm">
          Strava connection cancelled.
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-700 rounded-xl flex items-center justify-center text-orange-400 font-bold text-sm">
            S
          </div>
          <div>
            <div className="font-bold">Connect Strava</div>
            <div className="text-xs text-gray-400">
              Auto-import your runs, rides & swims
            </div>
          </div>
        </div>
        <a
          href={profile ? getStravaAuthUrl(profile.id) : '#'}
          className="bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-colors"
        >
          Connect →
        </a>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// MAIN ATHLETE DASHBOARD
// ─────────────────────────────────────────────────────────
export default function AthleteDashboard() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  // ── STATE ──────────────────────────────────────────────
  const [profile, setProfile] = useState<Profile | null>(null)
  const [todayWorkout, setTodayWorkout] = useState<ScheduledWorkoutFull | null>(null)
  const [weekWorkouts, setWeekWorkouts] = useState<ScheduledWorkoutFull[]>([])
  const [lastWorkout, setLastWorkout] = useState<ScheduledWorkoutFull | null>(null)
  const [races, setRaces] = useState<Race[]>([])
  const [loading, setLoading] = useState(true)

  // ── LOAD DATA ─────────────────────────────────────────
  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Fetch athlete profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    if (profileData) setProfile(profileData)

    // Get this week's date range
    const weekDays = getCurrentWeekDays()
    const weekStart = toDateString(weekDays[0])
    const weekEnd = toDateString(weekDays[6])
    const todayStr = toDateString(new Date())

    // Fetch all scheduled workouts for this week
    // The "workout:workouts(*)" part joins the workouts table
    // so we get the full workout details in one query
    const { data: weekData } = await supabase
      .from('scheduled_workouts')
      .select('*, workout:workouts(*)')
      .eq('athlete_id', user.id)
      .gte('scheduled_date', weekStart)
      .lte('scheduled_date', weekEnd)
      .order('scheduled_date', { ascending: true })

    if (weekData) {
      const full = weekData as ScheduledWorkoutFull[]
      setWeekWorkouts(full)

      // Find today's workout from the week data
      const todayW = full.find(sw => sw.scheduled_date === todayStr)
      setTodayWorkout(todayW ?? null)
    }

    // Fetch last completed workout (before today)
    const { data: lastData } = await supabase
      .from('scheduled_workouts')
      .select('*, workout:workouts(*)')
      .eq('athlete_id', user.id)
      .eq('status', 'completed')
      .lt('scheduled_date', todayStr)
      // .lt() = "less than" = before today
      .order('scheduled_date', { ascending: false })
      .limit(1)
      // Only get the most recent one
      .single()

    if (lastData) setLastWorkout(lastData as ScheduledWorkoutFull)

    // Fetch upcoming races
    const { data: raceData } = await supabase
      .from('races')
      .select('*')
      .eq('athlete_id', user.id)
      .gte('race_date', todayStr)
      // Only future races
      .order('race_date', { ascending: true })
      .limit(3)

    if (raceData) setRaces(raceData)

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // ── LOADING ───────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 text-lg">Loading your training...</div>
      </div>
    )
  }

  const today = new Date()
  const weekDays = getCurrentWeekDays()
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Athlete'

  // ── RENDER ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* TOP NAV */}
      <nav className="border-b border-gray-800 bg-gray-900 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-cyan-400">
              Sulong Endurance
            </span>
            <span className="text-gray-600">|</span>
            <span className="text-gray-400 text-sm">My Training</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-300 text-sm">👋 {profile?.full_name}</span>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* ── GREETING ── */}
        <div>
          <h1 className="text-3xl font-bold">
            {getGreeting()}, {firstName} 👋
          </h1>
          <p className="text-gray-400 mt-1">
            {today.toLocaleDateString('en-US', {
              weekday: 'long', month: 'long', day: 'numeric'
            })}
          </p>
        </div>

        {/* ── SECTION 1: TODAY'S WORKOUT ── */}
        <section>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
            Today's Workout
          </h2>

          {todayWorkout ? (
            (() => {
              // Get style for this sport
              const style = SPORT_STYLES[todayWorkout.workout.sport] ?? SPORT_STYLES.bike
              const hrZone = getDominantHRZone(todayWorkout.workout)
              const zoneInfo = HR_ZONE_INFO[hrZone]
              const intervals = todayWorkout.workout.intervals as Array<{
                type: string; duration_seconds: number; hr_zone?: number; label?: string
              }>

              return (
                <div className={`rounded-2xl border p-6 ${style.bg} ${style.border}`}>
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-3xl">{style.icon}</span>
                        <h3 className="text-2xl font-bold">{todayWorkout.workout.name}</h3>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-400">
                        <span>⏱ {formatDuration(todayWorkout.workout.duration_seconds)}</span>
                        <span>📊 {intervals?.length ?? 0} intervals</span>
                        <span className={`font-bold ${zoneInfo?.color}`}>
                          {zoneInfo?.label}
                        </span>
                      </div>
                    </div>
                    {/* HR Zone badge */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg ${zoneInfo?.bg ?? 'bg-gray-500'}`}>
                      Z{hrZone}
                    </div>
                  </div>

                  {/* Workout structure bar */}
                  <WorkoutIntervalBar workout={todayWorkout.workout} />

                  {/* Interval breakdown */}
                  {intervals?.length > 0 && (
                    <div className="mt-4 space-y-1.5">
                      {intervals.map((interval, idx) => {
                        const zone = interval.hr_zone ?? 2
                        const zInfo = HR_ZONE_INFO[zone]
                        const mins = Math.floor((interval.duration_seconds || 0) / 60)
                        const secs = (interval.duration_seconds || 0) % 60
                        const timeStr = secs > 0 ? `${mins}m ${secs}s` : `${mins}m`

                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-3 bg-black/20 rounded-lg px-3 py-2"
                          >
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${zInfo?.bg ?? 'bg-gray-400'}`} />
                            <span className="text-sm text-gray-300 capitalize flex-shrink-0 w-16">
                              {interval.type}
                            </span>
                            <span className="text-sm text-white font-medium flex-1">
                              {interval.label || zInfo?.label}
                            </span>
                            <span className="text-sm text-gray-400 flex-shrink-0">{timeStr}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Coach notes */}
                  {todayWorkout.coach_notes && (
                    <div className="mt-4 bg-black/20 rounded-xl px-4 py-3">
                      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                        Coach Says
                      </div>
                      <p className="text-sm text-gray-200">{todayWorkout.coach_notes}</p>
                    </div>
                  )}

                  {/* Mark complete */}
                  <div className="mt-5 pt-4 border-t border-white/10">
                    <MarkCompleteButton
                      scheduledWorkout={todayWorkout}
                      onComplete={loadData}
                    />
                  </div>
                </div>
              )
            })()
          ) : (
            // No workout today
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
              <div className="text-5xl mb-3">😴</div>
              <h3 className="text-xl font-bold mb-1">Rest Day</h3>
              <p className="text-gray-400">No workout scheduled for today. Recovery is training too!</p>
            </div>
          )}
        </section>

        {/* ── SECTION 2: THIS WEEK'S SCHEDULE ── */}
        <section>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
            This Week
          </h2>

          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day, idx) => {
              const dayStr = toDateString(day)
              const todayStr = toDateString(new Date())
              const isToday = dayStr === todayStr
              const isPast = day < new Date(todayStr)
              // Find any workout scheduled for this day
              const sw = weekWorkouts.find(w => w.scheduled_date === dayStr)
              const style = sw ? SPORT_STYLES[sw.workout.sport] : null

              return (
                <div
                  key={idx}
                  className={`
                    rounded-xl border p-2 text-center min-h-20
                    ${isToday
                      ? 'border-cyan-500/50 bg-cyan-500/5'
                      : isPast
                      ? 'border-gray-800/50 bg-gray-900/30 opacity-60'
                      : 'border-gray-800 bg-gray-900'}
                  `}
                >
                  {/* Day name */}
                  <div className={`text-xs font-bold mb-1 ${isToday ? 'text-cyan-400' : 'text-gray-500'}`}>
                    {DAY_NAMES_SHORT[day.getDay()]}
                  </div>
                  {/* Date number */}
                  <div className={`text-sm font-bold mb-2 ${isToday ? 'text-white' : 'text-gray-400'}`}>
                    {day.getDate()}
                  </div>

                  {/* Sport icon if workout exists */}
                  {sw && style ? (
                    <div className="space-y-1">
                      <div className="text-lg">{style.icon}</div>
                      {/* Status dot */}
                      <div className={`w-2 h-2 rounded-full mx-auto ${
                        sw.status === 'completed' ? 'bg-green-400'
                        : sw.status === 'skipped' ? 'bg-red-400'
                        : 'bg-gray-500'
                      }`} />
                    </div>
                  ) : (
                    <div className="text-gray-700 text-lg">·</div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Week summary */}
          <div className="flex gap-4 mt-3 text-sm text-gray-400">
            <span>
              ✅ {weekWorkouts.filter(w => w.status === 'completed').length} done
            </span>
            <span>
              ⏳ {weekWorkouts.filter(w => w.status === 'pending').length} remaining
            </span>
            <span>
              ⏭️ {weekWorkouts.filter(w => w.status === 'skipped').length} skipped
            </span>
          </div>
        </section>

        {/* ── SECTIONS 3 & 4: LAST WORKOUT + RACE COUNTDOWN ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* ── SECTION 3: LAST WORKOUT SUMMARY ── */}
          <section>
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
              Last Workout
            </h2>

            {lastWorkout ? (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">
                    {SPORT_STYLES[lastWorkout.workout.sport]?.icon}
                  </span>
                  <div>
                    <div className="font-bold">{lastWorkout.workout.name}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(lastWorkout.scheduled_date).toLocaleDateString('en-US', {
                        weekday: 'long', month: 'short', day: 'numeric'
                      })}
                    </div>
                  </div>
                  <span className="ml-auto text-green-400 text-xl">✅</span>
                </div>

                <div className="flex gap-4 text-sm text-gray-400">
                  <span>⏱ {formatDuration(lastWorkout.workout.duration_seconds)}</span>
                </div>

                {lastWorkout.athlete_notes && (
                  <div className="mt-3 bg-gray-800 rounded-xl px-3 py-2">
                    <p className="text-sm text-gray-300 italic">
                      "{lastWorkout.athlete_notes}"
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center">
                <p className="text-gray-500 text-sm">No completed workouts yet.</p>
                <p className="text-gray-600 text-xs mt-1">Complete today's workout to see it here!</p>
              </div>
            )}
          </section>

          {/* ── SECTION 4: RACE COUNTDOWN ── */}
          <section>
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
              Upcoming Races
            </h2>

            {races.length > 0 ? (
              <div className="space-y-3">
                {races.map(race => {
                  const days = daysUntil(race.race_date)
                  const isArace = race.priority === 'A'

                  return (
                    <div
                      key={race.id}
                      className={`rounded-2xl border p-4 ${
                        isArace
                          ? 'bg-yellow-500/10 border-yellow-500/30'
                          : 'bg-gray-900 border-gray-800'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {isArace && <span className="text-yellow-400 text-sm font-bold">⭐ A Race</span>}
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                              race.priority === 'A' ? 'bg-yellow-500/20 text-yellow-400'
                              : race.priority === 'B' ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-gray-700 text-gray-400'
                            }`}>
                              {race.priority} Race
                            </span>
                          </div>
                          <div className="font-bold">{race.name}</div>
                          <div className="text-sm text-gray-400 mt-0.5">
                            {RACE_DISTANCE_LABELS[race.distance] ?? race.distance}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(race.race_date).toLocaleDateString('en-US', {
                              weekday: 'short', month: 'long', day: 'numeric', year: 'numeric'
                            })}
                          </div>
                        </div>

                        {/* Countdown */}
                        <div className="text-right flex-shrink-0">
                          <div className={`text-3xl font-bold ${isArace ? 'text-yellow-400' : 'text-white'}`}>
                            {days}
                          </div>
                          <div className="text-xs text-gray-400">days to go</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center">
                <div className="text-4xl mb-2">🏁</div>
                <p className="text-gray-500 text-sm">No races scheduled yet.</p>
                <p className="text-gray-600 text-xs mt-1">
                  Ask your coach to add your goal race!
                </p>
              </div>
            )}
          </section>
          {/* ── STRAVA CONNECTION ── */}
        <section>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
            Connect Your Apps
          </h2>
          <StravaConnectCard profile={profile} />
        </section>
        </div>

      </main>
    </div>
  )
}