import { describe, expect, it } from 'vitest'
import { parseManuscript, STUDIO_BLOCK_MAX } from '@/lib/schemas/studio'

describe('parseManuscript', () => {
  it('splits chapters at headings and "Chapter N" lines, and blocks at blank lines', () => {
    const r = parseManuscript('# The gate\n\nIt was late.\nThe rain had stopped.\n\nChapter 2: Morning\nWREN: Are you sure?\n\nATLAS: Not at all.', 'Untitled')
    expect(r).toEqual([
      { title: 'The gate', blocks: [{ text: 'It was late. The rain had stopped.', speaker: null }] },
      { title: 'Chapter 2: Morning', blocks: [{ text: 'Are you sure?', speaker: 'WREN' }, { text: 'Not at all.', speaker: 'ATLAS' }] },
    ])
  })

  it('puts text before any heading in a first chapter and splits long paragraphs at sentences', () => {
    const long = Array.from({ length: 300 }, (_, i) => `Sentence number ${i} is here.`).join(' ')
    const r = parseManuscript(`Opening words.\n\n${long}`, 'Chapter 1')
    expect(r).toHaveLength(1)
    expect(r[0]!.title).toBe('Chapter 1')
    expect(r[0]!.blocks.length).toBeGreaterThan(3)
    expect(r[0]!.blocks.every((b) => b.text.length <= STUDIO_BLOCK_MAX)).toBe(true)
    expect(r[0]!.blocks.slice(1).map((b) => b.text).join(' ')).toBe(long)
  })

  it('does not treat a time or a URL as a speaker', () => {
    const r = parseManuscript('At 10:30 we left.\n\nhttps://example.com: see this', 'C')
    expect(r[0]!.blocks.map((b) => b.speaker)).toEqual([null, null])
  })
})
