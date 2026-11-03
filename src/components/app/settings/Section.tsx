import { useId, type ReactNode } from 'react'

/** A titled settings card. */
export function Section({ title, body, children, actions }: { title: string; body?: ReactNode; children?: ReactNode; actions?: ReactNode }) {
  const id = useId()
  return (
    <section className="m-card grid gap-4 p-4 sm:p-6" aria-labelledby={id}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-[640px]">
          <h2 id={id} className="text-[18px] font-semibold">{title}</h2>
          {body ? <p className="mt-1 text-[14px] text-[var(--text-muted)]">{body}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  )
}
