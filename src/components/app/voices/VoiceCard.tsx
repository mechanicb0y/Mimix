'use client'
import Link from 'next/link'
import { getMessages } from '@/i18n'
import { languageName } from '@/config/languages'
import { PreviewButton } from '@/components/app/VoicePicker'
import type { ReactNode } from 'react'

export interface VoiceItem {
  id: string; name: string; description: string; kind: string; status: string; licence: 'remix' | 'standard' | 'private'
  language: string; accent: string; gender: string; age: string; useCase: string; owned: boolean; library: boolean
  publishStatus: 'none' | 'pending' | 'approved' | 'rejected'; publishNote: string | null; saved: boolean; previewUrl: string
}

/** One voice as a card: name, what it is, its state, and the actions passed in. */
export function VoiceCard({ v, actions }: { v: VoiceItem; actions?: ReactNode }) {
  const t = getMessages().app
  const lib = getMessages().library.values
  const accent = (lib.accent as Record<string, string>)[v.accent] ?? v.accent
  const meta = [languageName(v.language), accent, (lib.gender as Record<string, string>)[v.gender], (lib.age as Record<string, string>)[v.age]].filter(Boolean).join(' · ')
  const active = v.status === 'active'
  return (
    <li className="m-card grid content-start gap-3 p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[16px] font-semibold">{v.owned ? <Link href={`/app/voices/${v.id}`} className="hover:underline">{v.name}</Link> : v.name}</h3>
          <p className="text-[13px] text-[var(--text-muted)]">{meta}</p>
        </div>
        {active ? <PreviewButton voice={v} /> : null}
      </div>
      {v.description ? <p className="line-clamp-2 text-[13px] text-[var(--text-muted)]">{v.description}</p> : null}
      <ul className="flex flex-wrap gap-1.5" aria-label={t.voiceDetail.details}>
        <li className="m-badge">{(t.voicePicker.kinds as Record<string, string>)[v.kind] ?? v.kind}</li>
        <li className="m-badge">{t.mixer.licences[v.licence]}</li>
        {v.owned && !active ? <li className="m-badge">{(t.myVoices.status as Record<string, string>)[v.status]}</li> : null}
        {v.owned && v.publishStatus !== 'none' ? <li className="m-badge">{t.myVoices.publish[v.publishStatus]}</li> : null}
        {!v.owned && !v.library ? <li className="m-badge">{t.libraryApp.community}</li> : null}
      </ul>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </li>
  )
}
