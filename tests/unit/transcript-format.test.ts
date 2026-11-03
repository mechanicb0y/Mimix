import { describe, expect, it } from 'vitest'
import { toSrt, toTxt, toVtt } from '@/lib/transcript-format'

const segs = [
  { startMs: 0, endMs: 1500, speaker: 'Speaker 1', text: 'Hello there.' },
  { startMs: 1600, endMs: 3000, speaker: 'Speaker 1', text: 'How are you?' },
  { startMs: 3_661_005, endMs: 3_662_000, speaker: 'Speaker 2', text: 'Fine <thanks> & you?' },
]

describe('transcript formats', () => {
  it('writes SRT with comma milliseconds and renamed speakers', () => {
    expect(toSrt(segs, { names: { 'Speaker 2': 'Dana' } })).toBe(
      '1\n00:00:00,000 --> 00:00:01,500\nSpeaker 1: Hello there.\n\n2\n00:00:01,600 --> 00:00:03,000\nSpeaker 1: How are you?\n\n3\n01:01:01,005 --> 01:01:02,000\nDana: Fine <thanks> & you?\n')
  })
  it('writes WebVTT with voice tags and escapes markup', () => {
    const v = toVtt(segs)
    expect(v.startsWith('WEBVTT\n\n00:00:00.000 --> 00:00:01.500\n<v Speaker 1>Hello there.')).toBe(true)
    expect(v).toContain('<v Speaker 2>Fine &lt;thanks&gt; &amp; you?')
  })
  it('groups text by speaker, with optional timestamps', () => {
    expect(toTxt(segs)).toBe('Speaker 1: Hello there. How are you?\n\nSpeaker 2: Fine <thanks> & you?\n')
    expect(toTxt(segs, { timestamps: true, speakers: false })).toBe('[00:00:00] Hello there. How are you?\n\n[01:01:01] Fine <thanks> & you?\n')
  })
})
