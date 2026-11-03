import 'server-only'
import { env, type Env } from '@/server/env'
import { MOCK_CAPABILITIES, MockEngine } from '@/lib/voice/mock-engine'
import { INWORLD_CAPABILITIES, InworldEngine } from '@/lib/voice/inworld-engine'
import { KOKORO_FEATURE_NAMES, KokoroEngine, kokoroMainCapabilities, parseRecipe, voiceRecipe, type KokoroFeature } from '@/lib/voice/kokoro-engine'
import { kokoroVoiceFor } from '@/config/kokoro-voices'
import { SELF_HOSTED_FEATURE_NAMES, SelfHostedEngine, selfHostedCapabilities, type SelfHostedFeature } from '@/lib/voice/selfhosted-engine'
import { KOKORO_DESIGN_LANGUAGES } from '@/lib/voice/kokoro-design'
import type { EngineCapabilities, EngineFeature, VoiceEngine } from '@/lib/voice/types'
import { speakerVerifier } from '@/server/speaker-verifier'
import { UserError } from '@/server/api/errors'
import { getMessages } from '@/i18n'
import { LIBRARY_VOICES } from '@/config/voices'

let engine: VoiceEngine | undefined
let mixer: VoiceEngine | null | undefined
let gpu: SelfHostedEngine | null | undefined

function selfHostedFeatures(e: Env, list = e.SELF_HOSTED_FEATURES, name = 'SELF_HOSTED_FEATURES'): SelfHostedFeature[] {
  const features = list.split(',').map((f) => f.trim()).filter(Boolean)
  const unknown = features.filter((f) => !(SELF_HOSTED_FEATURE_NAMES as readonly string[]).includes(f))
  if (unknown.length) throw new Error(`${name} has unknown entries: ${unknown.join(', ')}`)
  return features as SelfHostedFeature[]
}

function kokoroFeatures(e: Env): KokoroFeature[] {
  const features = e.KOKORO_FEATURES.split(',').map((f) => f.trim()).filter(Boolean)
  const unknown = features.filter((f) => !(KOKORO_FEATURE_NAMES as readonly string[]).includes(f))
  if (unknown.length) throw new Error(`KOKORO_FEATURES has unknown entries: ${unknown.join(', ')}`)
  return features as KokoroFeature[]
}

/** Builds the engine an environment names. Exported for tests and the worker's start-up check. */
export function createVoiceEngine(e: Env): VoiceEngine {
  switch (e.VOICE_ENGINE) {
    case 'mock': return new MockEngine()
    case 'inworld':
      if (!e.INWORLD_API_KEY) throw new Error('VOICE_ENGINE=inworld needs INWORLD_API_KEY')
      return new InworldEngine({
        apiKey: e.INWORLD_API_KEY, baseUrl: e.INWORLD_API_BASE, model: e.INWORLD_TTS_MODEL, sttModel: e.INWORLD_STT_MODEL,
        voiceLow: e.INWORLD_VOICE_LOW, voiceHigh: e.INWORLD_VOICE_HIGH,
      })
    case 'voxcpm':
      if (!e.SELF_HOSTED_ENGINE_URL) throw new Error('VOICE_ENGINE=voxcpm needs SELF_HOSTED_ENGINE_URL (see engines/voxcpm/README.md)')
      return new SelfHostedEngine({ url: e.SELF_HOSTED_ENGINE_URL, token: e.SELF_HOSTED_ENGINE_TOKEN, features: selfHostedFeatures(e) })
    case 'kokoro':
      // The same server as the Voice Mixer: one Kokoro process speaks, mixes, and runs the extras.
      if (!e.MIXER_ENGINE_URL) throw new Error('VOICE_ENGINE=kokoro needs MIXER_ENGINE_URL (see engines/kokoro/README.md)')
      return new KokoroEngine({ url: e.MIXER_ENGINE_URL, token: e.MIXER_ENGINE_TOKEN, features: kokoroFeatures(e), main: true, consentNeedsStt: e.CLONE_CONSENT !== 'attest' })
  }
}

/**
 * The capabilities an environment's engine has, without building it (no keys needed), so static
 * marketing pages can be built with the same flags the app uses.
 */
export function capabilitiesFor(e: Env): { capabilities: EngineCapabilities; isMock: boolean } {
  switch (e.VOICE_ENGINE) {
    case 'mock': return { capabilities: MOCK_CAPABILITIES, isMock: true }
    case 'inworld': return { capabilities: INWORLD_CAPABILITIES, isMock: false }
    case 'voxcpm': return { capabilities: selfHostedCapabilities(selfHostedFeatures(e)), isMock: false }
    case 'kokoro': return { capabilities: kokoroMainCapabilities(kokoroFeatures(e), { consentNeedsStt: e.CLONE_CONSENT !== 'attest' }), isMock: false }
  }
}

/** The engine named by VOICE_ENGINE: mock (no account), inworld, voxcpm (our GPU server) or kokoro (our CPU server). */
export function getVoiceEngine(): VoiceEngine {
  engine ??= createVoiceEngine(env())
  return engine
}

/** Tests swap engines (for example to simulate failures). */
export function setVoiceEngineForTests(e: VoiceEngine | undefined) { engine = e }

/** The graphics-card engine (GPU_ENGINE), next to the main one, or null when there is none. */
export function createGpuEngine(e: Env): SelfHostedEngine | null {
  if (e.GPU_ENGINE === 'off') return null
  if (!e.GPU_ENGINE_URL) throw new Error(`GPU_ENGINE=${e.GPU_ENGINE} needs GPU_ENGINE_URL`)
  return new SelfHostedEngine({ kind: e.GPU_ENGINE, url: e.GPU_ENGINE_URL, token: e.GPU_ENGINE_TOKEN, features: selfHostedFeatures(e, e.GPU_ENGINE_FEATURES, 'GPU_ENGINE_FEATURES') })
}

export function getGpuEngine(): SelfHostedEngine | null {
  if (gpu === undefined) gpu = createGpuEngine(env())
  return gpu
}

export function setGpuEngineForTests(e: SelfHostedEngine | null | undefined) { gpu = e }

/** The engine that makes cloned voices: the graphics-card engine when it clones, otherwise the main one. */
export function cloneEngine(): VoiceEngine {
  const g = getGpuEngine()
  return g?.capabilities.instantClone ? g : getVoiceEngine()
}

/** Languages Kokoro reads (BCP 47 primary subtags). */
const kokoroSpeaks = (language: string) => Boolean(KOKORO_DESIGN_LANGUAGES[language.split('-')[0]!.toLowerCase()])

/**
 * The engine that reads a line: the voice's own engine, except that text in a language Kokoro doesn't
 * speak goes to the graphics-card engine when it speaks it (library voices then read with its built-in
 * voices, picked by pitch).
 */
export function engineForSpeech(v: { engine: string | null; engineVoiceId: string | null }, language?: string | null): VoiceEngine {
  const e = engineForVoice(v)
  const g = getGpuEngine()
  if (e.id === 'kokoro' && language && !kokoroSpeaks(language) && g?.speaks(language)) return g
  return e
}

/** The separate Voice Mixer engine (MIXER_ENGINE=kokoro), or null when the main engine mixes. */
export function createMixerEngine(e: Env): VoiceEngine | null {
  if (e.VOICE_ENGINE === 'kokoro' || e.MIXER_ENGINE !== 'kokoro') return null
  if (!e.MIXER_ENGINE_URL) throw new Error('MIXER_ENGINE=kokoro needs MIXER_ENGINE_URL (see engines/kokoro/README.md)')
  return new KokoroEngine({ url: e.MIXER_ENGINE_URL, token: e.MIXER_ENGINE_TOKEN })
}

/** The Kokoro engine that mixes: the separate mixer, or the main engine when that is Kokoro. */
export function getMixerEngine(): VoiceEngine | null {
  if (kokoroIsMain()) return getVoiceEngine()
  if (mixer === undefined) mixer = createMixerEngine(env())
  return mixer
}

export function setMixerEngineForTests(e: VoiceEngine | null | undefined) { mixer = e }

/** Whether a separate mixer engine is configured, without building it. */
function mixerConfigured(): boolean {
  return kokoroIsMain() || (mixer !== undefined ? mixer !== null : env().MIXER_ENGINE === 'kokoro')
}

/** True when Kokoro is the main engine (VOICE_ENGINE=kokoro). */
export function kokoroIsMain(): boolean {
  return engine ? engine.id === 'kokoro' : env().VOICE_ENGINE === 'kokoro'
}

/**
 * The engine that mixes: the Kokoro mixer when configured, otherwise the main engine (which must
 * be able to mix). Refuses with 501 before anything is charged.
 */
export function requireMixer(): VoiceEngine {
  const m = getMixerEngine()
  if (m) return m
  return requireEngineFeature('mix')
}

/** The mixing engine, or null when nothing can mix (for routes that answer 501 themselves). */
export function requireMixerOrNull(): VoiceEngine | null {
  const m = getMixerEngine()
  if (m) return m
  const main = getVoiceEngine()
  return main.capabilities.mix ? main : null
}

/** True when Mixer sources must be Kokoro voices (library voices and mixes of them). */
export function mixerNeedsRecipes(): boolean {
  return mixerConfigured()
}

/**
 * The engine that voices a stored voice: Kokoro library voices and Kokoro mixes read on the mixer
 * engine until "mix, then clone" moves them onto the main engine; everything else on the main one.
 */
export function engineForVoice(v: { engine: string | null; engineVoiceId: string | null }): VoiceEngine {
  const g = getGpuEngine()
  if (g && v.engine === g.id && v.engine !== getVoiceEngine().id) return g
  if (v.engine === 'kokoro' && parseRecipe(v.engineVoiceId)) {
    const m = getMixerEngine()
    if (m) return m
  }
  return getVoiceEngine()
}

type VoiceRef = { id?: string; kind?: string; workspaceId?: string | null; engine: string | null; engineVoiceId: string | null; mixRecipe?: string | null }

/** A Mimix library voice's Kokoro recipe (config/kokoro-voices), or null when Kokoro has no voice for it. */
function libraryRecipe(v: VoiceRef): string | null {
  if (!v.id?.startsWith('lib_') || v.workspaceId !== null || v.kind !== 'library') return null
  const k = kokoroVoiceFor(v.id)
  return k ? voiceRecipe(k) : null
}

/** The provider voice id to send for a voice on a given engine (null when it belongs elsewhere). */
export function engineVoiceIdFor(v: VoiceRef, e: VoiceEngine): string | null {
  if (v.engine === e.id) return v.engineVoiceId
  // Kokoro as the main engine voices Mimix's library voices with their mapped Kokoro voice.
  if (e.id === 'kokoro') return libraryRecipe(v)
  return null
}

/**
 * The Kokoro recipe the Mixer blends for a voice: its own (Kokoro library voices and mixes), or, with
 * Kokoro as the main engine, a Mimix library voice's mapped Kokoro voice. Null when it can't be mixed yet.
 */
export function mixRecipeOf(v: VoiceRef): string | null {
  if (parseRecipe(v.mixRecipe)) return v.mixRecipe!
  return kokoroIsMain() ? libraryRecipe(v) : null
}

/** Library voices with no Kokoro voice, hidden from the library while Kokoro is the main engine. */
export function hiddenLibraryVoiceIds(): string[] {
  if (!kokoroIsMain()) return []
  return LIBRARY_VOICES.filter((v) => !kokoroVoiceFor(v.id)).map((v) => `lib_${v.id}`)
}

/** The model to use on an engine: the requested one when that engine has it, otherwise its default. */
export function modelFor(e: VoiceEngine, requested?: string | null): string {
  if (requested && e.capabilities.models.some((m) => m.id === requested)) return requested
  return e.capabilities.models.find((m) => m.default)?.id ?? e.capabilities.models[0]!.id
}

/** The graphics-card engine's capabilities, without building it. */
function gpuCapabilities(): EngineCapabilities | null {
  if (gpu !== undefined) return gpu?.capabilities ?? null
  const e = env()
  return e.GPU_ENGINE === 'off' ? null : selfHostedCapabilities(selfHostedFeatures(e, e.GPU_ENGINE_FEATURES, 'GPU_ENGINE_FEATURES'), e.GPU_ENGINE)
}

function current() {
  return engine ? { capabilities: engine.capabilities, isMock: engine.isMock } : capabilitiesFor(env())
}

/**
 * Cloning a real person's voice needs a speaker check we trust. The preview engine makes no real
 * voices, so it may clone with the stand-in verifier; a real engine needs a production verifier.
 */
export function cloningAllowed(isMock = current().isMock): boolean {
  return isMock || attestedConsent() || speakerVerifier().productionReady
}

/** CLONE_CONSENT=attest: clones switch on from the uploader's confirmation, with no recording to check. */
export function attestedConsent(): boolean {
  return env().CLONE_CONSENT === 'attest'
}

/**
 * Which product features are on: what the engine can do, minus cloning while the consent check
 * isn't production-grade. The app nav, the API and the marketing pages all read this.
 */
export function engineFeatures() {
  const { capabilities: main, isMock } = current()
  const g = gpuCapabilities()
  // Cloning on the graphics-card engine counts as the engine's own (cloneEngine). The read-aloud consent
  // check still hears the phrase on the main engine, so that needs Speech to Text (not when attested).
  const c = g ? { ...main, instantClone: main.instantClone || (g.instantClone && (main.transcribe || attestedConsent())) } : main
  const clones = cloningAllowed(isMock)
  return {
    mixer: c.mix || mixerConfigured(), clone: clones && (c.instantClone || c.professionalClone), instantClone: clones && c.instantClone, professionalClone: clones && c.professionalClone,
    design: c.design, changer: c.convert, stt: c.transcribe, dubbing: c.transcribe, sfx: c.soundEffects, isolator: c.isolate,
    /** Dubbing that keeps a speaker's own voice (casting a clone). */
    ownVoiceDubbing: clones,
    /** How a clone's consent is taken (CLONE_CONSENT): "recording" adds the read-aloud step. */
    cloneConsent: attestedConsent() ? 'attest' as const : 'recording' as const,
  }
}
export type EngineFeatures = ReturnType<typeof engineFeatures>

/** Refuses a request for a feature the engine lacks, before anything is charged (501). */
export function requireEngineFeature(...features: EngineFeature[]) {
  const e = getVoiceEngine()
  if (features.some((f) => !e.capabilities[f])) throw new UserError('engine_unsupported', getMessages('en').errors.app.engine.unsupported, 501)
  return e
}

/** Refuses cloning (and casting clones) while the consent check isn't production-grade (501). */
export function requireCloning() {
  if (!cloningAllowed()) throw new UserError('cloning_paused', getMessages('en').errors.app.engine.cloningPaused, 501)
}
