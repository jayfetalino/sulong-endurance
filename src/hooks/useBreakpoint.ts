'use client'
import { useState, useEffect } from 'react'

export function useBreakpoint() {
  const [bp, setBp] = useState({ isMobile: true, isTablet: false, isDesktop: false, isWide: false })

  useEffect(() => {
    function update() {
      setBp({
        isMobile:  window.matchMedia('(max-width: 767px)').matches,
        isTablet:  window.matchMedia('(min-width: 768px) and (max-width: 1023px)').matches,
        isDesktop: window.matchMedia('(min-width: 1024px) and (max-width: 1439px)').matches,
        isWide:    window.matchMedia('(min-width: 1440px)').matches,
      })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return bp
}
