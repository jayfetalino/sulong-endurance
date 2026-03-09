// src/app/(auth)/login/page.tsx
'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  const router   = useRouter()
  const supabase = createSupabaseBrowserClient()

  async function handleLogin() {
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      router.push(profile?.role === 'coach' ? '/coach' : '/athlete')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--obsidian)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'DM Sans, sans-serif',
    }}>

      {/* Background accent */}
      <div style={{
        position: 'fixed',
        top: '-20%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(201,168,76,0.04) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: '420px' }} className="fade-up">

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{
            fontFamily: 'Cormorant Garant, serif',
            fontSize: '2.8rem',
            fontWeight: 700,
            color: 'var(--gold)',
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}>
            Sulong
          </div>
          <div style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '0.65rem',
            fontWeight: 500,
            color: 'var(--silver)',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            marginTop: '6px',
          }}>
            Endurance Training System
          </div>
          <div style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.4), transparent)',
            marginTop: '20px',
          }} />
        </div>

        {/* Card */}
        <div style={{
          background: 'linear-gradient(135deg, var(--obsidian-3) 0%, var(--obsidian-2) 100%)',
          border: '1px solid rgba(201,168,76,0.15)',
          borderRadius: '20px',
          padding: '40px',
        }}>

          <h1 style={{
            fontFamily: 'Cormorant Garant, serif',
            fontSize: '1.8rem',
            fontWeight: 600,
            color: 'var(--platinum)',
            marginBottom: '4px',
          }}>
            Welcome back
          </h1>
          <p style={{ color: 'var(--silver)', fontSize: '0.875rem', marginBottom: '32px' }}>
            Sign in to your training account
          </p>

          {error && (
            <div style={{
              background: 'rgba(180,40,40,0.15)',
              border: '1px solid rgba(180,40,40,0.4)',
              color: '#FF8080',
              borderRadius: '10px',
              padding: '12px 16px',
              fontSize: '0.875rem',
              marginBottom: '24px',
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '0.7rem',
              fontWeight: 500,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--silver)',
              marginBottom: '8px',
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="athlete@example.com"
              className="input-luxury"
            />
          </div>

          <div style={{ marginBottom: '32px' }}>
            <label style={{
              display: 'block',
              fontSize: '0.7rem',
              fontWeight: 500,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--silver)',
              marginBottom: '8px',
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••••"
              className="input-luxury"
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="btn-gold"
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '10px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <p style={{
            textAlign: 'center',
            color: 'var(--silver-dim)',
            fontSize: '0.8rem',
            marginTop: '24px',
          }}>
            New athlete?{' '}
            <Link href="/signup" style={{ color: 'var(--gold)', textDecoration: 'none' }}>
              Create account
            </Link>
          </p>

        </div>

        {/* Bottom tagline */}
        <p style={{
          textAlign: 'center',
          color: 'var(--silver-dim)',
          fontSize: '0.7rem',
          letterSpacing: '0.1em',
          marginTop: '32px',
          fontStyle: 'italic',
          fontFamily: 'Cormorant Garant, serif',
        }}>
          Train with purpose. Race with confidence.
        </p>

      </div>
    </div>
  )
}

