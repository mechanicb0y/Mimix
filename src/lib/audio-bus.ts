'use client'
/**
 * Only one clip plays at a time across the page. Every player claims the bus when it starts;
 * the previous owner is paused.
 */
type Owner = { pause: () => void }
let current: Owner | null = null

export function claimPlayback(owner: Owner): void {
  if (current && current !== owner) current.pause()
  current = owner
}

export function releasePlayback(owner: Owner): void {
  if (current === owner) current = null
}
