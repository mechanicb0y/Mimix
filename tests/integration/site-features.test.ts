import { afterEach, describe, expect, it } from 'vitest'
import { POST as createClone } from '@/app/api/v1/voices/clone/route'
import { MockEngine } from '@/lib/voice/mock-engine'
import { cloningAllowed, engineFeatures, setVoiceEngineForTests } from '@/server/engine'
import { resetEnvForTests } from '@/server/env'
import { productAvailability, siteDescription, soonLabel } from '@/server/site-features'
import { call, workspaceWithKey } from '../support/fixtures'

/** A real-provider stand-in: everything the mock can do, but not a preview engine. */
class RealEngine extends MockEngine {
  override readonly isMock = false as unknown as true
}

const saved = { ...process.env }
afterEach(() => {
  process.env = { ...saved }
  resetEnvForTests()
  setVoiceEngineForTests(undefined)
})

describe('site and app feature flags', () => {
  it('the preview engine offers everything, including cloning', () => {
    expect(Object.values(productAvailability()).every(Boolean)).toBe(true)
    expect(cloningAllowed()).toBe(true)
    expect(siteDescription()).toMatch(/Voice Mixer/)
  })

  it('a real engine without blending hides the Mixer on the site, and cloning waits for a production verifier', () => {
    process.env.VOICE_ENGINE = 'inworld'
    resetEnvForTests()
    const on = productAvailability()
    expect(on).toMatchObject({ 'text-to-speech': true, studio: true, 'voice-mixer': false, 'voice-cloning': false, 'voice-changer': false, 'sound-effects': false, 'voice-design': true })
    expect(engineFeatures()).toMatchObject({ clone: false, ownVoiceDubbing: false, mixer: false })
    expect(siteDescription()).not.toMatch(/Mixer/)
    expect(soonLabel('Voice Mixer', false)).toBe('Voice Mixer (coming soon)')
  })

  it('refuses to start a clone on a real engine with 501 cloning_paused', async () => {
    setVoiceEngineForTests(new RealEngine())
    const w = await workspaceWithKey({ credits: 1000, plan: 'pro' })
    const r = await call(createClone, { key: w.key, json: { kind: 'instant', name: 'Ada', uploadIds: ['upl_x'], licence: 'private', language: 'en', rightsConfirmed: true } })
    expect(r.status).toBe(501)
    expect(r.data.error.code).toBe('cloning_paused')
  })
})
