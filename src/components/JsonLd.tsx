import { jsonLdString } from '@/lib/seo'

export function JsonLd({ nodes }: { nodes: Array<Record<string, unknown>> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(nodes) }} />
}
