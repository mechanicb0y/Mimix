'use client'
import Link from 'next/link'
import { Accordion, Dialog } from 'radix-ui'
import { ChevronDown, Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Icon } from '@/components/Icon'
import type { NavLinkModel, NavModel } from './types'

/** Below 1024px the main navigation lives in this drawer: focus trap, scroll lock, Esc to close. */
export function MobileNav({ model, pathname }: { model: NavModel; pathname: string }) {
  const [open, setOpen] = useState(false)

  // Close if the viewport grows past the desktop breakpoint while the drawer is open.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const onChange = () => { if (mq.matches) setOpen(false) }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const close = () => setOpen(false)
  const links = (items: NavLinkModel[]) => (
    <ul className="pb-3">
      {items.map((it) => (
        <li key={it.href}>
          <Link href={it.href} className="drawer-link" onClick={close} aria-current={pathname === it.href ? 'page' : undefined}>
            <span className="icon-tile" aria-hidden="true"><Icon name={it.icon} size={18} /></span>{it.title}{it.soon ? <span className="m-badge ml-auto">{it.soon}</span> : null}
          </Link>
        </li>
      ))}
    </ul>
  )
  const sections = [
    { id: 'products', label: model.labels.products, items: model.productGroups.flatMap((g) => g.items) },
    { id: 'solutions', label: model.labels.solutions, items: model.useCases.items },
    { id: 'developers', label: model.labels.developers, items: model.developers.items },
    { id: 'resources', label: model.labels.resources, items: model.resources.items },
  ]

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="m-btn ghost icon lg:hidden" aria-label={model.labels.openMenu}>
        <Menu strokeWidth={1.75} aria-hidden="true" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="drawer-overlay" />
        <Dialog.Content className="drawer-panel" aria-describedby={undefined}>
          <div className="flex h-16 flex-none items-center justify-between border-b border-border px-4">
            <Dialog.Title className="font-display text-lg font-semibold">{model.labels.menuTitle}</Dialog.Title>
            <Dialog.Close className="m-btn ghost icon" aria-label={model.labels.closeMenu}><X strokeWidth={1.75} aria-hidden="true" /></Dialog.Close>
          </div>
          <nav aria-label={model.labels.mainNav} className="flex-1 overflow-y-auto overscroll-contain px-4 py-2">
            <Accordion.Root type="multiple">
              {sections.map((s) => (
                <Accordion.Item key={s.id} value={s.id} className="border-b border-border">
                  <Accordion.Header>
                    <Accordion.Trigger className="drawer-acc-trigger">{s.label}<ChevronDown strokeWidth={1.75} aria-hidden="true" /></Accordion.Trigger>
                  </Accordion.Header>
                  <Accordion.Content>{links(s.items)}</Accordion.Content>
                </Accordion.Item>
              ))}
            </Accordion.Root>
            <Link href="/pricing" onClick={close} className="drawer-acc-trigger border-b border-border no-underline" aria-current={pathname === '/pricing' ? 'page' : undefined}>{model.labels.pricing}</Link>
          </nav>
          <div className="grid flex-none grid-cols-2 gap-3 border-t border-border p-4">
            <Link href={model.loginHref} onClick={close} className="m-btn secondary">{model.labels.login}</Link>
            <Link href={model.signupHref} onClick={close} className="m-btn primary">{model.labels.startFree}</Link>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
