import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { toWav, wavDurationMs } from '@/server/audio'

const make = (args: string[]) => {
  const dir = mkdtempSync(join(tmpdir(), 'dec-'))
  const out = join(dir, args.pop()!)
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', ...args, '-y', out])
  expect(r.status).toBe(0)
  return new Uint8Array(readFileSync(out))
}

describe('toWav', () => {
  it('reads MP4 and M4A files whose index is at the end (phone recordings, screen captures)', async () => {
    const mp4 = make(['-f', 'lavfi', '-i', 'testsrc=size=640x360:rate=25', '-f', 'lavfi', '-i', 'sine=frequency=220:duration=8', '-t', '8', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', 'v.mp4'])
    expect(Math.abs(wavDurationMs(await toWav(mp4, 16000)) - 8000)).toBeLessThan(150)
    const m4a = make(['-f', 'lavfi', '-i', 'sine=frequency=330:duration=5', '-c:a', 'aac', 'a.m4a'])
    expect(Math.abs(wavDurationMs(await toWav(m4a, 16000)) - 5000)).toBeLessThan(150)
  })

  it('refuses a video with no sound track', async () => {
    const silent = make(['-f', 'lavfi', '-i', 'testsrc=size=160x90:rate=10', '-t', '2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', 'n.mp4'])
    await expect(toWav(silent)).rejects.toThrow(/couldn’t read any audio/)
  })
})
