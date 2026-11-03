'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { DesktopNav } from './DesktopNav'
import { MobileNav } from './MobileNav'
import { ThemeToggle } from './ThemeToggle'
import type { NavModel } from './types'

export const SCROLL_THRESHOLD = 8

/** Sticky header. Gains the translucent, blurred background once the page scrolls past 8px. */
export function Header({ model, logo }: { model: NavModel; logo: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`site-header${menuOpen ? ' is-menu-open' : ''}`} data-scrolled={scrolled ? 'true' : 'false'}>
      <div className="container-wide relative flex h-full items-center gap-4 lg:gap-8">
        {logo}
        <DesktopNav model={model} pathname={pathname} onOpenChange={setMenuOpen} />
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <ThemeToggle toLight={model.labels.toLight} toDark={model.labels.toDark} />
          <Link href={model.loginHref} className="m-btn ghost sm hidden lg:inline-flex">{model.labels.login}</Link>
          <Link href={model.signupHref} className="m-btn primary sm hidden sm:inline-flex">{model.labels.startFree}</Link>
          <MobileNav model={model} pathname={pathname} />
        </div>
      </div>
    </header>
  )
}
