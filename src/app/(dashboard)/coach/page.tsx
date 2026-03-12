'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useBreakpoint } from '@/hooks/useBreakpoint'

interface Profile {
  id: string
  full_name: string
  role: string
  ftp?: number
  invite_code?: string
}

export default function CoachDashboard() {
  const [profile, setProfile]   = useState<Profile | null>(null)
  const [athletes, setAthletes] = useState<Profile[]>([])
  const [stats, setStats]       = useState({ totalAthletes: 0, workoutsThisWeek: 0, completedToday: 0, upcomingRaces: 0 })
  const [showInviteModal, setShowInviteModal] = useState(false)
  const router   = useRouter()
  const supabase = createSupabaseBrowserClient()
  const { isMobile, isTablet, isWide } = useBreakpoint()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof || prof.role !== 'coach') { router.push('/athlete'); return }
      setProfile(prof)
      const { data: aths } = await supabase.from('profiles').select('*').eq('coach_id', user.id).eq('role', 'athlete')
      setAthletes(aths ?? [])
      setStats(s => ({ ...s, totalAthletes: aths?.length ?? 0 }))
    }
    load()
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>

      {/* ── PAGE HEADER ── */}
      <div className="fade-up" style={{ marginBottom: '40px' }}>
        <p style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--silver-dim)', marginBottom: '6px' }}>
          Coach Dashboard
        </p>
        <h1 style={{ fontFamily: 'Cormorant Garant, serif', fontSize: 'clamp(1.6rem, 5vw, 3.2rem)', fontWeight: 600, color: 'var(--platinum)', lineHeight: 1.1, wordBreak: 'break-word' }}>
          {greeting}, {profile?.full_name?.split(' ')[0]} 👋
        </h1>
        <p style={{ color: 'var(--silver)', marginTop: '6px', fontSize: '0.95rem' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="fade-up-1" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'Total Athletes',      value: stats.totalAthletes,    icon: '🏊' },
          { label: 'Workouts This Week',  value: stats.workoutsThisWeek, icon: '📋' },
          { label: 'Completed Today',     value: stats.completedToday,   icon: '✅' },
          { label: 'Upcoming Races',      value: stats.upcomingRaces,    icon: '🏁' },
        ].map(stat => (
          <div key={stat.label} className="card-luxury" style={{ padding: '24px', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '12px' }}>{stat.icon}</div>
            <div style={{ fontFamily: 'Cormorant Garant, serif', fontSize: '2.8rem', fontWeight: 600, color: 'var(--gold)', lineHeight: 1 }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--silver)', marginTop: '6px', letterSpacing: '0.05em' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── MAIN GRID ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 320px', gap: '24px' }}>

        {/* Athletes */}
        <div className="fade-up-2 card-luxury" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h2 style={{ fontFamily: 'Cormorant Garant, serif', fontSize: '1.6rem', fontWeight: 600, color: 'var(--platinum)' }}>
                Your Athletes
              </h2>
              <div style={{ height: '1px', background: 'linear-gradient(90deg, var(--gold-dim), transparent)', marginTop: '6px', width: '60px', opacity: 0.6 }} />
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              className="btn-gold"
              style={{ padding: '10px 20px', borderRadius: '8px', border: 'none' }}
            >
              + Add Athlete
            </button>
          </div>

          {athletes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--silver-dim)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🏊</div>
              <p style={{ fontFamily: 'Cormorant Garant, serif', fontSize: '1.2rem' }}>No athletes yet</p>
              <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>Share your invite code to get started</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {athletes.map(athlete => (
                <div key={athlete.id} style={{
                  display: 'flex', flexDirection: isMobile ? 'column' : 'row',
                  alignItems: isMobile ? 'flex-start' : 'center',
                  justifyContent: 'space-between',
                  gap: isMobile ? '12px' : '0',
                  padding: '16px 20px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(201,168,76,0.08)',
                  borderRadius: '12px',
                  width: '100%', boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '42px', height: '42px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--gold-dim), var(--gold))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: '1rem', color: '#0A0A0F', flexShrink: 0,
                    }}>
                      {athlete.full_name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--platinum)', fontSize: '0.95rem' }}>{athlete.full_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--silver-dim)', marginTop: '2px' }}>
                        FTP: {athlete.ftp ? `${athlete.ftp}w` : 'Not set'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', width: isMobile ? '100%' : 'auto' }}>
                    <button
                      onClick={() => router.push(`/calendar?athlete=${athlete.id}`)}
                      className="btn-ghost"
                      style={{ padding: '7px 14px', borderRadius: '8px', flex: isMobile ? 1 : undefined }}
                    >
                      View Plan
                    </button>
                    <button
                      onClick={() => router.push(`/workouts/new?athlete=${athlete.id}`)}
                      className="btn-gold"
                      style={{ padding: '7px 14px', borderRadius: '8px', border: 'none', flex: isMobile ? 1 : undefined }}
                    >
                      Add Workout
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Quick Actions */}
          <div className="fade-up-3 card-luxury" style={{ padding: '24px' }}>
            <h3 style={{ fontFamily: 'Cormorant Garant, serif', fontSize: '1.2rem', color: 'var(--platinum)', marginBottom: '16px' }}>
              Quick Actions
            </h3>
            {[
              { icon: '✏️', label: 'Build a Workout',  sub: 'Create swim, bike or run', href: '/workouts/new' },
              { icon: '📅', label: 'Open Calendar',    sub: 'Plan training week',       href: '/calendar'     },
            ].map(action => (
              <button
                key={action.label}
                onClick={() => router.push(action.href)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px', borderRadius: '10px', border: 'none',
                  background: 'rgba(255,255,255,0.02)', cursor: 'pointer',
                  transition: 'background 0.2s', marginBottom: '8px',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>{action.icon}</span>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--platinum)' }}>{action.label}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--silver-dim)' }}>{action.sub}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Invite Code */}
          <div className="fade-up-4 card-luxury" style={{ padding: '24px' }}>
            <h3 style={{ fontFamily: 'Cormorant Garant, serif', fontSize: '1.2rem', color: 'var(--platinum)', marginBottom: '4px' }}>
              Your Invite Code
            </h3>
            <p style={{ fontSize: '0.72rem', color: 'var(--silver-dim)', marginBottom: '16px' }}>
              Share with athletes to join your roster
            </p>
            <div style={{
              background: 'rgba(201,168,76,0.06)',
              border: '1px solid rgba(201,168,76,0.2)',
              borderRadius: '12px', padding: '16px',
              textAlign: 'center',
            }}>
              <div style={{
                fontFamily: 'DM Mono, monospace',
                fontSize: '2.2rem', fontWeight: 500,
                color: 'var(--gold)', letterSpacing: '0.2em',
              }}>
                {profile?.invite_code ?? '------'}
              </div>
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              className="btn-ghost"
              style={{ width: '100%', padding: '10px', borderRadius: '8px', marginTop: '12px' }}
            >
              Share Invite Link
            </button>
          </div>

          {/* Sport Zones */}
          <div className="card-luxury" style={{ padding: '24px' }}>
            <h3 style={{ fontFamily: 'Cormorant Garant, serif', fontSize: '1.2rem', color: 'var(--platinum)', marginBottom: '16px' }}>
              Sport Zones
            </h3>
            {[
              { sport: 'Swim', color: '#4A9EDB' },
              { sport: 'Bike', color: '#E8A84C' },
              { sport: 'Run',  color: '#DB4A6A' },
            ].map(s => (
              <div key={s.sport} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: s.color }} />
                <span style={{ fontSize: '0.85rem', color: 'var(--silver)' }}>{s.sport}</span>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* ── INVITE MODAL ── */}
      {showInviteModal && (
        <div
          onClick={() => setShowInviteModal(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100, padding: '24px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="card-luxury"
            style={{ width: '100%', maxWidth: '480px', padding: isMobile ? '24px 20px' : '36px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
              <h2 style={{ fontFamily: 'Cormorant Garant, serif', fontSize: '1.8rem', fontWeight: 600 }}>Add an Athlete</h2>
              <button onClick={() => setShowInviteModal(false)} style={{ background: 'none', border: 'none', color: 'var(--silver)', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Share link */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.12)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--platinum)', marginBottom: '4px' }}>🔗 Share Signup Link</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--silver-dim)', marginBottom: '12px' }}>Send this — invite code is pre-filled automatically</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  readOnly
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/signup?code=${profile?.invite_code}`}
                  style={{
                    flex: 1, background: 'var(--obsidian)', border: '1px solid rgba(201,168,76,0.2)',
                    color: 'var(--gold)', borderRadius: '8px', padding: '10px 12px',
                    fontSize: '0.72rem', fontFamily: 'DM Mono, monospace', outline: 'none',
                  }}
                />
                <button
                  onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/signup?code=${profile?.invite_code}`); alert('Copied!') }}
                  className="btn-gold"
                  style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', whiteSpace: 'nowrap' }}
                >
                  Copy
                </button>
              </div>
            </div>

            {/* Code only */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.12)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--platinum)', marginBottom: '4px' }}>🔑 Invite Code Only</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--silver-dim)', marginBottom: '12px' }}>Athlete enters this manually at signup</p>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{
                  flex: 1, background: 'var(--obsidian)', border: '1px solid rgba(201,168,76,0.2)',
                  borderRadius: '8px', padding: '12px', textAlign: 'center',
                  fontFamily: 'DM Mono, monospace', fontSize: '1.8rem',
                  color: 'var(--gold)', letterSpacing: '0.2em',
                }}>
                  {profile?.invite_code}
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(profile?.invite_code ?? ''); alert('Copied!') }}
                  className="btn-ghost"
                  style={{ padding: '12px 16px', borderRadius: '8px' }}
                >
                  Copy
                </button>
              </div>
            </div>

            <div style={{ background: 'rgba(74,158,219,0.08)', border: '1px solid rgba(74,158,219,0.2)', borderRadius: '10px', padding: '14px' }}>
              <p style={{ fontSize: '0.8rem', color: '#7BC8F0' }}>
                <strong>How it works:</strong> Athletes who sign up with your link or code automatically appear in your roster above.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
