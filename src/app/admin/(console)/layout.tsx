import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { AdminShell } from '@/components/admin/AdminShell'
import { checkAdmin } from '@/server/admin/guard'
import { ADMIN_NAV, adminCan } from '@/config/admin'

/** Every console page: staff only, 2FA on, not idle. Each page then checks its own section permission. */
export default async function ConsoleLayout({ children }: LayoutProps<'/admin'>) {
  const r = await checkAdmin(await headers(), { touch: false })
  if (!r.ok) {
    if (r.reason === 'signed_out') redirect('/sign-in?next=/admin')
    if (r.reason === 'two_factor') redirect('/admin/two-factor')
    if (r.reason === 'locked') redirect('/admin/unlock?next=/admin')
    notFound()
  }
  const allowed = ADMIN_NAV.filter((i) => adminCan(r.actor.role, i.permission)).map((i) => i.key)
  return <AdminShell allowed={allowed} user={{ email: r.actor.email, role: r.actor.role }} twoFactor>{children}</AdminShell>
}
