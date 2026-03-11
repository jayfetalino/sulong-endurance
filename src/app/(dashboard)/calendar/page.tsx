'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import type { Workout, ScheduledWorkout, Profile } from '@/types'

type CalendarView = 'week' | 'month'

interface ScheduledWorkoutWithDetails extends ScheduledWorkout {
  workout: Workout
}
interface DayCell {
  date: Date
  isToday: boolean
  isCurrentMonth: boolean
  scheduledWorkouts: ScheduledWorkoutWithDetails[]
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

const SPORT_COLORS: Record<string, string> = {
  swim:  '#4A9EDB',
  bike:  '#E8A84C',
  run:   '#DB4A6A',
  brick: '#A84ADB',
}

const ZONE_COLORS: Record<number, string> = {
  1: '#6B8CAE', 2: '#4A9EDB', 3: '#4ADB8A', 4: '#E8A84C', 5: '#DB4A6A',
}

function toDateString(d: Date) {
  return d.toISOString().split('T')[0]
}

export default function CalendarPage() {
  const [view, setView]                   = useState<CalendarView>('month')
  const [currentDate, setCurrentDate]     = useState(new Date())
  const [scheduledWorkouts, setScheduled] = useState<ScheduledWorkoutWithDetails[]>([])
  const [workouts, setWorkouts]           = useState<Workout[]>([])
  const [athletes, setAthletes]           = useState<Profile[]>([])
  const [profile, setProfile]             = useState<Profile | null>(null)
  const [selectedDay, setSelectedDay]     = useState<DayCell | null>(null)
  const [showModal, setShowModal]         = useState(false)
  const [assignForm, setAssignForm]       = useState({ athleteId: '', workoutId: '', notes: '' })
  const [saving, setSaving]               = useState(false)

  const router   = useRouter()
  const supabase = createSupabaseBrowserClient()

  useEffect(() => { loadData() }, [currentDate, view])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(prof)

    const { data: ws } = await supabase.from('workouts').select('*').eq('created_by', user.id)
    setWorkouts(ws ?? [])

    const { data: aths } = await supabase.from('profiles').select('*').eq('coach_id', user.id)
    setAthletes(aths ?? [])

    const { start, end } = getDateRange()
    const { data: sw } = await supabase
      .from('scheduled_workouts')
      .select('*, workout:workouts(*)')
      .gte('scheduled_date', toDateString(start))
      .lte('scheduled_date', toDateString(end))
    setScheduled((sw as ScheduledWorkoutWithDetails[]) ?? [])
  }

  function getDateRange() {
    if (view === 'week') {
      const start = new Date(currentDate)
      start.setDate(start.getDate() - start.getDay())
      const end = new Date(start)
      end.setDate(end.getDate() + 6)
      return { start, end }
    } else {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      start.setDate(start.getDate() - start.getDay())
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
      end.setDate(end.getDate() + (6 - end.getDay()))
      return { start, end }
    }
  }

  function buildDayCells(): DayCell[] {
    const today = toDateString(new Date())
    const { start, end } = getDateRange()
    const cells: DayCell[] = []
    const cur = new Date(start)
    while (cur <= end) {
      const dateStr = toDateString(cur)
      cells.push({
        date: new Date(cur),
        isToday: dateStr === today,
        isCurrentMonth: cur.getMonth() === currentDate.getMonth(),
        scheduledWorkouts: scheduledWorkouts.filter(sw => sw.scheduled_date === dateStr),
      })
      cur.setDate(cur.getDate() + 1)
    }
    return cells
  }

  function navigate(dir: number) {
    const d = new Date(currentDate)
    if (view === 'week') d.setDate(d.getDate() + dir * 7)
    else d.setMonth(d.getMonth() + dir)
    setCurrentDate(d)
  }

  function openAssign(cell: DayCell) {
    setSelectedDay(cell)
    setAssignForm({ athleteId: athletes[0]?.id ?? '', workoutId: workouts[0]?.id ?? '', notes: '' })
    setShowModal(true)
  }

  async function handleAssign() {
    if (!selectedDay || !assignForm.athleteId || !assignForm.workoutId) return
    setSaving(true)
    await supabase.from('scheduled_workouts').insert({
      athlete_id: assignForm.athleteId,
      workout_id: assignForm.workoutId,
      scheduled_date: toDateString(selectedDay.date),
      coach_notes: assignForm.notes,
      status: 'scheduled',
    })
    setSaving(false)
    setShowModal(false)
    loadData()
  }

  const cells = buildDayCells()

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>

      {/* ── HEADER ── */}
      <div className="fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <p style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--silver-dim)', marginBottom: '6px' }}>
            Training Calendar
          </p>
          <h1 style={{ fontFamily: 'Cormorant Garant, serif', fontSize: '2.5rem', fontWeight: 600, color: 'var(--platinum)' }}>
            {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Prev / Today / Next */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => navigate(-1)} className="btn-ghost" style={{ padding: '8px 14px', borderRadius: '8px' }}>←</button>
            <button onClick={() => setCurrentDate(new Date())} className="btn-ghost" style={{ padding: '8px 14px', borderRadius: '8px' }}>Today</button>
            <button onClick={() => navigate(1)} className="btn-ghost" style={{ padding: '8px 14px', borderRadius: '8px' }}>→</button>
          </div>
          {/* Week / Month toggle */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setView('week')}
              className={view === 'week' ? 'btn-gold' : 'btn-ghost'}
              style={{ padding: '8px 18px', borderRadius: '8px', border: view === 'week' ? 'none' : undefined }}
            >Week</button>
            <button
              onClick={() => setView('month')}
              className={view === 'month' ? 'btn-gold' : 'btn-ghost'}
              style={{ padding: '8px 18px', borderRadius: '8px', border: view === 'month' ? 'none' : undefined }}
            >Month</button>
          </div>
        </div>
      </div>

      {/* ── DAY NAME HEADERS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '8px' }}>
        {DAY_NAMES.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--silver-dim)', padding: '6px 0' }}>
            {d}
          </div>
        ))}
      </div>

      {/* ── CALENDAR GRID ── */}
      <div className="fade-up-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
        {cells.map((cell, i) => (
          <div
            key={i}
            onClick={() => openAssign(cell)}
            style={{
              minHeight: view === 'month' ? '110px' : '160px',
              padding: '10px',
              borderRadius: '12px',
              border: cell.isToday
                ? '1px solid rgba(201,168,76,0.5)'
                : '1px solid rgba(201,168,76,0.08)',
              background: cell.isToday
                ? 'rgba(201,168,76,0.06)'
                : cell.isCurrentMonth
                  ? 'rgba(26,26,36,0.8)'
                  : 'rgba(15,15,20,0.5)',
              cursor: 'pointer',
              transition: 'border-color 0.2s, background 0.2s',
            }}
          >
            {/* Date number */}
            <div style={{
              fontFamily: 'Cormorant Garant, serif',
              fontSize: '1.1rem',
              fontWeight: 600,
              color: cell.isToday ? 'var(--gold)' : cell.isCurrentMonth ? 'var(--platinum)' : 'var(--silver-dim)',
              marginBottom: '6px',
            }}>
              {cell.date.getDate()}
            </div>

            {/* Workout pills */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {cell.scheduledWorkouts.map((sw, j) => (
                <div key={j} style={{
                  padding: '3px 7px',
                  borderRadius: '6px',
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  background: `${SPORT_COLORS[sw.workout?.sport] ?? '#4A9EDB'}18`,
                  color: SPORT_COLORS[sw.workout?.sport] ?? '#4A9EDB',
                  border: `1px solid ${SPORT_COLORS[sw.workout?.sport] ?? '#4A9EDB'}35`,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                }}>
                  {sw.workout?.name ?? 'Workout'}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── ZONE LEGEND ── */}
      <div className="fade-up-2" style={{ display: 'flex', gap: '16px', marginTop: '20px', alignItems: 'center' }}>
        <span style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--silver-dim)' }}>Zones:</span>
        {Object.entries(ZONE_COLORS).map(([zone, color]) => (
          <div key={zone} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color }} />
            <span style={{ fontSize: '0.72rem', color: 'var(--silver)' }}>Z{zone}</span>
          </div>
        ))}
        <div style={{ marginLeft: '16px', display: 'flex', gap: '12px' }}>
          {Object.entries(SPORT_COLORS).map(([sport, color]) => (
            <div key={sport} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color }} />
              <span style={{ fontSize: '0.72rem', color: 'var(--silver)', textTransform: 'capitalize' }}>{sport}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── ASSIGN MODAL ── */}
      {showModal && selectedDay && (
        <div
          onClick={() => setShowModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '24px' }}
        >
          <div onClick={e => e.stopPropagation()} className="card-luxury" style={{ width: '100%', maxWidth: '480px', padding: '36px' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{ fontFamily: 'Cormorant Garant, serif', fontSize: '1.8rem', fontWeight: 600, color: 'var(--platinum)' }}>
                Assign Workout
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--silver)', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--silver)', marginBottom: '28px' }}>
              {selectedDay.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>

            {/* Athlete */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--silver)', marginBottom: '8px' }}>Athlete</label>
              <select
                value={assignForm.athleteId}
                onChange={e => setAssignForm(f => ({ ...f, athleteId: e.target.value }))}
                className="input-luxury"
                style={{ appearance: 'none' }}
              >
                {athletes.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
              </select>
            </div>

            {/* Workout */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--silver)', marginBottom: '8px' }}>Workout</label>
              <select
                value={assignForm.workoutId}
                onChange={e => setAssignForm(f => ({ ...f, workoutId: e.target.value }))}
                className="input-luxury"
                style={{ appearance: 'none' }}
              >
                {workouts.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--silver)', marginBottom: '8px' }}>Coach Notes</label>
              <textarea
                value={assignForm.notes}
                onChange={e => setAssignForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Any instructions for this workout..."
                rows={3}
                className="input-luxury"
                style={{ resize: 'none' }}
              />
            </div>

            <button
              onClick={handleAssign}
              disabled={saving}
              className="btn-gold"
              style={{ width: '100%', padding: '14px', borderRadius: '10px', border: 'none' }}
            >
              {saving ? 'Assigning...' : 'Assign Workout'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}