'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Wand2 } from 'lucide-react'
import { useId, useState } from 'react'
import { api, ApiClientError } from '@/lib/api-client'
import { getMessages, fmt, formatNumber, plural } from '@/i18n'
import { CREDIT_RATES } from '@/config/plans'
import { FORM_LANGUAGES, languageName } from '@/config/languages'
import { DESIGN_AGES, DESIGN_DESCRIPTION_MAX, DESIGN_DESCRIPTION_MIN, DESIGN_GENDERS, DESIGN_PACES, DESIGN_PITCHES, DESIGN_PREVIEW_MAX, DESIGN_WARMTHS } from '@/lib/schemas/design'
import { LICENCES } from '@/lib/schemas/voices'
import { FormMessage, TextArea, TextInput } from '@/components/app/Field'
import { OverQuota } from '@/components/app/OverQuota'
import { GenerationPlayer } from '@/components/app/GenerationPlayer'
import { useAppContext } from '@/components/app/shell/context'

interface DesignSet { id: string; description: string; candidates: Array<{ index: number; durationMs: number; peaks: number[]; audioUrl: string; savedVoiceId: string | null }> }

interface Traits { gender: (typeof DESIGN_GENDERS)[number]; age: (typeof DESIGN_AGES)[number]; accent: string; pitch: (typeof DESIGN_PITCHES)[number]; pace: (typeof DESIGN_PACES)[number]; warmth: (typeof DESIGN_WARMTHS)[number] }
const START: Traits = { gender: 'any', age: 'any', accent: 'any', pitch: 'medium', pace: 'normal', warmth: 'neutral' }

/** A plain description from the picked traits, used when the box is left (nearly) empty. */
function describe(t: Traits, language: string): string {
  const d = getMessages().app.designUi.traits
  const who = [t.age !== 'any' ? d.ageWords[t.age] : '', t.gender !== 'any' ? d.genderWords[t.gender] : d.genderWords.any].filter(Boolean).join(' ')
  const parts = [fmt(d.sentence, { who, language: languageName(language) })]
  if (t.accent !== 'any') parts.push(fmt(d.withAccent, { accent: (getMessages().library.values.accent as Record<string, string>)[t.accent] ?? t.accent }))
  parts.push(fmt(d.withVoice, { pitch: d.pitchWords[t.pitch], pace: d.paceWords[t.pace], warmth: d.warmthWords[t.warmth] }))
  return parts.join(' ')
}

/**
 * `accents`: the languages the engine designs in and the accents it has for each (Kokoro); null
 * when the engine designs from free text in any language.
 */
export function DesignStudio({ canGenerate, accents = null }: { canGenerate: boolean; accents?: Record<string, string[]> | null }) {
  const t = getMessages().app.designUi
  const c = getMessages().app.common
  const mx = getMessages().app.mixer
  const ctx = useAppContext()
  const qc = useQueryClient()
  const router = useRouter()
  const id = useId()
  const [description, setDescription] = useState('')
  const [previewText, setPreviewText] = useState('')
  const [language, setLanguage] = useState('en')
  const [traits, setTraits] = useState<Traits>(START)
  const languages = accents ? Object.keys(accents) : [...FORM_LANGUAGES]
  const accentOptions = accents?.[language] ?? []
  const typed = description.trim().length >= DESIGN_DESCRIPTION_MIN
  const sentDescription = typed ? description : describe(traits, language)
  const sentTraits = { ...traits, accent: traits.accent === 'any' ? undefined : traits.accent }
  const [set, setSet] = useState<DesignSet | null>(null)
  const [picked, setPicked] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [licence, setLicence] = useState<(typeof LICENCES)[number]>('private')
  const [saved, setSaved] = useState<{ id: string; name: string } | null>(null)
  const cost = CREDIT_RATES.voiceDesignPerPreviewSet
  const notEnough = !ctx.balance.unlimited && cost > ctx.balance.total

  const generate = useMutation({
    mutationFn: () => api<DesignSet>('/api/v1/voices/design', { method: 'POST', json: { description: sentDescription, previewText, language, traits: sentTraits } }),
    onMutate: () => { setPicked(null); setSaved(null) },
    onSuccess: (d) => { setSet(d); router.refresh() },
  })
  const save = useMutation({
    mutationFn: () => api<{ id: string; name: string }>('/api/v1/voices/design/save', { method: 'POST', json: { designId: set!.id, candidate: picked, name, licence } }),
    onSuccess: (v) => {
      setSaved(v); setName('')
      setSet((s) => s && { ...s, candidates: s.candidates.map((x) => (x.index === picked ? { ...x, savedVoiceId: v.id } : x)) })
      void qc.invalidateQueries({ queryKey: ['voices'] })
    },
  })
  const gErr = generate.error instanceof ApiClientError ? generate.error : null
  const sErr = save.error instanceof ApiClientError ? save.error : null

  return (
    <div className="mx-auto grid max-w-[1100px] gap-6">
      <header>
        <h1 className="app-page-title">{t.title}</h1>
        <p className="mt-1 text-[var(--text-muted)]">{t.subtitle}</p>
      </header>
      {!canGenerate ? <FormMessage tone="info">{c.viewerReadOnly}</FormMessage> : null}
      <form className="m-card grid gap-4 p-4 sm:p-6" noValidate onSubmit={(e) => { e.preventDefault(); generate.mutate() }}>
        <fieldset className="grid gap-3">
          <legend className="m-label">{t.traits.legend}</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            <Pick id={`${id}-gender`} label={t.traits.gender} value={traits.gender} options={DESIGN_GENDERS.map((v) => [v, t.traits.genders[v]])} onChange={(v) => setTraits((x) => ({ ...x, gender: v as Traits['gender'] }))} />
            <Pick id={`${id}-age`} label={t.traits.age} value={traits.age} options={DESIGN_AGES.map((v) => [v, t.traits.ages[v]])} onChange={(v) => setTraits((x) => ({ ...x, age: v as Traits['age'] }))} />
            <Pick id={`${id}-accent`} label={t.traits.accent} value={traits.accent} options={[['any', t.traits.anyAccent], ...accentOptions.map((a) => [a, (getMessages().library.values.accent as Record<string, string>)[a] ?? a] as [string, string])]} onChange={(v) => setTraits((x) => ({ ...x, accent: v }))} disabled={!accents} />
            <Pick id={`${id}-pitch`} label={t.traits.pitch} value={traits.pitch} options={DESIGN_PITCHES.map((v) => [v, t.traits.pitches[v]])} onChange={(v) => setTraits((x) => ({ ...x, pitch: v as Traits['pitch'] }))} />
            <Pick id={`${id}-pace`} label={t.traits.pace} value={traits.pace} options={DESIGN_PACES.map((v) => [v, t.traits.paces[v]])} onChange={(v) => setTraits((x) => ({ ...x, pace: v as Traits['pace'] }))} />
            <Pick id={`${id}-warmth`} label={t.traits.warmth} value={traits.warmth} options={DESIGN_WARMTHS.map((v) => [v, t.traits.warmths[v]])} onChange={(v) => setTraits((x) => ({ ...x, warmth: v as Traits['warmth'] }))} />
          </div>
        </fieldset>
        <TextArea label={<>{t.description} <span className="font-normal text-[var(--text-subtle)]">({c.optional})</span></>} hint={typed ? t.descriptionHint : fmt(t.traits.composed, { text: sentDescription })} value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={DESIGN_DESCRIPTION_MAX} error={gErr?.fields.description} />
        <p className="-mt-2 text-[13px] text-[var(--text-muted)]" aria-live="polite">{fmt(t.count, { count: formatNumber(description.length), max: formatNumber(DESIGN_DESCRIPTION_MAX) })}</p>
        <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
          <TextInput label={<>{t.previewText} <span className="font-normal text-[var(--text-subtle)]">({c.optional})</span></>} hint={t.previewHint} value={previewText} onChange={(e) => setPreviewText(e.target.value)} maxLength={DESIGN_PREVIEW_MAX} error={gErr?.fields.previewText} />
          <div>
            <label htmlFor={`${id}-lang`} className="m-label">{t.language}</label>
            <select id={`${id}-lang`} className="m-select" value={language} onChange={(e) => { setLanguage(e.target.value); setTraits((x) => ({ ...x, accent: 'any' })) }}>
              {languages.map((l) => <option key={l} value={l}>{languageName(l)}</option>)}
            </select>
          </div>
        </div>
        {notEnough ? <OverQuota needed={cost} available={ctx.balance.total} /> : null}
        {gErr?.code === 'insufficient_credits' ? <OverQuota needed={Number(gErr.extra.needed)} available={Number(gErr.extra.available)} /> : null}
        {gErr && gErr.code !== 'insufficient_credits' && !Object.keys(gErr.fields).length ? <FormMessage>{gErr.message}</FormMessage> : null}
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="m-btn primary lg" disabled={!canGenerate || sentDescription.trim().length < DESIGN_DESCRIPTION_MIN || notEnough || generate.isPending} aria-busy={generate.isPending}>
            <Wand2 aria-hidden="true" />{generate.isPending ? t.generating : t.generate}
          </button>
          <span className="text-[13px] text-[var(--text-muted)]">{fmt(t.cost, { credits: plural(cost, c.creditsOne, c.credits) })}</span>
        </div>
      </form>

      <section aria-labelledby={`${id}-cands`} className="grid gap-3">
        <h2 id={`${id}-cands`} className="text-[20px] font-semibold">{t.candidates}</h2>
        <p className="sr-only" role="status" aria-live="polite">{generate.isPending ? t.generating : set ? t.candidates : ''}</p>
        {generate.isPending ? <div className="grid gap-3 md:grid-cols-3" aria-hidden="true">{[0, 1, 2].map((i) => <div key={i} className="m-skeleton h-36" />)}</div>
          : !set ? <p className="app-empty">{t.empty}</p>
          : (
            <ul className="grid gap-3 md:grid-cols-3">
              {set.candidates.map((cand) => (
                <li key={cand.index} className={`m-card grid content-start gap-3 p-4 ${picked === cand.index ? 'outline outline-2 outline-[var(--primary)]' : ''}`}>
                  <h3 className="font-semibold">{fmt(t.candidate, { n: cand.index + 1 })}</h3>
                  <GenerationPlayer g={{ id: `${set.id}-${cand.index}`, audioUrl: cand.audioUrl, downloadUrl: null, durationMs: cand.durationMs, peaks: cand.peaks, mimeType: null }} title={fmt(t.candidate, { n: cand.index + 1 })} />
                  {cand.savedVoiceId ? <span className="m-badge justify-self-start"><CheckCircle2 size={14} aria-hidden="true" />{t.savedBadge}</span>
                    : <button type="button" className="m-btn secondary sm justify-self-start" aria-pressed={picked === cand.index} onClick={() => { setPicked(cand.index); setSaved(null) }}>{t.choose}</button>}
                </li>
              ))}
            </ul>
          )}
      </section>

      {set && picked !== null && !set.candidates[picked]?.savedVoiceId ? (
        <form className="m-card grid gap-4 p-4 sm:p-6" noValidate onSubmit={(e) => { e.preventDefault(); save.mutate() }} aria-labelledby={`${id}-save`}>
          <h2 id={`${id}-save`} className="text-[18px] font-semibold">{fmt(t.saveTitle, { n: picked + 1 })}</h2>
          <TextInput label={t.name} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required error={sErr?.fields.name} autoComplete="off" />
          <fieldset>
            <legend className="m-label">{getMessages().app.clone.licence}</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {[...LICENCES].reverse().map((l) => (
                <label key={l} className="flex cursor-pointer items-start gap-3 rounded-[10px] border border-[var(--border)] p-3">
                  <input type="radio" name={`${id}-lic`} className="mt-1 size-4 accent-[var(--primary)]" checked={licence === l} onChange={() => setLicence(l)} />
                  <span><span className="block text-[14px] font-semibold">{mx.licences[l]}</span><span className="block text-[13px] text-[var(--text-muted)]">{mx.licenceHelp[l]}</span></span>
                </label>
              ))}
            </div>
          </fieldset>
          {sErr && !Object.keys(sErr.fields).length ? <FormMessage>{sErr.message}</FormMessage> : null}
          <button type="submit" className="m-btn primary justify-self-start" disabled={!canGenerate || !name.trim() || save.isPending} aria-busy={save.isPending}>{save.isPending ? c.saving : t.save}</button>
        </form>
      ) : null}
      {saved ? (
        <FormMessage tone="success">
          {fmt(t.saved, { name: saved.name })} <Link className="link" href={`/app/speech?voice=${encodeURIComponent(saved.id)}`}>{t.useInSpeech}</Link>
        </FormMessage>
      ) : null}
    </div>
  )
}

function Pick({ id, label, value, options, onChange, disabled }: { id: string; label: string; value: string; options: Array<[string, string]>; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div>
      <label htmlFor={id} className="m-label">{label}</label>
      <select id={id} className="m-select" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  )
}
