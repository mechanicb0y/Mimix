import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { getMessages } from '@/i18n'

export function Breadcrumbs({ items }: { items: Array<{ name: string; path: string }> }) {
  const m = getMessages().common
  return (
    <nav aria-label={m.a11y.breadcrumb} className="mb-6">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-text-subtle">
        {items.map((it, i) => (
          <li key={it.path} className="flex items-center gap-1">
            {i > 0 && <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />}
            {i === items.length - 1 ? <span aria-current="page" className="text-text-muted">{it.name}</span>
              : <Link href={it.path} className="tap rounded-sm text-text-subtle no-underline hover:text-text">{it.name}</Link>}
          </li>
        ))}
      </ol>
    </nav>
  )
}
