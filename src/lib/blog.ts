import type { BlogPost } from '@/content/types'

/** Reading time at 220 words per minute, rounded up, at least 1. */
export function readingMinutes(post: BlogPost): number {
  const text = post.body.map((b) => (b.type === 'ul' ? b.items.join(' ') : b.text)).join(' ')
  return Math.max(1, Math.ceil(text.split(/\s+/).filter(Boolean).length / 220))
}
