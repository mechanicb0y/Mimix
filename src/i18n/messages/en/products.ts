import type { EngineLimitKey } from '@/config/engine-limits'

/**
 * Copy for the nine product pages that share the product template.
 * Items tagged with `limit` depend on the voice engine: they stay hidden until that limit is confirmed
 * in src/config/engine-limits.ts, and {value} is filled from there. Untagged copy must not state them.
 */
interface ProductCopy {
  seo: { title: string; description: string }
  hero: { overline: string; title: string; lead: string }
  steps: Array<{ title: string; body: string }>
  features: Array<{ title: string; body: string; limit?: EngineLimitKey }>
  specs: Array<{ label: string; value: string; limit?: EngineLimitKey }>
  samples: { title: string; items: Record<string, { title: string; text: string }> }
  faq: Array<{ q: string; a: string; limit?: EngineLimitKey }>
  cta: { title: string; body: string }
}

const productsCopy = {
  'text-to-speech': {
    seo: {
      title: 'Text to Speech: natural AI voiceovers in seconds',
      description: 'Paste a script, pick a voice and tune stability, style and speed. Download MP3 or WAV and see the credit cost before you generate.',
    },
    hero: { overline: 'Text to Speech', title: 'Scripts in, natural speech out', lead: 'Paste a script, choose a voice and hear it straight away. Tune how steady, expressive or fast it sounds, then download the take you like.' },
    steps: [
      { title: 'Write or paste', body: 'Type or paste your script, with a live character count and credit estimate as you go.' },
      { title: 'Pick a voice', body: 'Choose from the library, your clones, your designs or your mixes.' },
      { title: 'Tune and download', body: 'Adjust stability, similarity, style and speed. Regenerate any line and export MP3 or WAV.' },
    ],
    features: [
      { title: 'Cost before you click', body: 'The editor shows characters, credits and the rough length of the audio before every generation.' },
      { title: 'Four simple controls', body: 'Stability, similarity, style and speed, each with a plain-language hint about what it changes.' },
      { title: 'Pronunciation dictionary', body: 'Teach Mimix how to say brand names, acronyms and tricky words once, and it remembers.' },
      { title: 'History you can reuse', body: 'Every take is saved with its settings, so you can replay, download or regenerate it later.' },
      { title: 'Streams for apps', body: 'The API streams audio as it’s made, so your app can start speaking almost straight away.' },
      { title: 'Provenance included', body: 'Downloads carry provenance data where the engine supports it, so your audience can trust the source.' },
    ],
    specs: [
      { label: 'Cost', value: '1 credit per character, about 1,000 credits per minute of audio' },
      { label: 'Length per take', value: 'Up to {value} characters', limit: 'ttsCharsPerTake' },
      { label: 'Downloads', value: 'MP3 and WAV' },
      { label: 'Plans', value: 'All plans. Commercial use on paid plans.' },
    ],
    samples: {
      title: 'Listen to a few takes',
      items: {
        'tts-narration': { title: 'Audiobook narration · Marlow', text: 'Chapter one. The lighthouse keeper had not seen a ship in eleven days, and he had started to count the gulls instead.' },
        'tts-ad': { title: 'Radio ad · Atlas', text: 'Fresh bread, every morning, from six. Come hungry, leave happy. Corner Bakery, on Harbour Street.' },
        'tts-character': { title: 'Game line · Tamsin', text: 'Oh, you found the secret door? Well then, I suppose you’d better come inside.' },
      },
    },
    faq: [
      { q: 'How long can one take be?', a: 'Up to {value} characters per take. For whole books or episodes, use Studio, which splits long text into chapters.', limit: 'ttsCharsPerTake' },
      { q: 'What do stability and style do?', a: 'Stability keeps the delivery even from take to take. Style adds expression. Lower stability with higher style sounds more animated; the opposite sounds calm and consistent.' },
      { q: 'Do failed generations cost credits?', a: 'No. If a take fails on our side, the credits go straight back to your balance.' },
    ],
    cta: { title: 'Hear your script in a minute', body: 'Free accounts get 10,000 credits a month. No card needed.' },
  },
  'voice-cloning': {
    seo: {
      title: 'Voice Cloning with verified consent | Mimix',
      description: 'Clone your own voice from a short sample or a longer dataset. Every clone is verified with a spoken phrase before it switches on.',
    },
    hero: { overline: 'Voice Cloning', title: 'Your voice, ready whenever you are', lead: 'Record a short sample for an instant clone, or upload longer audio for a professional one. Either way, you prove it’s your voice before it works.' },
    steps: [
      { title: 'Record or upload', body: 'Instant clones need about one minute of clean speech. Professional clones use 30 minutes or more.' },
      { title: 'Read the phrase', body: 'We show a random sentence. Read it aloud, and we match it to your samples to confirm it’s you.' },
      { title: 'Use it anywhere', body: 'Your clone works in Text to Speech, Studio, Dubbing, the Voice Changer and the Voice Mixer.' },
    ],
    features: [
      { title: 'Consent on every clone', body: 'Instant or professional, every clone needs the speaker’s spoken verification. A checkbox is never enough.' },
      { title: 'Two levels of likeness', body: 'Instant clones are ready in minutes. Professional clones are trained on more audio for the closest match.' },
      { title: 'A record you can show', body: 'We keep a consent record with the time, the phrase and a fingerprint of the audio.' },
      { title: 'You decide on remixing', body: 'Choose whether your clone can be used in other people’s mixes. The default is no.' },
      { title: 'Delete for good', body: 'Delete a clone and its samples at any time. Mixes built from it stop working too.' },
      { title: 'Public figures blocked', body: 'A blocklist stops cloning of well-known voices, even with uploaded audio.' },
    ],
    specs: [
      { label: 'Instant clone', value: 'About 1 minute of speech. From the Maker plan.' },
      { label: 'Professional clone', value: '30 minutes or more. From the Pro plan.' },
      { label: 'Verification', value: 'Spoken random phrase, matched to your samples' },
      { label: 'Files', value: 'WAV, MP3, M4A or FLAC, up to 50 MB each' },
    ],
    samples: {
      title: 'Original and clone',
      items: {
        'clone-original': { title: 'Original recording', text: 'Hi, this is my real voice, recorded on my laptop microphone.' },
        'clone-result': { title: 'Instant clone reading new text', text: 'And this is my clone, reading a script I never recorded.' },
      },
    },
    faq: [
      { q: 'Why do I have to read a phrase?', a: 'It proves the person in the samples agreed to the clone. The phrase is random, so it can’t be faked with an old recording.' },
      { q: 'Can I clone a friend’s voice?', a: 'Only if your friend does the verification step themselves, live. The clone is then linked to their consent record.' },
      { q: 'Who can use my clone?', a: 'Only you and your workspace, unless you choose to publish it to the library or allow remixing.' },
    ],
    cta: { title: 'Clone your voice in minutes', body: 'Instant cloning is included from the Maker plan.' },
  },
  'voice-design': {
    seo: {
      title: 'Voice Design: create an AI voice from a description',
      description: 'Describe the voice you need, such as age, accent and tone, and get three versions to compare. Keep the one that fits and use it anywhere.',
    },
    hero: { overline: 'Voice Design', title: 'Describe a voice. Hear three takes on it.', lead: 'Type what you’re after, like “warm older narrator with a soft Scottish accent”, and Mimix gives you three versions to compare.' },
    steps: [
      { title: 'Describe it', body: 'Age, accent, tone, pace, mood. Plain words work best.' },
      { title: 'Compare three', body: 'Listen to three candidates reading the same line, and keep the closest one.' },
      { title: 'Refine or mix', body: 'Adjust the description and try again, or send your favourite to the Voice Mixer.' },
    ],
    features: [
      { title: 'Plain-language prompts', body: 'No sliders to learn. Describe the person you hear in your head.' },
      { title: 'Side-by-side previews', body: 'All three candidates read the same sentence, so you compare voices, not scripts.' },
      { title: 'Synthetic by design', body: 'Designed voices don’t copy a real person, so they’re yours to use without a consent step.' },
      { title: 'Ready for the mixer', body: 'Designed voices can be mixed with your clones or library voices.' },
      { title: 'Save what you like', body: 'Keep a voice and it appears in every Mimix tool straight away.' },
      { title: 'Prompt tips built in', body: 'Examples and hints help you get from vague to specific in one or two tries.' },
    ],
    specs: [
      { label: 'Cost', value: '500 credits per set of three previews' },
      { label: 'Prompt length', value: 'Up to 500 characters' },
      { label: 'Saving', value: 'Free. Counts towards your custom voice slots.' },
      { label: 'Plans', value: 'All plans' },
    ],
    samples: {
      title: 'Voices made from a sentence',
      items: {
        'design-narrator': { title: '“Calm documentary narrator, deep and unhurried”', text: 'Beneath the ice, life carries on in the dark, slow and patient.' },
        'design-guide': { title: '“Cheerful young tour guide, quick and bright”', text: 'Right this way, everyone! The best view in the city is just up these stairs.' },
        'design-villain': { title: '“Breathy villain, low and theatrical”', text: 'You came all this way for nothing. How very disappointing.' },
      },
    },
    faq: [
      { q: 'Do designed voices sound like real people?', a: 'They’re generated from your description, not copied from anyone. If a design ends up close to a known voice, our checks flag it before you can save.' },
      { q: 'How specific should my description be?', a: 'Two or three traits is a good start, for example age, accent and mood. Add pace or texture if the first set isn’t quite right.' },
      { q: 'Can I use a designed voice commercially?', a: 'Yes, on any paid plan, like any other Mimix audio.' },
    ],
    cta: { title: 'Design the voice in your head', body: 'Try a few descriptions free, then keep the ones you love.' },
  },
  'voice-changer': {
    seo: {
      title: 'Voice Changer: keep your delivery, change the voice',
      description: 'Record or upload speech and hear it in a different voice, with your timing, emotion and emphasis kept intact. MP3 or WAV in and out.',
    },
    hero: { overline: 'Voice Changer', title: 'Your performance, a different voice', lead: 'Act it out yourself, with your timing and emotion, then hear it in any voice you’re allowed to use.' },
    steps: [
      { title: 'Record or upload', body: 'Speak into your microphone or upload a clip.' },
      { title: 'Pick a target voice', body: 'Choose a library voice, a clone of your own, a design or a mix.' },
      { title: 'Convert and compare', body: 'Play the original and the result side by side, then download.' },
    ],
    features: [
      { title: 'Delivery stays yours', body: 'Pauses, emphasis, whispers and laughs carry over into the new voice.' },
      { title: 'Record in the browser', body: 'A built-in recorder with a level meter, so you know the take is clean before you convert.' },
      { title: 'Before and after', body: 'Switch between the original and the converted clip with one key.' },
      { title: 'Noise cleanup option', body: 'Run the Voice Isolator first in the same step if your room is noisy.' },
      { title: 'Consent applies', body: 'You can only convert into voices you own or that are licensed for it.' },
      { title: 'Batch friendly', body: 'Queue several clips and get a notification when they’re all done.' },
    ],
    specs: [
      { label: 'Cost', value: '1,000 credits per minute of audio' },
      { label: 'Clip length', value: 'Up to {value} minutes per clip', limit: 'changerMaxMinutes' },
      { label: 'Files', value: 'WAV, MP3, M4A, up to 50 MB' },
      { label: 'Plans', value: 'All plans' },
    ],
    samples: {
      title: 'Before and after',
      items: {
        'changer-before': { title: 'Original performance', text: 'Wait. Did you hear that? Something’s moving behind the door.' },
        'changer-after': { title: 'Converted to Juniper', text: 'Wait. Did you hear that? Something’s moving behind the door.' },
      },
    },
    faq: [
      { q: 'Will it keep my accent?', a: 'It keeps your timing and emotion. Accent usually follows the target voice, though strong accents can carry over a little.' },
      { q: 'Can I change my voice live?', a: 'Not yet. Live conversion is on our roadmap for voice agents.' },
      { q: 'Which voices can I convert into?', a: 'Any voice you own, and library voices whose owners allow it. Public figures are blocked.' },
    ],
    cta: { title: 'Perform once, cast anyone', body: 'Try the Voice Changer free with your monthly credits.' },
  },
  'speech-to-text': {
    seo: {
      title: 'Speech to Text: accurate transcripts and captions | Mimix',
      description: 'Upload audio or video and get an accurate transcript with timestamps. Edit it in the browser and export TXT, SRT or VTT captions.',
    },
    hero: { overline: 'Speech to Text', title: 'Every word, right where it was said', lead: 'Upload an interview, lecture or episode and get a transcript with timestamps, ready to edit and export.' },
    steps: [
      { title: 'Upload', body: 'Add audio or video, or paste a link to a file you host.' },
      { title: 'Review', body: 'Click any word to hear it and fix names or terms.' },
      { title: 'Export', body: 'Download plain text, or SRT and VTT captions for your video.' },
    ],
    features: [
      { title: 'Speaker labels', body: 'Tell us how many people speak, or let Mimix work it out, then rename them.', limit: 'speakerLabels' },
      { title: 'Word-level timing', body: 'Every word is timed, so captions line up and edits are precise.' },
      { title: 'Click to hear', body: 'Select any line to play it back and check what was really said.' },
      { title: 'Caption-ready exports', body: 'SRT and VTT with sensible line lengths for video players.' },
      { title: 'Search inside', body: 'Find every mention of a word across a long recording.' },
      { title: 'Feeds dubbing', body: 'Send a transcript straight to Dubbing to translate and re-voice it.' },
    ],
    specs: [
      { label: 'Cost', value: '200 credits per minute of audio' },
      { label: 'Length', value: 'Up to {value} hours per file', limit: 'sttMaxHours' },
      { label: 'Exports', value: 'TXT, SRT and VTT' },
      { label: 'Plans', value: 'All plans' },
    ],
    samples: {
      title: 'The audio behind a transcript',
      items: {
        'stt-interview': { title: 'Two-person interview, 12 seconds', text: 'So, how did the project start? Honestly, it began as a joke between two friends.' },
      },
    },
    faq: [
      { q: 'How accurate is it?', a: 'Clear recordings transcribe very accurately. Background noise, crosstalk and heavy music lower accuracy, so run the Voice Isolator first if needed.' },
      { q: 'Can it tell speakers apart?', a: 'Yes. Mimix labels each speaker, and you can rename them, for example from “Speaker 1” to “Dana”.', limit: 'speakerLabels' },
      { q: 'Do you keep my recordings?', a: 'Files stay in your private storage until you delete them. See the Privacy Policy for retention periods.' },
    ],
    cta: { title: 'Turn your next recording into text', body: 'About 50 minutes of transcription fits in the free monthly credits.' },
  },
  dubbing: {
    seo: {
      title: 'AI Dubbing: translate video and keep the original voices',
      description: 'Upload a video, pick target languages and get a dubbed version that keeps each speaker’s voice. Edit the transcript and timing before you export.',
    },
    hero: { overline: 'Dubbing', title: 'One video, every language, the same voices', lead: 'Upload a video, choose languages, and Mimix translates the speech and re-voices it in each speaker’s own voice.' },
    steps: [
      { title: 'Upload and choose', body: 'Add a video or audio file and pick one or more target languages.' },
      { title: 'Edit the script', body: 'Check the transcript and translation side by side and fix anything before voicing.' },
      { title: 'Export', body: 'Download the dubbed video, the audio track, or captions for each language.' },
    ],
    features: [
      { title: 'Voices that stay', body: 'Each speaker sounds like themselves in the new language, with their consent on record.' },
      { title: 'Editable transcript', body: 'Fix names, terms and tone in the translation before any audio is made.' },
      { title: 'Timing that fits', body: 'Lines are paced to match the original scene, so lips and cuts line up better.' },
      { title: 'Background kept', body: 'Music and sound effects stay under the new voices.' },
      { title: 'Progress you can see', body: 'Long videos run in the background with live progress, and we notify you when they’re done.' },
      { title: 'Captions included', body: 'Get SRT and VTT for every language alongside the dub.' },
    ],
    specs: [
      { label: 'Cost', value: '3,000 credits per minute of video, per language' },
      { label: 'Length', value: 'Up to {value} minutes per file', limit: 'dubbingMaxMinutes' },
      { label: 'Exports', value: 'MP4, audio track (WAV), SRT and VTT' },
      { label: 'Plans', value: 'From the Maker plan' },
    ],
    samples: {
      title: 'Original and dubbed',
      items: {
        'dub-original': { title: 'Original line (English)', text: 'Welcome back to the kitchen. Today we’re making bread from scratch.' },
        'dub-spanish': { title: 'Dubbed line (Spanish), same voice', text: 'Bienvenidos de nuevo a la cocina. Hoy hacemos pan desde cero.' },
      },
    },
    faq: [
      { q: 'Do the speakers need to consent?', a: 'Yes. Keeping someone’s voice in another language counts as cloning it, so each speaker verifies once. Otherwise, pick a library voice instead.' },
      { q: 'Can I edit the translation?', a: 'Yes. You see the original and translated text side by side and can change any line before voicing.' },
      { q: 'What happens to background music?', a: 'Mimix separates speech from the background and keeps music and effects under the new voices.' },
    ],
    cta: { title: 'Take your video global this week', body: 'Dubbing is included from the Maker plan.' },
  },
  'sound-effects': {
    seo: {
      title: 'Sound Effects: generate any sound from a description',
      description: 'Describe a sound, like rain on a tin roof or a heavy door, and get clips to choose from. Royalty-free on paid plans and ready for any edit.',
    },
    hero: { overline: 'Sound Effects', title: 'Describe a sound. Drop it in your edit.', lead: 'Type “rain on a tin roof” or “heavy wooden door creaks shut” and get clips you can preview, trim and download.' },
    steps: [
      { title: 'Describe it', body: 'What it is, where it happens and how it should feel.' },
      { title: 'Pick a take', body: 'Get several variations and keep the one that fits.' },
      { title: 'Download', body: 'Export WAV or MP3 and drop it into your editor.' },
    ],
    features: [
      { title: 'Variations per prompt', body: 'Every prompt returns several takes, so you’re choosing, not settling.' },
      { title: 'Set the length', body: 'Ask for a short hit or a longer ambience.' },
      { title: 'Loop-friendly', body: 'Ambiences can be made to loop cleanly for games and long scenes.' },
      { title: 'Royalty-free', body: 'Use effects in commercial work on any paid plan.' },
      { title: 'Saved to history', body: 'Find past prompts and takes whenever you need them again.' },
      { title: 'Pairs with speech', body: 'Layer effects under Text to Speech in Studio projects.' },
    ],
    specs: [
      { label: 'Cost', value: '200 credits per generation' },
      { label: 'Length', value: '0.5 to {value} seconds', limit: 'sfxMaxSeconds' },
      { label: 'Downloads', value: 'WAV and MP3' },
      { label: 'Plans', value: 'All plans. Commercial use on paid plans.' },
    ],
    samples: {
      title: 'Made from a single line of text',
      items: {
        'sfx-rain': { title: '“Steady rain on a window, close up”', text: '' },
        'sfx-door': { title: '“Heavy door knock, three times”', text: '' },
        'sfx-crowd': { title: '“Busy café, people chatting”', text: '' },
      },
    },
    faq: [
      { q: 'Can I use the effects in paid projects?', a: 'Yes, on any paid plan. Free plan effects are for personal projects.' },
      { q: 'How do I get better results?', a: 'Name the source, the space and the feel, for example “small dog barking twice, in a tiled kitchen, playful”.' },
      { q: 'Can I make music with it?', a: 'Short stingers, yes. Full music generation is on our roadmap as a separate tool.' },
    ],
    cta: { title: 'Your next sound is one sentence away', body: 'Fifty free generations every month on the Free plan.' },
  },
  'voice-isolator': {
    seo: {
      title: 'Voice Isolator: remove background noise from speech',
      description: 'Pull clean speech out of wind, traffic, hum and crowd noise. Upload audio or video and download a clean voice track in seconds.',
    },
    hero: { overline: 'Voice Isolator', title: 'Clean speech from noisy recordings', lead: 'Wind, traffic, fans, hum, a busy café. Upload the recording and get just the voice back.' },
    steps: [
      { title: 'Upload', body: 'Add an audio or video file.' },
      { title: 'Isolate', body: 'Mimix separates the voice from everything else.' },
      { title: 'Compare and download', body: 'Switch between before and after, then export the clean track.' },
    ],
    features: [
      { title: 'Handles real-world noise', body: 'Built for outdoor interviews, home studios and phone recordings.' },
      { title: 'Before and after', body: 'Flip between the original and the clean version as it plays.' },
      { title: 'Keeps the voice natural', body: 'Removes noise without the underwater sound of older filters.' },
      { title: 'Video in, video out', body: 'Upload a video and get it back with a clean voice track.' },
      { title: 'Works before other tools', body: 'Clean audio first for better transcripts, clones and conversions.' },
      { title: 'Fast', body: 'Most files finish in less time than they take to play.' },
    ],
    specs: [
      { label: 'Cost', value: '1,000 credits per minute of audio' },
      { label: 'Length', value: 'Up to {value} hour per file', limit: 'isolatorMaxHours' },
      { label: 'Files', value: 'WAV, MP3, M4A, MP4 and MOV, up to 500 MB' },
      { label: 'Plans', value: 'All plans' },
    ],
    samples: {
      title: 'Before and after',
      items: {
        'isolator-before': { title: 'Street interview, original', text: 'I’ve lived on this street for twenty years and it’s never been this busy.' },
        'isolator-after': { title: 'Same clip, voice isolated', text: 'I’ve lived on this street for twenty years and it’s never been this busy.' },
      },
    },
    faq: [
      { q: 'Will it remove music too?', a: 'Yes. Everything that isn’t speech, including music, is removed from the voice track.' },
      { q: 'Can it fix echo?', a: 'It reduces room echo noticeably. Very reverberant rooms improve, but won’t sound like a studio.' },
      { q: 'Is my file stored?', a: 'In your private storage until you delete it. It’s never used to train models without your permission.' },
    ],
    cta: { title: 'Rescue your next recording', body: 'Ten free minutes every month on the Free plan.' },
  },
  studio: {
    seo: {
      title: 'Studio: audiobooks and podcasts with AI voices | Mimix',
      description: 'Long-form projects with chapters, a voice per paragraph or speaker, sound effects and one-click export for audiobooks and podcast episodes.',
    },
    hero: { overline: 'Studio', title: 'Audiobooks and podcasts, chapter by chapter', lead: 'Import a manuscript or script, assign a voice to each speaker or paragraph, and export finished chapters.' },
    steps: [
      { title: 'Import', body: 'Paste text or import a document. Chapters are detected from your headings.' },
      { title: 'Cast and direct', body: 'Give each speaker a voice, tune lines that need it and layer sound effects.' },
      { title: 'Export', body: 'Render chapters in the background and download them one by one or all at once.' },
    ],
    features: [
      { title: 'Chapters built in', body: 'Work on one chapter while others render, and track progress for each.' },
      { title: 'A voice per speaker', body: 'Assign voices to characters once and Mimix keeps them consistent.' },
      { title: 'Line-level fixes', body: 'Regenerate a single sentence without touching the rest of the chapter.' },
      { title: 'Pronunciations once', body: 'Your dictionary applies across the whole project.' },
      { title: 'Background rendering', body: 'Close the tab. We’ll email you when the export is ready.' },
      { title: 'Ready to publish', body: 'Export MP3 or WAV per chapter, ready for your player or distributor.' },
    ],
    specs: [
      { label: 'Cost', value: '1 credit per character, like Text to Speech' },
      { label: 'Project size', value: 'Up to {value} characters', limit: 'studioProjectChars' },
      { label: 'Exports', value: 'MP3 or WAV per chapter, or a ZIP of all chapters' },
      { label: 'Plans', value: 'From the Pro plan' },
    ],
    samples: {
      title: 'A chapter opening',
      items: {
        'studio-chapter': { title: 'Chapter 3 · Two voices', text: 'Chapter three. “Are you sure about this?” asked Wren. “Not at all,” said Atlas, and opened the gate.' },
      },
    },
    faq: [
      { q: 'How long a book can I produce?', a: 'Projects hold up to {value} characters. Bigger books can be split across projects.', limit: 'studioProjectChars' },
      { q: 'Can I publish to audiobook stores?', a: 'Yes, on paid plans. Check each store’s rules about AI narration and disclosure before you submit.' },
      { q: 'Can I use my own cloned voice?', a: 'Yes. Clone your voice once, verify it, and narrate your own book.' },
    ],
    cta: { title: 'Start your audiobook today', body: 'Studio projects are included from the Pro plan.' },
  },
} satisfies Record<string, ProductCopy>

export const products = productsCopy
