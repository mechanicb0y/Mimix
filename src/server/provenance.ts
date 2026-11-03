import 'server-only'
import { createHash } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { getDb, schema } from '@/server/db'

/**
 * Provenance (brief section 9). Every file Mimix produces:
 *  1. carries a plain-text label in its metadata (WAV LIST/INFO comment, MP3 ID3 comment), and
 *  2. is fingerprinted (sha256) against its generation, so an exact copy can be traced.
 * Engines that add an inaudible watermark (for example Chatterbox's) add a third, robust layer;
 * the public check page reports which layers matched.
 */
export const PROVENANCE_LABEL = 'AI-generated with Mimix'

export function provenanceComment(generationId: string): string {
  return `${PROVENANCE_LABEL}; id=${generationId};`
}

/** Adds a LIST/INFO chunk with ICMT (comment) and ISFT (software) to a WAV. */
export function tagWav(wav: Uint8Array, generationId: string): Uint8Array {
  const enc = new TextEncoder()
  const sub = (id: string, text: string) => {
    const body = enc.encode(`${text}\0`)
    const pad = body.length % 2
    const out = new Uint8Array(8 + body.length + pad)
    out.set(enc.encode(id), 0)
    new DataView(out.buffer).setUint32(4, body.length, true)
    out.set(body, 8)
    return out
  }
  const icmt = sub('ICMT', provenanceComment(generationId))
  const isft = sub('ISFT', 'Mimix')
  const list = new Uint8Array(12 + icmt.length + isft.length)
  list.set(enc.encode('LIST'), 0)
  new DataView(list.buffer).setUint32(4, 4 + icmt.length + isft.length, true)
  list.set(enc.encode('INFO'), 8)
  list.set(icmt, 12)
  list.set(isft, 12 + icmt.length)
  const out = new Uint8Array(wav.length + list.length)
  out.set(wav, 0)
  out.set(list, wav.length)
  new DataView(out.buffer).setUint32(4, out.length - 8, true)
  return out
}

/** ID3v2.3 tag with a COMM frame, prepended to an MP3. */
export function tagMp3(mp3: Uint8Array, generationId: string): Uint8Array {
  const enc = new TextEncoder()
  const text = enc.encode(provenanceComment(generationId))
  const commBody = new Uint8Array(1 + 3 + 1 + text.length)
  commBody[0] = 0 // ISO-8859-1
  commBody.set(enc.encode('eng'), 1)
  commBody[4] = 0 // empty description
  commBody.set(text, 5)
  const frame = new Uint8Array(10 + commBody.length)
  frame.set(enc.encode('COMM'), 0)
  new DataView(frame.buffer).setUint32(4, commBody.length)
  frame.set(commBody, 10)
  const size = frame.length
  const header = new Uint8Array([0x49, 0x44, 0x33, 3, 0, 0, (size >> 21) & 0x7f, (size >> 14) & 0x7f, (size >> 7) & 0x7f, size & 0x7f])
  const out = new Uint8Array(header.length + frame.length + mp3.length)
  out.set(header, 0); out.set(frame, header.length); out.set(mp3, header.length + frame.length)
  return out
}

export function fingerprint(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

export interface ProvenanceResult {
  fingerprintMatch: { generationId: string; createdAt: Date; module: string } | null
  label: { generationId: string | null } | null
}

/** Checks an uploaded clip for Mimix provenance. Never reveals who made it. */
export async function checkProvenance(bytes: Uint8Array): Promise<ProvenanceResult> {
  const [g] = await getDb().select({ id: schema.generation.id, createdAt: schema.generation.createdAt, module: schema.generation.module })
    .from(schema.generation).where(eq(schema.generation.fingerprint, fingerprint(bytes)))
  const text = new TextDecoder('latin1').decode(bytes.length > 4_000_000 ? new Uint8Array([...bytes.subarray(0, 64_000), ...bytes.subarray(-64_000)]) : bytes)
  const m = text.match(/AI-generated with Mimix; id=(gen_[A-Za-z0-9_-]+);/)
  return {
    fingerprintMatch: g ? { generationId: g.id, createdAt: g.createdAt, module: g.module } : null,
    label: m || text.includes(PROVENANCE_LABEL) ? { generationId: m?.[1] ?? null } : null,
  }
}
