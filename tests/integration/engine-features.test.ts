import { afterEach, describe, expect, it } from 'vitest'
import { POST as sfx } from '@/app/api/v1/sound-effects/route'
import { POST as mixPreview } from '@/app/api/v1/voices/mix/preview/route'
import { POST as design } from '@/app/api/v1/voices/design/route'
import { POST as saveDesign } from '@/app/api/v1/voices/design/save/route'
import { GET as models } from '@/app/api/v1/models/route'
import { MockEngine, MOCK_CAPABILITIES } from '@/lib/voice/mock-engine'
import type { DesignRequest, EngineVoice, SynthesisRequest } from '@/lib/voice/types'
import { engineFeatures, setVoiceEngineForTests } from '@/server/engine'
import { getBalance } from '@/server/credits'
import { getDb, schema } from '@/server/db'
import { eq } from 'drizzle-orm'
import { call, workspaceWithKey } from '../support/fixtures'

/** Like a real provider: no mixing or sound effects, design makes drafts with previews that must be published. */
class DraftEngine extends MockEngine {
  override readonly capabilities = { ...MOCK_CAPABILITIES, mix: false, soundEffects: false }
  synthCalls = 0
  published: string[] = []
  override async synthesize(req: SynthesisRequest) { this.synthCalls++; return super.synthesize(req) }
  override async design(req: DesignRequest): Promise<EngineVoice[]> {
    const voices = await super.design(req)
    return Promise.all(voices.map(async (v, i) => ({ ...v, engineVoiceId: `draft_${i}`, preview: await super.synthesize({ text: req.previewText ?? 'x', voice: v.params }) })))
  }
  async publishVoice(id: string) { this.published.push(id); return `kept_${id}` }
}

afterEach(() => setVoiceEngineForTests(undefined))

describe('engine features', () => {
  it('refuses tools the engine can’t run with 501 and charges nothing', async () => {
    setVoiceEngineForTests(new DraftEngine())
    const w = await workspaceWithKey({ credits: 1000 })
    const r = await call(sfx, { key: w.key, json: { prompt: 'Rain on a tin roof' } })
    expect(r.status).toBe(501)
    expect(r.data.error.code).toBe('engine_unsupported')
    const m = await call(mixPreview, { key: w.key, json: { sources: [{ voiceId: 'lib_wren', weight: 0.5 }, { voiceId: 'lib_atlas', weight: 0.5 }] } })
    expect(m.status).toBe(501)
    expect((await getBalance(w.workspaceId)).total).toBe(1000)
    const caps = await call(models, { key: w.key })
    expect(caps.data).toMatchObject({ mix: false, soundEffects: false })
    expect(engineFeatures()).toMatchObject({ mixer: false, sfx: false, design: true, clone: true })
  })

  it('uses the engine’s design previews and publishes the chosen draft when it is saved', async () => {
    const engine = new DraftEngine()
    setVoiceEngineForTests(engine)
    const w = await workspaceWithKey({ credits: 2000 })
    const r = await call(design, { key: w.key, json: { description: 'A bright, quick announcer with lots of energy.' } })
    expect(r.status).toBe(201)
    expect(engine.synthCalls).toBe(0)
    const s = await call(saveDesign, { key: w.key, json: { designId: r.data.id, candidate: 2, name: 'Announcer' } })
    expect(s.status).toBe(201)
    expect(engine.published).toEqual(['draft_2'])
    const [v] = await getDb().select().from(schema.voice).where(eq(schema.voice.id, s.data.id))
    expect(v?.engineVoiceId).toBe('kept_draft_2')
  })
})
