import { siteUrl } from '@/config/site'
import type { CodeTab } from './CodeSample'

/** API base: NEXT_PUBLIC_API_BASE_URL once the API has its own host, otherwise <site>/api. */
export function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || `${siteUrl()}/api`).replace(/\/+$/, '')
}

export function codeSamples(): CodeTab[] {
  const base = apiBase()
  return [
    { id: 'curl', label: 'cURL', code: `curl ${base}/v1/text-to-speech/stream \\
  -H "Authorization: Bearer $MIMIX_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Hello from Mimix.", "voiceId": "lib_wren", "format": "mp3"}' \\
  --output hello.mp3` },
    { id: 'js', label: 'JavaScript', code: `import { writeFile } from 'node:fs/promises'

const res = await fetch('${base}/v1/text-to-speech/stream', {
  method: 'POST',
  headers: {
    Authorization: \`Bearer \${process.env.MIMIX_API_KEY}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ text: 'Hello from Mimix.', voiceId: 'lib_wren', format: 'mp3' }),
})
if (!res.ok) throw new Error((await res.json()).error.message)
await writeFile('hello.mp3', Buffer.from(await res.arrayBuffer()))` },
    { id: 'python', label: 'Python', code: `import os
import requests

res = requests.post(
    "${base}/v1/text-to-speech/stream",
    headers={"Authorization": f"Bearer {os.environ['MIMIX_API_KEY']}"},
    json={"text": "Hello from Mimix.", "voiceId": "lib_wren", "format": "mp3"},
    timeout=60,
)
res.raise_for_status()
with open("hello.mp3", "wb") as f:
    f.write(res.content)` },
  ]
}

export function streamingSample(): CodeTab[] {
  const base = apiBase()
  return [{ id: 'js-stream', label: 'JavaScript', code: `const res = await fetch('${base}/v1/text-to-speech/stream', {
  method: 'POST',
  headers: { Authorization: \`Bearer \${process.env.MIMIX_API_KEY}\`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: longScript, voiceId: 'lib_atlas' }),
})
for await (const chunk of res.body) {
  player.append(chunk) // start playing as soon as the first chunk arrives
}` }]
}

/** Long jobs: upload, start, then wait for the webhook (or poll the job). */
export function jobSample(): CodeTab[] {
  const base = apiBase()
  return [{ id: 'js-job', label: 'JavaScript', code: `const api = (path, init = {}) => fetch('${base}/v1' + path, {
  ...init,
  headers: { Authorization: \`Bearer \${process.env.MIMIX_API_KEY}\`, 'Content-Type': 'application/json', ...init.headers },
}).then(async (r) => { if (!r.ok) throw new Error((await r.json()).error.message); return r.status === 204 ? null : r.json() })

// 1. Upload: ask for a signed URL, PUT the file, confirm it.
const up = await api('/uploads', { method: 'POST', body: JSON.stringify({ purpose: 'media', filename: 'talk.mp4', contentType: 'video/mp4', bytes: file.size }) })
await fetch(up.url, { method: up.method, headers: up.headers, body: file })
await api(\`/uploads/\${up.id}/complete\`, { method: 'POST' })

// 2. Start the job (202). 3. Wait: a "job.succeeded" webhook arrives, or poll:
const { jobId, project } = await api('/dubbing', { method: 'POST', body: JSON.stringify({ uploadId: up.id, targetLanguages: ['es', 'ms'] }) })
let job
do { await new Promise((r) => setTimeout(r, 5000)); job = await api(\`/jobs/\${jobId}\`) } while (job.status === 'queued' || job.status === 'running')
const dub = await api(\`/dubbing/\${project.id}\`)` }]
}

/** Checking a webhook signature (Node, Express-style raw body). */
export function webhookSample(): CodeTab[] {
  return [
    { id: 'js-verify', label: 'JavaScript', code: `import { createHmac, timingSafeEqual } from 'node:crypto'

export function verifyMimix(rawBody, header, secret) {
  const { t, v1 } = Object.fromEntries(header.split(',').map((p) => p.split('=')))
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false // older than 5 minutes
  const expected = createHmac('sha256', secret).update(\`\${t}.\${rawBody}\`).digest('hex')
  return v1?.length === expected.length && timingSafeEqual(Buffer.from(v1), Buffer.from(expected))
}` },
    { id: 'py-verify', label: 'Python', code: `import hashlib, hmac, time

def verify_mimix(raw_body: bytes, header: str, secret: str) -> bool:
    parts = dict(p.split("=", 1) for p in header.split(","))
    if abs(time.time() - int(parts.get("t", 0))) > 300:
        return False
    expected = hmac.new(secret.encode(), f"{parts['t']}.".encode() + raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, parts.get("v1", ""))` },
  ]
}
