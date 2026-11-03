/** Writes the API reference to docs/openapi.json (the same document /api/v1/openapi.json serves). */
import fs from 'node:fs'
import { openApiDocument } from '@/server/openapi'

const base = `${(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mimix.example').replace(/\/$/, '')}/api`
const doc = openApiDocument(base)
fs.mkdirSync('docs', { recursive: true })
fs.writeFileSync('docs/openapi.json', `${JSON.stringify(doc, null, 2)}\n`)
const ops = Object.values((doc as { paths: Record<string, object> }).paths).reduce((n, p) => n + Object.keys(p).length, 0)
console.log(`docs/openapi.json: ${ops} operations`)
