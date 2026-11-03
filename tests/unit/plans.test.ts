import { describe, expect, it } from 'vitest'
import { annualDiscountPercent, formatPrice, minutesOfSpeech, PLANS } from '@/config/plans'

describe('plans', () => {
  it('keeps every paid annual price at a 20% discount', () => {
    expect(annualDiscountPercent()).toBe(20)
    for (const p of PLANS) {
      const usd = p.prices.USD
      if (!usd || usd.monthly === 0) continue
      expect(usd.annualPerMonth).toBe(Math.round(usd.monthly * 0.8))
    }
  })

  it('has exactly one highlighted plan', () => {
    expect(PLANS.filter((p) => p.highlighted)).toHaveLength(1)
  })

  it('grows credits with price', () => {
    const paid = PLANS.filter((p) => p.prices.USD && p.creditsPerMonth !== null)
    for (let i = 1; i < paid.length; i++) expect(paid[i]!.creditsPerMonth!).toBeGreaterThan(paid[i - 1]!.creditsPerMonth!)
  })

  it('converts credits to minutes', () => {
    expect(minutesOfSpeech(10_000)).toBe(10)
    expect(minutesOfSpeech(150_000)).toBe(150)
  })

  it('formats whole and fractional prices', () => {
    expect(formatPrice(2900, 'USD')).toBe('$29')
    expect(formatPrice(2320, 'USD')).toBe('$23.20')
    expect(formatPrice(0, 'USD')).toBe('$0')
  })
})
