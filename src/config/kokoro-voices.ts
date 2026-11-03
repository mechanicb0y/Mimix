/**
 * Library voices on Kokoro-82M (VOICE_ENGINE=kokoro): the Kokoro voice that speaks each Mimix
 * library voice when Kokoro is the main engine. Chosen by language, accent, gender and age; Kokoro
 * has no Australian, Scottish, Irish or Indian English voices, so those use the nearest it has.
 * Library voices whose language Kokoro doesn't speak (Arabic, German, Malay) have no entry: they are
 * hidden from the library while Kokoro is the main engine.
 *
 * Kokoro voice ids start with the language: a = American English, b = British English, e = Spanish,
 * f = French, h = Hindi, i = Italian, p = Brazilian Portuguese; then f/m for female/male.
 */
export const KOKORO_LIBRARY: Readonly<Record<string, string>> = {
  wren: 'bf_isabella', // British, young woman
  atlas: 'am_eric', // American man, advertising
  juniper: 'af_aoede', // Australian in our library; nearest: American woman
  koa: 'af_river', // gender-neutral, young: Kokoro's most neutral voice
  marlow: 'bm_daniel', // Scottish in our library; nearest: British older man
  sable: 'af_kore', // American older woman
  indigo: 'am_liam', // Indian English in our library; nearest: American young man
  elio: 'em_alex', // Spanish man
  tamsin: 'bf_lily', // Irish in our library; nearest: British young woman
}

/** The Kokoro voice for a library voice id ("wren" or "lib_wren"), or null when it has none. */
export function kokoroVoiceFor(libraryId: string): string | null {
  return KOKORO_LIBRARY[libraryId.replace(/^lib_/, '')] ?? null
}
