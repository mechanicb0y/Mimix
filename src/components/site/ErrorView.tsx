import Link from 'next/link'

/** Shared layout for the 404 and 500 pages: big code, plain explanation, ways forward. */
export function ErrorView({ code, title, body, children }: { code: string; title: string; body: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby="error-title" className="py-20 md:py-32">
      <div className="container-content text-center">
        <p className="gradient-text font-display text-[96px] leading-none font-bold md:text-[144px]" aria-hidden="true">{code}</p>
        <h1 id="error-title" className="mt-6 text-4xl font-bold md:text-5xl">{title}</h1>
        <p className="lead mx-auto mt-4 max-w-[560px]">{body}</p>
        <div className="mt-10">{children}</div>
      </div>
    </section>
  )
}

export function HomeLink({ label }: { label: string }) {
  return <Link href="/" className="m-btn primary lg">{label}</Link>
}
