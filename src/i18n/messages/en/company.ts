export const about = {
  seo: { title: 'About Mimix: voices you can mix, made with consent', description: 'Mimix is an AI voice platform built on one idea: every voice is a mix. Here’s what we believe, how we handle consent and what we’re building next.' },
  hero: { overline: 'About', title: 'Every voice is a mix', lead: 'You sound a little like the people who raised you, the places you lived and the voices you loved listening to. Mimix is built on that idea.' },
  story: {
    title: 'Why we started',
    paragraphs: [
      'Pick two or three voices, blend them, and hear something new that still carries where it came from. That’s the Voice Mixer, and it’s the heart of Mimix.',
      'Around it, we’re building everything a voice project needs: clone your own voice to read your scripts, design one from a few words, or dub a podcast into new languages with the same voices.',
      'Every voice in Mimix comes with the speaker’s consent and a record of how it was made, so creators, studios and teachers can use what they make with confidence.',
    ],
  },
  values: {
    title: 'What we believe',
    items: [
      { title: 'Consent first', body: 'No clone without the speaker’s live yes. No exceptions for big customers.' },
      { title: 'Show the cost', body: 'You see credits and minutes before you click, every time.' },
      { title: 'Accessible by default', body: 'Our own product is built to meet WCAG 2.2 AA, and our tools help others meet it too.' },
      { title: 'Plain words', body: 'If we can’t explain a feature simply, we haven’t finished building it.' },
    ],
  },
  safety: {
    title: 'How we keep voices safe',
    body: 'Spoken verification for every clone, a public-figure blocklist, lineage for every mix, provenance data on generated audio and a team that reviews reports.',
    cta: 'Read the voice cloning policy',
  },
  cta: { title: 'Come make something', body: 'Start free, or get in touch if you’d like to work with us.' },
}

export const contactSales = {
  seo: { title: 'Contact sales: volume pricing and enterprise | Mimix', description: 'Talk to the Mimix team about volume credits, SSO, security reviews, custom contracts and managed dubbing. We usually reply within one business day.' },
  hero: { overline: 'Contact sales', title: 'Let’s talk about your project', lead: 'Tell us what you’re building and we’ll usually reply within one business day with options and pricing.' },
  points: ['Volume credits and custom seats', 'SSO, audit exports and role controls', 'Data processing agreement and security reviews', 'Managed dubbing for large catalogues'],
  form: {
    title: 'Tell us about your needs',
    name: 'Full name',
    email: 'Work email',
    company: 'Company',
    size: 'Team size',
    sizeOptions: { '1-10': '1 to 10', '11-50': '11 to 50', '51-200': '51 to 200', '201-1000': '201 to 1,000', '1000+': 'More than 1,000' },
    sizePlaceholder: 'Choose a size',
    useCase: 'What will you use Mimix for?',
    useCasePlaceholder: 'For example: dubbing our training library into Spanish and Malay',
    volume: 'Estimated monthly audio (optional)',
    volumePlaceholder: 'For example: 40 hours',
    consent: 'I agree to Mimix contacting me about this request.',
    submit: 'Send message',
    submitting: 'Sending…',
    required: 'Required',
    optional: 'Optional',
    success: { title: 'Thanks, we’ve got it', body: 'Someone from our team will usually reply to {email} within one business day.' },
    errors: {
      name: 'Enter your name.',
      emailRequired: 'Enter your work email.',
      emailInvalid: 'Enter an email address like name@company.com.',
      company: 'Enter your company name.',
      size: 'Choose your team size.',
      useCase: 'Tell us a little about your project, at least 20 characters.',
      consent: 'Tick the box so we can reply to you.',
      server: 'We couldn’t send your message. Try again, or email {email}.',
      rateLimited: 'Too many messages in a short time. Wait a minute and try again.',
      summary: 'Please fix {count} fields before sending.',
      summaryOne: 'Please fix 1 field before sending.',
    },
  },
}

export const help = {
  seo: { title: 'Help center: plans, credits, voices and more | Mimix', description: 'Answers about plans and billing, credits, voice cloning and consent, the Voice Mixer, downloads and your account. Search or browse by topic.' },
  hero: { overline: 'Help center', title: 'How can we help?', lead: 'Search the most common questions, or browse by topic below.' },
  search: { label: 'Search help articles', placeholder: 'For example: how credits reset', results: '{count} answers', resultsOne: '1 answer', empty: 'No answers match “{query}”. Try fewer words, or contact us.' },
  topicsTitle: 'Browse by topic',
  topics: [
    { id: 'billing', title: 'Plans and billing', items: [
      { q: 'When do my credits reset?', a: 'On the same day each month as your billing date. Unused monthly credits don’t roll over; top-up credits stay until used.' },
      { q: 'How do I cancel?', a: 'Go to Settings → Plan and billing → Cancel plan. You keep your plan until the end of the period you paid for.' },
      { q: 'Can I get an invoice for my company?', a: 'Yes. Add your company name and tax ID in Settings → Billing, and every invoice will include them.' },
    ] },
    { id: 'voices', title: 'Voices and cloning', items: [
      { q: 'Why was my clone rejected?', a: 'Usually because the verification phrase didn’t match the samples, or the audio was too noisy. Record in a quiet room and try again.' },
      { q: 'How do I delete a voice?', a: 'Open the voice in My Voices and choose Delete. The voice and its samples are permanently removed, and mixes built from it stop working.' },
      { q: 'Can I publish my voice to the library?', a: 'Yes, once it’s verified. Our moderation team reviews it before it appears publicly.' },
    ] },
    { id: 'mixer', title: 'Voice Mixer', items: [
      { q: 'Why can’t I mix a voice?', a: 'The voice’s owner hasn’t allowed remixing, or it isn’t yours. Look for the “Can be mixed” badge in the library.' },
      { q: 'What licence does my mix have?', a: 'The strictest licence among its sources. The voice page shows it under Lineage.' },
    ] },
    { id: 'audio', title: 'Generating and downloading', items: [
      { q: 'Which formats can I download?', a: 'MP3 and WAV for speech and effects; SRT, VTT and TXT for transcripts; MP4 for dubbed video.' },
      { q: 'A generation failed. Did I lose credits?', a: 'No. Failed generations are refunded to your balance automatically.' },
    ] },
    { id: 'account', title: 'Account and security', items: [
      { q: 'How do I turn on two-factor authentication?', a: 'Go to Settings → Security → Two-factor authentication and scan the code with an authenticator app.' },
      { q: 'How do I export my data?', a: 'Settings → Privacy → Export data. We email you a download link when the export is ready.' },
    ] },
  ],
  contact: { title: 'Still stuck?', body: 'Email us and a real person will usually reply within one business day.', cta: 'Email support' },
}
