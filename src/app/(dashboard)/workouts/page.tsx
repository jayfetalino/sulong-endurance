// src/app/(dashboard)/workouts/page.tsx
// The workout LIBRARY — lists all workouts the coach has created
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import type { Workout } from '@/types'

// Sport color helpers
const SPORT_COLORS: Record<string, string> = {
  swim: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30',
  bike: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  run:  'text-green-400 bg-green-400/10 border-green-400/30',
  brick: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
}

const SPORT_ICONS: Record<string, string> = {
  swim: '🏊', bike: '🚴', run: '🏃', brick: '🧱'
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('workouts')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        // Show newest workouts first

      if (data) setWorkouts(data)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">Loading workouts...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* NAV */}
      <nav className="border-b border-gray-800 bg-gray-900 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/coach')} className="text-gray-400 hover:text-white">
              ← Dashboard
            </button>
            <span className="text-gray-600">|</span>
            <span className="font-bold">Workout Library</span>
          </div>
          <button
            onClick={() => router.push('/workouts/new')}
            className="bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-sm px-4 py-2 rounded-lg transition-colors"
          >
            + New Workout
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {workouts.length === 0 ? (
          // Empty state
          <div className="text-center py-20">
            <div className="text-6xl mb-4">✍️</div>
            <h2 className="text-2xl font-bold mb-2">No workouts yet</h2>
            <p className="text-gray-400 mb-6">Create your first workout to get started.</p>
            <button
              onClick={() => router.push('/workouts/new')}
              className="bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold px-6 py-3 rounded-xl transition-colors"
            >
              Build Your First Workout
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workouts.map(workout => (
              <div
                key={workout.id}
                className="bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-2xl p-5 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-bold text-lg">{workout.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full border ${SPORT_COLORS[workout.sport]}`}>
                    {SPORT_ICONS[workout.sport]} {workout.sport}
                  </span>
                </div>
                {workout.description && (
                  <p className="text-gray-400 text-sm mb-3">{workout.description}</p>
                )}
                <div className="flex gap-4 text-sm text-gray-400">
                  <span>⏱ {formatDuration(workout.duration_seconds)}</span>
                  <span>📊 {(workout.intervals as unknown[])?.length ?? 0} intervals</span>
                  {workout.tss_estimate && <span>TSS: {workout.tss_estimate}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
