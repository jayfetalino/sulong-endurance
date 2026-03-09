// src/app/(dashboard)/athlete/strava/page.tsx
// Simple redirect page — sends athlete back to dashboard
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function StravaPage() {
  const router = useRouter()
  
  useEffect(() => {
    router.push('/athlete')
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-gray-400">Connecting Strava...</div>
    </div>
  )
}