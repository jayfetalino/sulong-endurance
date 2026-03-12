'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import type { Workout } from '@/types'
import { useBreakpoint } from '@/hooks/useBreakpoint'

const SPORT_COLORS: Record<string, string> = {
  swim: '#4A9EDB', bike: '#E8A84C', run: '#DB4A6A', brick: '#A84ADB',
}
const SPORT_ICONS: Record<string, string> = {
  swim: '🏊', bike: '🚴', run: '🏃', brick: '🧱',
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function getTotalDuration(workout: Workout): number {
  if (!workout.intervals || !Array.isArray(workout.intervals)) return 0
  return workout.intervals.reduce((sum: number, iv: any) => sum + (iv.duration_seconds ?? 0), 0)
}

export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading]   = useState(true)
  const router   = useRouter()
  const supabase = createSupabaseBrowserClient()
  const { isMobile, isWide } = useBreakpoint()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase
        .from('workouts')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
      setWorkouts(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>

      {/* ── HEADER ── */}
      <div className="fade-up" style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'flex-end', gap: isMobile ? '12px' : '0', marginBottom: '36px' }}>
        <div>
          <p style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--silver-dim)', marginBottom: '6px' }}>
            Workout Library
          </p>
          <h1 style={{ fontFamily: 'Cormorant Garant, serif', fontSize: isMobile ? '2rem' : '2.5rem', fontWeight: 600, color: 'var(--platinum)' }}>
            Your Workouts
          </h1>
        </div>
        <button
          onClick={() => router.push('/workouts/new')}
          className="btn-gold"
          style={{ padding: '12px 24px', borderRadius: '10px', border: 'none', width: isMobile ? '100%' : 'auto' }}
        >
          + New Workout
        </button>
      </div>

      {/* ── LOADING ── */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <p style={{ fontFamily: 'Cormorant Garant, serif', fontSize: '1.5rem', fontStyle: 'italic', color: 'var(--silver)' }}>
            Loading workouts...
          </p>
        </div>
      )}

      {/* ── EMPTY STATE ── */}
      {!loading && workouts.length === 0 && (
        <div className="card-luxury" style={{ padding: '80px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✏️</div>
          <h2 style={{ fontFamily: 'Cormorant Garant, serif', fontSize: '2rem', color: 'var(--platinum)', marginBottom: '8px' }}>
            No workouts yet
          </h2>
          <p style={{ color: 'var(--silver)', fontSize: '0.9rem', marginBottom: '28px' }}>
            Build your first workout to start coaching your athletes.
          </p>
          <button
            onClick={() => router.push('/workouts/new')}
            className="btn-gold"
            style={{ padding: '12px 28px', borderRadius: '10px', border: 'none' }}
          >
            Build First Workout
          </button>
        </div>
      )}

      {/* ── WORKOUT GRID ── */}
      {!loading && workouts.length > 0 && (
        <div className="fade-up-1" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isWide ? 'repeat(auto-fill, minmax(340px, 1fr))' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {workouts.map(workout => {
            const sport = workout.sport ?? 'run'
            const color = SPORT_COLORS[sport] ?? '#4A9EDB'
            const duration = getTotalDuration(workout)
            const intervalCount = Array.isArray(workout.intervals) ? workout.intervals.length : 0

            return (
              <div
                key={workout.id}
                onClick={() => router.push(`/workouts/${workout.id}`)}
                style={{
                  background: 'linear-gradient(135deg, var(--obsidian-3) 0%, var(--obsidian-2) 100%)',
                  border: '1px solid rgba(201,168,76,0.1)',
                  borderRadius: '16px',
                  padding: '24px',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s, transform 0.2s',
                  borderLeft: `3px solid ${color}`,
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = `rgba(201,168,76,0.3)`
                  ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = `rgba(201,168,76,0.1)`
                  ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
                }}
              >
                {/* Sport badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.1em',
                    textTransform: 'uppercase', padding: '4px 10px', borderRadius: '20px',
                    background: `${color}18`, color, border: `1px solid ${color}35`,
                  }}>
                    {SPORT_ICONS[sport]} {sport}
                  </span>
                  <span style={{ fontSize: '1.4rem' }}>{SPORT_ICONS[sport]}</span>
                </div>

                {/* Name */}
                <h3 style={{
                  fontFamily: 'Cormorant Garant, serif',
                  fontSize: '1.4rem', fontWeight: 600,
                  color: 'var(--platinum)', marginBottom: '8px',
                  lineHeight: 1.2,
                }}>
                  {workout.name}
                </h3>

                {/* Stats row */}
                <div style={{ display: 'flex', gap: '20px', marginBottom: '16px' }}>
                  {duration > 0 && (
                    <div>
                      <div style={{ fontFamily: 'Cormorant Garant, serif', fontSize: '1.3rem', fontWeight: 600, color: 'var(--gold)' }}>
                        {formatDuration(duration)}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--silver-dim)', letterSpacing: '0.05em' }}>duration</div>
                    </div>
                  )}
                  <div>
                    <div style={{ fontFamily: 'Cormorant Garant, serif', fontSize: '1.3rem', fontWeight: 600, color: 'var(--gold)' }}>
                      {intervalCount}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--silver-dim)', letterSpacing: '0.05em' }}>intervals</div>
                  </div>
                </div>

                {/* Interval bar */}
                {Array.isArray(workout.intervals) && workout.intervals.length > 0 && (
                  <div style={{ display: 'flex', gap: '2px', height: '4px', borderRadius: '2px', overflow: 'hidden' }}>
                    {workout.intervals.map((iv: any, i: number) => (
                      <div key={i} style={{
                        flex: iv.duration_seconds ?? 1,
                        background: iv.hr_zone
                          ? ['#6B8CAE','#4A9EDB','#4ADB8A','#E8A84C','#DB4A6A'][iv.hr_zone - 1]
                          : color,
                        opacity: 0.8,
                      }} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

