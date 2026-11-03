/**
 * Mimix plans. Prices are stored per currency in minor units (cents), so MYR can be added later
 * by adding a currency key, with no code changes (DECISIONS.md, 2 Nov 2026). USD only at launch.
 * One credit = one character of speech. Other products convert at the rates in CREDIT_RATES.
 */
export type Currency = 'USD'
export const ACTIVE_CURRENCIES: Currency[] = ['USD']
export type BillingPeriod = 'monthly' | 'annual'

export interface Plan {
  id: 'free' | 'maker' | 'pro' | 'production' | 'team' | 'enterprise'
  /** Monthly price, and the annual price per month (billed yearly). null = contact sales. */
  prices: Record<Currency, { monthly: number; annualPerMonth: number } | null>
  creditsPerMonth: number | null
  seats: number | null
  customVoices: number | null
  professionalClones: number
  mixerSources: 2 | 3
  commercialUse: boolean
  highlighted?: boolean
}

export const PLANS: Plan[] = [
  { id: 'free', prices: { USD: { monthly: 0, annualPerMonth: 0 } }, creditsPerMonth: 10_000, seats: 1, customVoices: 3, professionalClones: 0, mixerSources: 2, commercialUse: false },
  { id: 'maker', prices: { USD: { monthly: 900, annualPerMonth: 720 } }, creditsPerMonth: 50_000, seats: 1, customVoices: 10, professionalClones: 0, mixerSources: 3, commercialUse: true },
  { id: 'pro', prices: { USD: { monthly: 2900, annualPerMonth: 2320 } }, creditsPerMonth: 170_000, seats: 1, customVoices: 30, professionalClones: 1, mixerSources: 3, commercialUse: true, highlighted: true },
  { id: 'production', prices: { USD: { monthly: 9900, annualPerMonth: 7920 } }, creditsPerMonth: 600_000, seats: 2, customVoices: 100, professionalClones: 3, mixerSources: 3, commercialUse: true },
  { id: 'team', prices: { USD: { monthly: 29900, annualPerMonth: 23920 } }, creditsPerMonth: 2_000_000, seats: 5, customVoices: 300, professionalClones: 10, mixerSources: 3, commercialUse: true },
  { id: 'enterprise', prices: { USD: null }, creditsPerMonth: null, seats: null, customVoices: null, professionalClones: 0, mixerSources: 3, commercialUse: true },
]

/**
 * One-off credit packs for paid plans. Top-up credits never reset and are spent after the plan's
 * monthly credits. Prices are placeholders, like plan prices, until the engine is chosen.
 */
export interface TopUp { id: 'topup_50k' | 'topup_250k' | 'topup_1m'; credits: number; prices: Record<Currency, number> }
export const TOP_UPS: TopUp[] = [
  { id: 'topup_50k', credits: 50_000, prices: { USD: 1200 } },
  { id: 'topup_250k', credits: 250_000, prices: { USD: 5000 } },
  { id: 'topup_1m', credits: 1_000_000, prices: { USD: 18000 } },
]

export type PaidPlanId = 'maker' | 'pro' | 'production' | 'team'
export const PAID_PLAN_IDS: PaidPlanId[] = ['maker', 'pro', 'production', 'team']

/**
 * Admin edits (plan_setting table) on top of the defaults above. The server loads them with
 * refreshPlans() in src/server/plans.ts; until then, and in the browser, the defaults apply.
 */
export type PlanOverride = Partial<Pick<Plan, 'prices' | 'creditsPerMonth' | 'seats' | 'customVoices' | 'professionalClones' | 'mixerSources'>>
let overrides: Partial<Record<Plan['id'], PlanOverride>> = {}

export function applyPlanOverrides(next: Partial<Record<Plan['id'], PlanOverride>>) { overrides = next }

/** Every plan with admin edits applied. */
export function currentPlans(): Plan[] {
  return PLANS.map((p) => ({ ...p, ...overrides[p.id], prices: { ...p.prices, ...overrides[p.id]?.prices } }))
}

export function getPlan(id: Plan['id']): Plan {
  const p = currentPlans().find((x) => x.id === id)
  if (!p) throw new Error(`Unknown plan ${id}`)
  return p
}

/** Stripe lookup key for a plan price, e.g. mimix_pro_annual_usd. */
export function priceLookupKey(plan: PaidPlanId, period: BillingPeriod, currency: Currency = 'USD'): string {
  return `mimix_${plan}_${period}_${currency.toLowerCase()}`
}

export function parsePriceLookupKey(key: string | null | undefined): { plan: PaidPlanId; period: BillingPeriod; currency: Currency } | null {
  const m = key?.match(/^mimix_(maker|pro|production|team)_(monthly|annual)_([a-z]{3})$/)
  if (!m) return null
  return { plan: m[1] as PaidPlanId, period: m[2] as BillingPeriod, currency: m[3]!.toUpperCase() as Currency }
}

/**
 * Features that depend on the plan, in one place so the pricing table, the app and the API agree.
 * Instant cloning and Dubbing come with a commercial licence (Maker up); Studio from Pro up.
 */
export type PlanFeature = 'instantClone' | 'dubbing' | 'studio'

/**
 * What an Owner's workspace gets (brief section 8): every module and no plan quotas, with no
 * Stripe and no payment. It counts as Enterprise for feature checks, with every limit removed.
 */
export const OWNER_PLAN: Plan = {
  id: 'enterprise', prices: { USD: null }, creditsPerMonth: null, seats: null, customVoices: null,
  professionalClones: Number.MAX_SAFE_INTEGER, mixerSources: 3, commercialUse: true,
}

/** The plan that sets a workspace's features and limits: the Owner plan when it is unlimited. */
export function effectivePlan(w: { planId: Plan['id'] | string; unlimited?: boolean | null }): Plan {
  return w.unlimited ? OWNER_PLAN : getPlan(w.planId as Plan['id'])
}
export function planHas(p: Plan, feature: PlanFeature): boolean {
  if (p.id === 'enterprise') return true
  if (feature === 'studio') return p.professionalClones > 0
  return p.commercialUse
}

/** Credits charged per unit, shown as one plain table on the pricing page. */
export const CREDIT_RATES = {
  ttsPerCharacter: 1,
  /** About 1,000 characters of speech make one minute of audio. */
  charactersPerMinute: 1000,
  sttPerMinute: 200,
  dubbingPerMinute: 3000,
  changerPerMinute: 1000,
  isolatorPerMinute: 1000,
  soundEffectPerGeneration: 200,
  voiceDesignPerPreviewSet: 500,
  mixerPreview: 0,
  mixerSave: 1000,
} as const

export function minutesOfSpeech(credits: number): number {
  return Math.floor(credits / CREDIT_RATES.charactersPerMinute)
}

/** Annual discount as a whole percentage, computed from the stored prices (20% today). */
export function annualDiscountPercent(currency: Currency = 'USD'): number {
  const paid = PLANS.map((p) => p.prices[currency]).filter((p): p is { monthly: number; annualPerMonth: number } => !!p && p.monthly > 0)
  const ratios = paid.map((p) => 1 - p.annualPerMonth / p.monthly)
  return Math.round((Math.min(...ratios)) * 100)
}

export function formatPrice(minor: number, currency: Currency, locale = 'en-US'): string {
  const whole = minor % 100 === 0
  return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 }).format(minor / 100)
}
