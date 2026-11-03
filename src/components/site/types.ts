import type { IconName } from '@/config/products'

/** Resolved navigation (strings already translated) passed from server to client components. */
export interface NavLinkModel { href: string; title: string; body: string; icon: IconName; /** "Coming soon" label when the tool is off. */ soon?: string }
export interface NavModel {
  labels: {
    mainNav: string; products: string; solutions: string; developers: string; pricing: string; resources: string
    login: string; startFree: string; openMenu: string; closeMenu: string; menuTitle: string; toLight: string; toDark: string
  }
  productGroups: Array<{ title: string; items: NavLinkModel[] }>
  featured: { overline: string; title: string; body: string; cta: string; href: string }
  useCases: { title: string; items: NavLinkModel[] }
  resources: { title: string; items: NavLinkModel[] }
  developers: { title: string; items: NavLinkModel[] }
  signupHref: string
  loginHref: string
}
