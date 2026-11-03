'use client'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Scroll reveal. Content is visible by default. When motion is allowed, this arms the effect by
 * adding .reveal-armed to <html> and fades [data-reveal] elements in as they enter the viewport.
 * Under prefers-reduced-motion it never arms, so nothing moves.
 */
export function RevealController() {
  const pathname = usePathname()
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reduce.matches || !('IntersectionObserver' in window)) {
      document.documentElement.classList.remove('reveal-armed')
      return
    }
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-revealed)'))
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-revealed'); io.unobserve(e.target) }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 })
    // Anything already on screen is revealed at once, so first paint never hides above-the-fold content.
    const vh = window.innerHeight
    for (const el of els) { if (el.getBoundingClientRect().top < vh) el.classList.add('is-revealed'); else io.observe(el) }
    document.documentElement.classList.add('reveal-armed')
    const onChange = () => { if (reduce.matches) { document.documentElement.classList.remove('reveal-armed'); io.disconnect() } }
    reduce.addEventListener('change', onChange)
    return () => { io.disconnect(); reduce.removeEventListener('change', onChange) }
  }, [pathname])
  return null
}
