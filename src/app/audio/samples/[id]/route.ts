import { renderSample, SAMPLE_IDS } from '@/lib/voice/samples'

export const dynamicParams = false

export function generateStaticParams() {
  return SAMPLE_IDS.map((id) => ({ id }))
}

export async function GET(_req: Request, { params }: RouteContext<'/audio/samples/[id]'>) {
  const { id } = await params
  const sample = renderSample(id)
  if (!sample) return new Response('Not found', { status: 404 })
  return new Response(sample.wav as BodyInit, {
    headers: {
      'Content-Type': 'audio/wav',
      'Content-Length': String(sample.wav.byteLength),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
