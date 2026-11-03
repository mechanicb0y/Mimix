import { Logo } from '@/components/site/Logo'
import { ThemeToggle } from '@/components/site/ThemeToggle'
import { getMessages } from '@/i18n'

export default function AuthLayout({ children }: LayoutProps<'/'>) {
  const c = getMessages().common
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="container-content flex h-16 items-center justify-between">
        <Logo id="mark-auth" />
        <ThemeToggle toLight={c.a11y.themeToLight} toDark={c.a11y.themeToDark} />
      </header>
      <main id="main" className="container-content flex flex-1 items-start justify-center pb-16 pt-6 sm:items-center sm:pt-0">
        <div className="m-card w-full max-w-[440px] p-6 sm:p-8">{children}</div>
      </main>
    </div>
  )
}
