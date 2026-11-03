import { describe, expect, it } from 'vitest'
import { ENGINE_LIMITS, limitText, withEngineLimits, type EngineLimitKey } from '@/config/engine-limits'
import { getContent, getMessages } from '@/i18n'

/** Planning numbers and capabilities that must not appear in copy until the engine confirms them. */
const ENGINE_CLAIMS = /\b(5,000 characters|22 seconds|45 minutes|2 hours|1 hour|5 minutes long|500,000|speaker labels|loudness|\d+\+? languages|twelve languages)\b/i

function untaggedStrings(node: unknown, out: string[] = []): string[] {
  if (typeof node === 'string') out.push(node)
  else if (Array.isArray(node)) node.forEach((n) => untaggedStrings(n, out))
  else if (node && typeof node === 'object' && !('limit' in node)) Object.values(node).forEach((n) => untaggedStrings(n, out))
  return out
}

describe('engine limits', () => {
  it('are all unconfirmed until the engine is chosen', () => {
    for (const l of Object.values(ENGINE_LIMITS)) expect(l.confirmed).toBe(false)
  })

  it('hides tagged copy while unconfirmed and keeps untagged copy', () => {
    const items = [{ t: 'always' }, { t: 'Up to {value}', limit: 'ttsCharsPerTake' as EngineLimitKey }]
    expect(withEngineLimits(items)).toEqual([{ t: 'always' }])
    expect(limitText('ttsCharsPerTake')).toBeNull()
  })

  it('no untagged copy states an engine-dependent limit', () => {
    const strings = [...untaggedStrings(getMessages()), ...untaggedStrings(getContent().blog), ...untaggedStrings(getContent().legal)]
    const hits = strings.filter((s) => ENGINE_CLAIMS.test(s))
    expect(hits).toEqual([])
  })

  it('every tagged item names a known limit', () => {
    const tags: string[] = []
    const walk = (n: unknown) => {
      if (Array.isArray(n)) n.forEach(walk)
      else if (n && typeof n === 'object') { if ('limit' in n) tags.push(String((n as { limit: unknown }).limit)); Object.values(n).forEach(walk) }
    }
    walk(getMessages())
    expect(tags.length).toBeGreaterThan(5)
    for (const t of tags) expect(Object.keys(ENGINE_LIMITS)).toContain(t)
  })
})
