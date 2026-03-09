// src/app/(auth)/login/page.tsx
// ─────────────────────────────────────────────────────────
// This is the LOGIN page — what users see at /login
// 
// 'use client' at the top means this component runs in 
// the browser (not on the server). We need this because
// it listens to button clicks and typing — things that
// only happen in the browser.
// ─────────────────────────────────────────────────────────
'use client'

// useState = lets us store values that change over time
// e.g. what the user has typed in the email box
import { useState } from 'react'

// useRouter = lets us navigate to a different page in code
// e.g. after login, send user to /dashboard
import { useRouter } from 'next/navigation'

// Our Supabase browser client from the file we just made
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

// "@/" is a shortcut that means "starting from the src/ folder"
// So "@/lib/supabase" = "src/lib/supabase"

// Link = like an <a> tag but faster — doesn't reload the whole page
import Link from 'next/link'

export default function LoginPage() {
  // ── STATE ────────────────────────────────────────────────
  // Think of "state" like sticky notes the component remembers.
  // When state changes, the page automatically re-renders.

  const [email, setEmail] = useState('')
  // email = the current value of the email input
  // setEmail = the function to UPDATE that value
  // useState('') = starts as an empty string

  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  // error = null means no error. A string means show that error message.
  const [loading, setLoading] = useState(false)
  // loading = true while we wait for Supabase to respond

  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  // ── HANDLE LOGIN ─────────────────────────────────────────
  // This function runs when the user clicks "Sign In"
  async function handleLogin() {
    setLoading(true)   // Show loading state
    setError(null)     // Clear any previous error

    // Ask Supabase: "is this email + password correct?"
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    // "await" = wait for Supabase to respond before continuing
    // We destructure { error } from the response — if login failed,
    // error will contain a message explaining why
if (error) {
      // Login failed — show the error message to the user
      setError(error.message)
      setLoading(false)
      return
    }

    // Login succeeded! Now check their role in the profiles table
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      // .single() = expect exactly one row back

      // Coaches → /coach, Athletes → /athlete
      if (profileData?.role === 'coach') {
        router.push('/coach')
      } else {
        router.push('/athlete')
      }
    }

     else {
      router.push('/athlete')
    }

    // We'll update this later to go to /athlete for athletes
  }

  // ── RENDER ───────────────────────────────────────────────
  // Everything below is what gets displayed on screen.
  // This looks like HTML but it's actually JSX — 
  // JavaScript that describes what the page should look like.

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      {/* min-h-screen = at least as tall as the screen */}
      {/* bg-gray-950 = very dark background */}
      {/* flex items-center justify-center = center everything */}

      <div className="w-full max-w-md">
        {/* max-w-md = not too wide — readable on all screens */}

        {/* ── HEADER ── */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            TriCoach
          </h1>
          <p className="text-gray-400">
            Sign in to your account
          </p>
        </div>

        {/* ── CARD ── */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">

          {/* ── ERROR MESSAGE ── */}
          {/* The "&&" means: only show this if error is not null */}
          {error && (
            <div className="bg-red-950 border border-red-800 text-red-400 rounded-lg p-3 mb-6 text-sm">
              {error}
            </div>
          )}

          {/* ── EMAIL FIELD ── */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              // onChange fires every time the user types a character
              // e.target.value = whatever is currently in the input box
              // setEmail(...) updates our state with the new value
              placeholder="you@example.com"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-cyan-500 transition-colors"
              // focus:border-cyan-500 = highlight cyan when clicked
            />
          </div>

          {/* ── PASSWORD FIELD ── */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* ── SUBMIT BUTTON ── */}
          <button
            onClick={handleLogin}
            // onClick fires when the button is clicked
            disabled={loading}
            // disabled = can't click while loading
            className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 disabled:text-gray-500 text-gray-950 font-bold rounded-lg px-4 py-3 transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In'}
            {/* Ternary operator: if loading is true show first text, else show second */}
          </button>

          {/* ── SIGNUP LINK ── */}
          <p className="text-center text-gray-500 text-sm mt-6">
            Don't have an account?{' '}
            <Link href="/signup" className="text-cyan-400 hover:text-cyan-300">
              Create one
            </Link>
          </p>

        </div>
      </div>
    </div>
  )
}