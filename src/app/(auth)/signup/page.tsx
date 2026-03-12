// src/app/(auth)/signup/page.tsx
'use client'

import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import Link from 'next/link'

function SignupForm() {
  const searchParams = useSearchParams()
  const [fullName, setFullName]     = useState('')
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [role, setRole]             = useState<'coach' | 'athlete'>('athlete')
  const [inviteCode, setInviteCode] = useState(
    searchParams.get('code')?.toUpperCase() ?? ''
  )
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const router   = useRouter()
  const supabase = createSupabaseBrowserClient()

  async function handleSignup() {
    setLoading(true)
    setError(null)

    if (!fullName.trim()) {
      setError('Please enter your full name.')
      setLoading(false)
      return
    }

    let coachId: string | null = null
    if (role === 'athlete') {
      if (!inviteCode.trim()) {
        setError('Please enter your coach invite code.')
        setLoading(false)
        return
      }

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

      coachId = coachData.id
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
        user_role:     role,
        user_coach_id: coachId,
      })

      if (profileError) {
        setError(profileError.message)
        setLoading(false)
        return
      }
    }

    router.push(role === 'coach' ? '/coach' : '/athlete')
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.65rem', fontWeight: 500,
    letterSpacing: '0.12em', textTransform: 'uppercase',
    color: 'var(--silver)', marginBottom: '8px',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--obsidian)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
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
          <img src="/sulong-logo-transparent.png" alt="Sulong" style={{ width: '360px', height: 'auto' }} />
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
        <div className="card-luxury" style={{ padding: '40px' }}>
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

          {/* Role toggle */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>I am a...</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {(['athlete', 'coach'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    border: role === r ? '1px solid rgba(201,168,76,0.5)' : '1px solid rgba(201,168,76,0.12)',
                    background: role === r ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.02)',
                    color: role === r ? 'var(--gold)' : 'var(--silver)',
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {r === 'athlete' ? '🏊 Athlete' : '📋 Coach'}
                </button>
              ))}
            </div>
          </div>

          {/* Invite code */}
          {role === 'athlete' && (
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
