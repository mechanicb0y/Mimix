import 'server-only'

/** The configured engine (VOICE_ENGINE); one instance shared with the app's API. */
export { getVoiceEngine } from '@/server/engine'
export type { VoiceEngine, VoiceParams } from './types'
