import type { IconName, ProductSlug, UseCaseSlug } from './products'
import { USE_CASES, PRODUCTS } from './products'

export type ProductKey = ProductSlug | 'voice-mixer' | 'voice-library'

export function productHref(key: ProductKey): string {
  if (key === 'voice-mixer') return '/voice-mixer'
  if (key === 'voice-library') return '/voice-library'
  return `/products/${key}`
}

export function productIcon(key: ProductKey): IconName {
  if (key === 'voice-mixer') return 'Blend'
  if (key === 'voice-library') return 'Library'
  return PRODUCTS[key].icon
}

export function iconForUseCase(key: UseCaseSlug): IconName {
  return USE_CASES[key].icon
}

/** Product menu: four groups at most, six items each (Phase 0, opportunity 8). */
export const PRODUCT_GROUPS: Array<{ key: 'create' | 'voices' | 'editAudio'; items: ProductKey[] }> = [
  { key: 'create', items: ['text-to-speech', 'voice-mixer', 'sound-effects', 'studio'] },
  { key: 'voices', items: ['voice-library', 'voice-cloning', 'voice-design', 'voice-changer'] },
  { key: 'editAudio', items: ['dubbing', 'speech-to-text', 'voice-isolator'] },
]

export const RESOURCE_ITEMS: Array<{ key: 'blog' | 'help' | 'about' | 'contactSales' | 'safety'; href: string; icon: IconName }> = [
  { key: 'blog', href: '/blog', icon: 'Newspaper' },
  { key: 'help', href: '/help', icon: 'LifeBuoy' },
  { key: 'about', href: '/about', icon: 'Info' },
  { key: 'contactSales', href: '/contact-sales', icon: 'Mail' },
  { key: 'safety', href: '/legal/voice-cloning-policy', icon: 'Shield' },
]

export const DEVELOPER_ITEMS: Array<{ key: 'api' | 'quickstart' | 'streaming'; href: string; icon: IconName }> = [
  { key: 'api', href: '/developers', icon: 'Code' },
  { key: 'quickstart', href: '/developers#quickstart', icon: 'Zap' },
  { key: 'streaming', href: '/developers#streaming', icon: 'AudioLines' },
]
