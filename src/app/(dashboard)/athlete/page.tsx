'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

interface Profile { id: string; full_name: string; role: string; strava_athlete_id?: string; invite_code?: string }
interface Interval { id: string; type: string; duration_seconds?: number; hr_zone?: number; label?: string }
interface Workout { id: string; name: string; sport: string; intervals: Interval[]; coach_notes?: string }
interface ScheduledWorkout { id: string; scheduled_date: string; status: string; workout: Workout; coach_notes?: string }

const ZONE_COLORS: Record<number, string> = { 1: '#6B8CAE', 2: '#4A9EDB', 3: '#4ADB8A', 4: '#E8A84C', 5: '#DB4A6A' }
const SPORT_COLORS: Record<string, string> = { swim: '#4A9EDB', bike: '#E8A84C', run: '#DB4A6A' }

function getGreeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export default function AthleteDashboard() {
  const [profile, setProfile]           = useState<Profile | null>(null)
  const [todayWorkout, setTodayWorkout] = useState<ScheduledWorkout | null>(null)
  const [weekWorkouts, setWeekWorkouts] = useState<ScheduledWorkout[]>([])
  const [loading, setLoading]           = useState(true)
  const router   = useRouter()
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof) { router.push('/login'); return }
      setProfile(prof)

      const today = new Date().toISOString().split('T')[0]
      const { data: tw } = await supabase
        .from('scheduled_workouts').select('*, workout:workouts(*)').eq('athlete_id', user.id).eq('scheduled_date', today).single()
      setTodayWorkout(tw ?? null)

      const startOfWeek = new Date()
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(endOfWeek.getDate() + 6)
      const { data: ww } = await supabase
        .from('scheduled_workouts').select('*, workout:workouts(*)')
        .eq('athlete_id', user.id)
        .gte('scheduled_date', startOfWeek.toISOString().split('T')[0])
        .lte('scheduled_date', endOfWeek.toISOString().split('T')[0])
      setWeekWorkouts(ww ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function markComplete() {
    if (!todayWorkout) return
    await supabase.from('scheduled_workouts').update({ status: 'completed' }).eq('id', todayWorkout.id)
    setTodayWorkout(prev => prev ? { ...prev, status: 'completed' } : null)
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay() + i)
    return d
  })

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ fontFamily: 'Cormorant Garant, serif', fontSize: '1.5rem', color: 'var(--silver)', fontStyle: 'italic' }}>
        Loading your training...
      </div>
    </div>
  )

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>

      {/* ── HEADER ── */}
      <div className="fade-up" style={{ marginBottom: '40px' }}>
        <p style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--silver-dim)', marginBottom: '6px' }}>
          Athlete Dashboard
        </p>
        <h1 style={{ fontFamily: 'Cormorant Garant, serif', fontSize: '2.8rem', fontWeight: 600, color: 'var(--platinum)', lineHeight: 1.1 }}>
          {getGreeting()}, {profile?.full_name?.split(' ')[0]} 👋
        </h1>
        <p style={{ color: 'var(--silver)', marginTop: '6px' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* ── TODAY'S WORKOUT ── */}
      <div className="fade-up-1" style={{ marginBottom: '28px' }}>
        <p style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--silver-dim)', marginBottom: '12px' }}>
          Today's Workout
        </p>

        {!todayWorkout ? (
          <div className="card-luxury" style={{ padding: '48px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>😴</div>
            <h2 style={{ fontFamily: 'Cormorant Garant, serif', fontSize: '1.8rem', color: 'var(--platinum)', marginBottom: '8px' }}>Rest Day</h2>
            <p style={{ color: 'var(--silver)', fontSize: '0.9rem' }}>No workout scheduled. Recovery is training too.</p>
          </div>
        ) : (
          <div className="card-luxury" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.1em',
                    textTransform: 'uppercase', padding: '3px 10px', borderRadius: '20px',
                    background: `${SPORT_COLORS[todayWorkout.workout.sport]}20`,
                    color: SPORT_COLORS[todayWorkout.workout.sport],
                    border: `1px solid ${SPORT_COLORS[todayWorkout.workout.sport]}40`,
                  }}>
                    {todayWorkout.workout.sport}
                  </span>
                  {todayWorkout.status === 'completed' && (
                    <span style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: '20px', background: 'rgba(74,219,138,0.1)', color: '#4ADB8A', border: '1px solid rgba(74,219,138,0.3)' }}>
                      Completed ✓
                    </span>
                  )}
                </div>
                <h2 style={{ fontFamily: 'Cormorant Garant, serif', fontSize: '1.8rem', fontWeight: 600, color: 'var(--platinum)' }}>
                  {todayWorkout.workout.name}
                </h2>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'Cormorant Garant, serif', fontSize: '2rem', color: 'var(--gold)', fontWeight: 600 }}>
                  {todayWorkout.workout.intervals.length}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--silver-dim)', letterSpacing: '0.05em' }}>intervals</div>
              </div>
            </div>

            {/* Interval bar */}
            <div style={{ display: 'flex', gap: '2px', height: '8px', borderRadius: '4px', overflow: 'hidden', marginBottom: '20px' }}>
              {todayWorkout.workout.intervals.map((interval, i) => (
                <div key={i} style={{
                  flex: interval.duration_seconds ?? 1,
                  background: ZONE_COLORS[interval.hr_zone ?? 2] ?? '#4A9EDB',
                  opacity: 0.85,
                }} />
              ))}
            </div>

            {/* Intervals list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
              {todayWorkout.workout.intervals.map((interval, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 14px', borderRadius: '8px',
                  background: 'rgba(255,255,255,0.02)',
                  borderLeft: `3px solid ${ZONE_COLORS[interval.hr_zone ?? 2]}`,
                }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: ZONE_COLORS[interval.hr_zone ?? 2], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: '#0A0A0F' }}>
                    {interval.hr_zone ?? '—'}
                  </div>
                  <span style={{ flex: 1, fontSize: '0.85rem', color: 'var(--platinum)' }}>{interval.label ?? interval.type}</span>
                  {interval.duration_seconds && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--silver)', fontFamily: 'DM Mono, monospace' }}>
                      {Math.floor(interval.duration_seconds / 60)}:{String(interval.duration_seconds % 60).padStart(2, '0')}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {todayWorkout.coach_notes && (
              <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: '10px', padding: '14px', marginBottom: '20px' }}>
                <p style={{ fontSize: '0.72rem', color: 'var(--gold-dim)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>Coach Notes</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--silver)', fontStyle: 'italic' }}>{todayWorkout.coach_notes}</p>
              </div>
            )}

            {todayWorkout.status !== 'completed' && (
              <button onClick={markComplete} className="btn-gold" style={{ padding: '12px 28px', borderRadius: '8px', border: 'none' }}>
                Mark Complete ✓
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── THIS WEEK ── */}
      <div className="fade-up-2" style={{ marginBottom: '28px' }}>
        <p style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--silver-dim)', marginBottom: '12px' }}>
          This Week
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
          {weekDays.map((day, i) => {
            const dateStr = day.toISOString().split('T')[0]
            const workout = weekWorkouts.find(w => w.scheduled_date === dateStr)
            const isToday = dateStr === new Date().toISOString().split('T')[0]
            return (
              <div key={i} className="card-luxury" style={{
                padding: '14px 10px', textAlign: 'center',
                borderColor: isToday ? 'rgba(201,168,76,0.4)' : undefined,
                background: isToday ? 'rgba(201,168,76,0.05)' : undefined,
              }}>
                <div style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: isToday ? 'var(--gold)' : 'var(--silver-dim)', marginBottom: '4px' }}>
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div style={{ fontFamily: 'Cormorant Garant, serif', fontSize: '1.4rem', fontWeight: 600, color: isToday ? 'var(--gold)' : 'var(--platinum)' }}>
                  {day.getDate()}
                </div>
                <div style={{ marginTop: '8px', height: '6px', width: '6px', borderRadius: '50%', margin: '8px auto 0', background: workout ? SPORT_COLORS[workout.workout?.sport] : 'transparent', border: workout ? 'none' : '1px solid var(--silver-dim)' }} />
                {workout?.status === 'completed' && (
                  <div style={{ fontSize: '0.6rem', color: '#4ADB8A', marginTop: '4px' }}>✓</div>
                )}
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: '20px', marginTop: '12px' }}>
          {[
            { icon: '✅', label: `${weekWorkouts.filter(w => w.status === 'completed').length} done` },
            { icon: '⏳', label: `${weekWorkouts.filter(w => w.status === 'pending').length} remaining` },
            { icon: '⏭️', label: `${weekWorkouts.filter(w => w.status === 'skipped').length} skipped` },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--silver)' }}>
              <span>{s.icon}</span><span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── VIEW ALL WORKOUTS ── */}
      <div className="fade-up-3" style={{ marginBottom: '28px' }}>
        <button
          onClick={() => router.push('/athlete/workouts')}
          className="btn-ghost"
          style={{ width: '100%', padding: '14px', borderRadius: '10px', fontSize: '0.8rem', letterSpacing: '0.08em' }}
        >
          View All Workouts →
        </button>
      </div>

      {/* ── STRAVA CONNECT ── */}
      <div className="fade-up-4">
        <p style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--silver-dim)', marginBottom: '12px' }}>
          Connect Apps
        </p>
        {(profile as any)?.strava_athlete_id ? (
          <div className="card-luxury" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '40px', height: '40px', background: '#FC4C02', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'white', fontSize: '0.85rem' }}>S</div>
            <div>
              <div style={{ fontWeight: 600, color: '#FC4C02' }}>Strava Connected ✓</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--silver-dim)' }}>Activities syncing automatically</div>
            </div>
          </div>
        ) : (
          <div className="card-luxury" style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '40px', height: '40px', background: 'rgba(252,76,2,0.15)', border: '1px solid rgba(252,76,2,0.3)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#FC4C02', fontSize: '0.85rem' }}>S</div>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--platinum)' }}>Connect Strava</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--silver-dim)' }}>Auto-import your activities</div>
              </div>
            </div>
            
            <a
              href={profile ? `https://www.strava.com/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID}&redirect_uri=${typeof window !== 'undefined' ? window.location.origin : ''}/api/strava/callback&response_type=code&approval_prompt=auto&scope=activity:read_all&state=${profile.id}` : '#'}
              style={{ background: '#FC4C02', color: 'white', fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '10px 18px', borderRadius: '8px', textDecoration: 'none' }}
            >
              Connect →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}