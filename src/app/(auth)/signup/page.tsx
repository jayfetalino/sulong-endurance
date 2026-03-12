// src/app/(auth)/signup/page.tsx
'use client'

import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import Link from 'next/link'
import { useBreakpoint } from '@/hooks/useBreakpoint'

const RUNNER_DISTANCES = [
  '5K (3.1M)',
  '10K (6.2M)',
  '21K (13.1M / Half Marathon)',
  '42K (26.2M / Marathon)',
  'Other',
]

const TRIATHLETE_DISTANCES = [
  'Sprint Distance',
  'Olympic Distance',
  'Half Ironman (70.3)',
  'Full Ironman (140.6)',
]

function goalsLabel(athleteType: string): string {
  if (athleteType === 'Cyclist') return "What would make you say 'that coaching changed everything'? Let's make it happen"
  if (athleteType === 'Swimmer') return "What's the big swim goal we're chasing together? Dream big!"
  return 'What is your goal? (e.g. finish time, first race, improvement)'
}

function goalsPlaceholder(): string {
  return 'Share your goal...'
}

const fadeIn: React.CSSProperties = {
  animation: 'fadeUp 0.4s ease forwards',
}

function SignupForm() {
  const searchParams = useSearchParams()
  const [fullName, setFullName]         = useState('')
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [inviteCode, setInviteCode]     = useState(
    searchParams.get('code')?.toUpperCase() ?? ''
  )
  const [athleteType, setAthleteType]   = useState('')
  const [raceDistance, setRaceDistance] = useState('')
  const [coachingGoals, setCoachingGoals] = useState('')
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const router   = useRouter()
  const supabase = createSupabaseBrowserClient()
  const { isMobile } = useBreakpoint()

  const needsDistance = athleteType === 'Runner' || athleteType === 'Triathlete'
  const showDistance  = needsDistance
  const showGoals     = athleteType === 'Cyclist' || athleteType === 'Swimmer' ||
                        (needsDistance && raceDistance !== '')

  function handleAthleteTypeChange(value: string) {
    setAthleteType(value)
    setRaceDistance('')
    setCoachingGoals('')
  }

  async function handleSignup() {
    setLoading(true)
    setError(null)

    if (!fullName.trim()) {
      setError('Please enter your full name.')
      setLoading(false)
      return
    }

    if (!inviteCode.trim()) {
      setError('Please enter your coach invite code.')
      setLoading(false)
      return
    }

    if (!athleteType) {
      setError('Please select your athlete type.')
      setLoading(false)
      return
    }

    if (needsDistance && !raceDistance) {
      setError('Please select your race distance.')
      setLoading(false)
      return
    }

    if (!coachingGoals.trim()) {
      setError('Please share your coaching goal.')
      setLoading(false)
      return
    }

    // Validate invite code
    const { data: coachData, error: coachError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('invite_code', inviteCode.trim().toUpperCase())
      .eq('role', 'coach')
      .single()

    if (coachError || !coachData) {
      setError('Invalid invite code. Please check with your coach.')
      setLoading(false)
      return
    }

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const { error: profileError } = await supabase.rpc('create_profile', {
        user_id:       data.user.id,
        user_name:     fullName.trim(),
        user_role:     'athlete',
        user_coach_id: coachData.id,
      })

      if (profileError) {
        setError(profileError.message)
        setLoading(false)
        return
      }

      await supabase
        .from('profiles')
        .update({
          athlete_type:   athleteType,
          race_distance:  raceDistance || null,
          coaching_goals: coachingGoals.trim(),
        })
        .eq('id', data.user.id)
    }

    router.push('/athlete')
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.65rem', fontWeight: 500,
    letterSpacing: '0.12em', textTransform: 'uppercase',
    color: 'var(--silver)', marginBottom: '8px',
  }

  const selectStyle: React.CSSProperties = {
    width: '100%',
    background: 'transparent',
    color: 'var(--platinum)',
    cursor: 'pointer',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--obsidian)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: isMobile ? '16px' : '24px',
    }}>
      {/* Radial glow */}
      <div style={{
        position: 'fixed', top: '-10%', left: '50%',
        transform: 'translateX(-50%)',
        width: '700px', height: '700px',
        background: 'radial-gradient(circle, rgba(201,168,76,0.05) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: '420px' }} className="fade-up">

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <img src="/sulong-logo-transparent.png" alt="Sulong" style={{ width: isMobile ? '200px' : '360px', height: 'auto' }} />
          <div style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '0.6rem',
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: 'var(--silver-dim)',
            marginTop: '0px',
          }}>
            Endurance Training System
          </div>
          <div style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.35), transparent)',
            marginTop: '10px',
          }} />
        </div>

        {/* Card */}
        <div className="card-luxury" style={{ padding: isMobile ? '24px 20px' : '40px' }}>
          <h1 style={{
            fontFamily: 'Cormorant Garant, serif',
            fontSize: '2rem',
            fontWeight: 600,
            color: 'var(--platinum)',
            marginBottom: '4px',
          }}>
            Create account
          </h1>
          <p style={{ color: 'var(--silver)', fontSize: '0.875rem', marginBottom: '28px' }}>
            Join the Sulong training platform
          </p>

          {error && (
            <div style={{
              background: 'rgba(180,40,40,0.12)',
              border: '1px solid rgba(180,40,40,0.35)',
              color: '#FF8080',
              borderRadius: '10px',
              padding: '12px 16px',
              fontSize: '0.85rem',
              marginBottom: '20px',
            }}>
              {error}
            </div>
          )}

          {/* Full Name */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Jane Smith"
              className="input-luxury"
            />
          </div>

          {/* Email */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input-luxury"
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••"
              className="input-luxury"
            />
          </div>

          {/* Invite code */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Coach Invite Code</label>
            <input
              type="text"
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              className="input-luxury"
              style={{ textAlign: 'center', letterSpacing: '0.3em', fontFamily: 'DM Mono, monospace', fontSize: '1.1rem', textTransform: 'uppercase' }}
            />
            <p style={{ fontSize: '0.72rem', color: 'var(--silver-dim)', marginTop: '6px' }}>
              Get this code from your coach.
            </p>
          </div>

          {/* Athlete Type */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>I am a...</label>
            <select
              value={athleteType}
              onChange={e => handleAthleteTypeChange(e.target.value)}
              className="input-luxury"
              style={selectStyle}
            >
              <option value="" disabled style={{ background: 'var(--obsidian-2)' }}>Select athlete type</option>
              {['Runner', 'Cyclist', 'Swimmer', 'Triathlete'].map(t => (
                <option key={t} value={t} style={{ background: 'var(--obsidian-2)' }}>{t}</option>
              ))}
            </select>
          </div>

          {/* Race Distance (Runner or Triathlete) */}
          {showDistance && (
            <div style={{ marginBottom: '16px', ...fadeIn }}>
              <label style={labelStyle}>Race Distance</label>
              <select
                value={raceDistance}
                onChange={e => { setRaceDistance(e.target.value); setCoachingGoals('') }}
                className="input-luxury"
                style={selectStyle}
              >
                <option value="" disabled style={{ background: 'var(--obsidian-2)' }}>Select distance</option>
                {(athleteType === 'Runner' ? RUNNER_DISTANCES : TRIATHLETE_DISTANCES).map(d => (
                  <option key={d} value={d} style={{ background: 'var(--obsidian-2)' }}>{d}</option>
                ))}
              </select>
            </div>
          )}

          {/* Coaching Goals */}
          {showGoals && (
            <div style={{ marginBottom: '16px', ...fadeIn }}>
              <label style={labelStyle}>{goalsLabel(athleteType)}</label>
              <textarea
                value={coachingGoals}
                onChange={e => setCoachingGoals(e.target.value)}
                placeholder={goalsPlaceholder()}
                rows={3}
                className="input-luxury"
                style={{ resize: 'vertical', minHeight: '80px' }}
              />
            </div>
          )}

          <button
            onClick={handleSignup}
            disabled={loading}
            className="btn-gold"
            style={{ width: '100%', padding: '14px', borderRadius: '10px', border: 'none', marginTop: '8px' }}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <p style={{
            textAlign: 'center', color: 'var(--silver-dim)',
            fontSize: '0.8rem', marginTop: '24px',
          }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--gold)', textDecoration: 'none' }}>
              Sign in
            </Link>
          </p>
        </div>

        <p style={{
          textAlign: 'center', marginTop: '28px',
          fontFamily: 'Cormorant Garant, serif',
          fontStyle: 'italic', fontSize: '0.9rem',
          color: 'var(--silver-dim)',
        }}>
          Train with purpose. Race with confidence.
        </p>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: 'var(--obsidian)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'Cormorant Garant, serif', fontSize: '1.5rem', color: 'var(--silver)', fontStyle: 'italic' }}>Loading...</div>
      </div>
    }>
      <SignupForm />
    </Suspense>
  )
}
