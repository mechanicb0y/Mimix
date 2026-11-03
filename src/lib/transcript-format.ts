/** Transcript exports: plain text, SubRip (SRT) and WebVTT. Pure functions, used by the API and tests. */
export interface Segment { startMs: number; endMs: number; speaker: string; text: string }
export type TranscriptFormat = 'txt' | 'srt' | 'vtt' | 'json'

const pad = (n: number, w = 2) => String(n).padStart(w, '0')
function stamp(ms: number, sep: ',' | '.') {
  const h = Math.floor(ms / 3_600_000), m = Math.floor((ms % 3_600_000) / 60_000), s = Math.floor((ms % 60_000) / 1000)
  return `${pad(h)}:${pad(m)}:${pad(s)}${sep}${pad(Math.floor(ms % 1000), 3)}`
}
const name = (speaker: string, names: Record<string, string>) => names[speaker]?.trim() || speaker

/** Groups consecutive segments by the same speaker into paragraphs. */
export function toTxt(segments: Segment[], opts: { names?: Record<string, string>; timestamps?: boolean; speakers?: boolean } = {}): string {
  const names = opts.names ?? {}
  const out: string[] = []
  let current: { speaker: string; start: number; text: string[] } | null = null
  const flush = () => {
    if (!current) return
    const head = [opts.timestamps ? `[${stamp(current.start, '.').slice(0, 8)}]` : '', opts.speakers !== false ? `${name(current.speaker, names)}:` : ''].filter(Boolean).join(' ')
    out.push(`${head ? head + ' ' : ''}${current.text.join(' ')}`)
  }
  for (const s of segments) {
    if (current && current.speaker === s.speaker) current.text.push(s.text.trim())
    else { flush(); current = { speaker: s.speaker, start: s.startMs, text: [s.text.trim()] } }
  }
  flush()
  return out.join('\n\n') + '\n'
}

export function toSrt(segments: Segment[], opts: { names?: Record<string, string>; speakers?: boolean } = {}): string {
  return segments.map((s, i) => `${i + 1}\n${stamp(s.startMs, ',')} --> ${stamp(s.endMs, ',')}\n${opts.speakers === false ? '' : `${name(s.speaker, opts.names ?? {})}: `}${s.text.trim()}\n`).join('\n')
}

export function toVtt(segments: Segment[], opts: { names?: Record<string, string>; speakers?: boolean } = {}): string {
  const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return 'WEBVTT\n\n' + segments.map((s) => `${stamp(s.startMs, '.')} --> ${stamp(s.endMs, '.')}\n${opts.speakers === false ? '' : `<v ${esc(name(s.speaker, opts.names ?? {}))}>`}${esc(s.text.trim())}\n`).join('\n')
}

export const TRANSCRIPT_MIME: Record<TranscriptFormat, string> = { txt: 'text/plain; charset=utf-8', srt: 'application/x-subrip; charset=utf-8', vtt: 'text/vtt; charset=utf-8', json: 'application/json' }
