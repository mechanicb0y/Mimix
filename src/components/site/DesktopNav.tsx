'use client'
import Link from 'next/link'
import { NavigationMenu } from 'radix-ui'
import { ArrowRight, ChevronDown } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Icon } from '@/components/Icon'
import type { NavLinkModel, NavModel } from './types'

/** Hover intent before a menu opens, in milliseconds (brief: 150ms). */
export const MEGA_MENU_DELAY = 150

/** Arrow keys move between links inside an open panel, in reading order. */
function onPanelKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
  const keys = ['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End']
  if (!keys.includes(e.key)) return
  const links = Array.from(e.currentTarget.querySelectorAll<HTMLAnchorElement>('a[href]'))
  const i = links.indexOf(document.activeElement as HTMLAnchorElement)
  if (i < 0) return
  e.preventDefault()
  e.stopPropagation()
  const next = e.key === 'Home' ? 0 : e.key === 'End' ? links.length - 1
    : e.key === 'ArrowDown' || e.key === 'ArrowRight' ? (i + 1) % links.length : (i - 1 + links.length) % links.length
  links[next]?.focus()
}

function MegaLink({ item, active }: { item: NavLinkModel; active: boolean }) {
  return (
    <NavigationMenu.Link asChild active={active}>
      <Link href={item.href} className="mega-link" aria-current={active ? 'page' : undefined}>
        <span className="icon-tile" aria-hidden="true"><Icon name={item.icon} size={16} /></span>
        <span><b>{item.title}{item.soon ? <span className="m-badge ml-2 align-middle">{item.soon}</span> : null}</b><span>{item.body}</span></span>
      </Link>
    </NavigationMenu.Link>
  )
}

/** Panel widths in pixels. Each panel has one fixed width, so nothing re-measures while it is open. */
export const MENU_WIDTHS = { products: 880, solutions: 420, developers: 400, resources: 420 } as const
const GUTTER = 16

/**
 * One menu panel, placed once under its own trigger when it opens and kept there: centred on the
 * trigger, nudged inside the window if it would overflow. Only its opacity animates. The panel's
 * transparent top padding bridges the gap from the trigger, so the pointer never leaves the menu.
 */
function MenuContent({ width, children, className = '' }: { width: number; children: React.ReactNode; className?: string }) {
  const [place, setPlace] = useState<{ left: number; gap: number } | undefined>(undefined)
  // Runs each time the panel mounts (every open), before the browser paints it.
  const ref = useCallback((el: HTMLDivElement | null) => {
    const item = el?.parentElement
    if (!item) { setPlace(undefined); return }
    const r = item.getBoundingClientRect()
    const vw = document.documentElement.clientWidth
    const wanted = r.left + r.width / 2 - width / 2
    const placed = Math.min(Math.max(GUTTER, wanted), Math.max(GUTTER, vw - GUTTER - width))
    // The panel's top edge sits just under the header; the padding above it bridges from the trigger.
    const header = item.closest('header')?.getBoundingClientRect()
    const gap = header ? Math.max(6, Math.round(header.bottom - 4 - r.bottom)) : 6
    setPlace({ left: Math.round(placed - r.left), gap })
  }, [width])
  return (
    <NavigationMenu.Content ref={ref} className="mega-content" style={{ width, left: place?.left, paddingTop: place?.gap, visibility: place ? undefined : 'hidden' }}>
      <div className={`mega-panel p-3 ${className}`} onKeyDown={onPanelKeyDown}>{children}</div>
    </NavigationMenu.Content>
  )
}

export function DesktopNav({ model, pathname, onOpenChange }: { model: NavModel; pathname: string; onOpenChange: (open: boolean) => void }) {
  const [value, setValue] = useState('')
  const change = useCallback((v: string) => { setValue(v); onOpenChange(v !== '') }, [onOpenChange])
  const is = (href: string) => pathname === href
  const inSection = (items: NavLinkModel[]) => items.some((i) => pathname.startsWith(i.href.split('#')[0] as string))

  return (
    <NavigationMenu.Root value={value} onValueChange={change} delayDuration={MEGA_MENU_DELAY} skipDelayDuration={300} aria-label={model.labels.mainNav} className="hidden lg:block">
      <NavigationMenu.List className="flex items-center gap-1">
        <NavigationMenu.Item className="relative" value="products">
          <NavigationMenu.Trigger className="nav-trigger" aria-current={inSection(model.productGroups.flatMap((g) => g.items)) ? 'true' : undefined}>
            {model.labels.products} <ChevronDown strokeWidth={1.75} aria-hidden="true" />
          </NavigationMenu.Trigger>
          <MenuContent width={MENU_WIDTHS.products} className="grid grid-cols-[1fr_1fr_1fr_240px] gap-2">
              {model.productGroups.map((g) => (
                <div key={g.title} role="group" aria-label={g.title}>
                  <p className="eyebrow px-3 pt-2 pb-2">{g.title}</p>
                  <ul>{g.items.map((it) => <li key={it.href}><MegaLink item={it} active={is(it.href)} /></li>)}</ul>
                </div>
              ))}
              <div className="flex flex-col justify-between rounded-[16px] border border-border bg-surface-2 p-4">
                <div>
                  <p className="eyebrow">{model.featured.overline}</p>
                  <p className="mt-2 font-display text-xl font-semibold">{model.featured.title}</p>
                  <p className="mt-1 text-sm text-text-muted">{model.featured.body}</p>
                </div>
                <NavigationMenu.Link asChild>
                  <Link href={model.featured.href} className="m-btn primary sm mt-4 self-start">{model.featured.cta}<ArrowRight strokeWidth={1.75} aria-hidden="true" /></Link>
                </NavigationMenu.Link>
              </div>
          </MenuContent>
        </NavigationMenu.Item>

        <NavigationMenu.Item className="relative" value="solutions">
          <NavigationMenu.Trigger className="nav-trigger" aria-current={inSection(model.useCases.items) ? 'true' : undefined}>
            {model.labels.solutions} <ChevronDown strokeWidth={1.75} aria-hidden="true" />
          </NavigationMenu.Trigger>
          <MenuContent width={MENU_WIDTHS.solutions}>
              <p className="eyebrow px-3 pt-2 pb-2">{model.useCases.title}</p>
              <ul>{model.useCases.items.map((it) => <li key={it.href}><MegaLink item={it} active={is(it.href)} /></li>)}</ul>
          </MenuContent>
        </NavigationMenu.Item>

        <NavigationMenu.Item className="relative" value="developers">
          <NavigationMenu.Trigger className="nav-trigger" aria-current={pathname.startsWith('/developers') ? 'true' : undefined}>
            {model.labels.developers} <ChevronDown strokeWidth={1.75} aria-hidden="true" />
          </NavigationMenu.Trigger>
          <MenuContent width={MENU_WIDTHS.developers}>
              <p className="eyebrow px-3 pt-2 pb-2">{model.developers.title}</p>
              <ul>{model.developers.items.map((it) => <li key={it.href}><MegaLink item={it} active={is(it.href)} /></li>)}</ul>
          </MenuContent>
        </NavigationMenu.Item>

        <NavigationMenu.Item>
          <NavigationMenu.Link asChild active={is('/pricing')}>
            <Link href="/pricing" className="nav-trigger" aria-current={is('/pricing') ? 'page' : undefined}>{model.labels.pricing}</Link>
          </NavigationMenu.Link>
        </NavigationMenu.Item>

        <NavigationMenu.Item className="relative" value="resources">
          <NavigationMenu.Trigger className="nav-trigger" aria-current={inSection(model.resources.items) ? 'true' : undefined}>
            {model.labels.resources} <ChevronDown strokeWidth={1.75} aria-hidden="true" />
          </NavigationMenu.Trigger>
          <MenuContent width={MENU_WIDTHS.resources}>
              <p className="eyebrow px-3 pt-2 pb-2">{model.resources.title}</p>
              <ul>{model.resources.items.map((it) => <li key={it.href}><MegaLink item={it} active={is(it.href)} /></li>)}</ul>
          </MenuContent>
        </NavigationMenu.Item>
      </NavigationMenu.List>
    </NavigationMenu.Root>
  )
}
