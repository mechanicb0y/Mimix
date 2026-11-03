import 'server-only'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileTypeFromBuffer } from 'file-type'
import ffmpegStatic from 'ffmpeg-static'
import { decodeWav, encodeWav } from '@/lib/voice/wav'

/**
 * Audio processing with ffmpeg. Web requests use it too (MP3 encoding, consent recordings from the
 * browser), and Vercel has no ffmpeg, so the app bundles a static build (ffmpeg-static, GPL; run as
 * a separate process, never linked or shipped to users). FFMPEG_PATH overrides it, for example the
 * worker container's system ffmpeg. Every call streams bytes through stdin/stdout.
 */
const FFMPEG = process.env.FFMPEG_PATH || ffmpegStatic || 'ffmpeg'

export class AudioError extends Error {
  constructor(message: string) { super(message); this.name = 'AudioError' }
}

function run(args: string[], input: Uint8Array): Promise<{ out: Uint8Array; err: string }> {
  return new Promise((resolve, reject) => {
    const p = spawn(FFMPEG, ['-hide_banner', '-nostdin', '-loglevel', 'info', ...args], { stdio: ['pipe', 'pipe', 'pipe'] })
    const chunks: Buffer[] = []
    let err = ''
    p.stdout.on('data', (c: Buffer) => chunks.push(c))
    p.stderr.on('data', (c: Buffer) => { err += c.toString(); if (err.length > 200_000) err = err.slice(-100_000) })
    p.on('error', (e) => reject(new AudioError(`ffmpeg is not available (${e.message}). Install it or set FFMPEG_PATH.`)))
    p.on('close', (code) => (code === 0 ? resolve({ out: new Uint8Array(Buffer.concat(chunks)), err }) : reject(new AudioError(`ffmpeg failed: ${err.split('\n').slice(-3).join(' ')}`))))
    p.stdin.on('error', () => { /* ffmpeg may close stdin early on bad input; the exit code reports it */ })
    p.stdin.end(Buffer.from(input))
  })
}

export const ACCEPTED_AUDIO = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/vnd.wave', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/ogg', 'audio/webm', 'audio/flac', 'audio/x-flac', 'video/mp4', 'video/webm', 'video/quicktime'] as const

/** Sniffs the real type from the bytes (never trusts the file name or the browser's claim). */
export async function sniffMedia(bytes: Uint8Array): Promise<{ mime: string; ext: string } | null> {
  const t = await fileTypeFromBuffer(bytes)
  if (!t) return null
  const mime = t.mime === 'audio/x-m4a' || t.mime === 'audio/m4a' ? 'audio/mp4' : t.mime
  return (ACCEPTED_AUDIO as readonly string[]).includes(mime) || mime === 'audio/mp4' ? { mime, ext: t.ext } : null
}

/** Any accepted audio or video → mono 16-bit PCM WAV at `rate` Hz. */
export async function toWav(bytes: Uint8Array, rate = 22050): Promise<Uint8Array> {
  const args = ['-vn', '-ac', '1', '-ar', String(rate), '-c:a', 'pcm_s16le', '-f', 'wav', 'pipe:1']
  // MP4, MOV and M4A files often keep their index (moov) at the end, which ffmpeg can't reach
  // through a pipe; it then "succeeds" with no audio. Those go through a temporary file.
  const noAudio = 'We couldn’t read any audio from this file. Check that it has a sound track and try again.'
  let out: Uint8Array
  try {
    out = isIsoMedia(bytes) ? await withTempFile(bytes, async (f) => (await run(['-i', f, ...args], new Uint8Array())).out) : (await run(['-i', 'pipe:0', ...args], bytes)).out
  } catch (e) {
    if (e instanceof AudioError && /does not contain any stream|matches no streams|Invalid data found|Error opening output file/i.test(e.message)) throw new AudioError(noAudio)
    throw e
  }
  const wav = fixWavSizes(out)
  const hasAudio = (() => { try { return decodeWav(wav).samples.length > 0 } catch { return false } })()
  if (!hasAudio) throw new AudioError(noAudio)
  return wav
}

/** ISO base media (MP4, MOV, M4A, 3GP): "ftyp" at byte 4. */
function isIsoMedia(b: Uint8Array): boolean {
  return b.length > 12 && b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70
}

async function withTempFile<T>(bytes: Uint8Array, fn: (path: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'mimix-in-'))
  try {
    const f = join(dir, 'input')
    await writeFile(f, bytes)
    return await fn(f)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

/** WAV → MP3 (CBR, 44.1 kHz stereo-compatible mono). */
export async function wavToMp3(wav: Uint8Array, kbps: 128 | 192 = 128): Promise<Uint8Array> {
  const { out } = await run(['-f', 'wav', '-i', 'pipe:0', '-c:a', 'libmp3lame', '-b:a', `${kbps}k`, '-ar', '44100', '-f', 'mp3', 'pipe:1'], wav)
  return out
}

/** Duration in ms of a WAV, read from the header. */
export function wavDurationMs(wav: Uint8Array): number {
  const { samples, sampleRate } = decodeWav(wav)
  return Math.round((samples.length / sampleRate) * 1000)
}

/**
 * EBU R128 loudness normalisation, two passes: measure, then apply one linear gain so dynamics are
 * kept (linear=true). Target -16 LUFS integrated, -1.5 dBTP, the usual podcast and audiobook target.
 */
export async function normaliseLoudness(wav: Uint8Array, target = { I: -16, TP: -1.5, LRA: 11 }): Promise<Uint8Array> {
  const filter = `loudnorm=I=${target.I}:TP=${target.TP}:LRA=${target.LRA}`
  const { err } = await run(['-f', 'wav', '-i', 'pipe:0', '-af', `${filter}:print_format=json`, '-f', 'null', '-'], wav)
  const json = err.slice(err.lastIndexOf('{'), err.lastIndexOf('}') + 1)
  let m: Record<string, string>
  try { m = JSON.parse(json) } catch { throw new AudioError('Could not measure loudness') }
  if (!Number.isFinite(Number(m.input_i)) || Number(m.input_i) < -70) return wav // silence: nothing to normalise
  const second = `${filter}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`
  const { sampleRate } = decodeWav(wav)
  const { out } = await run(['-f', 'wav', '-i', 'pipe:0', '-af', second, '-ar', String(sampleRate), '-c:a', 'pcm_s16le', '-f', 'wav', 'pipe:1'], wav)
  return fixWavSizes(out)
}

/** Joins WAV clips (same rate) with `gapMs` of silence between them. Pure JS, no ffmpeg. */
export function concatWav(clips: Uint8Array[], gapMs = 0): Uint8Array {
  if (!clips.length) throw new AudioError('Nothing to join')
  const decoded = clips.map(decodeWav)
  const rate = decoded[0]!.sampleRate
  if (decoded.some((d) => d.sampleRate !== rate)) throw new AudioError('Clips have different sample rates')
  const gap = Math.round((gapMs / 1000) * rate)
  const total = decoded.reduce((t, d) => t + d.samples.length, 0) + gap * (decoded.length - 1)
  const out = new Float32Array(total)
  let at = 0
  decoded.forEach((d, i) => { out.set(d.samples, at); at += d.samples.length + (i < decoded.length - 1 ? gap : 0) })
  return encodeWav(out, rate)
}

/** Places clips at given start times (ms) on one track, for dubbing. Overlaps are summed. */
export function placeWav(clips: Array<{ wav: Uint8Array; atMs: number }>, totalMs: number, rate: number): Uint8Array {
  const out = new Float32Array(Math.ceil((totalMs / 1000) * rate))
  for (const c of clips) {
    const d = decodeWav(c.wav)
    if (d.sampleRate !== rate) throw new AudioError('Clip sample rate mismatch')
    const at = Math.round((c.atMs / 1000) * rate)
    for (let i = 0; i < d.samples.length && at + i < out.length; i++) out[at + i] = (out[at + i] ?? 0) + (d.samples[i] ?? 0)
  }
  for (let i = 0; i < out.length; i++) out[i] = Math.max(-1, Math.min(1, out[i] ?? 0))
  return encodeWav(out, rate)
}

/** a − b, sample by sample (same rate). Used to get the background once the voice is isolated. */
export function subtractWav(a: Uint8Array, b: Uint8Array): Uint8Array {
  const x = decodeWav(a), y = decodeWav(b)
  if (x.sampleRate !== y.sampleRate) throw new AudioError('Clip sample rate mismatch')
  const out = new Float32Array(x.samples.length)
  for (let i = 0; i < out.length; i++) out[i] = Math.max(-1, Math.min(1, (x.samples[i] ?? 0) - (y.samples[i] ?? 0)))
  return encodeWav(out, x.sampleRate)
}

/**
 * Replaces a video's audio with a new track, copying the video stream as is. Video files can be
 * large, so this one goes through temporary files instead of pipes. `comment` lands in the
 * container metadata (the provenance label).
 */
export async function muxVideo(video: Uint8Array, audioMp3: Uint8Array, comment: string): Promise<Uint8Array> {
  const dir = await mkdtemp(join(tmpdir(), 'mimix-mux-'))
  try {
    const v = join(dir, 'in.video'), a = join(dir, 'in.mp3'), o = join(dir, 'out.mp4')
    await writeFile(v, video); await writeFile(a, audioMp3)
    await run(['-i', v, '-i', a, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-metadata', `comment=${comment}`, '-movflags', '+faststart', '-y', o], new Uint8Array())
    return new Uint8Array(await readFile(o))
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

/** Cuts [startMs, endMs) out of a WAV. */
export function sliceWav(wav: Uint8Array, startMs: number, endMs: number): Uint8Array {
  const d = decodeWav(wav)
  const a = Math.max(0, Math.floor((startMs / 1000) * d.sampleRate))
  const b = Math.min(d.samples.length, Math.ceil((endMs / 1000) * d.sampleRate))
  return encodeWav(d.samples.slice(a, Math.max(a, b)), d.sampleRate)
}

/** ffmpeg writes streaming WAV headers with unknown sizes; rewrite them from the real length. */
function fixWavSizes(wav: Uint8Array): Uint8Array {
  if (wav.length < 44) throw new AudioError('Empty audio')
  const v = new DataView(wav.buffer, wav.byteOffset, wav.byteLength)
  v.setUint32(4, wav.length - 8, true)
  // Find the "data" chunk and fix its size.
  let p = 12
  while (p + 8 <= wav.length) {
    const id = String.fromCharCode(wav[p]!, wav[p + 1]!, wav[p + 2]!, wav[p + 3]!)
    if (id === 'data') { v.setUint32(p + 4, wav.length - p - 8, true); break }
    p += 8 + v.getUint32(p + 4, true)
  }
  return wav
}
