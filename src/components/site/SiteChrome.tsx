import { RevealController } from '@/components/Reveal'
import { Footer } from './Footer'
import { Header } from './Header'
import { Logo } from './Logo'
import { SiteStatus } from './SiteStatus'
import { buildNavModel } from './nav-model'
import { getMessages } from '@/i18n'

/** Header, main landmark and footer shared by every marketing page, the 404 and the error page. */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header model={buildNavModel()} logo={<Logo />} />
      <SiteStatus labels={{ learnMore: getMessages().app.shell.learnMore, maintenance: getMessages().errors.app.maintenance }} />
      <main id="main" tabIndex={-1} className="outline-none">{children}</main>
      <Footer />
      <RevealController />
    </>
  )
}
