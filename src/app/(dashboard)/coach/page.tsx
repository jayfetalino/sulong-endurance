'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import type { Profile } from '@/types'

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="text-2xl mb-3">{icon}</div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-gray-400">{label}</div>
    </div>
  )
}

export default function CoachDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [athletes, setAthletes] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    async function loadData() {
      // Check if someone is logged in
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Fetch this coach's profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) setProfile(profileData)

      // Fetch all athletes belonging to this coach
      const { data: athletesData } = await supabase
        .from('profiles')
        .select('*')
        .eq('coach_id', user.id)
        .order('full_name', { ascending: true })

      if (athletesData) setAthletes(athletesData)

      setLoading(false)
    }

    loadData()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* TOP NAV */}
      <nav className="border-b border-gray-800 bg-gray-900 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-cyan-400">Sulong Endurance Training System</span>
            <span className="text-gray-600">|</span>
            <span className="text-gray-400 text-sm">Coach Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-300 text-sm">👋 {profile?.full_name}</span>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="max-w-6xl mx-auto px-6 py-10">

        {/* WELCOME */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-2">
            Good morning, {profile?.full_name?.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-400">
            Here's what's happening with your athletes today.
          </p>
        </div>

        {/* STAT CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <StatCard icon="🏊" value={athletes.length.toString()} label="Total Athletes" />
          <StatCard icon="📋" value="0" label="Workouts This Week" />
          <StatCard icon="✅" value="0" label="Completed Today" />
          <StatCard icon="📅" value="0" label="Upcoming Races" />
        </div>

        {/* TWO COLUMN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ATHLETE LIST */}
          <div className="lg:col-span-2">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Your Athletes</h2>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-sm px-4 py-2 rounded-lg transition-colors">
                  + Add Athlete
                </button>
              </div>

              {athletes.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">🏊</div>
                  <p className="text-gray-400 mb-2">No athletes yet</p>
                  <p className="text-gray-600 text-sm">
                    Athletes will appear here once they sign up and are assigned to you.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {athletes.map((athlete) => (
                    <div
                      key={athlete.id}
                      className="flex items-center justify-between p-4 bg-gray-800 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-cyan-500 rounded-full flex items-center justify-center text-gray-950 font-bold">
                          {athlete.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">{athlete.full_name}</div>
                          <div className="text-sm text-gray-400">
                            FTP: {athlete.ftp ? `${athlete.ftp}w` : 'Not set'}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => router.push(`/calendar?athlete=${athlete.id}`)}
                          className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg transition-colors">
                          View Plan
                        </button>
                        <button
                          onClick={() => router.push(`/workouts/new?athlete=${athlete.id}`)}
                          className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg transition-colors">
                          Add Workout
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* QUICK ACTIONS */}
          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <button
                  onClick={() => router.push('/workouts')}
                  className="w-full text-left flex items-center gap-3 p-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors"
                >
                  <span className="text-xl">✍️</span>
                  <div>
                    <div className="font-medium text-sm">Build a Workout</div>
                    <div className="text-xs text-gray-400">Create swim, bike or run</div>
                  </div>
                </button>
                <button
                  onClick={() => router.push('/calendar')}
                  className="w-full text-left flex items-center gap-3 p-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors"
                >
                  <span className="text-xl">📅</span>
                  <div>
                    <div className="font-medium text-sm">Open Calendar</div>
                    <div className="text-xs text-gray-400">Plan training week</div>
                  </div>
                </button>
                <button className="w-full text-left flex items-center gap-3 p-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors">
                  <span className="text-xl">📊</span>
                  <div>
                    <div className="font-medium text-sm">View Analytics</div>
                    <div className="text-xs text-gray-400">Athlete performance</div>
                  </div>
                </button>
              </div>
            </div>

            {/* YOUR INVITE CODE CARD — paste this above Sport Zones */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h2 className="text-sm font-bold text-gray-400 mb-1 uppercase tracking-wider">
                Your Invite Code
              </h2>
              <p className="text-xs text-gray-600 mb-3">
                Share this with athletes so they can join your roster.
              </p>
              <div className="bg-gray-800 rounded-xl px-4 py-3 text-center">
                <span className="text-3xl font-mono font-bold tracking-widest text-cyan-400">
                  {(profile as any)?.invite_code ?? '------'}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-2 text-center">
                Athletes enter this at signup
              </p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h2 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Sport Zones</h2>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full bg-cyan-400"></div>
                  <span className="text-gray-300">Swim</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full bg-orange-400"></div>
                  <span className="text-gray-300">Bike</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  <span className="text-gray-300">Run</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    {/* ── INVITE MODAL ── */}
      {showInviteModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setShowInviteModal(false)}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-2xl p-8 w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Add an Athlete</h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-500 hover:text-white text-xl"
              >✕</button>
            </div>

            {/* Two ways to invite */}
            <div className="space-y-5">

              {/* Option 1: Share the link */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                <h3 className="font-bold mb-1">🔗 Share Signup Link</h3>
                <p className="text-sm text-gray-400 mb-3">
                  Send this link to your athlete. It pre-fills your invite code automatically.
                </p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/signup?code=${(profile as any)?.invite_code}`}
                    className="flex-1 bg-gray-900 border border-gray-600 text-cyan-400 text-xs rounded-lg px-3 py-2.5 font-mono"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/signup?code=${(profile as any)?.invite_code}`
                      )
                      alert('Link copied!')
                    }}
                    className="bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-sm px-4 rounded-lg transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Option 2: Share the code */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                <h3 className="font-bold mb-1">🔑 Share Invite Code</h3>
                <p className="text-sm text-gray-400 mb-3">
                  Athletes enter this code manually at signup.
                </p>
                <div className="flex gap-2 items-center">
                  <div className="flex-1 bg-gray-900 border border-gray-600 rounded-xl px-4 py-3 text-center">
                    <span className="text-3xl font-mono font-bold tracking-widest text-cyan-400">
                      {(profile as any)?.invite_code ?? '------'}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText((profile as any)?.invite_code ?? '')
                      alert('Code copied!')
                    }}
                    className="bg-gray-700 hover:bg-gray-600 text-white font-bold text-sm px-4 py-3 rounded-xl transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <p className="text-sm text-blue-300">
                  <span className="font-bold">How it works:</span> When your athlete signs up using your link or code, they automatically appear in your Athletes list above.
                </p>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  )
}
