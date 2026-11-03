/**
 * Every user-facing string lives in src/i18n/messages/<locale> and src/content/<locale>.
 * English ships at launch. To add a locale, copy the en folders, translate the values (never the
 * keys), and register it below. The Messages type makes the compiler flag any missing string.
 */
import { en } from './messages/en'
import * as enBlog from '@/content/en/blog'
import * as enLegal from '@/content/en/legal'

export type Messages = typeof en
export const LOCALES = ['en'] as const
export type Locale = (typeof LOCALES)[number]

const MESSAGES: Record<Locale, Messages> = { en }
const CONTENT = { en: { blog: enBlog, legal: enLegal } } satisfies Record<Locale, unknown>

export function getMessages(locale: Locale = 'en'): Messages {
  return MESSAGES[locale]
}

export function getContent(locale: Locale = 'en') {
  return CONTENT[locale]
}

/** Replaces {name} placeholders. Unknown placeholders are left as they are so mistakes are visible. */
export function fmt(template: string, values: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (m, key: string) => (key in values ? String(values[key]) : m))
}

/** Picks the singular or plural template. English rule; locales with richer rules add Intl.PluralRules here. */
export function plural(count: number, one: string, other: string): string {
  return fmt(count === 1 ? one : other, { count: formatNumber(count) })
}

export function formatNumber(n: number, locale: Locale = 'en'): string {
  return new Intl.NumberFormat(locale === 'en' ? 'en-US' : locale).format(n)
}

export function formatDate(iso: string, locale: Locale = 'en'): string {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`))
}

/** A full timestamp (ISO string) as date and time in the viewer's time zone. */
export function formatDateTime(iso: string, locale: Locale = 'en'): string {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : locale, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}
