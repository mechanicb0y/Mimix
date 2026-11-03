import { DEVELOPER_ITEMS, PRODUCT_GROUPS, RESOURCE_ITEMS, productHref, productIcon, iconForUseCase } from '@/config/nav'
import { USE_CASE_SLUGS } from '@/config/products'
import { APP_ROUTES } from '@/config/site'
import { getMessages } from '@/i18n'
import { productAvailability } from '@/server/site-features'
import type { NavModel } from './types'

export function buildNavModel(): NavModel {
  const m = getMessages().common
  const on = productAvailability()
  return {
    labels: {
      mainNav: m.a11y.mainNav, products: m.nav.products, solutions: m.nav.solutions, developers: m.nav.developers,
      pricing: m.nav.pricing, resources: m.nav.resources, login: m.nav.login, startFree: m.nav.startFree,
      openMenu: m.a11y.openMenu, closeMenu: m.a11y.closeMenu, menuTitle: m.a11y.mobileMenuTitle, toLight: m.a11y.themeToLight, toDark: m.a11y.themeToDark,
    },
    productGroups: PRODUCT_GROUPS.map((g) => ({
      title: m.nav.groups[g.key],
      items: g.items.map((key) => ({ href: productHref(key), title: m.products[key].name, body: m.products[key].short, icon: productIcon(key), ...(on[key] ? {} : { soon: m.soon.badge }) })),
    })),
    featured: on['voice-mixer'] ? { ...m.nav.featured, href: '/voice-mixer' } : { ...m.nav.featuredNoMixer, href: '/products/studio' },
    useCases: { title: m.nav.groups.useCases, items: USE_CASE_SLUGS.map((s) => ({ href: `/use-cases/${s}`, title: m.useCases[s].name, body: m.useCases[s].short, icon: iconForUseCase(s) })) },
    resources: { title: m.nav.groups.learn, items: RESOURCE_ITEMS.map((r) => ({ href: r.href, title: m.nav.resourceItems[r.key].title, body: m.nav.resourceItems[r.key].body, icon: r.icon })) },
    developers: { title: m.nav.groups.developers, items: DEVELOPER_ITEMS.map((d) => ({ href: d.href, title: m.nav.developerItems[d.key].title, body: m.nav.developerItems[d.key].body, icon: d.icon })) },
    signupHref: APP_ROUTES.signup,
    loginHref: APP_ROUTES.login,
  }
}
