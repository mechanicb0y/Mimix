/** Where a job's result lives in the app. Notifications, emails and the header's job list link here. */
export function jobTarget(j: { type: string; status: string; input?: Record<string, unknown> | null; output?: Record<string, unknown> | null; ref?: string | null }): string | null {
  const s = (v: unknown) => (typeof v === 'string' && v ? encodeURIComponent(v) : null)
  const input = j.input ?? {}
  const ref = s(j.ref) ?? s(input.projectId) ?? s(input.voiceId)
  switch (j.type) {
    case 'dub_prepare': case 'dub_render': return ref && `/app/dubbing/${ref}`
    case 'stt': return j.status === 'succeeded' && s(j.output?.generationId) ? `/app/transcripts/${s(j.output?.generationId)}` : '/app/transcripts'
    case 'clone_prepare': case 'clone_professional': case 'mix_promote': return ref && `/app/voices/${ref}`
    case 'studio_export': return ref && `/app/studio/${ref}`
    case 'tts': return '/app/speech'
    case 'changer': return '/app/voice-changer'
    case 'isolator': return '/app/voice-isolator'
    case 'data_export': return '/app/settings/data'
    default: return null
  }
}
