'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useEffect, useState } from 'react'
import { useBreakpoint } from '@/hooks/useBreakpoint'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [role, setRole] = useState<string | null>(null)
  const [name, setName] = useState<string | null>(null)
  const { isMobile, isTablet, isWide } = useBreakpoint()

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
    { href: '/coach',           label: 'Overview',  icon: '🏠' },
    { href: '/coach/athletes',  label: 'Athletes',  icon: '🏊' },
    { href: '/calendar',        label: 'Calendar',  icon: '📅' },
    { href: '/workouts',        label: 'Workouts',  icon: '✏️' },
  ]
  const athleteLinks = [
    { href: '/athlete',          label: 'My Training', icon: '🏃' },
    { href: '/athlete/workouts', label: 'Workouts',    icon: '📋' },
    { href: '/athlete/profile',  label: 'Profile',     icon: '👤' },
  ]
  const links = role === 'coach' ? coachLinks : athleteLinks

  const maxW = isWide ? '1400px' : '1280px'

  return (
    <>
    <div style={{ minHeight: '100vh', background: 'var(--obsidian)', overflowX: 'hidden' }}>

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
          maxWidth: maxW,
          margin: '0 auto',
          padding: isMobile ? '0 16px' : '0 24px',
          height: isMobile ? '56px' : isTablet ? '64px' : '72px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>

          {/* Logo */}
          <Link href={role === 'coach' ? '/coach' : '/athlete'} style={{ textDecoration: 'none' }}>
            <img src="/sulong-logo-transparent.png" alt="Sulong" style={{ height: isMobile ? '36px' : '48px', width: 'auto', filter: 'drop-shadow(0 0 8px rgba(201,168,76,0.3))' }} />
          </Link>

          {/* Nav Links — hidden on mobile (shown in bottom tab bar) */}
          {!isMobile && (
            <div style={{ display: 'flex', gap: '4px' }}>
              {links.map(link => {
                const active = pathname === link.href
                return (
                  <Link key={link.href} href={link.href} style={{
                    textDecoration: 'none',
                    padding: isTablet ? '6px 10px' : '6px 16px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: active ? 'var(--gold)' : 'var(--silver)',
                    background: active ? 'rgba(201,168,76,0.08)' : 'transparent',
                    border: active ? '1px solid rgba(201,168,76,0.2)' : '1px solid transparent',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: isTablet ? '0' : '6px',
                  }}>
                    {isTablet ? (
                      <span style={{ fontSize: '1.1rem' }}>{link.icon}</span>
                    ) : (
                      link.label
                    )}
                  </Link>
                )
              })}
            </div>
          )}

          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '16px' }}>
            {name && !isMobile && (
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
              padding: isMobile ? '5px 10px' : '6px 16px',
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
      <main style={{
        maxWidth: maxW,
        margin: '0 auto',
        padding: isMobile ? '20px 16px 80px' : isTablet ? '32px 20px' : '40px 24px',
        width: '100%',
        boxSizing: 'border-box',
        overflowX: 'hidden',
      }}>
        {children}
      </main>


    </div>

    {/* ── BOTTOM TAB BAR — always rendered, CSS hides on ≥768px ── */}
    <nav className="bottom-tab-bar" style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: 'calc(64px + env(safe-area-inset-bottom))',
      background: 'rgba(10,10,15,0.97)',
      backdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(201,168,76,0.15)',
      alignItems: 'stretch',
      zIndex: 50,
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {links.map(link => {
        const active = pathname === link.href
        return (
          <Link key={link.href} href={link.href} style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px',
            textDecoration: 'none',
            color: active ? 'var(--gold)' : 'var(--silver)',
            background: active ? 'rgba(201,168,76,0.06)' : 'transparent',
            borderTop: active ? '2px solid var(--gold)' : '2px solid transparent',
            transition: 'all 0.2s ease',
          }}>
            <span style={{ fontSize: '1.2rem' }}>{link.icon}</span>
            <span style={{ fontSize: '0.58rem', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {link.label}
            </span>
          </Link>
        )
      })}
    </nav>
    </>
  )
}
