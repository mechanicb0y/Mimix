import { z } from '@/lib/zod'

/** One block is one paragraph or line of dialogue; longer paragraphs are split at sentences. */
export const STUDIO_BLOCK_MAX = 2000
export const STUDIO_TITLE_MAX = 120
export const STUDIO_SPEAKER_MAX = 40
/** Text pasted or uploaded in one import. */
export const STUDIO_IMPORT_MAX = 1_000_000
export const NARRATOR = 'Narrator'

const title = z.string({ error: 'nameRequired' }).trim().min(1, 'nameRequired').max(STUDIO_TITLE_MAX, 'titleTooLong')
const voiceId = z.string().min(1, 'voiceRequired').max(64)
const speaker = z.string().trim().min(1, 'speakerRequired').max(STUDIO_SPEAKER_MAX, 'speakerTooLong')

export const studioCreateSchema = z.object({
  title,
  kind: z.enum(['audiobook', 'podcast'], { error: 'kind' }).default('audiobook'),
  defaultVoiceId: voiceId,
})

export const studioPatchSchema = z.object({
  title: title.optional(),
  kind: z.enum(['audiobook', 'podcast'], { error: 'kind' }).optional(),
  defaultVoiceId: voiceId.optional(),
  /** Speaker → voice. A null voice removes the speaker from the cast (its blocks fall back to the default voice). */
  cast: z.record(speaker, voiceId.nullable()).optional(),
})

export const studioImportSchema = z.object({
  text: z.string({ error: 'textRequired' }).refine((s) => s.trim().length > 0, 'textRequired').refine((s) => s.length <= STUDIO_IMPORT_MAX, 'importTooLong'),
  /** append adds chapters after the existing ones; replace starts over. */
  mode: z.enum(['append', 'replace']).default('append'),
})

export const chapterCreateSchema = z.object({ title, afterId: z.string().max(64).optional() })
export const chapterPatchSchema = z.object({ title: title.optional(), move: z.enum(['up', 'down']).optional() })

export const blockCreateSchema = z.object({
  chapterId: z.string().min(1).max(64),
  afterId: z.string().max(64).optional(),
  text: z.string().max(STUDIO_BLOCK_MAX, 'blockTooLong').default(''),
  speaker: speaker.optional(),
})
export const blockPatchSchema = z.object({
  text: z.string().max(STUDIO_BLOCK_MAX, 'blockTooLong').optional(),
  /** null clears the speaker (narration). */
  speaker: speaker.nullable().optional(),
  /** A one-off voice for this block; null goes back to the cast. */
  voiceId: voiceId.nullable().optional(),
})

export const studioExportSchema = z.object({
  /** One chapter, or the whole project when omitted. */
  chapterId: z.string().max(64).optional(),
})

/**
 * Splits imported text into chapters and blocks.
 *   Chapters start at a Markdown heading ("# Title") or a line like "Chapter 3" / "Part Two".
 *   Blocks are paragraphs (blank-line separated). "NAME: line" at the start of a paragraph sets a
 *   speaker, as in podcast and drama scripts. Paragraphs over STUDIO_BLOCK_MAX split at sentences.
 */
export function parseManuscript(text: string, fallbackTitle: string): Array<{ title: string; blocks: Array<{ text: string; speaker: string | null }> }> {
  const chapters: Array<{ title: string; blocks: Array<{ text: string; speaker: string | null }> }> = []
  let cur: (typeof chapters)[number] | null = null
  const heading = /^\s*(?:#{1,3}\s+(.+)|((?:chapter|part)\s+[\w-]+(?:[:.\s-].*)?))\s*$/i
  const speakerLine = /^([A-Z][A-Za-z0-9 .'’-]{0,38}):\s+([\s\S]+)$/
  for (const para of text.replace(/\r\n?/g, '\n').split(/\n\s*\n/)) {
    const lines = para.split('\n')
    const first = lines[0]?.trim() ?? ''
    const h = first.match(heading)
    if (h) {
      cur = { title: (h[1] ?? h[2] ?? '').trim().slice(0, STUDIO_TITLE_MAX), blocks: [] }
      chapters.push(cur)
      lines.shift()
    }
    const body = lines.join(' ').replace(/\s+/g, ' ').trim()
    if (!body) continue
    if (!cur) { cur = { title: fallbackTitle.slice(0, STUDIO_TITLE_MAX), blocks: [] }; chapters.push(cur) }
    const m = body.match(speakerLine)
    const speaker = m ? m[1]!.trim() : null
    for (const piece of splitLong(m ? m[2]!.trim() : body)) cur.blocks.push({ text: piece, speaker })
  }
  return chapters
}

function splitLong(text: string): string[] {
  if (text.length <= STUDIO_BLOCK_MAX) return [text]
  const out: string[] = []
  let buf = ''
  for (const s of text.match(/[^.!?…]+[.!?…]+["'”’)]*\s*|[^.!?…]+$/g) ?? [text]) {
    if ((buf + s).length > STUDIO_BLOCK_MAX && buf) { out.push(buf.trim()); buf = '' }
    if (s.length > STUDIO_BLOCK_MAX) { for (let i = 0; i < s.length; i += STUDIO_BLOCK_MAX) out.push(s.slice(i, i + STUDIO_BLOCK_MAX).trim()); continue }
    buf += s
  }
  if (buf.trim()) out.push(buf.trim())
  return out
}
