interface UseCaseCopy {
  seo: { title: string; description: string }
  hero: { overline: string; title: string; lead: string }
  problems: Array<{ title: string; body: string }>
  workflow: { title: string; steps: Array<{ title: string; body: string }> }
  sampleTitle: string
  sampleText: string
  cta: { title: string; body: string }
}

const useCasesCopy = {
  creators: {
    seo: { title: 'AI voiceovers for creators and video makers | Mimix', description: 'Voiceovers for videos, shorts and streams in minutes. Use your own cloned voice, mix a signature voice and add sound effects, all on one plan.' },
    hero: { overline: 'For creators', title: 'Voiceovers as fast as your ideas', lead: 'Script, voice and sound for videos, shorts and streams, without booking a booth or re-recording every flubbed line.' },
    problems: [
      { title: 'Re-recording eats your day', body: 'Fix one word by retyping it, not by setting up the mic again.' },
      { title: 'Your voice, even when you’re tired', body: 'Clone your own voice once and keep the same energy across every upload.' },
      { title: 'A sound that’s yours', body: 'Mix a signature channel voice that nobody else can use.' },
    ],
    workflow: {
      title: 'A typical video, start to finish',
      steps: [
        { title: 'Draft the script', body: 'Paste it into Text to Speech and pick your clone or mix.' },
        { title: 'Add atmosphere', body: 'Generate a whoosh, a crowd or rain for the right moments.' },
        { title: 'Export and edit', body: 'Download WAV and drop it on your timeline.' },
      ],
    },
    sampleTitle: 'A short intro read',
    sampleText: 'Hey everyone, welcome back. Today we’re testing three cameras under fifty dollars.',
    cta: { title: 'Make your next video sound great', body: 'Start free and voice your first short in minutes.' },
  },
  podcasts: {
    seo: { title: 'AI tools for podcasters: clean, fix and translate | Mimix', description: 'Clean noisy recordings, fix flubbed lines in your own voice, get searchable transcripts and publish episodes in more languages.' },
    hero: { overline: 'For podcasts', title: 'Record less, fix faster, reach further', lead: 'Clean up noisy rooms, patch a stumbled line in your own voice and turn episodes into transcripts and other languages.' },
    problems: [
      { title: 'Noisy guests', body: 'The Voice Isolator pulls speech out of cafés, cars and echoey rooms.' },
      { title: 'One wrong word', body: 'Type the correction and patch it in your verified clone.' },
      { title: 'Show notes take ages', body: 'Get a transcript with speakers and timestamps to write from.' },
    ],
    workflow: {
      title: 'From raw recording to published episode',
      steps: [
        { title: 'Clean', body: 'Run each track through the Voice Isolator.' },
        { title: 'Transcribe', body: 'Get speaker-labelled text and captions.' },
        { title: 'Translate', body: 'Dub the episode so new audiences hear the same hosts.' },
      ],
    },
    sampleTitle: 'An episode opening',
    sampleText: 'You’re listening to Small Rooms, the show about big ideas from tiny studios.',
    cta: { title: 'Make your next episode easier', body: 'Start free with 10,000 credits every month.' },
  },
  education: {
    seo: { title: 'AI voices for education and e-learning | Mimix', description: 'Narrate lessons, translate courses and make every reading accessible with clear AI voices, transcripts and captions. Built for teachers and teams.' },
    hero: { overline: 'For education', title: 'Lessons every learner can hear', lead: 'Turn slides, readings and courses into clear narration, with captions and translations for every student.' },
    problems: [
      { title: 'Not every student reads easily', body: 'Offer an audio version of every reading in a calm, clear voice.' },
      { title: 'Courses in one language', body: 'Dub lectures so international students hear the same teacher.' },
      { title: 'Accessibility deadlines', body: 'Transcripts and captions for every recorded lesson.' },
    ],
    workflow: {
      title: 'Turning a course into audio',
      steps: [
        { title: 'Import the text', body: 'Paste lesson notes into Studio, one chapter per module.' },
        { title: 'Pick a teacher voice', body: 'Use a library voice or clone your own with consent.' },
        { title: 'Publish', body: 'Export audio and captions to your learning platform.' },
      ],
    },
    sampleTitle: 'A lesson introduction',
    sampleText: 'In this lesson, we’ll learn why the sky looks blue, and why sunsets look orange.',
    cta: { title: 'Give every lesson a voice', body: 'Start free, or talk to us about school and university plans.' },
  },
  games: {
    seo: { title: 'AI character voices and sound effects for games | Mimix', description: 'Design and mix voices for every character, generate sound effects from text and prototype dialogue fast. Use the API to voice lines at scale.' },
    hero: { overline: 'For games', title: 'A full cast without a casting call', lead: 'Design a voice for every character, mix new ones for variety, and generate the sound effects around them.' },
    problems: [
      { title: 'Placeholder dialogue', body: 'Prototype every line with real voices from day one.' },
      { title: 'Too many characters', body: 'Mix and design voices so every villager sounds different.' },
      { title: 'Endless sound lists', body: 'Generate footsteps, doors and ambiences from a description.' },
    ],
    workflow: {
      title: 'From script to playable scene',
      steps: [
        { title: 'Design the cast', body: 'Describe each character and keep the best take.' },
        { title: 'Batch the lines', body: 'Send your dialogue sheet through the API.' },
        { title: 'Drop into the engine', body: 'Export WAV files named by line ID.' },
      ],
    },
    sampleTitle: 'A character line',
    sampleText: 'Halt, traveller. Nobody crosses this bridge without paying the toll.',
    cta: { title: 'Cast your game today', body: 'Start free and prototype a full scene in an afternoon.' },
  },
  business: {
    seo: { title: 'AI voice for business: support, training, marketing | Mimix', description: 'Training videos, support lines and ads in every language, in a voice that stays on brand. Team seats, shared voices and enterprise security.' },
    hero: { overline: 'For business', title: 'On-brand voice in every language', lead: 'Training, support and marketing audio in one consistent voice, with team seats, shared libraries and the controls your security team expects.' },
    problems: [
      { title: 'Inconsistent voiceovers', body: 'One shared brand voice for every team and every video.' },
      { title: 'Translation bottlenecks', body: 'Dub training and product videos into new languages in days.' },
      { title: 'Security reviews', body: 'SSO, audit logs and a data processing agreement on Enterprise.' },
    ],
    workflow: {
      title: 'Rolling out a brand voice',
      steps: [
        { title: 'Create the voice', body: 'Mix or design a brand voice, or clone a spokesperson with consent.' },
        { title: 'Share it', body: 'Add it to your team library with roles for who can use it.' },
        { title: 'Scale it', body: 'Produce audio in the app or through the API.' },
      ],
    },
    sampleTitle: 'A training video line',
    sampleText: 'Welcome to your first week. Let’s start with how we look after our customers.',
    cta: { title: 'Give your brand a voice', body: 'Talk to our team about volume, security and contracts.' },
  },
} satisfies Record<string, UseCaseCopy>

export const useCases = useCasesCopy
