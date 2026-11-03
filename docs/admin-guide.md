# Mimix admin guide

For staff who run Mimix day to day in the console at `/admin`. Every action described here is checked on the server, needs the right role, and is written to the audit log with who did it, when, and why.

## Getting in

1. Sign in at `/sign-in` with your staff account.
2. Two-factor sign-in must be on (Settings, Security). Without it the console sends you to set it up.
3. Open `/admin`. After 15 minutes without activity the console locks and asks for your password again. Destructive actions (suspend, ban, role change, two-factor reset, plan edits, voice takedown, key revocation, coupon and blocklist removal, maintenance mode) ask for your password and a two-factor code if you last confirmed more than 5 minutes ago.
4. If `ADMIN_IP_ALLOWLIST` is set, the console only opens from those addresses.

The first Owner is created once with `ADMIN_SETUP_TOKEN` at `/admin/setup` (see the launch checklist, step 7).

## Roles

| Role | Can do |
|---|---|
| Owner | Everything, including giving and removing staff roles |
| Admin | Runs the platform: users, plans, credits, bans, voices, flags, developers, system, audit. Can't change roles |
| Moderator | Trust and safety: reported voices and generations, library requests, suspensions |
| Support | Helps customers: looks up users, adjusts credits, resets two-factor for customers, views as user (read-only) |

Staff act only on accounts with a **lower** role. A Support user can't touch a Moderator, Admin or Owner, and a Moderator can't suspend an Admin. Resetting two-factor on **any** staff account needs an Owner. Nobody can act on their own account from the console.

## Common tasks

### Adjust a customer's credits
Users, search by email, open the user, **Adjust credits**. Enter a positive number to add, a negative number to remove, and a note saying why (the customer doesn't see the note; the audit log keeps it). The change shows at once in the customer's balance and in **Credit adjustments** on the user page.

### Change a plan without Stripe
**Change plan** on the user page sets the plan (for a comp or a correction) and grants that plan's monthly credits now. If the workspace pays through Stripe, change it in Stripe instead, or the next Stripe webhook puts it back.

### Lost phone (two-factor reset)
Confirm the person's identity first (for example a reply from their account email and a detail only they know). Then **Reset two-factor**. They are signed out everywhere and can sign in with their password, then set up two-factor again. For staff accounts, ask an Owner.

### Suspend, ban, restore
- **Suspend** for a pause while you look into something: signs the account out everywhere and stops its API keys.
- **Ban** for serious or repeated abuse. Same effect, recorded as a ban.
- **Restore** undoes either.

### Look at what a customer sees
**View as user (read-only)** opens their app pages without acting as them. The visit is in the audit log.

### Reported voices
Voices, **Reported**. Each row shows the reasons and the latest report. Open a voice to listen to its preview, check its consent record (phrase, recording and verification result) and where it came from (**Built from**, and any mixes made from it). You can take a voice down; mixes built from it are listed so you can review them too. **Public-figure blocklist** holds names that can't be cloned or designed.

### Library requests
Voices, **Library requests**: customers asking to publish a voice to the shared library. Approve only voices with a valid consent record and a clear licence.

### Switch a tool off, or roll one out
**Flags and banner**: turn a tool off for everyone, limit it to some plans, or give it to named users. **Site banner** shows a message at the top of the website and the app (for example planned maintenance). Tools the voice engine can't run stay hidden whatever the flag says.

### Plans and coupons
**Plans** shows each plan's prices and limits, and whether it was edited from the defaults in `src/config/plans.ts`. Price changes must also be made in Stripe (`npm run stripe:setup` creates prices from the config). **Coupons** creates and deactivates Stripe promotion codes.

### API keys and webhooks
**Developers** lists every workspace's keys (prefix only, never the full key) and recent webhook deliveries. **Revoke** stops a key at once, for example after a leak.

### System
**System** shows which voice engine is live and what it can do, a health check, the failure rate over 24 hours, whether the consent speaker check is production-ready, and storage use. If the failure rate climbs, see the runbook.

### Audit log
**Audit** lists every staff action (credits, plans, roles, two-factor resets, view-as visits, takedowns, flags, coupons) and sensitive customer actions (password resets, API keys and webhooks, team changes, cloning, voice deletion, mixes, account deletion and export). Filter by person, action or date. Entries can't be edited or deleted from the console.
