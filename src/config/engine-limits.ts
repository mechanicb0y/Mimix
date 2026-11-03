/**
 * Every limit and capability that depends on the voice engine, in one place.
 *
 * Values are the planning targets from Phase 3. They are NOT shown on the site until the engine is
 * chosen and each one is confirmed against it (Phase 4 engine comparison). Until then, copy that
 * carries a `limit` key is left out, and no page states a number or capability from this file.
 * Loudness matching is not here: it runs on any engine's output (two-pass ffmpeg loudnorm, EBU R128).
 * To confirm a limit: check it against the chosen engine, update `value`, set `confirmed: true`.
 */
export interface EngineLimit {
  /** Planning value; a number, or true for a yes/no capability. null = not yet known. */
  value: number | boolean | null
  /** How the value is written into copy that uses {value}. */
  format?: 'number' | 'plain'
  confirmed: boolean
  /** What it means, for whoever confirms it. */
  note: string
}

export const ENGINE_LIMITS = {
  languages: { value: null, confirmed: false, note: 'Number of languages for speech, dubbing and transcription. Report 2026-11-02: Inworld claims 200+ (platform, cloning count not found), VoxCPM2 30 (Malay unconfirmed). Publish per-feature counts only after the blind test.' },
  ttsCharsPerTake: { value: 5000, format: 'number', confirmed: false, note: 'Characters in one Text to Speech generation. Inworld limit not found; ElevenLabs v4 10,000. Keep 5,000 until confirmed; longer text is chunked by Mimix.' },
  sfxMaxSeconds: { value: 22, format: 'plain', confirmed: false, note: 'Longest sound effect in seconds (shortest is 0.5). ElevenLabs SFX now allows 30 s; raise to 30 if it is the SFX engine.' },
  dubbingMaxMinutes: { value: 45, format: 'plain', confirmed: false, note: 'Longest file for Dubbing, in minutes. Our own STT+translate+TTS pipeline; bounded by Scribe v2 (10 h). Revisit after load tests.' },
  sttMaxHours: { value: 2, format: 'plain', confirmed: false, note: 'Longest file for Speech to Text, in hours. Scribe v2 allows 10 h / 3 GB.' },
  isolatorMaxHours: { value: 1, format: 'plain', confirmed: false, note: 'Longest file for the Voice Isolator, in hours.' },
  changerMaxMinutes: { value: 5, format: 'plain', confirmed: false, note: 'Longest clip for the Voice Changer, in minutes.' },
  speakerLabels: { value: true, confirmed: false, note: 'Transcripts label who is speaking (diarization). Scribe v2: up to 32 speakers.' },
  cloneInstantMinSeconds: { value: 10, format: 'plain', confirmed: false, note: 'Least clean speech for an instant clone, in seconds (we recommend about 60). Inworld and VoxCPM2 condition on 5 to 30 s; confirm after the blind test.' },
  cloneInstantMaxSeconds: { value: 300, format: 'plain', confirmed: false, note: 'Most speech used for an instant clone, in seconds. Extra audio is ignored by zero-shot engines.' },
  cloneProfessionalMinMinutes: { value: 30, format: 'plain', confirmed: false, note: 'Least speech for a professional clone, in minutes. Depends on the fine-tuning recipe.' },
  cloneProfessionalMaxMinutes: { value: 180, format: 'plain', confirmed: false, note: 'Most speech for a professional clone, in minutes.' },
  studioProjectChars: { value: 500_000, format: 'number', confirmed: false, note: 'Characters in one Studio project. No engine limit found; Mimix chunks, so this is our own product limit.' },
} as const satisfies Record<string, EngineLimit>

export type EngineLimitKey = keyof typeof ENGINE_LIMITS

export function isConfirmed(key: EngineLimitKey): boolean {
  return ENGINE_LIMITS[key].confirmed
}

/** The value as copy, or null while it is unconfirmed. */
export function limitText(key: EngineLimitKey, locale = 'en-US'): string | null {
  const l: EngineLimit = ENGINE_LIMITS[key]
  if (!l.confirmed || l.value === null || typeof l.value === 'boolean') return l.confirmed && l.value === true ? '' : null
  return l.format === 'number' ? new Intl.NumberFormat(locale).format(l.value) : String(l.value)
}

/**
 * Filters copy items that depend on the engine. Items without `limit` always stay. Items with one
 * stay only once it is confirmed, with {value} filled in.
 */
export function withEngineLimits<T extends object>(items: readonly T[]): T[] {
  const out: T[] = []
  for (const item of items) {
    const limit = (item as { limit?: EngineLimitKey }).limit
    if (!limit) { out.push(item); continue }
    const text = limitText(limit)
    if (text === null) continue
    out.push(JSON.parse(JSON.stringify(item).replaceAll('{value}', text)) as T)
  }
  return out
}
