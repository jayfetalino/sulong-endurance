'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useBreakpoint } from '@/hooks/useBreakpoint'

interface AthleteProfile {
  id: string
  full_name: string
  athlete_type: string | null
  race_distance: string | null
  coaching_goals: string | null
  ftp: number | null
  lthr: number | null
}

interface CoachProfile {
  id: string
  full_name: string
  role: string
  invite_code: string | null
}

interface WorkoutRow {
  athlete_id: string
  scheduled_date: string
  status: string
}

const SPORT_TYPE_COLORS: Record<string, string> = {
  Runner: '#DB4A6A',
  Cyclist: '#E8A84C',
  Swimmer: '#4A9EDB',
  Triathlete: '#C9A84C',
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="card-luxury" style={{ padding: '20px 24px', boxSizing: 'border-box' }}>
      <div style={{ fontSize: '1.3rem', marginBottom: '8px' }}>{icon}</div>
      <div style={{ fontFamily: 'Cormorant Garant, serif', fontSize: '2.4rem', fontWeight: 600, color: 'var(--gold)', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: '0.72rem', color: 'var(--silver)', marginTop: '6px', letterSpacing: '0.05em' }}>
        {label}
      </div>
    </div>
  )
}

export default function CoachAthletesPage() {
  const supabase = createSupabaseBrowserClient()
  const router   = useRouter()
  const { isMobile, isTablet } = useBreakpoint()

  const [coach,    setCoach]    = useState<CoachProfile | null>(null)
  const [athletes, setAthletes] = useState<AthleteProfile[]>([])
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')

  const today = new Date().toISOString().slice(0, 10)

  // Start of current week (Sunday)
  const weekStart = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay())
    return d.toISOString().slice(0, 10)
  }, [])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: prof } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()
      if (!prof || prof.role !== 'coach') { router.push('/athlete'); return }
      setCoach(prof as CoachProfile)

      const { data: aths } = await supabase
        .from('profiles')
        .select('id, full_name, athlete_type, race_distance, coaching_goals, ftp, lthr')
        .eq('coach_id', user.id)
        .eq('role', 'athlete')
        .order('full_name')

      const athleteList = (aths ?? []) as AthleteProfile[]
      setAthletes(athleteList)

      if (athleteList.length > 0) {
        const ids = athleteList.map(a => a.id)
        const { data: wrows } = await supabase
          .from('scheduled_workouts')
          .select('athlete_id, scheduled_date, status')
          .in('athlete_id', ids)
        setWorkouts((wrows ?? []) as WorkoutRow[])
      }

      setLoading(false)
    }
    load()
  }, [])

  // Per-athlete workout stats
  function athleteStats(athleteId: string) {
    const aw = workouts.filter(w => w.athlete_id === athleteId)
    const upcoming  = aw.filter(w => w.status === 'scheduled' && w.scheduled_date >= today).length
    const missed    = aw.filter(w => w.status === 'missed').length
    const completed = aw.filter(w => w.status === 'completed').length
    const lastDates = aw
      .filter(w => w.status === 'completed')
      .map(w => w.scheduled_date)
      .sort()
      .reverse()
    const lastWorkout = lastDates[0] ?? null
    return { upcoming, missed, completed, lastWorkout }
  }

  // Global stats
  const globalUpcoming  = workouts.filter(w => w.status === 'scheduled' && w.scheduled_date >= today).length
  const globalMissed    = workouts.filter(w => w.status === 'missed').length
  const globalThisWeek  = workouts.filter(w => w.status === 'completed' && w.scheduled_date >= weekStart).length

  // Filtered athletes
  const filtered = athletes.filter(a =>
    a.full_name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ fontFamily: 'Cormorant Garant, serif', fontSize: '1.5rem', color: 'var(--silver)', fontStyle: 'italic' }}>
        Loading athletes...
      </div>
    </div>
  )

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>

      {/* ── HEADER ── */}
      <div className="fade-up" style={{ marginBottom: '32px' }}>
        <p style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--silver-dim)', marginBottom: '6px' }}>
          Coach
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <h1 style={{ fontFamily: 'Cormorant Garant, serif', fontSize: 'clamp(1.6rem, 5vw, 2.8rem)', fontWeight: 600, color: 'var(--platinum)', lineHeight: 1.1, wordBreak: 'break-word' }}>
            Your Athletes
          </h1>
          <span style={{
            fontFamily: 'DM Mono, monospace',
            fontSize: '0.8rem', fontWeight: 500,
            padding: '4px 12px', borderRadius: '20px',
            background: 'rgba(201,168,76,0.1)',
            border: '1px solid rgba(201,168,76,0.25)',
            color: 'var(--gold)',
          }}>
            {athletes.length} {athletes.length === 1 ? 'athlete' : 'athletes'}
          </span>
        </div>
      </div>

      {/* ── STATS BAR ── */}
      <div className="fade-up-1" style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        gap: '12px',
        marginBottom: '28px',
      }}>
        <StatCard label="Total Athletes"      value={athletes.length}  icon="🏊" />
        <StatCard label="Upcoming Workouts"   value={globalUpcoming}   icon="📋" />
        <StatCard label="Missed Workouts"     value={globalMissed}     icon="⚠️" />
        <StatCard label="Completed This Week" value={globalThisWeek}   icon="✅" />
      </div>

      {/* ── SEARCH ── */}
      {athletes.length > 0 && (
        <div className="fade-up-2" style={{ marginBottom: '24px' }}>
          <input
            className="input-luxury"
            placeholder="Search athletes by name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: '400px' }}
          />
        </div>
      )}

      {/* ── EMPTY STATE ── */}
      {athletes.length === 0 ? (
        <div className="fade-up-2 card-luxury" style={{ padding: isMobile ? '32px 20px' : '48px', textAlign: 'center', maxWidth: '520px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🏊</div>
          <h2 style={{ fontFamily: 'Cormorant Garant, serif', fontSize: '1.8rem', fontWeight: 600, color: 'var(--platinum)', marginBottom: '8px' }}>
            No athletes yet
          </h2>
          <p style={{ color: 'var(--silver)', fontSize: '0.9rem', marginBottom: '28px' }}>
            Share your invite code and athletes will appear here automatically once they sign up.
          </p>

          {/* Invite code display */}
          <div style={{
            background: 'rgba(201,168,76,0.06)',
            border: '1px solid rgba(201,168,76,0.2)',
            borderRadius: '14px', padding: '24px',
            marginBottom: '20px',
          }}>
            <p style={{ fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--silver-dim)', marginBottom: '10px' }}>
              Your Invite Code
            </p>
            <div style={{
              fontFamily: 'DM Mono, monospace',
              fontSize: '2.6rem', fontWeight: 500,
              color: 'var(--gold)', letterSpacing: '0.25em',
              marginBottom: '16px',
            }}>
              {coach?.invite_code ?? '------'}
            </div>
            <button
              onClick={() => {
                const code = coach?.invite_code ?? ''
                const url  = `${window.location.origin}/signup?code=${code}`
                navigator.clipboard.writeText(url)
              }}
              className="btn-gold"
              style={{ padding: '10px 24px', borderRadius: '8px', border: 'none' }}
            >
              Copy Signup Link
            </button>
          </div>

          <a
            href={`/signup?code=${coach?.invite_code ?? ''}`}
            style={{ fontSize: '0.78rem', color: 'var(--silver-dim)', textDecoration: 'underline' }}
          >
            Preview signup page →
          </a>
        </div>
      ) : filtered.length === 0 ? (
        <div className="fade-up-2 card-luxury" style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: 'var(--silver)' }}>No athletes match &ldquo;{search}&rdquo;</p>
        </div>
      ) : (
        /* ── ATHLETE CARDS ── */
        <div className="fade-up-3" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filtered.map(athlete => {
            const stats   = athleteStats(athlete.id)
            const typeColor = SPORT_TYPE_COLORS[athlete.athlete_type ?? ''] ?? 'var(--gold)'

            return (
              <div
                key={athlete.id}
                className="card-luxury"
                style={{ padding: isMobile ? '18px 16px' : '24px 28px', boxSizing: 'border-box' }}
              >
                <div style={{
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  gap: isMobile ? '16px' : '0',
                  alignItems: isMobile ? 'flex-start' : 'center',
                  justifyContent: 'space-between',
                }}>

                  {/* Left: avatar + info */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flex: 1, minWidth: 0 }}>
                    {/* Avatar */}
                    <div style={{
                      width: '52px', height: '52px', borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg, rgba(201,168,76,0.3), rgba(201,168,76,0.08))',
                      border: '2px solid rgba(201,168,76,0.35)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'Cormorant Garant, serif',
                      fontSize: '1.3rem', fontWeight: 700, color: 'var(--gold)',
                    }}>
                      {initials(athlete.full_name)}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Name + type badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <span style={{ fontFamily: 'Cormorant Garant, serif', fontSize: '1.3rem', fontWeight: 600, color: 'var(--platinum)' }}>
                          {athlete.full_name}
                        </span>
                        {athlete.athlete_type && (
                          <span style={{
                            fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
                            padding: '2px 8px', borderRadius: '20px',
                            background: `${typeColor}18`, color: typeColor, border: `1px solid ${typeColor}35`,
                          }}>
                            {athlete.athlete_type}
                          </span>
                        )}
                      </div>

                      {/* Race distance */}
                      {athlete.race_distance && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--silver-dim)', marginBottom: '10px' }}>
                          {athlete.race_distance}
                        </div>
                      )}

                      {/* Workout stats row */}
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '10px' }}>
                        {[
                          { label: 'Upcoming',  value: stats.upcoming,  color: 'var(--gold)' },
                          { label: 'Completed', value: stats.completed, color: '#4ADB8A'      },
                          { label: 'Missed',    value: stats.missed,    color: '#DB4A6A'      },
                        ].map(s => (
                          <div key={s.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '48px' }}>
                            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '1.1rem', fontWeight: 600, color: s.color, lineHeight: 1 }}>
                              {s.value}
                            </span>
                            <span style={{ fontSize: '0.62rem', color: 'var(--silver-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '2px' }}>
                              {s.label}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Performance metrics + last workout */}
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {athlete.ftp != null && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--silver-dim)', fontFamily: 'DM Mono, monospace' }}>
                            FTP <span style={{ color: 'var(--silver)' }}>{athlete.ftp}w</span>
                          </span>
                        )}
                        {athlete.lthr != null && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--silver-dim)', fontFamily: 'DM Mono, monospace' }}>
                            LTHR <span style={{ color: 'var(--silver)' }}>{athlete.lthr}bpm</span>
                          </span>
                        )}
                        {stats.lastWorkout && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--silver-dim)' }}>
                            Last: <span style={{ color: 'var(--silver)' }}>
                              {new Date(stats.lastWorkout + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: actions */}
                  <div style={{
                    display: 'flex',
                    flexDirection: isTablet ? 'column' : 'row',
                    gap: '8px',
                    flexShrink: 0,
                    width: isMobile ? '100%' : undefined,
                  }}>
                    <button
                      onClick={() => router.push(`/coach/athletes/${athlete.id}`)}
                      className="btn-gold"
                      style={{
                        padding: '9px 20px', borderRadius: '8px', border: 'none',
                        flex: isMobile ? 1 : undefined,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      View Plan
                    </button>
                    <button
                      onClick={() => router.push('/calendar')}
                      className="btn-ghost"
                      style={{
                        padding: '9px 20px', borderRadius: '8px',
                        flex: isMobile ? 1 : undefined,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Assign Workout
                    </button>
                  </div>

                </div>
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}
