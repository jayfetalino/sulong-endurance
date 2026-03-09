// src/app/(auth)/signup/page.tsx
// ─────────────────────────────────────────────────────────
// Updated signup — athletes enter a coach invite code
// to get automatically linked to their coach.
// ─────────────────────────────────────────────────────────
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import Link from 'next/link'

export default function SignupPage() {
  const [fullName, setFullName]     = useState('')
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [role, setRole]             = useState<'coach' | 'athlete'>('athlete')
  const [inviteCode, setInviteCode] = useState('')
  // inviteCode only matters when role === 'athlete'

  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const router  = useRouter()
  const supabase = createSupabaseBrowserClient()

  async function handleSignup() {
    setLoading(true)
    setError(null)

    // ── VALIDATE ───────────────────────────────────────
    if (!fullName.trim()) {
      setError('Please enter your full name.')
      setLoading(false)
      return
    }

    // If athlete, validate invite code before creating account
    let coachId: string | null = null
    if (role === 'athlete') {
      if (!inviteCode.trim()) {
        setError('Please enter your coach invite code.')
        setLoading(false)
        return
      }

      // Look up the coach by invite code
      const { data: coachData, error: coachError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('invite_code', inviteCode.trim().toUpperCase())
        // .toUpperCase() so "abc123" and "ABC123" both work
        .eq('role', 'coach')
        .single()

      if (coachError || !coachData) {
        setError('Invalid invite code. Please check with your coach.')
        setLoading(false)
        return
      }

      coachId = coachData.id
      // We found the coach — save their ID to link later
    }

    // ── CREATE AUTH ACCOUNT ────────────────────────────
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // ── CREATE PROFILE ROW ─────────────────────────────
    if (data.user) {
      const { error: profileError } = await supabase
        .rpc('create_profile', {
          user_id: data.user.id,
          user_name: fullName.trim(),
          user_role: role,
          user_coach_id: coachId,
          // If athlete: links to coach. If coach: stays null.
        })

      if (profileError) {
        setError(profileError.message)
        setLoading(false)
        return
      }
    }

    // ── REDIRECT ───────────────────────────────────────
    router.push(role === 'coach' ? '/coach' : '/athlete')
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">Sulong Endurance</h1>
          <p className="text-gray-400">Create your account</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">

          {error && (
            <div className="bg-red-950 border border-red-800 text-red-400 rounded-lg p-3 mb-5 text-sm">
              {error}
            </div>
          )}

          {/* Full name */}
          <div className="mb-4">
            <label className="block text-sm text-gray-300 mb-1.5">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Jane Smith"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Email */}
          <div className="mb-4">
            <label className="block text-sm text-gray-300 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Password */}
          <div className="mb-4">
            <label className="block text-sm text-gray-300 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Role selector */}
          <div className="mb-4">
            <label className="block text-sm text-gray-300 mb-1.5">I am a...</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setRole('athlete')}
                className={`py-3 rounded-lg border font-medium text-sm transition-colors ${
                  role === 'athlete'
                    ? 'bg-cyan-500 border-cyan-500 text-gray-950'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                🏊 Athlete
              </button>
              <button
                onClick={() => setRole('coach')}
                className={`py-3 rounded-lg border font-medium text-sm transition-colors ${
                  role === 'coach'
                    ? 'bg-cyan-500 border-cyan-500 text-gray-950'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                📋 Coach
              </button>
            </div>
          </div>

          {/* Invite code — only shown for athletes */}
          {role === 'athlete' && (
            <div className="mb-4">
              <label className="block text-sm text-gray-300 mb-1.5">
                Coach Invite Code
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value.toUpperCase())}
                // .toUpperCase() as they type so it always shows uppercase
                placeholder="e.g. ABC123"
                maxLength={6}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-cyan-500 transition-colors font-mono tracking-widest text-center text-lg uppercase"
                // font-mono = monospace font looks great for codes
                // tracking-widest = spaced out letters
              />
              <p className="text-xs text-gray-500 mt-1.5">
                Get this code from your coach.
              </p>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSignup}
            disabled={loading}
            className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 disabled:text-gray-500 text-gray-950 font-bold rounded-lg px-4 py-3 transition-colors mt-2"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <p className="text-center text-gray-500 text-sm mt-5">
            Already have an account?{' '}
            <Link href="/login" className="text-cyan-400 hover:text-cyan-300">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

