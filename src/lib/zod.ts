/**
 * zod with its eval-based fast path switched off. zod probes `new Function` once, which our
 * Content-Security-Policy (no 'unsafe-eval') blocks and browsers report as a violation.
 * Import `z` from here, not from 'zod'.
 */
import { z } from 'zod'

z.config({ jitless: true })

export { z }
