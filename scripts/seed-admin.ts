/**
 * Creates the super-admin (platform Owner) for ADMIN_EMAIL on first deploy: `npm run admin:seed`.
 * Safe to run again. It sets no password: the Owner chooses one at <APP_URL>/admin/setup with
 * ADMIN_SETUP_TOKEN, then must turn on two-factor sign-in before the admin console opens.
 */
import { env } from '@/server/env'
import { seedSuperAdmin } from '@/server/admin/setup'

const r = await seedSuperAdmin()
console.log(r.status === 'created' ? `Created the Owner account for ${env().ADMIN_EMAIL}.` : `The Owner account for ${env().ADMIN_EMAIL} already exists; role confirmed.`)
console.log(`Next: open ${env().APP_URL}/admin/setup and enter the setup token to choose a password.`)
process.exit(0)
