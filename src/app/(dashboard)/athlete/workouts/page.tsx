'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

interface Workout { id: string; name: string; sport: string; description: string | null; duration_seconds: number; intervals: { id: string }[] }
interface ScheduledWorkout { id: string; scheduled_date: string; status: string; coach_notes: string | null; workout: Workout }

const SPORT_COLORS: Record<string, string> = { swim: '#4A9EDB', bike: '#E8A84C', run: '#DB4A6A', brick: '#C9A84C' }
const SPORT_ICONS: Record<string, string>  = { swim: '🏊', bike: '🚴', run: '🏃', brick: '⚡' }

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

export default function AthleteWorkoutsPage() {
  const [upcoming, setUpcoming]   = useState<ScheduledWorkout[]>([])
  const [completed, setCompleted] = useState<ScheduledWorkout[]>([])
  const [loading, setLoading]     = useState(true)
  const router   = useRouter()
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('scheduled_workouts')
        .select('*, workout:workouts(*)')
        .eq('athlete_id', user.id)
        .order('scheduled_date', { ascending: false })

      if (data) {
        setUpcoming(data.filter(w => w.status === 'pending').sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date)))
        setCompleted(data.filter(w => w.status === 'completed' || w.status === 'skipped').sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date)))
      }
      setLoading(false)
    }
    load()
  }, [])

  async function markComplete(id: string) {
    await supabase.from('scheduled_workouts').update({ status: 'completed' }).eq('id', id)
    setUpcoming(prev => {
      const moved = prev.find(w => w.id === id)
      if (!moved) return prev
      setCompleted(c => [{ ...moved, status: 'completed' }, ...c])
      return prev.filter(w => w.id !== id)
    })
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ fontFamily: 'Cormorant Garant, serif', fontSize: '1.5rem', color: 'var(--silver)', fontStyle: 'italic' }}>
        Loading workouts...
      </div>
    </div>
  )

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>

      {/* Header */}
      <div className="fade-up" style={{ marginBottom: '40px' }}>
        <p style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--silver-dim)', marginBottom: '6px' }}>
          Athlete
        </p>
        <h1 style={{ fontFamily: 'Cormorant Garant, serif', fontSize: '2.8rem', fontWeight: 600, color: 'var(--platinum)', lineHeight: 1.1 }}>
          My Workouts
        </h1>
        <p style={{ color: 'var(--silver)', marginTop: '6px' }}>
          {upcoming.length} upcoming · {completed.length} completed
        </p>
      </div>

      {/* Upcoming */}
      <div className="fade-up-1" style={{ marginBottom: '40px' }}>
        <p style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--silver-dim)', marginBottom: '16px' }}>
          Upcoming
        </p>

        {upcoming.length === 0 ? (
          <div className="card-luxury" style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📭</div>
            <p style={{ color: 'var(--silver)', fontSize: '0.9rem' }}>No upcoming workouts scheduled yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {upcoming.map(sw => (
              <WorkoutCard key={sw.id} sw={sw} onMarkComplete={markComplete} />
            ))}
          </div>
        )}
      </div>

      {/* Completed */}
      <div className="fade-up-2">
        <p style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--silver-dim)', marginBottom: '16px' }}>
          Completed & Skipped
        </p>

        {completed.length === 0 ? (
          <div className="card-luxury" style={{ padding: '40px', textAlign: 'center' }}>
            <p style={{ color: 'var(--silver)', fontSize: '0.9rem' }}>No completed workouts yet. Get after it!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {completed.map(sw => (
              <WorkoutCard key={sw.id} sw={sw} />
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

function WorkoutCard({ sw, onMarkComplete }: { sw: ScheduledWorkout; onMarkComplete?: (id: string) => void }) {
  const color   = SPORT_COLORS[sw.workout.sport] ?? 'var(--gold)'
  const icon    = SPORT_ICONS[sw.workout.sport]  ?? '🏋️'
  const isDone  = sw.status === 'completed'
  const isSkip  = sw.status === 'skipped'

  return (
    <div className="card-luxury" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '20px' }}>

      {/* Sport icon */}
      <div style={{
        width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0,
        background: `${color}18`, border: `1px solid ${color}35`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.4rem',
      }}>
        {icon}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
            padding: '2px 8px', borderRadius: '20px',
            background: `${color}18`, color, border: `1px solid ${color}35`,
          }}>
            {sw.workout.sport}
          </span>
          {isDone && (
            <span style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: '20px', background: 'rgba(74,219,138,0.1)', color: '#4ADB8A', border: '1px solid rgba(74,219,138,0.3)' }}>
              Completed ✓
            </span>
          )}
          {isSkip && (
            <span style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: '20px', background: 'rgba(180,180,180,0.08)', color: 'var(--silver-dim)', border: '1px solid rgba(180,180,180,0.15)' }}>
              Skipped
            </span>
          )}
        </div>
        <div style={{ fontFamily: 'Cormorant Garant, serif', fontSize: '1.2rem', fontWeight: 600, color: 'var(--platinum)', marginBottom: '2px' }}>
          {sw.workout.name}
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--silver-dim)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <span>{formatDate(sw.scheduled_date)}</span>
          {sw.workout.duration_seconds > 0 && <span>{formatDuration(sw.workout.duration_seconds)}</span>}
          {sw.workout.intervals?.length > 0 && <span>{sw.workout.intervals.length} intervals</span>}
        </div>
        {sw.coach_notes && (
          <div style={{ marginTop: '8px', fontSize: '0.78rem', color: 'var(--silver)', fontStyle: 'italic', paddingLeft: '10px', borderLeft: '2px solid rgba(201,168,76,0.3)' }}>
            {sw.coach_notes}
          </div>
        )}
      </div>

      {/* Action */}
      {onMarkComplete && !isDone && !isSkip && (
        <button
          onClick={() => onMarkComplete(sw.id)}
          className="btn-gold"
          style={{ flexShrink: 0, padding: '8px 18px', borderRadius: '8px', border: 'none', fontSize: '0.78rem' }}
        >
          Done ✓
        </button>
      )}
    </div>
  )
}
