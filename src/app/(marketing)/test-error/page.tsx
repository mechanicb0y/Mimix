import { notFound } from 'next/navigation'

/** Throws on purpose so tests can check the 500 page. Exists only when ENABLE_TEST_ROUTES=1. */
export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false } }

export default function TestError() {
  if (process.env.ENABLE_TEST_ROUTES !== '1') notFound()
  throw new Error('Test error: this page always fails so the 500 page can be checked.')
}
