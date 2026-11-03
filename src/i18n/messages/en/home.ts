export const home = {
  seo: {
    title: 'Mimix: AI voices you can mix, mimic and make yours',
    description: 'Text to speech, consent-verified voice cloning and the Voice Mixer, which blends two or three voices into a new one. Start free with 10,000 credits.',
  },
  hero: {
    overline: 'AI voice platform',
    title: 'Two voices in. One voice out.',
    lead: 'Write it, pick a voice and hear it in seconds. Then blend voices in the Voice Mixer to make one nobody else has.',
    secondaryCta: 'Explore the Voice Mixer',
  },
  /** Used while the Voice Mixer is off (engine can't blend voices yet). */
  heroNoMixer: {
    title: 'Your words. Any voice. In seconds.',
    lead: 'Write it, pick a voice and hear natural speech in seconds, for videos, audiobooks, podcasts and apps.',
  },
  seoNoMixer: {
    title: 'Mimix: natural AI voices for every story',
    description: 'Text to speech, Studio for audiobooks and podcasts, and a library of natural voices. Start free with 10,000 credits a month.',
  },
  demo: {
    title: 'Try it now',
    textLabel: 'Text to speak',
    defaultText: 'Hi, I’m a Mimix voice. Give me a script and I’ll read it any way you like.',
    voiceLabel: 'Voice',
    generate: 'Play',
    generating: 'Making audio…',
    stop: 'Stop',
    charCount: '{count} of {max} characters',
    overLimit: 'Keep it under {max} characters for the demo. Sign up free to read longer scripts.',
    empty: 'Type something for the voice to read.',
    error: 'We couldn’t make that clip. Try again in a moment.',
    rateLimited: 'You’ve played a lot of demos. Wait a minute, or sign up free to keep going.',
    ready: 'Audio ready. Playing now.',
    voiceTraits: '{accent} · {age}',
  },
  products: {
    overline: 'One platform',
    title: 'Everything your voice work needs',
    lead: 'Create speech, shape new voices and fix audio in one place, on one credit balance.',
  },
  samples: {
    overline: 'Hear the range',
    title: 'Four voices, four moods',
    lead: 'Press play on any clip. Starting one pauses the others.',
    items: [
      { voice: 'wren', title: 'Wren · Calm narration', text: 'The river was quiet that morning, and the fog sat low over the water.' },
      { voice: 'atlas', title: 'Atlas · Upbeat ad read', text: 'This weekend only, every plan comes with double credits. Don’t miss it!' },
      { voice: 'koa', title: 'Koa · Game character', text: 'You want the key? Then you’ll have to catch me first!' },
      { voice: 'sable', title: 'Sable · Friendly lesson', text: 'Let’s break this down into three easy steps, starting with the first one.' },
    ],
  },
  mixer: {
    overline: 'Signature feature',
    title: 'Meet the Voice Mixer',
    lead: 'Pick two voices, slide between them and hear the blend change live. Add a third voice and steer the mix on a triangle pad.',
    points: [
      'Blend two or three voices you own or that are licensed for remixing',
      'Fine-tune pitch, pace and warmth after the blend',
      'Every mix remembers its sources and their weights',
    ],
    teaser: {
      label: 'Blend',
      left: 'Wren',
      right: 'Atlas',
      valueText: '{left} {leftPct}%, {right} {rightPct}%',
      preview: 'Preview this blend',
      caption: 'Drag the slider, then preview. This demo uses two library voices.',
    },
  },
  trust: {
    overline: 'Consent built in',
    title: 'Real voices, with the speaker’s yes',
    items: [
      { title: 'Every clone is verified', body: 'The speaker reads a random phrase out loud, and we match it to the samples before the voice switches on. Instant and professional clones alike.' },
      { title: 'Mixes keep their family tree', body: 'Each mixed voice records its sources. If a source is taken down, every mix built from it stops working too.' },
      { title: 'Audio carries its origin', body: 'Generated audio includes provenance data where the engine supports it, and anyone can check a clip with our public checker.' },
    ],
    cta: 'Read the voice cloning policy',
  },
  useCases: {
    overline: 'Built for',
    title: 'Made for people who make things',
  },
  developers: {
    overline: 'For developers',
    title: 'One API for every voice',
    lead: 'Stream speech in real time, blend voices and transcribe audio with scoped keys, clear errors and webhooks.',
    points: ['Streaming text to speech', 'Scoped API keys and usage stats', 'OpenAPI spec with cURL, JavaScript and Python samples'],
  },
  faq: [
    { q: 'Is Mimix free to try?', a: 'Yes. The Free plan gives you 10,000 credits every month, which is about 10 minutes of speech, with no card needed. Free audio is for personal projects; paid plans add a commercial licence.' },
    { q: 'What makes the Voice Mixer different?', a: 'Instead of tweaking one voice, you blend two or three. You choose how much of each to use, fine-tune pitch, pace and warmth, and save the result as a new voice with its sources on record.' },
    { q: 'Can I clone someone else’s voice?', a: 'Only with their consent. Every clone needs the speaker to read a random phrase that we match against the samples. Voices of public figures are blocked.' },
    { q: 'How are credits counted?', a: 'Speech costs one credit per character. Other tools have their own rate, such as 200 credits per minute of transcription. You always see the cost before you generate.' },
    { q: 'Can I use Mimix audio commercially?', a: 'Yes, on any paid plan. That covers ads, videos, games, courses and podcasts, within our Acceptable Use Policy.' },
  ],
  cta: {
    title: 'Your next voice is a mix away',
    body: 'Start free, make your first clip in under a minute, and upgrade only when you need more.',
  },
}
