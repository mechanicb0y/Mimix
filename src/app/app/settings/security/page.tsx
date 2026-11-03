import type { Metadata } from 'next'
import { and, eq } from 'drizzle-orm'
import { SecuritySettings } from '@/components/app/settings/SecuritySettings'
import { getAppContext } from '@/server/app-context'
import { getDb, schema } from '@/server/db'
import { getMessages } from '@/i18n'

export const metadata: Metadata = { title: getMessages().app.settings.nav.security }

export default async function SecurityPage() {
  const ctx = await getAppContext('/app/settings/security')
  const db = getDb()
  const [[cred], [u]] = await Promise.all([
    db.select({ id: schema.account.id }).from(schema.account).where(and(eq(schema.account.userId, ctx.user.id), eq(schema.account.providerId, 'credential'))),
    db.select({ tf: schema.user.twoFactorEnabled }).from(schema.user).where(eq(schema.user.id, ctx.user.id)),
  ])
  return <SecuritySettings hasPassword={!!cred} twoFactorEnabled={!!u?.tf} />
}
