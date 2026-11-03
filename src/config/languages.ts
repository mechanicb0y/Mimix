/**
 * Languages offered in voice and transcript forms (ISO 639-1). Names come from Intl.DisplayNames in
 * the reader's locale, so there is no copy to translate here. Which of these each engine supports
 * is confirmed after the engine choice (ENGINE_LIMITS.languages).
 */
export const FORM_LANGUAGES = ['en', 'ms', 'zh', 'ta', 'id', 'ar', 'hi', 'es', 'fr', 'de', 'pt', 'it', 'nl', 'pl', 'tr', 'ru', 'ja', 'ko'] as const

export function languageName(code: string, locale = 'en'): string {
  try { return new Intl.DisplayNames([locale], { type: 'language' }).of(code) ?? code } catch { return code }
}
