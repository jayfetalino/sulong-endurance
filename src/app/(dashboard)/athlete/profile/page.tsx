'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useBreakpoint } from '@/hooks/useBreakpoint'

const ATHLETE_TYPES = ['Runner', 'Cyclist', 'Swimmer', 'Triathlete']
const RACE_DISTANCES = [
  '5K', '10K', 'Half Marathon', 'Marathon',
  'Sprint Triathlon', 'Olympic Triathlon', '70.3 Half Ironman', 'Full Ironman (140.6)',
  'Other',
]

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--silver-dim)', marginBottom: '16px' }}>
    {children}
  </p>
)

export default function AthleteProfilePage() {
  const supabase = createSupabaseBrowserClient()
  const router   = useRouter()
  const { isMobile } = useBreakpoint()

  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [email,    setEmail]    = useState('')

  // Editable fields
  const [fullName,       setFullName]       = useState('')
  const [athleteType,    setAthleteType]    = useState('')
  const [raceDistance,   setRaceDistance]   = useState('')
  const [coachingGoals,  setCoachingGoals]  = useState('')
  const [lthr,           setLthr]           = useState('')
  const [ftp,            setFtp]            = useState('')
  const [stravaId,       setStravaId]       = useState<string | null>(null)
  const [userId,         setUserId]         = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      setEmail(user.email ?? '')

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (prof) {
        setFullName(prof.full_name ?? '')
        setAthleteType(prof.athlete_type ?? '')
        setRaceDistance(prof.race_distance ?? '')
        setCoachingGoals(prof.coaching_goals ?? '')
        setLthr(prof.lthr != null ? String(prof.lthr) : '')
        setFtp(prof.ftp != null ? String(prof.ftp) : '')
        setStravaId((prof as Record<string, unknown>).strava_athlete_id as string ?? null)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    await supabase.from('profiles').update({
      full_name:      fullName,
      athlete_type:   athleteType || null,
      race_distance:  raceDistance || null,
      coaching_goals: coachingGoals || null,
      lthr:           lthr ? Number(lthr) : null,
      ftp:            ftp  ? Number(ftp)  : null,
    }).eq('id', userId)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const showFtp = athleteType === 'Cyclist' || athleteType === 'Triathlete'

  // Initials avatar
  const initials = fullName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?'

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
  }
  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(201,168,76,0.2)',
    borderRadius: '8px',
    color: 'var(--platinum)',
    padding: '10px 14px',
    fontSize: '0.9rem',
    fontFamily: 'DM Sans, sans-serif',
    appearance: 'none',
    cursor: 'pointer',
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ fontFamily: 'Cormorant Garant, serif', fontSize: '1.5rem', color: 'var(--silver)', fontStyle: 'italic' }}>
        Loading profile...
      </div>
    </div>
  )

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', maxWidth: '640px' }}>

      {/* Header */}
      <div className="fade-up" style={{ marginBottom: '40px' }}>
        <p style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--silver-dim)', marginBottom: '6px' }}>
          Athlete
        </p>
        <h1 style={{ fontFamily: 'Cormorant Garant, serif', fontSize: 'clamp(1.6rem, 5vw, 2.8rem)', fontWeight: 600, color: 'var(--platinum)', lineHeight: 1.1, wordBreak: 'break-word' }}>
          My Profile
        </h1>
        <p style={{ color: 'var(--silver)', marginTop: '6px' }}>
          Manage your personal info and training settings.
        </p>
      </div>

      {/* ── PERSONAL INFO ── */}
      <div className="fade-up-1 card-luxury" style={{ padding: isMobile ? '20px 16px' : '28px', marginBottom: '20px' }}>
        <SectionLabel>Personal Info</SectionLabel>

        {/* Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(201,168,76,0.25), rgba(201,168,76,0.08))',
            border: '2px solid rgba(201,168,76,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Cormorant Garant, serif',
            fontSize: '1.5rem', fontWeight: 700, color: 'var(--gold)',
          }}>
            {initials}
          </div>
          <div>
            <div style={{ fontFamily: 'Cormorant Garant, serif', fontSize: '1.3rem', fontWeight: 600, color: 'var(--platinum)' }}>
              {fullName || 'Your Name'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--silver-dim)', marginTop: '2px' }}>
              {email}
            </div>
          </div>
        </div>

        {/* Full Name */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--silver-dim)', marginBottom: '6px' }}>
            Full Name
          </label>
          <input
            className="input-luxury"
            style={inputStyle}
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="Your full name"
          />
        </div>

        {/* Email (read-only) */}
        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--silver-dim)', marginBottom: '6px' }}>
            Email <span style={{ color: 'var(--gold)', fontSize: '0.65rem' }}>· read only</span>
          </label>
          <input
            className="input-luxury"
            style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }}
            value={email}
            readOnly
          />
        </div>
      </div>

      {/* ── ATHLETE INFO ── */}
      <div className="fade-up-2 card-luxury" style={{ padding: isMobile ? '20px 16px' : '28px', marginBottom: '20px' }}>
        <SectionLabel>Athlete Info</SectionLabel>

        {/* Athlete Type */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--silver-dim)', marginBottom: '6px' }}>
            Athlete Type
          </label>
          <select
            style={selectStyle}
            value={athleteType}
            onChange={e => setAthleteType(e.target.value)}
          >
            <option value="">Select type…</option>
            {ATHLETE_TYPES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Race Distance */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--silver-dim)', marginBottom: '6px' }}>
            Race Distance
          </label>
          <select
            style={selectStyle}
            value={raceDistance}
            onChange={e => setRaceDistance(e.target.value)}
          >
            <option value="">Select distance…</option>
            {RACE_DISTANCES.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* Coaching Goals */}
        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--silver-dim)', marginBottom: '6px' }}>
            Coaching Goals
          </label>
          <textarea
            className="input-luxury"
            style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
            value={coachingGoals}
            onChange={e => setCoachingGoals(e.target.value)}
            placeholder="What do you want to achieve this season?"
          />
        </div>
      </div>

      {/* ── PERFORMANCE ── */}
      <div className="fade-up-3 card-luxury" style={{ padding: isMobile ? '20px 16px' : '28px', marginBottom: '20px' }}>
        <SectionLabel>Performance Metrics</SectionLabel>

        <div style={{ display: 'grid', gridTemplateColumns: showFtp ? '1fr 1fr' : '1fr', gap: '16px' }}>
          {/* LTHR — always shown */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--silver-dim)', marginBottom: '6px' }}>
              LTHR <span style={{ color: 'var(--silver-dim)', fontSize: '0.65rem', textTransform: 'none', letterSpacing: 0 }}>bpm</span>
            </label>
            <input
              className="input-luxury"
              style={inputStyle}
              type="number"
              min={100}
              max={220}
              value={lthr}
              onChange={e => setLthr(e.target.value)}
              placeholder="e.g. 162"
            />
            <p style={{ fontSize: '0.68rem', color: 'var(--silver-dim)', marginTop: '4px' }}>
              Lactate Threshold Heart Rate
            </p>
          </div>

          {/* FTP — only for Cyclist / Triathlete */}
          {showFtp && (
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--silver-dim)', marginBottom: '6px' }}>
                FTP <span style={{ color: 'var(--silver-dim)', fontSize: '0.65rem', textTransform: 'none', letterSpacing: 0 }}>watts</span>
              </label>
              <input
                className="input-luxury"
                style={inputStyle}
                type="number"
                min={50}
                max={600}
                value={ftp}
                onChange={e => setFtp(e.target.value)}
                placeholder="e.g. 280"
              />
              <p style={{ fontSize: '0.68rem', color: 'var(--silver-dim)', marginTop: '4px' }}>
                Functional Threshold Power
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── STRAVA ── */}
      <div className="fade-up-4 card-luxury" style={{ padding: isMobile ? '20px 16px' : '28px', marginBottom: '28px' }}>
        <SectionLabel>Strava Integration</SectionLabel>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '10px', flexShrink: 0,
              background: stravaId ? '#FC4C02' : 'rgba(252,76,2,0.12)',
              border: stravaId ? 'none' : '1px solid rgba(252,76,2,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, color: stravaId ? 'white' : '#FC4C02', fontSize: '0.95rem',
            }}>
              S
            </div>
            <div>
              <div style={{ fontWeight: 600, color: stravaId ? '#FC4C02' : 'var(--platinum)', fontSize: '0.9rem' }}>
                {stravaId ? 'Strava Connected ✓' : 'Connect Strava'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--silver-dim)', marginTop: '2px' }}>
                {stravaId ? 'Activities syncing automatically' : 'Auto-import your workouts'}
              </div>
            </div>
          </div>
          {!stravaId && (
            <a
              href="/athlete/strava"
              style={{
                background: '#FC4C02', color: 'white', fontWeight: 600,
                fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase',
                padding: '10px 18px', borderRadius: '8px', textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              Connect →
            </a>
          )}
          {stravaId && (
            <a
              href="/athlete/strava"
              className="btn-ghost"
              style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.75rem', textDecoration: 'none' }}
            >
              Manage →
            </a>
          )}
        </div>
      </div>

      {/* ── SAVE ── */}
      <div className="fade-up-5" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-gold"
          style={{ padding: '12px 32px', borderRadius: '8px', border: 'none', fontSize: '0.85rem', opacity: saving ? 0.7 : 1 }}
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        {saved && (
          <span style={{ fontSize: '0.82rem', color: '#4ADB8A', display: 'flex', alignItems: 'center', gap: '6px' }}>
            ✓ Profile saved
          </span>
        )}
      </div>

    </div>
  )
}
