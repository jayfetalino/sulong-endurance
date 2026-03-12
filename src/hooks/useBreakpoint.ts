'use client'
import { useState, useEffect } from 'react'

export function useBreakpoint() {
  const [width, setWidth] = useState(1280) // SSR-safe default (desktop)
  useEffect(() => {
    function update() { setWidth(window.innerWidth) }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return {
    isMobile:  width < 768,
    isTablet:  width >= 768 && width < 1024,
    isDesktop: width >= 1024 && width < 1440,
    isWide:    width >= 1440,
  }
}
