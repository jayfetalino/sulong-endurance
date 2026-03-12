'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import type { Workout, Interval } from '@/types'
import { useBreakpoint } from '@/hooks/useBreakpoint'

const ZONE_COLORS: Record<number, string> = {
  1: '#6B8CAE', 2: '#4A9EDB', 3: '#4ADB8A', 4: '#E8A84C', 5: '#DB4A6A',
}
const ZONE_LABELS: Record<number, string> = {
  1: 'Z1 Recovery', 2: 'Z2 Endurance', 3: 'Z3 Tempo', 4: 'Z4 Threshold', 5: 'Z5 VO2Max',
}
const SPORT_COLORS: Record<string, string> = {
  swim: '#4A9EDB', bike: '#E8A84C', run: '#DB4A6A', brick: '#A84ADB',
}
const TYPE_LABELS: Record<string, string> = {
  warmup: 'Warm Up', work: 'Work', rest: 'Rest', cooldown: 'Cool Down', repeat: 'Repeat',
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0 && s > 0) return `${m}m ${s}s`
  if (m > 0) return `${m}m`
  return `${s}s`
}

function getTotalDuration(intervals: Interval[]): number {
  return intervals.reduce((sum, iv) => sum + (iv.duration_seconds ?? 0), 0)
}

export default function WorkoutDetailPage() {
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [role, setRole] = useState<string>('')
  const router = useRouter()
  const params = useParams()
  const supabase = createSupabaseBrowserClient()
  const { isMobile, isTablet } = useBreakpoint()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      setRole(prof?.role ?? '')
      const { data } = await supabase.from('workouts').select('*').eq('id', params.id).single()
      setWorkout(data)
      setLoading(false)
    }
    load()
  }, [])

  async function handleDelete() {
    if (!confirm('Delete this workout? This cannot be undone.')) return
    setDeleting(true)
    await supabase.from('workouts').delete().eq('id', params.id)
    router.push('/workouts')
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '80px 0' }}>
      <p style={{ fontFamily: 'Cormorant Garant, serif', fontSize: '1.5rem', fontStyle: 'italic', color: 'var(--silver)' }}>Loading workout...</p>
    </div>
  )

  if (!workout) return (
    <div style={{ textAlign: 'center', padding: '80px 0' }}>
      <p style={{ fontFamily: 'Cormorant Garant, serif', fontSize: '1.5rem', color: 'var(--silver)' }}>Workout not found.</p>
      <button onClick={() => router.push('/workouts')} className="btn-ghost" style={{ marginTop: '16px', padding: '10px 20px', borderRadius: '8px' }}>← Back to Library</button>
    </div>
  )

  const intervals: Interval[] = Array.isArray(workout.intervals) ? workout.intervals : []
  const totalSecs = getTotalDuration(intervals)
  const sport = workout.sport ?? 'run'
  const sportColor = SPORT_COLORS[sport] ?? '#4A9EDB'

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div className="fade-up" style={{ marginBottom: '32px' }}>
        <button onClick={() => router.push('/workouts')} style={{ background: 'none', border: 'none', color: 'var(--silver)', fontSize: '0.8rem', cursor: 'pointer', marginBottom: '16px', padding: 0 }}>
          ← Back to Library
        </button>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'flex-end', gap: isMobile ? '12px' : '0' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 12px', borderRadius: '20px', background: `${sportColor}18`, color: sportColor, border: `1px solid ${sportColor}35` }}>
                {sport === 'swim' ? '🏊' : sport === 'bike' ? '🚴' : '🏃'} {sport}
              </span>
            </div>
            <h1 style={{ fontFamily: 'Cormorant Garant, serif', fontSize: isMobile ? '2rem' : '2.8rem', fontWeight: 600, color: 'var(--platinum)' }}>
              {workout.name}
            </h1>
          </div>
          {role === 'coach' && (
            <button onClick={handleDelete} disabled={deleting} style={{ background: 'none', border: '1px solid rgba(219,74,106,0.3)', color: '#DB4A6A', borderRadius: '8px', padding: '10px 18px', cursor: 'pointer', fontSize: '0.8rem', width: isMobile ? '100%' : 'auto' }}>
              {deleting ? 'Deleting...' : 'Delete Workout'}
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile || isTablet ? '1fr' : '1fr 320px', gap: '24px' }}>
        <div>
          {totalSecs > 0 && (
            <div className="fade-up-1" style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', gap: '3px', height: '16px', borderRadius: '8px', overflow: 'hidden', marginBottom: '8px' }}>
                {intervals.map((iv, i) => (
                  <div key={i} style={{ flex: iv.duration_seconds || 1, background: ZONE_COLORS[iv.heart_rate_zone ?? 3] ?? sportColor, opacity: 0.85 }} />
                ))}
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--silver-dim)' }}>Total: {formatDuration(totalSecs)} · {intervals.length} intervals</p>
            </div>
          )}

          <div className="fade-up-1 card-luxury" style={{ padding: '24px' }}>
            <h2 style={{ fontFamily: 'Cormorant Garant, serif', fontSize: '1.4rem', color: 'var(--platinum)', marginBottom: '20px' }}>Intervals</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {intervals.map((iv, idx) => {
                const zone = iv.heart_rate_zone ?? 3
                const zoneColor = ZONE_COLORS[zone] ?? sportColor
                return (
                  <div key={iv.id ?? idx} style={{ display: 'grid', gridTemplateColumns: isMobile ? '24px 1fr' : '32px 1fr auto', gap: '16px', alignItems: 'center', padding: '14px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${zoneColor}25`, borderLeft: `3px solid ${zoneColor}` }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.75rem', color: 'var(--silver-dim)', textAlign: 'center' }}>{idx + 1}</div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: zoneColor }}>{TYPE_LABELS[iv.type] ?? iv.type}</span>
                        {iv.label && <span style={{ fontSize: '0.8rem', color: 'var(--platinum)' }}>{iv.label}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '16px' }}>
                        {iv.duration_seconds > 0 && <span style={{ fontSize: '0.8rem', color: 'var(--silver)' }}>⏱ {formatDuration(iv.duration_seconds)}</span>}
                        {iv.distance_meters && <span style={{ fontSize: '0.8rem', color: 'var(--silver)' }}>📏 {iv.distance_meters}m</span>}
                        {iv.power_target_pct && <span style={{ fontSize: '0.8rem', color: 'var(--gold)' }}>⚡ {iv.power_target_pct}% FTP</span>}
                        {iv.pace_target && <span style={{ fontSize: '0.8rem', color: 'var(--gold)' }}>👟 {iv.pace_target} min/km</span>}
                      </div>
                    </div>
                    {!isMobile && (
                      <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `${zoneColor}20`, border: `1px solid ${zoneColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '0.6rem', color: zoneColor, fontWeight: 700 }}>Z{zone}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="fade-up-2 card-luxury" style={{ padding: '24px' }}>
            <h3 style={{ fontFamily: 'Cormorant Garant, serif', fontSize: '1.2rem', color: 'var(--platinum)', marginBottom: '16px' }}>Summary</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--silver)' }}>Total Duration</span>
                <span style={{ fontFamily: 'Cormorant Garant, serif', fontSize: '1.3rem', color: 'var(--gold)', fontWeight: 600 }}>{formatDuration(totalSecs)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--silver)' }}>Intervals</span>
                <span style={{ fontFamily: 'Cormorant Garant, serif', fontSize: '1.3rem', color: 'var(--gold)', fontWeight: 600 }}>{intervals.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--silver)' }}>Sport</span>
                <span style={{ fontSize: '0.85rem', color: sportColor, fontWeight: 600, textTransform: 'capitalize' }}>{sport}</span>
              </div>
            </div>
          </div>

          <div className="fade-up-2 card-luxury" style={{ padding: '24px' }}>
            <h3 style={{ fontFamily: 'Cormorant Garant, serif', fontSize: '1.2rem', color: 'var(--platinum)', marginBottom: '16px' }}>Zone Breakdown</h3>
            {([1,2,3,4,5] as number[]).map(z => {
              const zoneSecs = intervals.filter(iv => (iv.heart_rate_zone ?? 3) === z).reduce((s, iv) => s + (iv.duration_seconds ?? 0), 0)
              if (zoneSecs === 0) return null
              const pct = totalSecs > 0 ? Math.round((zoneSecs / totalSecs) * 100) : 0
              return (
                <div key={z} style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.75rem', color: ZONE_COLORS[z] }}>{ZONE_LABELS[z]}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--silver-dim)' }}>{formatDuration(zoneSecs)}</span>
                  </div>
                  <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: ZONE_COLORS[z], borderRadius: '3px' }} />
                  </div>
                </div>
              )
            })}
          </div>

          {workout.description && (
            <div className="fade-up-3 card-luxury" style={{ padding: '24px' }}>
              <h3 style={{ fontFamily: 'Cormorant Garant, serif', fontSize: '1.2rem', color: 'var(--platinum)', marginBottom: '12px' }}>Coach Notes</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--silver)', lineHeight: 1.6 }}>{workout.description}</p>
            </div>
          )}

          {role === 'coach' && (
            <button onClick={() => router.push('/calendar')} className="btn-gold" style={{ width: '100%', padding: '14px', borderRadius: '10px', border: 'none' }}>
              Assign to Athlete →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
