import { afterEach, describe, expect, it } from 'vitest'
import { KokoroEngine, voiceRecipe } from '@/lib/voice/kokoro-engine'
import { SelfHostedEngine, selfHostedCapabilities } from '@/lib/voice/selfhosted-engine'
import { createGpuEngine, cloneEngine, engineFeatures, engineForSpeech, engineVoiceIdFor, setGpuEngineForTests, setVoiceEngineForTests } from '@/server/engine'
import { env } from '@/server/env'

/**
 * The graphics-card engine next to Kokoro (GPU_ENGINE). No GPU here: the servers are fakes, so this
 * checks the routing only. engines/chatterbox and engines/voxcpm are untested on real hardware.
 */
afterEach(() => { setGpuEngineForTests(undefined); setVoiceEngineForTests(undefined) })

const kokoro = (features: Array<'transcribe' | 'clone'> = ['transcribe']) => new KokoroEngine({ url: 'http://k.test', main: true, features })
const chatterbox = () => new SelfHostedEngine({ kind: 'chatterbox', url: 'http://g.test', features: ['clone'] })

describe('graphics-card engine', () => {
  it('describes Chatterbox Multilingual: 23 languages, cloning, no design or streaming', () => {
    const c = selfHostedCapabilities(['clone', 'design', 'stream'], 'chatterbox')
    expect(c.models[0]).toMatchObject({ id: 'chatterbox-multilingual', languages: 23 })
    expect(c).toMatchObject({ instantClone: true, design: false, streaming: false, mix: false })
    const g = chatterbox()
    expect(g.id).toBe('chatterbox')
    expect(g.speaks('ar')).toBe(true)
    expect(g.speaks('ms-MY')).toBe(true)
    expect(g.speaks('vi')).toBe(false)
    expect(new SelfHostedEngine({ url: 'http://v.test', features: [] }).speaks('vi')).toBe(true)
    expect(createGpuEngine({ ...env(), GPU_ENGINE: 'off' })).toBeNull()
    expect(() => createGpuEngine({ ...env(), GPU_ENGINE: 'chatterbox', GPU_ENGINE_URL: undefined })).toThrow(/GPU_ENGINE_URL/)
  })

  it('reads languages Kokoro lacks on the GPU engine, with a built-in voice; Kokoro keeps its own', () => {
    setVoiceEngineForTests(kokoro())
    const g = chatterbox()
    setGpuEngineForTests(g)
    const library = { id: 'lib_wren', kind: 'library', workspaceId: null, engine: 'mock', engineVoiceId: null }
    expect(engineForSpeech(library, 'fr').id).toBe('kokoro')
    expect(engineForSpeech(library, 'en-GB').id).toBe('kokoro')
    expect(engineForSpeech(library, 'ar')).toBe(g)
    expect(engineVoiceIdFor(library, g)).toBeNull()
    // Neither speaks it: Kokoro answers (and refuses with its own message).
    expect(engineForSpeech(library, 'vi').id).toBe('kokoro')
    // A voice cloned on the GPU engine always reads there.
    expect(engineForSpeech({ engine: 'chatterbox', engineVoiceId: 'v_1' }, 'en')).toBe(g)
    expect(engineForSpeech({ engine: 'kokoro', engineVoiceId: voiceRecipe('af_heart') }, 'en').id).toBe('kokoro')
  })

  it('makes clones on the GPU engine when it clones, and only with Speech to Text for the consent check', () => {
    setVoiceEngineForTests(kokoro([]))
    setGpuEngineForTests(chatterbox())
    expect(cloneEngine().id).toBe('chatterbox')
    expect(engineFeatures().instantClone).toBe(false)
    setVoiceEngineForTests(kokoro(['transcribe']))
    expect(cloneEngine().id).toBe('chatterbox')
    setGpuEngineForTests(null)
    expect(cloneEngine().id).toBe('kokoro')
  })
})
