'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import type { Sport, Interval } from '@/types'

type IntervalType = 'warmup' | 'work' | 'rest' | 'cooldown'
type DurationUnit  = 'minutes' | 'seconds'
type DistanceUnit  = 'yards' | 'miles' | 'meters'
type HRZone        = 1 | 2 | 3 | 4 | 5

interface IntervalRow {
  id: string
  type: IntervalType
  duration_value: number
  duration_unit: DurationUnit
  use_distance: boolean
  distance_value: number
  distance_unit: DistanceUnit
  hr_zone: HRZone
  power_target_pct: number
  pace_target: number
  label: string
}

const ZONE_COLORS: Record<HRZone, string> = {
  1: '#6B8CAE', 2: '#4A9EDB', 3: '#4ADB8A', 4: '#E8A84C', 5: '#DB4A6A',
}
const ZONE_LABELS: Record<HRZone, string> = {
  1: 'Z1 Recovery', 2: 'Z2 Endurance', 3: 'Z3 Tempo', 4: 'Z4 Threshold', 5: 'Z5 VO2Max',
}

function newInterval(): IntervalRow {
  return {
    id: Math.random().toString(36).slice(2),
    type: 'work', duration_value: 10, duration_unit: 'minutes',
    use_distance: false, distance_value: 400, distance_unit: 'meters',
    hr_zone: 3, power_target_pct: 75, pace_target: 0, label: '',
  }
}

function toDurationSeconds(row: IntervalRow): number {
  if (row.use_distance) return 0
  return row.duration_unit === 'minutes' ? row.duration_value * 60 : row.duration_value
}

function toDistanceMeters(row: IntervalRow): number | null {
  if (!row.use_distance) return null
  if (row.distance_unit === 'meters') return row.distance_value
  if (row.distance_unit === 'yards')  return Math.round(row.distance_value * 0.9144)
  if (row.distance_unit === 'miles')  return Math.round(row.distance_value * 1609.34)
  return null
}

export default function WorkoutBuilderPage() {
  const [name, setName]           = useState('')
  const [sport, setSport]         = useState<Sport>('run')
  const [notes, setNotes]         = useState('')
  const [intervals, setIntervals] = useState<IntervalRow[]>([newInterval()])
  const [saving, setSaving]       = useState(false)
  const router   = useRouter()
  const supabase = createSupabaseBrowserClient()

  function updateInterval(id: string, updates: Partial<IntervalRow>) {
    setIntervals(prev => prev.map(iv => iv.id === id ? { ...iv, ...updates } : iv))
  }
  function addInterval() { setIntervals(prev => [...prev, newInterval()]) }
  function removeInterval(id: string) { setIntervals(prev => prev.filter(iv => iv.id !== id)) }
  function moveInterval(id: string, dir: -1 | 1) {
    setIntervals(prev => {
      const idx = prev.findIndex(iv => iv.id === id)
      if (idx + dir < 0 || idx + dir >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[idx + dir]] = [next[idx + dir], next[idx]]
      return next
    })
  }

  async function saveWorkout() {
    if (!name.trim()) { alert('Please enter a workout name'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const intervalsPayload: Interval[] = intervals.map(iv => ({
      id: iv.id, type: iv.type, label: iv.label || iv.type,
      duration_seconds: toDurationSeconds(iv),
      heart_rate_zone: iv.hr_zone,
      power_target_pct: sport === 'bike' ? iv.power_target_pct : undefined,
      pace_target: (sport === 'run' || sport === 'swim') ? iv.pace_target : undefined,
      distance_meters: toDistanceMeters(iv) ?? undefined,
    }))
    const totalSeconds = intervalsPayload.reduce((s, iv) => s + (iv.duration_seconds ?? 0), 0)
    const { error } = await supabase.from('workouts').insert({
      created_by: user.id, name: name.trim(), sport,
      intervals: intervalsPayload,
      duration_seconds: totalSeconds, is_public: false,
    })
    if (error) {
      alert(`Failed to save workout: ${error.message}`)
      setSaving(false)
      return
    }
    setSaving(false)
    router.push('/workouts')
  }

  const totalSecs = intervals.reduce((s, iv) => s + toDurationSeconds(iv), 0)

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div className="fade-up" style={{ marginBottom: '32px' }}>
        <p style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--silver-dim)', marginBottom: '6px' }}>Workout Builder</p>
        <h1 style={{ fontFamily: 'Cormorant Garant, serif', fontSize: '2.5rem', fontWeight: 600, color: 'var(--platinum)' }}>Build a Workout</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '24px' }}>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="fade-up-1 card-luxury" style={{ padding: '24px' }}>
            <h2 style={{ fontFamily: 'Cormorant Garant, serif', fontSize: '1.3rem', color: 'var(--platinum)', marginBottom: '20px' }}>Workout Details</h2>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--silver)', marginBottom: '8px' }}>Workout Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sweet Spot Bike" className="input-luxury" />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--silver)', marginBottom: '8px' }}>Sport</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {(['swim', 'bike', 'run'] as Sport[]).map(s => (
                  <button key={s} onClick={() => setSport(s)} style={{ padding: '10px 6px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', background: sport === s ? 'linear-gradient(135deg, #C9A84C, #E8C97A)' : 'rgba(255,255,255,0.04)', color: sport === s ? '#0A0A0F' : 'var(--silver)', transition: 'all 0.2s' }}>
                    {s === 'swim' ? '🏊' : s === 'bike' ? '🚴' : '🏃'} {s}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--silver)', marginBottom: '8px' }}>Coach Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Instructions for your athletes..." rows={4} className="input-luxury" style={{ resize: 'none' }} />
            </div>
            <button onClick={saveWorkout} disabled={saving} className="btn-gold" style={{ width: '100%', padding: '14px', borderRadius: '10px', border: 'none' }}>
              {saving ? 'Saving...' : 'Save Workout'}
            </button>
          </div>

          <div className="card-luxury" style={{ padding: '24px' }}>
            <h3 style={{ fontFamily: 'Cormorant Garant, serif', fontSize: '1.1rem', color: 'var(--platinum)', marginBottom: '14px' }}>HR Zones</h3>
            {([1,2,3,4,5] as HRZone[]).map(z => (
              <div key={z} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: ZONE_COLORS[z], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#0A0A0F' }}>{z}</div>
                <span style={{ fontSize: '0.8rem', color: 'var(--silver)' }}>{ZONE_LABELS[z]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="fade-up-2">
          {totalSecs > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '3px', height: '12px', borderRadius: '6px', overflow: 'hidden', marginBottom: '6px' }}>
                {intervals.map(iv => (
                  <div key={iv.id} style={{ flex: toDurationSeconds(iv) || 1, background: ZONE_COLORS[iv.hr_zone], opacity: 0.85 }} />
                ))}
              </div>
              <p style={{ fontSize: '0.7rem', color: 'var(--silver-dim)' }}>Total: {Math.floor(totalSecs / 60)}min</p>
            </div>
          )}

          <div className="card-luxury" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontFamily: 'Cormorant Garant, serif', fontSize: '1.4rem', color: 'var(--platinum)' }}>Intervals</h2>
              <button onClick={addInterval} className="btn-ghost" style={{ padding: '8px 16px', borderRadius: '8px' }}>+ Add Interval</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {intervals.map((iv, idx) => (
                <div key={iv.id} style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${ZONE_COLORS[iv.hr_zone]}30`, borderLeft: `3px solid ${ZONE_COLORS[iv.hr_zone]}` }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
                    <select value={iv.type} onChange={e => updateInterval(iv.id, { type: e.target.value as IntervalType })} style={{ background: 'var(--obsidian-4)', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--platinum)', borderRadius: '6px', padding: '6px 10px', fontSize: '0.8rem', outline: 'none' }}>
                      <option value="warmup">Warmup</option>
                      <option value="work">Work</option>
                      <option value="rest">Rest</option>
                      <option value="cooldown">Cooldown</option>
                    </select>
                    <input type="text" value={iv.label} onChange={e => updateInterval(iv.id, { label: e.target.value })} placeholder="Label (optional)" style={{ flex: 1, background: 'var(--obsidian-4)', border: '1px solid rgba(201,168,76,0.15)', color: 'var(--platinum)', borderRadius: '6px', padding: '6px 10px', fontSize: '0.8rem', outline: 'none' }} />
                    <button onClick={() => moveInterval(iv.id, -1)} disabled={idx === 0} style={{ background: 'none', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--silver)', borderRadius: '6px', padding: '6px 8px', cursor: 'pointer', opacity: idx === 0 ? 0.3 : 1 }}>↑</button>
                    <button onClick={() => moveInterval(iv.id, 1)} disabled={idx === intervals.length - 1} style={{ background: 'none', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--silver)', borderRadius: '6px', padding: '6px 8px', cursor: 'pointer', opacity: idx === intervals.length - 1 ? 0.3 : 1 }}>↓</button>
                    <button onClick={() => removeInterval(iv.id)} style={{ background: 'none', border: '1px solid rgba(219,74,106,0.3)', color: '#DB4A6A', borderRadius: '6px', padding: '6px 8px', cursor: 'pointer' }}>✕</button>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
                    <button onClick={() => updateInterval(iv.id, { use_distance: false })} style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, background: !iv.use_distance ? 'var(--gold)' : 'rgba(255,255,255,0.05)', color: !iv.use_distance ? '#0A0A0F' : 'var(--silver)' }}>⏱ Time</button>
                    <button onClick={() => updateInterval(iv.id, { use_distance: true })} style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, background: iv.use_distance ? 'var(--gold)' : 'rgba(255,255,255,0.05)', color: iv.use_distance ? '#0A0A0F' : 'var(--silver)' }}>📏 Distance</button>
                    {!iv.use_distance ? (
                      <>
                        <input type="number" value={iv.duration_value} min={1} onChange={e => updateInterval(iv.id, { duration_value: +e.target.value })} style={{ width: '70px', background: 'var(--obsidian-4)', border: '1px solid rgba(201,168,76,0.15)', color: 'var(--platinum)', borderRadius: '6px', padding: '6px 8px', fontSize: '0.8rem', outline: 'none' }} />
                        <select value={iv.duration_unit} onChange={e => updateInterval(iv.id, { duration_unit: e.target.value as DurationUnit })} style={{ background: 'var(--obsidian-4)', border: '1px solid rgba(201,168,76,0.15)', color: 'var(--platinum)', borderRadius: '6px', padding: '6px 8px', fontSize: '0.8rem', outline: 'none' }}>
                          <option value="minutes">min</option>
                          <option value="seconds">sec</option>
                        </select>
                      </>
                    ) : (
                      <>
                        <input type="number" value={iv.distance_value} min={1} onChange={e => updateInterval(iv.id, { distance_value: +e.target.value })} style={{ width: '80px', background: 'var(--obsidian-4)', border: '1px solid rgba(201,168,76,0.15)', color: 'var(--platinum)', borderRadius: '6px', padding: '6px 8px', fontSize: '0.8rem', outline: 'none' }} />
                        <select value={iv.distance_unit} onChange={e => updateInterval(iv.id, { distance_unit: e.target.value as DistanceUnit })} style={{ background: 'var(--obsidian-4)', border: '1px solid rgba(201,168,76,0.15)', color: 'var(--platinum)', borderRadius: '6px', padding: '6px 8px', fontSize: '0.8rem', outline: 'none' }}>
                          <option value="meters">m</option>
                          <option value="yards">yd</option>
                          <option value="miles">mi</option>
                        </select>
                      </>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--silver-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', marginRight: '4px' }}>Zone:</span>
                    {([1,2,3,4,5] as HRZone[]).map(z => (
                      <button key={z} onClick={() => updateInterval(iv.id, { hr_zone: z })} style={{ width: '32px', height: '32px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, background: iv.hr_zone === z ? ZONE_COLORS[z] : `${ZONE_COLORS[z]}25`, color: iv.hr_zone === z ? '#0A0A0F' : ZONE_COLORS[z], transition: 'all 0.15s' }}>{z}</button>
                    ))}
                    {sport === 'bike' && (
                      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--silver-dim)' }}>Power %FTP:</span>
                        <input type="number" value={iv.power_target_pct} min={0} max={200} onChange={e => updateInterval(iv.id, { power_target_pct: +e.target.value })} style={{ width: '60px', background: 'var(--obsidian-4)', border: '1px solid rgba(201,168,76,0.15)', color: 'var(--gold)', borderRadius: '6px', padding: '5px 8px', fontSize: '0.8rem', outline: 'none', textAlign: 'center' }} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button onClick={addInterval} style={{ width: '100%', marginTop: '16px', padding: '12px', borderRadius: '10px', border: '1px dashed rgba(201,168,76,0.25)', background: 'transparent', color: 'var(--silver)', fontSize: '0.8rem', cursor: 'pointer' }}>
              + Add Another Interval
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
