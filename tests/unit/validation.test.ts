import { describe, expect, it } from 'vitest'
import { contactSalesSchema, DEMO_MAX_CHARS, demoMixSchema, demoTtsSchema, fieldErrors, newsletterSchema } from '@/lib/validation'

const validLead = { name: 'Ada Lovelace', email: 'ada@example.com', company: 'Analytical Ltd', size: '11-50', useCase: 'Narrating our training library in six languages.', consent: true }

describe('newsletterSchema', () => {
  it.each(['a@b.co', '  someone@example.org  '])('accepts %s', (email) => {
    expect(newsletterSchema.safeParse({ email }).success).toBe(true)
  })
  it.each([['', 'required'], ['not-an-email', 'invalid'], ['a@b.c', 'invalid']])('rejects %j with %s', (email, code) => {
    const r = newsletterSchema.safeParse({ email })
    expect(r.success).toBe(false)
    if (!r.success) expect(fieldErrors(r.error).email).toBe(code)
  })
})

describe('contactSalesSchema', () => {
  it('accepts a complete lead', () => {
    expect(contactSalesSchema.safeParse(validLead).success).toBe(true)
  })
  it('reports one code per field', () => {
    const r = contactSalesSchema.safeParse({ ...validLead, name: '', email: 'x', useCase: 'short', consent: false, size: 'huge' })
    expect(r.success).toBe(false)
    if (!r.success) expect(fieldErrors(r.error)).toEqual({ name: 'name', email: 'emailInvalid', useCase: 'useCase', consent: 'consent', size: 'size' })
  })
})

describe('demo schemas', () => {
  it('caps demo text length', () => {
    expect(demoTtsSchema.safeParse({ text: 'a'.repeat(DEMO_MAX_CHARS), voiceId: 'wren' }).success).toBe(true)
    expect(demoTtsSchema.safeParse({ text: 'a'.repeat(DEMO_MAX_CHARS + 1), voiceId: 'wren' }).success).toBe(false)
    expect(demoTtsSchema.safeParse({ text: '   ', voiceId: 'wren' }).success).toBe(false)
  })
  it('needs two or three mix sources', () => {
    const s = { voiceId: 'wren', weight: 0.5 }
    expect(demoMixSchema.safeParse({ sources: [s] }).success).toBe(false)
    expect(demoMixSchema.safeParse({ sources: [s, s] }).success).toBe(true)
    expect(demoMixSchema.safeParse({ sources: [s, s, s, s] }).success).toBe(false)
    expect(demoMixSchema.safeParse({ sources: [s, { ...s, weight: 2 }] }).success).toBe(false)
  })
})
