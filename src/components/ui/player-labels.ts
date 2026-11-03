import { getMessages } from '@/i18n'
import type { PlayerLabels } from './AudioPlayer'

export function playerLabels(): PlayerLabels {
  const m = getMessages().common
  return { ...m.player, loading: m.a11y.loading }
}
