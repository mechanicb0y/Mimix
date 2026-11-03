'use client'
/** Shared Voice Mixer controls: the two-voice slider maths, the three-voice triangle pad and the fine-tune sliders. */
import { Slider } from 'radix-ui'
import { useId, useRef } from 'react'

export interface PadLabels { padLabel: string; padHelp: string; padValue: string }
export type Point = { x: number; y: number }

export const fill = (t: string, v: Record<string, string | number>) => t.replace(/\{(\w+)\}/g, (m, k: string) => (k in v ? String(v[k]) : m))
// Triangle corners in pad units (0..1): voice 1 top, voice 2 bottom left, voice 3 bottom right.
const CORNERS: [Point, Point, Point] = [{ x: 0.5, y: 0.04 }, { x: 0.04, y: 0.96 }, { x: 0.96, y: 0.96 }]

export function barycentric(p: Point): [number, number, number] {
  const [a, b, c] = CORNERS
  const det = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y)
  let w1 = ((b.y - c.y) * (p.x - c.x) + (c.x - b.x) * (p.y - c.y)) / det
  let w2 = ((c.y - a.y) * (p.x - c.x) + (a.x - c.x) * (p.y - c.y)) / det
  let w3 = 1 - w1 - w2
  w1 = Math.max(0, w1); w2 = Math.max(0, w2); w3 = Math.max(0, w3)
  const s = w1 + w2 + w3 || 1
  return [w1 / s, w2 / s, w3 / s]
}
export const fromWeights = (w: [number, number, number]): Point => ({
  x: CORNERS[0].x * w[0] + CORNERS[1].x * w[1] + CORNERS[2].x * w[2],
  y: CORNERS[0].y * w[0] + CORNERS[1].y * w[1] + CORNERS[2].y * w[2],
})
/** Rounds weights to whole percentages that always add up to 100. */
export function percentages(w: number[]): number[] {
  const raw = w.map((x) => x * 100)
  const floor = raw.map(Math.floor)
  let rest = 100 - floor.reduce((t, x) => t + x, 0)
  const order = raw.map((x, i) => [x - Math.floor(x), i] as const).sort((p, q) => q[0] - p[0])
  for (const [, i] of order) { if (rest <= 0) break; floor[i] = (floor[i] as number) + 1; rest-- }
  return floor
}

export function TrianglePad({ point, onChange, names, labels }: { point: Point; onChange: (p: Point) => void; names: string[]; labels: PadLabels }) {
  const ref = useRef<HTMLDivElement>(null)
  const helpId = useId()
  const w = barycentric(point)
  const pct = percentages(w)
  const set = (p: Point) => onChange(fromWeights(barycentric(p)))
  const fromPointer = (e: React.PointerEvent) => {
    const r = ref.current?.getBoundingClientRect()
    if (r) set({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height })
  }
  const onKey = (e: React.KeyboardEvent) => {
    const d = e.shiftKey ? 0.1 : 0.03
    const moves: Record<string, Point> = { ArrowUp: { x: 0, y: -d }, ArrowDown: { x: 0, y: d }, ArrowLeft: { x: -d, y: 0 }, ArrowRight: { x: d, y: 0 } }
    const mv = moves[e.key]
    if (mv) { e.preventDefault(); set({ x: point.x + mv.x, y: point.y + mv.y }) }
    if (e.key === 'Home') { e.preventDefault(); set({ x: 0.5, y: 0.65 }) }
  }
  return (
    <div>
      <div ref={ref} className="tri-pad" onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); fromPointer(e) }} onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) fromPointer(e) }}>
        <svg viewBox="0 0 100 90" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="tri-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style={{ stopColor: 'var(--mark-a)' }} /><stop offset="1" style={{ stopColor: 'var(--mark-b)' }} /></linearGradient>
          </defs>
          <polygon points="50,3.6 4,86.4 96,86.4" fill="var(--surface-2)" stroke="url(#tri-g)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
          <line x1="50" y1="3.6" x2={point.x * 100} y2={point.y * 90} stroke="var(--border-strong)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <line x1="4" y1="86.4" x2={point.x * 100} y2={point.y * 90} stroke="var(--border-strong)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <line x1="96" y1="86.4" x2={point.x * 100} y2={point.y * 90} stroke="var(--border-strong)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        </svg>
        <div
          role="slider" tabIndex={0} className="tri-thumb" aria-label={labels.padLabel} aria-describedby={helpId}
          aria-roledescription="2D slider" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct[0]}
          aria-valuetext={fill(labels.padValue, { a: names[0] ?? '', pa: pct[0] ?? 0, b: names[1] ?? '', pb: pct[1] ?? 0, c: names[2] ?? '', pc: pct[2] ?? 0 })}
          onKeyDown={onKey} style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
        />
        <span className="absolute top-[-4px] left-1/2 -translate-x-1/2 -translate-y-full text-sm font-semibold">{names[0]}</span>
        <span className="absolute bottom-[-28px] left-0 text-sm font-semibold">{names[1]}</span>
        <span className="absolute right-0 bottom-[-28px] text-sm font-semibold">{names[2]}</span>
      </div>
      <p id={helpId} className="m-hint mt-10 text-center">{labels.padHelp}</p>
    </div>
  )
}

export function AdjustSlider({ label, low, high, value, onChange }: { label: string; low: string; high: string; value: number; onChange: (v: number) => void }) {
  const id = useId()
  return (
    <div>
      <div className="flex items-baseline justify-between"><span id={id} className="text-sm font-semibold">{label}</span><span className="font-mono text-xs text-text-subtle">{value > 0 ? '+' : ''}{Math.round(value * 100)}</span></div>
      <Slider.Root className="m-slider" min={-1} max={1} step={0.05} value={[value]} onValueChange={(v) => onChange(v[0] ?? 0)} aria-labelledby={id}>
        <Slider.Track className="m-slider-track"><Slider.Range className="m-slider-range" /></Slider.Track>
        <Slider.Thumb className="m-slider-thumb" aria-labelledby={id} aria-valuetext={`${value > 0 ? high : value < 0 ? low : ''} ${Math.round(Math.abs(value) * 100)}`.trim()} />
      </Slider.Root>
      <div className="flex justify-between text-xs text-text-subtle"><span>{low}</span><span>{high}</span></div>
    </div>
  )
}

