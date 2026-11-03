'use client'
import { claimPlayback, releasePlayback } from './audio-bus'

/**
 * Plays generated audio (a Blob) through one reusable <audio> element and the shared audio bus.
 * Kept outside React state so components only track status.
 */
export class BlobPlayer {
  private audio: HTMLAudioElement | null = null
  private url: string | null = null
  constructor(private onStop: () => void) {}

  readonly owner = { pause: () => this.stop() }

  async play(blob: Blob): Promise<void> {
    this.audio ??= new Audio()
    if (this.url) URL.revokeObjectURL(this.url)
    this.url = URL.createObjectURL(blob)
    this.audio.src = this.url
    this.audio.onended = () => { releasePlayback(this.owner); this.onStop() }
    claimPlayback(this.owner)
    await this.audio.play()
  }

  stop(): void {
    this.audio?.pause()
    releasePlayback(this.owner)
    this.onStop()
  }

  dispose(): void {
    this.audio?.pause()
    if (this.url) URL.revokeObjectURL(this.url)
    releasePlayback(this.owner)
  }
}
