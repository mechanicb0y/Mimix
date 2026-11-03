'use client'
import { useAppContext } from '@/components/app/shell/context'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, FileAudio, Lock, RefreshCw, Trash2, Upload } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { api, ApiClientError, followJob } from '@/lib/api-client'
import { uploadFile } from '@/lib/upload-client'
import { getMessages, fmt } from '@/i18n'
import { ENGINE_LIMITS } from '@/config/engine-limits'
import { formatBytes, UPLOAD_LIMITS } from '@/config/uploads'
import { FORM_LANGUAGES, languageName } from '@/config/languages'
import { LICENCES } from '@/lib/schemas/voices'
import { FormMessage, TextArea, TextInput } from '@/components/app/Field'
import { Recorder } from '@/components/app/Recorder'

type Kind = 'instant' | 'professional'
type Step = 'type' | 'samples' | 'consent' | 'done'
interface Sample { key: string; name: string; size: number; progress: number; id?: string; error?: string }
interface Phrase { consentId: string; phrase: string; expiresAt: string; attemptsLeft: number }
interface PendingVoice { id: string; name: string; kind: string }

const STEPS: Step[] = ['type', 'samples', 'consent', 'done']
const minutesOrSeconds = (s: number) => (s >= 120 ? `${Math.round(s / 60)} minutes` : `${s} seconds`)

export function CloneWizard({ canInstant, canPro, canWrite, resume, resumeError }: { canInstant: boolean; canPro: boolean; canWrite: boolean; resume: PendingVoice | null; resumeError: boolean }) {
  const t = getMessages().app.clone
  const c = getMessages().app.common
  const v = getMessages().app.mixer
  const router = useRouter()
  const qc = useQueryClient()
  const id = useId()
  const { features } = useAppContext()
  // CLONE_CONSENT=attest: no read-aloud step; the voice switches on when its samples are ready.
  const attest = features.cloneConsent === 'attest'
  // A voice made before the setting changed still waits for consent: it gets the confirmation instead.
  const steps = attest && !resume ? STEPS.filter((s) => s !== 'consent') : STEPS
  const [step, setStep] = useState<Step>(resume ? 'consent' : 'type')
  const [kind, setKind] = useState<Kind>(resume?.kind === 'professional_clone' ? 'professional' : 'instant')
  const [samples, setSamples] = useState<Sample[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [language, setLanguage] = useState('en')
  const [licence, setLicence] = useState<(typeof LICENCES)[number]>('private')
  const [rights, setRights] = useState(false)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [voice, setVoice] = useState<PendingVoice | null>(resume)
  const [phrase, setPhrase] = useState<Phrase | null>(null)
  const [recording, setRecording] = useState<{ blob: Blob; url: string; name: string } | null>(null)
  const [notice, setNotice] = useState('')
  const [training, setTraining] = useState<{ percent: number; failed: boolean } | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const headingRef = useRef<HTMLHeadingElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const recCount = useRef(0)

  useEffect(() => { headingRef.current?.focus() }, [step])
  useEffect(() => {
    if (step !== 'consent') return
    const timer = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(timer)
  }, [step])
  useEffect(() => () => { if (recording) URL.revokeObjectURL(recording.url) }, [recording])

  const limits = UPLOAD_LIMITS.voice_sample
  const min = kind === 'instant' ? ENGINE_LIMITS.cloneInstantMinSeconds.value : ENGINE_LIMITS.cloneProfessionalMinMinutes.value * 60

  /* ---------- samples */
  const addFiles = (files: Array<Blob & { name?: string }>) => {
    const added = files.map((f, i) => ({ key: `${Date.now()}-${i}-${Math.random()}`, name: f.name ?? fmt(t.recordedName, { n: ++recCount.current }), size: f.size, progress: 0 }))
    setSamples((s) => [...s, ...added])
    added.forEach((a, i) => {
      const f = files[i]!
      if (f.size > limits.maxBytes) { patch(a.key, { error: fmt(getMessages().errors.app.fileTooLarge, { limit: formatBytes(limits.maxBytes) }) }); return }
      const filename = f.name ?? `recording-${recCount.current}.${(f.type.includes('mp4') ? 'm4a' : 'webm')}`
      uploadFile(f, 'voice_sample', { filename, onProgress: (p) => patch(a.key, { progress: p }) })
        .then((u) => { patch(a.key, { id: u.id, progress: 1 }); setNotice(fmt(t.uploaded, { name: a.name })) })
        .catch((e: unknown) => patch(a.key, { error: e instanceof ApiClientError ? (Object.values(e.fields)[0] ?? e.message) : c.networkError }))
    })
  }
  const patch = (key: string, p: Partial<Sample>) => setSamples((s) => s.map((x) => (x.key === key ? { ...x, ...p } : x)))
  const ready = samples.filter((s) => s.id && !s.error)
  const uploading = samples.some((s) => !s.id && !s.error)

  const start = async () => {
    setFields({}); setError('')
    setBusy(t.starting)
    try {
      const r = await api<{ voice: PendingVoice; jobId: string }>('/api/v1/voices/clone', {
        method: 'POST', json: { kind, name, description, language, licence, uploadIds: ready.map((s) => s.id), rightsConfirmed: rights || undefined },
      })
      setVoice(r.voice)
      const output = await new Promise<Record<string, unknown> | null>((resolve, reject) => {
        const stop = followJob(r.jobId, (j) => {
          if (j.status === 'running' || j.status === 'queued') setBusy(fmt(t.preparing, { percent: j.progress }))
          if (j.status === 'succeeded') { stop(); resolve(j.output) }
          if (j.status === 'failed' || j.status === 'canceled') { stop(); reject(new Error(j.error ?? t.prepareFailed)) }
        })
      })
      if (attest) {
        const trainingJobId = typeof output?.trainingJobId === 'string' ? output.trainingJobId : null
        if (trainingJobId) {
          setTraining({ percent: 0, failed: false })
          followJob(trainingJobId, (j) => setTraining({ percent: j.progress, failed: j.status === 'failed' }))
        }
        void qc.invalidateQueries({ queryKey: ['voices'] })
        setStep('done')
        router.refresh()
        return
      }
      await newPhrase(r.voice.id)
      setStep('consent')
    } catch (e) {
      if (e instanceof ApiClientError) { setFields(e.fields); if (!Object.keys(e.fields).length) setError(e.message) }
      else setError((e as Error).message)
    } finally { setBusy('') }
  }

  /* ---------- consent */
  const newPhrase = async (voiceId = voice?.id) => {
    if (!voiceId) return
    setError('')
    try { setPhrase(await api<Phrase>(`/api/v1/voices/${voiceId}/consent/phrase`, { method: 'POST' })) } catch (e) {
      setPhrase(null); setError(e instanceof ApiClientError ? e.message : c.networkError)
    }
  }
  useEffect(() => {
    // Resuming a voice that waits for consent: fetch a phrase once on arrival.
    if (resume && !phrase && !attest) void newPhrase(resume.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setRecorded = (blob: Blob, label: string) => {
    if (recording) URL.revokeObjectURL(recording.url)
    setRecording({ blob, url: URL.createObjectURL(blob), name: label })
  }
  const expired = phrase ? new Date(phrase.expiresAt).getTime() <= now : false

  const verify = async () => {
    if (!voice || !phrase || !recording) return
    setError(''); setBusy(t.verifying)
    try {
      const ext = recording.blob.type.includes('mp4') ? 'm4a' : recording.blob.type.includes('wav') ? 'wav' : recording.blob.type.includes('mpeg') ? 'mp3' : 'webm'
      const up = await uploadFile(recording.blob, 'consent', { filename: (recording.blob as File).name ?? `consent.${ext}` })
      const r = await api<{ verified: true; voice: PendingVoice & { status: string }; jobId: string | null }>(`/api/v1/voices/${voice.id}/consent`, { method: 'POST', json: { consentId: phrase.consentId, uploadId: up.id } })
      setVoice(r.voice)
      void qc.invalidateQueries({ queryKey: ['voices'] })
      if (r.jobId) {
        setTraining({ percent: 0, failed: false })
        followJob(r.jobId, (j) => setTraining({ percent: j.progress, failed: j.status === 'failed' }))
      }
      setStep('done')
      router.refresh()
    } catch (e) {
      if (e instanceof ApiClientError) {
        const next = e.extra.next as Phrase | null | undefined
        setError(e.message + (next ? ` ${t.tryAgain}` : ''))
        if (next !== undefined) setPhrase(next)
        setRecording(null)
      } else setError(c.networkError)
    } finally { setBusy('') }
  }

  const confirm = async () => {
    if (!voice) return
    setError(''); setFields({}); setBusy(t.verifying)
    try {
      const r = await api<{ verified: true; voice: PendingVoice & { status: string }; jobId: string | null }>(`/api/v1/voices/${voice.id}/consent`, { method: 'POST', json: { attest: rights || undefined } })
      setVoice(r.voice)
      void qc.invalidateQueries({ queryKey: ['voices'] })
      if (r.jobId) {
        setTraining({ percent: 0, failed: false })
        followJob(r.jobId, (j) => setTraining({ percent: j.progress, failed: j.status === 'failed' }))
      }
      setStep('done')
      router.refresh()
    } catch (e) {
      if (e instanceof ApiClientError) { setFields(e.fields); if (!Object.keys(e.fields).length) setError(e.message) }
      else setError(c.networkError)
    } finally { setBusy('') }
  }

  /* ---------- render */
  const stepIndex = steps.indexOf(step)
  return (
    <div className="mx-auto grid max-w-[880px] gap-6">
      <header>
        <h1 className="app-page-title">{t.title}</h1>
        <p className="mt-1 text-[var(--text-muted)]">{attest ? t.subtitleAttest : t.subtitle}</p>
      </header>
      {!canWrite ? <FormMessage tone="info">{c.viewerReadOnly}</FormMessage> : null}
      {resumeError ? <FormMessage tone="info">{t.resumeNotPending}</FormMessage> : null}
      <ol className="flex flex-wrap gap-2" aria-label={t.title}>
        {steps.map((s, i) => (
          <li key={s} aria-current={s === step ? 'step' : undefined}
            className={`flex items-center gap-2 rounded-full border px-3 py-1 text-[13px] ${s === step ? 'border-[var(--primary)] font-semibold' : 'border-[var(--border)] text-[var(--text-muted)]'}`}>
            {i < stepIndex ? <CheckCircle2 size={14} aria-hidden="true" /> : <span aria-hidden="true">{i + 1}</span>}
            {t.steps[s]}
          </li>
        ))}
      </ol>

      <section className="m-card grid gap-5 p-4 sm:p-6" aria-labelledby={`${id}-h`}>
        <p className="sr-only">{fmt(t.stepOf, { n: stepIndex + 1, total: steps.length, name: t.steps[step] })}</p>

        {step === 'type' ? (
          <>
            <h2 id={`${id}-h`} ref={headingRef} tabIndex={-1} className="text-[20px] font-semibold outline-none">{t.typeTitle}</h2>
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-labelledby={`${id}-h`}>
              {(['instant', 'professional'] as const).filter((k) => (k === 'instant' ? features.instantClone : features.professionalClone)).map((k) => {
                const locked = k === 'professional' ? !canPro : !canInstant
                const body = k === 'instant'
                  ? fmt(t.instant.body, { min: minutesOrSeconds(ENGINE_LIMITS.cloneInstantMinSeconds.value) })
                  : fmt(t.professional.body, { min: minutesOrSeconds(ENGINE_LIMITS.cloneProfessionalMinMinutes.value * 60) })
                return (
                  <label key={k} className={`grid gap-1 rounded-[var(--radius-lg)] border p-4 ${kind === k ? 'border-[var(--primary)] bg-[var(--surface-2)]' : 'border-[var(--border)]'} ${locked ? 'opacity-60' : 'cursor-pointer'}`}>
                    <span className="flex items-center gap-2 font-semibold">
                      <input type="radio" name={`${id}-kind`} className="size-4 accent-[var(--primary)]" checked={kind === k} disabled={locked} onChange={() => setKind(k)} />
                      {t[k].title}{locked ? <Lock size={14} aria-hidden="true" /> : null}
                    </span>
                    <span className="text-[14px] text-[var(--text-muted)]">{body}</span>
                    {locked ? <span className="text-[13px]">{k === 'professional' ? t.proLocked : t.instantLocked} <Link href="/app/settings/billing" className="link">{v.seePlans}</Link></span> : null}
                  </label>
                )
              })}
            </div>
            <button type="button" className="m-btn primary justify-self-start" disabled={!canWrite || (kind === 'instant' ? !canInstant : !canPro)} onClick={() => setStep('samples')}>{c.next}</button>
          </>
        ) : null}

        {step === 'samples' ? (
          <form className="grid gap-5" noValidate onSubmit={(e) => { e.preventDefault(); void start() }}>
            <div>
              <h2 id={`${id}-h`} ref={headingRef} tabIndex={-1} className="text-[20px] font-semibold outline-none">{t.samplesTitle}</h2>
              <p className="mt-1 text-[14px] text-[var(--text-muted)]">{t.samplesBody}</p>
            </div>
            <div
              className="grid justify-items-center gap-2 rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--border-strong)] p-6 text-center"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); addFiles([...e.dataTransfer.files]) }}
            >
              <Upload aria-hidden="true" />
              <p className="text-[14px]">{t.dropHint}{' '}
                <button type="button" className="link" onClick={() => fileRef.current?.click()}>{t.chooseFiles}</button>
              </p>
              <p className="text-[13px] text-[var(--text-subtle)]">{fmt(t.acceptHint, { size: formatBytes(limits.maxBytes) })}</p>
              <input ref={fileRef} type="file" multiple className="sr-only" tabIndex={-1} aria-hidden="true"
                accept={limits.extensions.map((x) => `.${x}`).join(',')}
                onChange={(e) => { addFiles([...(e.target.files ?? [])]); e.target.value = '' }} />
            </div>
            <Recorder label={t.recordSample} maxSeconds={300} onRecorded={(b) => addFiles([b])} />
            {fields.uploadIds || fields['uploadIds.0'] ? <p className="m-error">{fields.uploadIds ?? fields['uploadIds.0']}</p> : null}
            {samples.length ? (
              <ul className="grid gap-2" aria-label={t.samplesTitle}>
                {samples.map((s) => (
                  <li key={s.key} className="flex items-center gap-3 rounded-[10px] border border-[var(--border)] p-3">
                    <FileAudio aria-hidden="true" size={18} className="flex-none" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold">{s.name}</p>
                      {s.error ? <p className="m-error">{s.error}</p>
                        : !s.id ? <progress className="mt-1 h-1.5 w-full" max={1} value={s.progress} aria-label={fmt(t.uploading, { name: s.name, percent: Math.round(s.progress * 100) })} />
                        : <p className="text-[12px] text-[var(--text-subtle)]">{formatBytes(s.size).replace(/^0 MB$/, '<1 MB')}</p>}
                    </div>
                    <button type="button" className="m-btn ghost icon sm" aria-label={fmt(t.removeFile, { name: s.name })} onClick={() => setSamples((x) => x.filter((y) => y.key !== s.key))}><Trash2 aria-hidden="true" /></button>
                  </li>
                ))}
              </ul>
            ) : <p className="app-empty">{t.noFiles}</p>}
            <p className="sr-only" role="status" aria-live="polite">{notice}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput label={t.name} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required error={fields.name} autoComplete="off" />
              <div>
                <label htmlFor={`${id}-lang`} className="m-label">{t.language}</label>
                <select id={`${id}-lang`} className="m-select" value={language} onChange={(e) => setLanguage(e.target.value)}>
                  {FORM_LANGUAGES.map((l) => <option key={l} value={l}>{languageName(l)}</option>)}
                </select>
              </div>
            </div>
            <TextArea label={<>{t.description} <span className="font-normal text-[var(--text-subtle)]">({c.optional})</span></>} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={2} error={fields.description} />
            <fieldset>
              <legend className="m-label">{t.licence}</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {[...LICENCES].reverse().map((l) => (
                  <label key={l} className="flex cursor-pointer items-start gap-3 rounded-[10px] border border-[var(--border)] p-3">
                    <input type="radio" name={`${id}-lic`} className="mt-1 size-4 accent-[var(--primary)]" checked={licence === l} onChange={() => setLicence(l)} />
                    <span><span className="block text-[14px] font-semibold">{v.licences[l]}</span><span className="block text-[13px] text-[var(--text-muted)]">{v.licenceHelp[l]}</span></span>
                  </label>
                ))}
              </div>
              <p className="m-hint">{t.licenceNote}</p>
            </fieldset>
            <div>
              <label className="flex items-start gap-3 text-[14px]">
                <input type="checkbox" className="mt-0.5 size-5 flex-none accent-[var(--primary)]" checked={rights} onChange={(e) => setRights(e.target.checked)} aria-invalid={fields.rightsConfirmed ? true : undefined} aria-describedby={fields.rightsConfirmed ? `${id}-rights-err` : undefined} />
                <span>{t.rights} <Link href="/legal/voice-cloning-policy" className="link" target="_blank">{t.policy}</Link></span>
              </label>
              {fields.rightsConfirmed ? <p id={`${id}-rights-err`} className="m-error">{fields.rightsConfirmed}</p> : null}
            </div>
            {fields.kind ? <FormMessage>{fields.kind}</FormMessage> : null}
            {error ? <FormMessage>{error}</FormMessage> : null}
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className="m-btn ghost" onClick={() => setStep('type')}>{c.back}</button>
              <button type="submit" className="m-btn primary" disabled={!canWrite || !ready.length || uploading || !name.trim() || !!busy} aria-busy={!!busy}>{busy || (attest ? t.startAttest : t.start)}</button>
              <span className="text-[13px] text-[var(--text-muted)]" aria-live="polite">{busy}</span>
            </div>
            <p className="m-hint">{fmt(kind === 'instant' ? t.instant.body : t.professional.body, { min: minutesOrSeconds(min) })}</p>
          </form>
        ) : null}

        {step === 'consent' && attest && voice ? (
          <div className="grid gap-5">
            <div>
              <h2 id={`${id}-h`} ref={headingRef} tabIndex={-1} className="text-[20px] font-semibold outline-none">{fmt(t.attestTitle, { name: voice.name })}</h2>
              <p className="mt-1 text-[14px] text-[var(--text-muted)]">{t.attestBody}</p>
            </div>
            <div>
              <label className="flex items-start gap-3 text-[14px]">
                <input type="checkbox" className="mt-0.5 size-5 flex-none accent-[var(--primary)]" checked={rights} onChange={(e) => setRights(e.target.checked)} aria-invalid={fields.attest ? true : undefined} aria-describedby={fields.attest ? `${id}-attest-err` : undefined} />
                <span>{t.rights} <Link href="/legal/voice-cloning-policy" className="link" target="_blank">{t.policy}</Link></span>
              </label>
              {fields.attest ? <p id={`${id}-attest-err`} className="m-error">{fields.attest}</p> : null}
            </div>
            {error ? <FormMessage>{error}</FormMessage> : null}
            <button type="button" className="m-btn primary justify-self-start" disabled={!rights || !!busy || !canWrite} aria-busy={!!busy} onClick={confirm}>{busy || t.attestSubmit}</button>
            <p className="sr-only" role="status" aria-live="polite">{busy}</p>
          </div>
        ) : null}

        {step === 'consent' && !attest ? (
          <div className="grid gap-5">
            <div>
              <h2 id={`${id}-h`} ref={headingRef} tabIndex={-1} className="text-[20px] font-semibold outline-none">{t.consentTitle}</h2>
              <p className="mt-1 text-[14px] text-[var(--text-muted)]">{t.consentBody}</p>
            </div>
            {phrase ? (
              <figure className="grid gap-2 rounded-[var(--radius-lg)] border border-[var(--primary)] bg-[var(--surface-2)] p-5">
                <figcaption className="text-[13px] font-semibold text-[var(--text-subtle)]">{t.phraseLabel}</figcaption>
                <blockquote className="text-[20px] leading-8 font-semibold" lang="en">“{phrase.phrase}”</blockquote>
                <p className="text-[13px] text-[var(--text-muted)]">
                  {expired ? t.expired : fmt(t.expires, { time: new Date(phrase.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })}{' '}
                  {phrase.attemptsLeft === 1 ? t.attemptLeft : fmt(t.attemptsLeft, { count: phrase.attemptsLeft })}
                </p>
                <button type="button" className="m-btn ghost sm justify-self-start" onClick={() => newPhrase()}><RefreshCw aria-hidden="true" />{t.newPhrase}</button>
              </figure>
            ) : null}
            {error ? <FormMessage>{error}</FormMessage> : null}
            {phrase && !expired ? (
              <>
                <Recorder label={t.recordConsent} maxSeconds={60} onRecorded={(b) => setRecorded(b, t.yourRecording)} disabled={!!busy} />
                <div>
                  <label htmlFor={`${id}-cfile`} className="m-btn ghost sm cursor-pointer">{t.uploadConsent}</label>
                  <input id={`${id}-cfile`} type="file" className="sr-only" accept={UPLOAD_LIMITS.consent.extensions.map((x) => `.${x}`).join(',')}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) setRecorded(f, f.name); e.target.value = '' }} />
                </div>
                {recording ? (
                  <div className="grid gap-2">
                    <p className="text-[14px] font-semibold">{recording.name}</p>
                    <audio controls src={recording.url} className="w-full" />
                  </div>
                ) : null}
                <button type="button" className="m-btn primary justify-self-start" disabled={!recording || !!busy || !canWrite} aria-busy={!!busy} onClick={verify}>{busy || t.submit}</button>
              </>
            ) : null}
            <p className="sr-only" role="status" aria-live="polite">{busy}</p>
          </div>
        ) : null}

        {step === 'done' && voice ? (
          <div className="grid gap-4">
            <h2 id={`${id}-h`} ref={headingRef} tabIndex={-1} className="flex items-center gap-2 text-[20px] font-semibold outline-none">
              <CheckCircle2 aria-hidden="true" className="text-[var(--success)]" />
              {training ? fmt(t.trainingTitle, { name: voice.name }) : fmt(t.readyTitle, { name: voice.name })}
            </h2>
            <p className="text-[var(--text-muted)]">{training ? (attest ? t.trainingBodyAttest : t.trainingBody) : (attest ? t.readyBodyAttest : t.readyBody)}</p>
            {training ? (
              training.failed ? <FormMessage>{t.trainingFailed}</FormMessage>
                : <progress className="h-2 w-full" max={100} value={training.percent} aria-label={fmt(t.trainingProgress, { percent: training.percent })} />
            ) : null}
            <div className="flex flex-wrap gap-2">
              {!training ? <Link href={`/app/speech?voice=${encodeURIComponent(voice.id)}`} className="m-btn primary">{t.useInSpeech}</Link> : null}
              <Link href={`/app/voices/${encodeURIComponent(voice.id)}`} className="m-btn secondary">{t.openVoice}</Link>
              <Link href="/app/voices/clone" className="m-btn ghost" onClick={() => { setStep('type'); setSamples([]); setName(''); setVoice(null); setPhrase(null); setTraining(null) }}>{t.cloneAnother}</Link>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}
