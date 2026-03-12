'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useBreakpoint } from '@/hooks/useBreakpoint'

interface Activity {
  id: string
  strava_activity_id: number
  name: string
  sport_type: string
  start_date: string
  distance_meters: number
  duration_seconds: number
  elevation_gain: number
  average_heart_rate: number
  max_heart_rate: number
  tss: number
}

const SPORT_COLORS: Record<string, string> = {
  Run: '#DB4A6A', Ride: '#E8A84C', Swim: '#4A9EDB',
  VirtualRide: '#E8A84C', TrailRun: '#DB4A6A', Walk: '#4ADB8A',
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatDistance(meters: number, sport: string): string {
  if (sport === 'Swim') return `${Math.round(meters)}m`
  const km = meters / 1000
  return `${km.toFixed(1)}km`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function getSportIcon(sport: string): string {
  if (sport.includes('Run')) return '🏃'
  if (sport.includes('Ride') || sport.includes('Bike')) return '🚴'
  if (sport === 'Swim') return '🏊'
  if (sport === 'Walk') return '🚶'
  return '🏋️'
}

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading]       = useState(true)
  const [filter, setFilter]         = useState<string>('all')
  const router   = useRouter()
  const supabase = createSupabaseBrowserClient()
  const { isMobile } = useBreakpoint()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase
        .from('activities')
        .select('*')
        .eq('athlete_id', user.id)
        .order('start_date', { ascending: false })
        .limit(100)
      setActivities(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const sports = ['all', ...Array.from(new Set(activities.map(a => a.sport_type)))]
  const filtered = filter === 'all' ? activities : activities.filter(a => a.sport_type === filter)

  const totalDistance = filtered.reduce((s, a) => s + (a.distance_meters ?? 0), 0)
  const totalDuration = filtered.reduce((s, a) => s + (a.duration_seconds ?? 0), 0)
  const totalTSS      = filtered.reduce((s, a) => s + (a.tss ?? 0), 0)

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>

      {/* ── HEADER ── */}
      <div className="fade-up" style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'flex-end', gap: isMobile ? '12px' : '0', marginBottom: '32px' }}>
        <div>
          <p style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--silver-dim)', marginBottom: '6px' }}>Activity Log</p>
          <h1 style={{ fontFamily: 'Cormorant Garant, serif', fontSize: isMobile ? '2rem' : '2.5rem', fontWeight: 600, color: 'var(--platinum)' }}>Your Activities</h1>
        </div>
        <button onClick={() => router.push('/athlete')} className="btn-ghost" style={{ padding: '10px 18px', borderRadius: '8px', width: isMobile ? '100%' : 'auto' }}>← Dashboard</button>
      </div>

      {/* ── SUMMARY STATS ── */}
      <div className="fade-up-1" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Total Distance', value: `${(totalDistance / 1000).toFixed(0)}km` },
          { label: 'Total Time', value: formatDuration(totalDuration) },
          { label: 'Total TSS', value: Math.round(totalTSS).toString() },
        ].map(stat => (
          <div key={stat.label} className="card-luxury" style={{ padding: isMobile ? '14px 16px' : '20px 24px' }}>
            <div style={{ fontFamily: 'Cormorant Garant, serif', fontSize: '2rem', fontWeight: 600, color: 'var(--gold)', marginBottom: '4px' }}>{stat.value}</div>
            <div style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--silver-dim)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ── SPORT FILTER ── */}
      <div className="fade-up-1" style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {sports.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{
              padding: '7px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer',
              fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize',
              background: filter === s ? 'linear-gradient(135deg, #C9A84C, #E8C97A)' : 'rgba(255,255,255,0.05)',
              color: filter === s ? '#0A0A0F' : 'var(--silver)',
              transition: 'all 0.2s',
            }}
          >{s === 'all' ? 'All Sports' : `${getSportIcon(s)} ${s}`}</button>
        ))}
      </div>

      {/* ── LOADING ── */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <p style={{ fontFamily: 'Cormorant Garant, serif', fontSize: '1.5rem', fontStyle: 'italic', color: 'var(--silver)' }}>Loading activities...</p>
        </div>
      )}

      {/* ── EMPTY STATE ── */}
      {!loading && activities.length === 0 && (
        <div className="card-luxury" style={{ padding: '80px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔗</div>
          <h2 style={{ fontFamily: 'Cormorant Garant, serif', fontSize: '2rem', color: 'var(--platinum)', marginBottom: '8px' }}>No activities yet</h2>
          <p style={{ color: 'var(--silver)', fontSize: '0.9rem', marginBottom: '28px' }}>Connect your Strava account to import your training history.</p>
          <button onClick={() => router.push('/athlete')} className="btn-gold" style={{ padding: '12px 28px', borderRadius: '10px', border: 'none' }}>
            Connect Strava
          </button>
        </div>
      )}

      {/* ── ACTIVITY LIST ── */}
      {!loading && filtered.length > 0 && (
        <div className="fade-up-2" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map(activity => {
            const color = SPORT_COLORS[activity.sport_type] ?? '#4A9EDB'
            return (
              <div key={activity.id} style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '40px 1fr' : '48px 1fr auto',
                gap: '16px',
                alignItems: 'center',
                padding: '16px 20px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(26,26,36,0.9) 0%, rgba(20,20,28,0.9) 100%)',
                border: '1px solid rgba(201,168,76,0.08)',
                borderLeft: `3px solid ${color}`,
                transition: 'border-color 0.2s',
              }}>
                {/* Icon */}
                <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: `${color}15`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                  {getSportIcon(activity.sport_type)}
                </div>

                {/* Details */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <h3 style={{ fontFamily: 'Cormorant Garant, serif', fontSize: isMobile ? '1rem' : '1.15rem', fontWeight: 600, color: 'var(--platinum)' }}>
                      {activity.name}
                    </h3>
                    <span style={{ fontSize: '0.65rem', color, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      {activity.sport_type}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--silver)' }}>📅 {formatDate(activity.start_date)}</span>
                    {activity.distance_meters > 0 && (
                      <span style={{ fontSize: '0.78rem', color: 'var(--silver)' }}>📏 {formatDistance(activity.distance_meters, activity.sport_type)}</span>
                    )}
                    {activity.duration_seconds > 0 && (
                      <span style={{ fontSize: '0.78rem', color: 'var(--silver)' }}>⏱ {formatDuration(activity.duration_seconds)}</span>
                    )}
                    {activity.average_heart_rate > 0 && (
                      <span style={{ fontSize: '0.78rem', color: 'var(--silver)' }}>❤️ {Math.round(activity.average_heart_rate)} bpm</span>
                    )}
                    {activity.elevation_gain > 0 && (
                      <span style={{ fontSize: '0.78rem', color: 'var(--silver)' }}>⛰ {Math.round(activity.elevation_gain)}m</span>
                    )}
                  </div>
                </div>

                {/* TSS */}
                {activity.tss > 0 && !isMobile && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'Cormorant Garant, serif', fontSize: '1.5rem', fontWeight: 600, color: 'var(--gold)' }}>
                      {Math.round(activity.tss)}
                    </div>
                    <div style={{ fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--silver-dim)' }}>TSS</div>
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
