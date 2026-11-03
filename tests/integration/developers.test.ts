import { describe, expect, it, vi } from 'vitest'
import { createServer, type IncomingMessage } from 'node:http'
import type { AddressInfo } from 'node:net'

vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }))

import { GET as listKeys, POST as createKey } from '@/app/api/v1/keys/route'
import { DELETE as revokeKey, PATCH as patchKey } from '@/app/api/v1/keys/[id]/route'
import { GET as usageRoute } from '@/app/api/v1/usage/route'
import { GET as listHooks, POST as createHook } from '@/app/api/v1/webhooks/route'
import { PATCH as patchHook } from '@/app/api/v1/webhooks/[id]/route'
import { POST as testHook } from '@/app/api/v1/webhooks/[id]/test/route'
import { POST as rotate } from '@/app/api/v1/webhooks/[id]/rotate/route'
import { GET as deliveries } from '@/app/api/v1/webhooks/[id]/deliveries/route'
import { POST as sfx } from '@/app/api/v1/sound-effects/route'
import { POST as isolator } from '@/app/api/v1/voice-isolator/route'
import { GET as openapi } from '@/app/api/v1/openapi.json/route'
import { CREDIT_RATES } from '@/config/plans'
import { verifyWebhook } from '@/server/crypto'
import { isPrivateAddress, retryDueWebhooks, RETRY_DELAYS } from '@/server/modules/developers'
import { drainInline } from '@/server/jobs'
import { getDb, schema } from '@/server/db'
import { eq } from 'drizzle-orm'
import { call, workspaceWithKey } from '../support/fixtures'
import { signedIn } from '../support/session'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/** A local receiver that records requests and answers with the next queued status. */
async function receiver(statuses: number[] = [200]) {
  const got: Array<{ headers: IncomingMessage['headers']; body: string }> = []
  const server = createServer((req, res) => {
    let body = ''
    req.on('data', (c) => { body += c })
    req.on('end', () => { got.push({ headers: req.headers, body }); res.statusCode = statuses.shift() ?? 200; res.end('ok') })
  })
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  return { url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/hook`, got, close: () => new Promise((r) => server.close(r)) }
}

describe('API keys', () => {
  it('shows a new key once, scopes it, and revokes it', async () => {
    const s = await signedIn({ plan: 'pro' })
    const h = { cookie: s.cookie }
    const bad = await call(createKey, { headers: h, json: { name: '', scopes: [] } })
    expect(bad.data.error.fields).toMatchObject({ name: 'Give it a name.', scopes: 'Pick at least one permission.' })
    const r = await call(createKey, { headers: h, json: { name: 'Server', scopes: ['sfx'], creditLimit: 300 } })
    expect(r.status).toBe(201)
    expect(r.data.key).toMatch(/^mmx_/)
    expect(r.res.headers.get('cache-control')).toBe('no-store')
    const listed = await call(listKeys, { headers: h })
    expect(listed.data.items[0]).toMatchObject({ name: 'Server', prefix: r.data.key.slice(0, 10), scopes: ['sfx'], creditLimit: 300 })
    expect(JSON.stringify(listed.data)).not.toContain(r.data.key)

    // The key works for its scope, not others, and cannot manage keys.
    const ok = await call(sfx, { key: r.data.key, json: { prompt: 'Door creak' } })
    expect(ok.status).toBe(201)
    expect((await call(isolator, { key: r.data.key, json: { uploadId: 'upl_x' } })).data.error.code).toBe('missing_scope')
    expect((await call(listKeys, { key: r.data.key })).status).toBe(403)
    // Its monthly cap applies.
    await call(patchKey, { headers: h, method: 'PATCH', params: { id: r.data.apiKey.id }, json: { creditLimit: CREDIT_RATES.soundEffectPerGeneration } })
    expect((await call(sfx, { key: r.data.key, json: { prompt: 'Door creak' } })).data.error.code).toBe('key_credit_limit')

    expect((await call(revokeKey, { headers: h, method: 'DELETE', params: { id: r.data.apiKey.id } })).status).toBe(204)
    expect((await call(sfx, { key: r.data.key, json: { prompt: 'x' } })).status).toBe(401)
  })

  it('reports usage per day, product and key', async () => {
    const w = await workspaceWithKey()
    await call(sfx, { key: w.key, json: { prompt: 'Rain' } })
    await call(sfx, { key: w.key, json: { prompt: 'Wind' } })
    const u = await call(usageRoute, { key: w.key })
    expect(u.data.totals).toEqual({ credits: 2 * CREDIT_RATES.soundEffectPerGeneration, requests: 2 })
    expect(u.data.modules).toEqual({ sfx: 2 * CREDIT_RATES.soundEffectPerGeneration })
    expect(u.data.days).toHaveLength(30)
    expect(u.data.days.at(-1)).toMatchObject({ credits: 400, requests: 2 })
    expect(u.data.keys).toHaveLength(1)
    expect(u.data.balance.total).toBe(100_000 - 400)
    const noScope = await workspaceWithKey({ scopes: ['tts'] })
    expect((await call(usageRoute, { key: noScope.key })).status).toBe(403)
  })
})

describe('Webhooks', () => {
  it('signs deliveries, retries failures on a schedule, and records attempts', async () => {
    const rx = await receiver([200, 500, 200])
    const s = await signedIn({ plan: 'pro' })
    const h = { cookie: s.cookie }
    const r = await call(createHook, { headers: h, json: { url: rx.url, events: ['job.succeeded', 'job.failed'] } })
    expect(r.status).toBe(201)
    expect(r.data.secret).toMatch(/^whsec_/)
    const id = r.data.webhook.id

    const ping = await call(testHook, { headers: h, params: { id } })
    expect(ping.data).toMatchObject({ status: 'delivered', responseCode: 200 })
    const sent = rx.got[0]!
    expect(sent.headers['mimix-event']).toBe('ping')
    expect(verifyWebhook(r.data.secret, sent.body, String(sent.headers['mimix-signature']))).toBe(true)
    expect(verifyWebhook('whsec_wrong', sent.body, String(sent.headers['mimix-signature']))).toBe(false)

    // A real event from a job: the first attempt gets a 500, the retry succeeds.
    const [ws] = await getDb().select().from(schema.workspace).where(eq(schema.workspace.id, s.workspaceId))
    const { createJob } = await import('@/server/jobs')
    await createJob({ workspaceId: ws!.id, userId: s.userId, type: 'no_such_type', input: {} })
    await drainInline()
    let list = await call(deliveries, { headers: h, params: { id } })
    const failed = list.data.items.find((d: { event: string }) => d.event === 'job.failed')
    expect(failed).toMatchObject({ status: 'pending', attempts: 1, responseCode: 500 })
    expect(new Date(failed.nextAttemptAt).getTime() - Date.now()).toBeGreaterThan((RETRY_DELAYS[0]! - 5) * 1000)
    expect(await retryDueWebhooks(new Date(Date.now() + RETRY_DELAYS[0]! * 1000 + 1000))).toBe(1)
    list = await call(deliveries, { headers: h, params: { id } })
    expect(list.data.items.find((d: { event: string }) => d.event === 'job.failed')).toMatchObject({ status: 'delivered', attempts: 2 })
    expect(JSON.parse(rx.got[2]!.body)).toMatchObject({ type: 'job.failed', data: { job: { status: 'failed' } } })

    // Paused endpoints get nothing; rotating changes the secret.
    await call(patchHook, { headers: h, method: 'PATCH', params: { id }, json: { active: false } })
    await createJob({ workspaceId: ws!.id, userId: s.userId, type: 'no_such_type', input: {} })
    await drainInline()
    expect(rx.got).toHaveLength(3)
    const rot = await call(rotate, { headers: h, params: { id } })
    expect(rot.data.secret).not.toBe(r.data.secret)
    expect((await call(listHooks, { headers: h })).data.items[0]).toMatchObject({ id, active: false })
    await rx.close()
  })

  it('validates URLs and blocks private networks', async () => {
    const s = await signedIn({ plan: 'pro' })
    const bad = await call(createHook, { headers: { cookie: s.cookie }, json: { url: 'ftp://example.com', events: [] } })
    expect(bad.data.error.fields).toMatchObject({ url: 'Enter a full https:// address.', events: 'Pick at least one event.' })
    for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.1.1', '169.254.169.254', '::1', 'fd00::1', '::ffff:10.0.0.1']) expect(isPrivateAddress(ip)).toBe(true)
    for (const ip of ['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111']) expect(isPrivateAddress(ip)).toBe(false)
  })
})

describe('OpenAPI', () => {
  it('lists every route file under /api/v1 with its methods', async () => {
    const doc = (await call(openapi as never)).data
    expect(doc.openapi).toBe('3.1.0')
    const root = join(process.cwd(), 'src/app/api/v1')
    const missing: string[] = []
    const walk = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f)
        if (statSync(p).isDirectory()) { walk(p); continue }
        if (f !== 'route.ts') continue
        const rel = '/' + p.slice(root.length + 1, -'/route.ts'.length).replace(/\[(\w+)\]/g, '{$1}')
        if (rel === '/openapi.json') continue
        const src = readFileSync(p, 'utf8')
        for (const m of src.matchAll(/export (?:const|async function|function) (GET|POST|PATCH|DELETE|PUT)\b/g)) {
          if (!doc.paths[rel]?.[m[1]!.toLowerCase()]) missing.push(`${m[1]} ${rel}`)
        }
      }
    }
    walk(root)
    expect(missing).toEqual([])
    expect(doc.paths['/dubbing'].post.requestBody.content['application/json'].schema.properties.targetLanguages.maxItems).toBe(5)
    expect(doc.paths['/dubbing'].post['x-required-scope']).toBe('dubbing')
  })
})

describe('cross-site requests', () => {
  it('refuses cookie-authenticated writes from another site, but not API keys or reads', async () => {
    const s = await signedIn({ plan: 'pro' })
    const foreign = { cookie: s.cookie, origin: 'https://evil.example', host: 'localhost:3000' }
    const r = await call(createKey, { headers: foreign, json: { name: 'Server', scopes: ['sfx'] } })
    expect(r.status).toBe(403)
    expect(r.data.error.code).toBe('bad_origin')
    const fetchMeta = await call(createKey, { headers: { cookie: s.cookie, 'sec-fetch-site': 'cross-site' }, json: { name: 'Server', scopes: ['sfx'] } })
    expect(fetchMeta.data.error.code).toBe('bad_origin')
    expect((await call(listKeys, { headers: foreign })).status).toBe(200)
    const same = await call(createKey, { headers: { cookie: s.cookie, origin: 'http://localhost:3000', host: 'localhost:3000' }, json: { name: 'Server', scopes: ['sfx'] } })
    expect(same.status).toBe(201)
    const viaKey = await call(sfx, { key: same.data.key, headers: { origin: 'https://evil.example', host: 'localhost:3000' }, json: { prompt: 'Door creak' } })
    expect(viaKey.status).toBe(201)
  })
})
