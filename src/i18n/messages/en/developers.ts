export const developers = {
  seo: {
    title: 'Developers: text to speech and voice API | Mimix',
    description: 'Stream speech, mix voices and transcribe audio with one REST API. Scoped keys, webhooks, an OpenAPI spec and samples in cURL, JavaScript and Python.',
  },
  hero: {
    overline: 'Developers',
    title: 'Give your product a voice',
    lead: 'One REST API for speech, voices and audio. Stream audio as it’s made, track usage per key and get webhooks when long jobs finish.',
    primary: 'Get an API key',
    secondary: 'Jump to the quickstart',
  },
  quickstart: {
    overline: 'Quickstart',
    title: 'Your first audio in three steps',
    steps: [
      { title: 'Create a key', body: 'In Developers → API keys, create a key with the tts scope. Keep it on your server, never in the browser.' },
      { title: 'Send text', body: 'POST your text and a voice ID to the text-to-speech endpoint.' },
      { title: 'Play the audio', body: 'The response is audio. Save it, or stream it straight to your player.' },
    ],
    tabsLabel: 'Code language',
    copy: 'Copy code',
    copied: 'Copied',
    copyFailed: 'Copy failed. Select the code and copy it manually.',
  },
  streaming: {
    overline: 'Streaming',
    title: 'Audio that starts before the text ends',
    body: 'The streaming endpoint sends audio in chunks as it’s generated, so voice assistants and games can start speaking almost at once.',
  },
  features: {
    title: 'Built for production',
    items: [
      { title: 'Scoped keys', body: 'Give each key only the scopes it needs, like speech or transcription, and revoke it in one click.' },
      { title: 'Usage per key', body: 'See requests, characters and minutes per key, per day.' },
      { title: 'Webhooks', body: 'Get signed callbacks when dubbing, Studio exports and other long jobs finish.' },
      { title: 'OpenAPI spec', body: 'Generate clients in your language from a spec that matches the live API.' },
      { title: 'Clear errors', body: 'Every error has a code, a message you can show users and a link to the fix.' },
      { title: 'Same credits', body: 'API calls draw from your plan’s credits, so there’s one balance to watch.' },
    ],
  },
  endpoints: {
    title: 'Endpoints at a glance',
    caption: 'Main API endpoints',
    columns: { method: 'Method', path: 'Path', purpose: 'What it does' },
    rows: [
      { method: 'POST', path: '/v1/speech', purpose: 'Text to speech, returns audio' },
      { method: 'POST', path: '/v1/speech/stream', purpose: 'Text to speech, streamed in chunks' },
      { method: 'POST', path: '/v1/voices/mix', purpose: 'Blend two or three voices' },
      { method: 'POST', path: '/v1/voices/design', purpose: 'Create voices from a description' },
      { method: 'POST', path: '/v1/transcriptions', purpose: 'Speech to text with speakers' },
      { method: 'GET', path: '/v1/voices', purpose: 'List voices you can use' },
    ],
  },
  status: 'The API opens with the app launch. Join the newsletter to hear first.',
  cta: { title: 'Build with Mimix', body: 'Free accounts include API access with the monthly credits.' },
}
