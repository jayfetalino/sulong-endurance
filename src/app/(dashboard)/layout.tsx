'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useEffect, useState } from 'react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [role, setRole] = useState<string | null>(null)
  const [name, setName] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .single()
      setRole(data?.role ?? null)
      setName(data?.full_name?.split(' ')[0] ?? null)
    }
    load()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const coachLinks = [
    { href: '/coach',    label: 'Overview'  },
    { href: '/calendar', label: 'Calendar'  },
    { href: '/workouts', label: 'Workouts'  },
  ]
  const athleteLinks = [
    { href: '/athlete',  label: 'My Training' },
  ]
  const links = role === 'coach' ? coachLinks : athleteLinks

  return (
    <div style={{ minHeight: '100vh', background: 'var(--obsidian)' }}>

      {/* ── NAV ── */}
      <nav style={{
        borderBottom: '1px solid rgba(201,168,76,0.12)',
        background: 'rgba(10,10,15,0.97)',
        backdropFilter: 'blur(20px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 24px',
          height: '72px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>

          {/* Logo */}
          <Link href={role === 'coach' ? '/coach' : '/athlete'} style={{ textDecoration: 'none' }}>
            <img src="/sulong-logo-transparent.png" alt="Sulong" style={{ height: '48px', width: 'auto', filter: 'drop-shadow(0 0 8px rgba(201,168,76,0.3))' }} />
          </Link>

          {/* Nav Links */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {links.map(link => {
              const active = pathname === link.href
              return (
                <Link key={link.href} href={link.href} style={{
                  textDecoration: 'none',
                  padding: '6px 16px',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: active ? 'var(--gold)' : 'var(--silver)',
                  background: active ? 'rgba(201,168,76,0.08)' : 'transparent',
                  border: active ? '1px solid rgba(201,168,76,0.2)' : '1px solid transparent',
                  transition: 'all 0.2s ease',
                }}>
                  {link.label}
                </Link>
              )
            })}
          </div>

          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {name && (
              <span style={{
                fontFamily: 'Cormorant Garant, serif',
                fontSize: '1rem',
                fontStyle: 'italic',
                color: 'var(--platinum)',
              }}>
                {name}
              </span>
            )}
            <button onClick={signOut} className="btn-ghost" style={{
              padding: '6px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(201,168,76,0.25)',
              color: 'var(--silver)',
              fontSize: '0.7rem',
            }}>
              Sign Out
            </button>
          </div>

        </div>
        {/* Gold hairline */}
        <div style={{
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.25), transparent)',
        }} />
      </nav>

      {/* ── CONTENT ── */}
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '40px 24px' }}>
        {children}
      </main>

    </div>
  )
}
