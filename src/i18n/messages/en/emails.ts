/** Transactional email copy. {placeholders} are filled by the sender. */
export const emails = {
  footer: 'You’re getting this email because of your Mimix account. If this wasn’t you, you can ignore it.',
  verify: {
    subject: 'Confirm your email for Mimix',
    body: 'Hi {name},\n\nConfirm your email to start making voices:\n{url}\n\nThis link works once and expires in 24 hours.',
  },
  reset: {
    subject: 'Reset your Mimix password',
    body: 'Hi {name},\n\nUse this link to choose a new password:\n{url}\n\nIt works once and expires in 30 minutes. If you didn’t ask for this, your password is unchanged.',
  },
  passwordChanged: {
    subject: 'Your Mimix password was changed',
    body: 'Hi {name},\n\nYour password was just changed and every other session was signed out. If this wasn’t you, reset your password now: {url}',
  },
  locked: {
    subject: 'We paused sign-ins to your Mimix account',
    body: 'Hi {name},\n\nThere were {count} failed sign-in attempts, so we paused sign-ins for {minutes} minutes. If this wasn’t you, reset your password: {url}',
  },
  changeEmail: {
    subject: 'Approve the new email for your Mimix account',
    body: 'Hi {name},\n\nSomeone asked to change your Mimix sign-in email to {newEmail}. If that was you, approve it here:\n{url}\n\nWe’ll then send a link to {newEmail} to confirm it. If it wasn’t you, ignore this email and change your password.',
  },
  adminSignIn: {
    subject: 'New sign-in to your Mimix admin account',
    body: 'Hi {name},\n\nYour account ({role}) just signed in to Mimix.\n\nTime: {time}\nIP address: {ip}\nBrowser: {agent}\n\nIf this wasn’t you, reset your password now ({url}) and tell another Owner.',
  },
  adminTest: {
    subject: 'Test email from the Mimix admin console',
    body: 'Hi {name},\n\nThis is a test of the “{template}” email, sent from the admin console. Here is how it reads with sample values:\n\n---\n{preview}\n---',
  },
  reportReceived: {
    subject: 'We received your report',
    body: 'Thanks for telling us. Our trust and safety team reviews every report, and we may switch a voice off while we look into it.\n\nYour reference: {reference}\n\nWe don’t tell the voice owner who reported it.',
  },
  reportAlert: {
    subject: 'New report {reference}: {reason}',
    body: 'A new report needs review.\n\nReference: {reference}\nReason: {reason}\nTarget: {target}',
  },
  invite: {
    subject: '{inviter} invited you to {workspace} on Mimix',
    body: '{inviter} invited you to join {workspace} as {role}.\n\nAccept the invite:\n{url}\n\nThe link expires in 7 days.',
  },
  jobDone: {
    subject: 'Your {module} is ready',
    body: 'Hi {name},\n\n“{title}” finished. Open it here: {url}',
  },
  jobFailed: {
    subject: 'Your {module} didn’t finish',
    body: 'Hi {name},\n\n“{title}” failed: {reason}\nNo credits were charged. Try again here: {url}',
  },
  lowCredits: {
    subject: 'You have {percent}% of your credits left',
    body: 'Hi {name},\n\n{workspace} has {credits} credits left this month. Top up or upgrade to keep going: {url}',
  },
  paymentFailed: {
    subject: 'Your Mimix payment didn’t go through',
    body: 'Hi {name},\n\nWe couldn’t charge your card for {workspace}. We’ll retry automatically. Update your payment method to avoid interruption: {url}',
  },
  exportReady: {
    subject: 'Your Mimix data export is ready',
    body: 'Hi {name},\n\nYour export is ready to download for 7 days:\n{url}',
  },
  deletionScheduled: {
    subject: 'Your Mimix account will be deleted',
    body: 'Hi {name},\n\nYour account and its data will be permanently deleted on {date}. Changed your mind? Sign in before then and cancel: {url}',
  },
}
