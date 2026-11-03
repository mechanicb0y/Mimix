import Link from 'next/link'
import { PRODUCT_GROUPS, productHref } from '@/config/nav'
import { LEGAL_SLUGS, USE_CASE_SLUGS } from '@/config/products'
import { fmt, getMessages } from '@/i18n'
import { productAvailability, soonLabel } from '@/server/site-features'
import { Logo } from './Logo'
import { NewsletterForm } from './NewsletterForm'

export function Footer() {
  const m = getMessages().common
  const on = productAvailability()
  const year = new Date().getUTCFullYear()
  const col = (title: string, items: Array<{ href: string; label: string }>) => (
    <div>
      <h2 className="eyebrow text-text-muted">{title}</h2>
      <ul className="mt-4 space-y-1">
        {items.map((it) => <li key={it.href}><Link href={it.href} className="inline-flex min-h-[32px] items-center text-sm text-text-muted no-underline transition-colors hover:text-text">{it.label}</Link></li>)}
      </ul>
    </div>
  )
  return (
    <footer className="mt-24 border-t border-border bg-surface">
      <div className="container-content grid gap-12 py-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="max-w-md">
          <Logo id="mark-footer" />
          <p className="mt-4 text-text-muted">{m.footer.blurb}</p>
          <div className="mt-8">
            <h2 className="font-display text-lg font-semibold">{m.newsletter.title}</h2>
            <p className="mt-1 mb-4 text-sm text-text-muted">{m.newsletter.body}</p>
            <NewsletterForm labels={{ label: m.newsletter.label, placeholder: m.newsletter.placeholder, submit: m.newsletter.submit, submitting: m.newsletter.submitting, success: m.newsletter.success, errors: m.newsletter.errors }} />
            <p className="m-hint">
              {m.newsletter.privacy.split('{privacyLink}')[0]}
              <Link href="/legal/privacy" className="link">{m.newsletter.privacyLinkText}</Link>
              {m.newsletter.privacy.split('{privacyLink}')[1]}
            </p>
          </div>
        </div>
        <nav aria-label={m.a11y.footerNav} className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {col(m.footer.columns.products, [...PRODUCT_GROUPS.flatMap((g) => g.items)].map((k) => ({ href: productHref(k), label: soonLabel(m.products[k].name, on[k]) })))}
          <div className="space-y-10">
            {col(m.footer.columns.solutions, USE_CASE_SLUGS.map((s) => ({ href: `/use-cases/${s}`, label: m.useCases[s].name })))}
            {col(m.footer.columns.developers, [
              { href: '/developers', label: m.footer.developerLinks.api },
              { href: '/developers#quickstart', label: m.footer.developerLinks.quickstart },
              { href: '/pricing#api', label: m.footer.developerLinks.pricing },
            ])}
          </div>
          <div className="space-y-10">
            {col(m.footer.columns.company, [
              { href: '/about', label: m.footer.companyLinks.about },
              { href: '/blog', label: m.footer.companyLinks.blog },
              { href: '/help', label: m.footer.companyLinks.help },
              { href: '/contact-sales', label: m.footer.companyLinks.contactSales },
              { href: '/pricing', label: m.nav.pricing },
            ])}
            {col(m.footer.columns.legal, [
              ...LEGAL_SLUGS.map((s) => ({ href: `/legal/${s}`, label: m.footer.legalLinks[s] })),
              { href: '/report', label: m.footer.safetyLinks.report },
              { href: '/check-audio', label: m.footer.safetyLinks.check },
            ])}
          </div>
        </nav>
      </div>
      <div className="border-t border-border">
        <div className="container-content flex flex-col gap-2 py-6 text-sm text-text-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>{fmt(m.footer.copyright, { year })}</p>
        </div>
      </div>
    </footer>
  )
}
