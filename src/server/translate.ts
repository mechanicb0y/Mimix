import 'server-only'
import { env } from '@/server/env'
import { EngineError } from '@/lib/voice/types'

/**
 * Machine translation for Dubbing, behind one small interface like the voice engine.
 * "mock" keeps each line and marks its language, so the whole pipeline runs with no account.
 * "google" calls Cloud Translation Basic (v2), which covers every language in FORM_LANGUAGES,
 * Malay and Tamil included.
 */
export interface Translator {
  readonly id: string
  readonly isMock: boolean
  /** Translates lines in order; `from` null means detect. Returns one string per input line. */
  translate(lines: string[], from: string | null, to: string): Promise<string[]>
}

class MockTranslator implements Translator {
  readonly id = 'mock'
  readonly isMock = true
  async translate(lines: string[], _from: string | null, to: string) {
    return lines.map((l) => `[${to}] ${l.replace(/^\[[a-z]{2,3}\] /, '')}`)
  }
}

/** Google Cloud Translation v2 allows up to 128 strings per request. */
const GOOGLE_BATCH = 128

class GoogleTranslator implements Translator {
  readonly id = 'google'
  readonly isMock = false
  constructor(private key: string) {}
  async translate(lines: string[], from: string | null, to: string) {
    const out: string[] = []
    for (let i = 0; i < lines.length; i += GOOGLE_BATCH) {
      const q = lines.slice(i, i + GOOGLE_BATCH)
      const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(this.key)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q, target: to, ...(from ? { source: from } : {}), format: 'text' }),
        signal: AbortSignal.timeout(30_000),
      })
      if (!res.ok) throw new EngineError('Translation is unavailable right now. Please try again shortly.', res.status >= 500 || res.status === 429, res.status)
      const data = await res.json() as { data?: { translations?: Array<{ translatedText: string }> } }
      const t = data.data?.translations ?? []
      if (t.length !== q.length) throw new EngineError('Translation returned an unexpected result.', true)
      out.push(...t.map((x) => x.translatedText))
    }
    return out
  }
}

let translator: Translator | undefined
export function getTranslator(): Translator {
  if (translator) return translator
  const e = env()
  if (e.TRANSLATOR === 'google') {
    if (!e.GOOGLE_TRANSLATE_API_KEY) throw new Error('TRANSLATOR=google needs GOOGLE_TRANSLATE_API_KEY')
    translator = new GoogleTranslator(e.GOOGLE_TRANSLATE_API_KEY)
  } else translator = new MockTranslator()
  return translator
}
