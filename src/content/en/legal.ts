import type { LegalDoc } from '../types'

/**
 * Plain-language policies written for Mimix. They must be reviewed by a qualified lawyer for the
 * jurisdictions Mimix operates in before launch; LEGAL_REVIEWED stays false until then.
 */
export const LEGAL_REVIEWED = false

export const legalUi = {
  updated: 'Last updated {date}',
  contents: 'Contents',
  draftNotice: 'This policy is awaiting legal review and may change before Mimix launches.',
  placeholdersNotice: 'Text in square brackets is a placeholder for company details.',
  questions: 'Questions about this policy? Email {email}.',
  otherPolicies: 'Other policies',
}

export const legal: Record<'terms' | 'privacy' | 'acceptable-use' | 'voice-cloning-policy', LegalDoc> = {
  terms: {
    title: 'Terms of Service',
    seo: { title: 'Terms of Service | Mimix', description: 'The agreement between you and Mimix when you use our website, apps and API: accounts, plans and credits, your content, our service and liability.' },
    updated: '2026-11-02',
    intro: 'These terms are the agreement between you and {legalName} (“Mimix”, “we”) when you use our website, apps and API (together, the “service”). By creating an account or using the service, you agree to them.',
    sections: [
      { id: 'accounts', heading: '1. Your account', paragraphs: ['You must be at least 18, or the age of majority where you live, to create an account. Keep your login details safe and turn on two-factor authentication. You’re responsible for activity on your account.', 'If you use Mimix for an organisation, you confirm you can accept these terms on its behalf.'] },
      { id: 'plans', heading: '2. Plans, credits and payment', paragraphs: ['Paid plans renew automatically each month or year until you cancel. Monthly credits reset at the start of each billing period and don’t roll over. Top-up credits stay available while your plan is active.', 'Upgrades take effect immediately and are prorated. Downgrades and cancellations take effect at the end of the current period. Prices exclude taxes, which we add at checkout where required.', 'If a generation fails because of a problem on our side, we return the credits it used.'] },
      { id: 'your-content', heading: '3. Your content', paragraphs: ['You keep ownership of the text, audio and voices you upload, and of the audio you generate, subject to the licence of any voices you use.', 'You give Mimix permission to store and process your content only as needed to run the service for you. We don’t use your content to train models unless you opt in.'] },
      { id: 'licence', heading: '4. Using generated audio', paragraphs: ['On paid plans, you may use generated audio commercially. On the Free plan, generated audio is for personal, non-commercial use.', 'Audio made with a library voice follows that voice’s licence. A mixed voice follows the most restrictive licence among its sources.'] },
      { id: 'rules', heading: '5. Rules', paragraphs: ['You must follow our Acceptable Use Policy and Voice Cloning Policy. We may suspend or close accounts that break them, and remove content that does.'] },
      { id: 'api', heading: '6. API use', paragraphs: ['Keep API keys secret and on your servers. You’re responsible for requests made with your keys. We may apply rate limits to keep the service reliable for everyone.'] },
      { id: 'availability', heading: '7. Availability and changes', paragraphs: ['We work hard to keep Mimix available, but we can’t promise it will never be interrupted. We may change or retire features; if a change removes something you pay for, we’ll tell you in advance.'] },
      { id: 'liability', heading: '8. Liability', paragraphs: ['To the extent the law allows, Mimix isn’t liable for indirect or consequential losses, and our total liability is limited to the amount you paid us in the 12 months before the claim. Nothing in these terms limits liability that can’t be limited by law.'] },
      { id: 'ending', heading: '9. Ending the agreement', paragraphs: ['You can close your account at any time from Settings. We may end these terms if you seriously or repeatedly break them. You can export your data before your account closes.'] },
      { id: 'changes', heading: '10. Changes to these terms', paragraphs: ['If we make material changes, we’ll email you at least 30 days before they apply. Continuing to use Mimix after that means you accept the new terms.'] },
      { id: 'governing-law', heading: '11. Governing law and disputes', paragraphs: ['These terms are governed by the laws of {governingLaw}. Disputes go to the courts of {courts}, unless the law where you live gives you the right to bring a claim in your local courts.'] },
      { id: 'who-we-are', heading: '12. Who we are', paragraphs: ['Mimix is operated by {legalName}, registration number {registrationNumber}, {address}.'] },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    seo: { title: 'Privacy Policy | Mimix', description: 'What personal data Mimix collects, why, how long we keep it, who we share it with and how to access, export or delete your data.' },
    updated: '2026-11-02',
    intro: 'This policy explains what personal data Mimix collects, why we collect it, and the choices you have. We collect as little as we can and keep it only as long as we need it.',
    sections: [
      { id: 'what', heading: '1. What we collect', paragraphs: ['We collect the information you give us and the information the service needs to work:'], list: ['Account details: name, email, password hash and two-factor settings', 'Billing details: handled by our payment provider; we store only the last four digits and expiry of your card', 'Your content: text, uploaded audio, voice samples, generated audio and transcripts', 'Consent records for cloned voices: time, verification phrase and an audio fingerprint', 'Usage data: features used, credits spent, device type and approximate location from your IP address'] },
      { id: 'why', heading: '2. Why we use it', paragraphs: ['To provide and secure the service, process payments, prevent abuse, answer support requests and, if you agree, send product news. We don’t sell personal data.'] },
      { id: 'voice-data', heading: '3. Voice data', paragraphs: ['Voice samples are used only to create and run the voice you asked for. We don’t use them to train shared models unless you opt in. You can delete a voice and its samples permanently at any time.'] },
      { id: 'retention', heading: '4. How long we keep data', paragraphs: ['We keep data for as long as your account is open, with these exceptions:'], list: ['Generated audio in your history: until you delete it, or 30 days after your account closes', 'Voice samples: until you delete the voice, or 30 days after your account closes', 'Consent records: for as long as the voice exists, then as long as the law requires', 'Billing records: as long as tax law requires', 'Server logs: 30 days'] },
      { id: 'sharing', heading: '5. Who we share it with', paragraphs: ['Service providers who help us run Mimix, such as hosting, payments, email and error monitoring, under contracts that limit how they use your data. We may disclose data if the law requires it, or to protect people from harm.'] },
      { id: 'rights', heading: '6. Your rights', paragraphs: ['You can access, correct, export or delete your data from Settings, or by emailing us. Depending on where you live, you may have more rights, such as objecting to processing or complaining to a regulator.'] },
      { id: 'security', heading: '7. Security', paragraphs: ['We encrypt data in transit and at rest, keep audio in private storage behind short-lived links, and limit staff access to what their job needs.'] },
      { id: 'cookies', heading: '8. Cookies', paragraphs: ['We use essential cookies to keep you signed in and remember settings such as your theme. We use privacy-friendly analytics that don’t track you across other sites.'] },
      { id: 'contact', heading: '9. Contact', paragraphs: ['The controller of your personal data is {legalName} (registration number {registrationNumber}), {address}.', 'Questions or requests about your data? Email us and we’ll reply within 30 days.'] },
    ],
  },
  'acceptable-use': {
    title: 'Acceptable Use Policy',
    seo: { title: 'Acceptable Use Policy | Mimix', description: 'What you can and can’t do with Mimix: no impersonation without consent, fraud, harassment or deceptive political content, and how we enforce it.' },
    updated: '2026-11-02',
    intro: 'Mimix is for creating, not deceiving. This policy lists what isn’t allowed on the service. It applies to everything you upload, generate or share.',
    sections: [
      { id: 'not-allowed', heading: '1. Not allowed', paragraphs: ['You must not use Mimix to:'], list: ['Impersonate a real person without their documented consent', 'Commit or help commit fraud, scams or identity theft, including voice phishing', 'Harass, threaten, bully or intimidate anyone', 'Create deceptive political content, including fake statements by candidates or officials, or content meant to mislead voters', 'Create sexual content involving real people without consent, or any content sexualising minors', 'Promote violence, terrorism or hatred against protected groups', 'Break the law or infringe others’ intellectual property', 'Get around our safety systems, rate limits or consent checks'] },
      { id: 'disclosure', heading: '2. Be open about AI audio', paragraphs: ['Where people could reasonably believe they’re hearing a real person, tell them the audio is AI-generated. Some platforms and countries require this.'] },
      { id: 'reporting', heading: '3. Reporting misuse', paragraphs: ['Use the report button on any voice or shared clip, or email us. Reports go to our moderation team, and we tell voice owners when we take something down.'] },
      { id: 'enforcement', heading: '4. Enforcement', paragraphs: ['Depending on the seriousness, we may remove content, disable voices, suspend features, close accounts and, where required, inform the authorities. Serious violations can lead to immediate closure without a refund.'] },
    ],
  },
  'voice-cloning-policy': {
    title: 'Voice Cloning Policy',
    seo: { title: 'Voice Cloning Policy: consent and safeguards | Mimix', description: 'How Mimix verifies consent for every voice clone, blocks public figures, tracks mixed-voice lineage, marks generated audio and handles takedowns.' },
    updated: '2026-11-02',
    intro: 'Real voices belong to real people. This policy explains the safeguards that apply to every cloned and mixed voice on Mimix.',
    sections: [
      { id: 'consent', heading: '1. Consent for every clone', paragraphs: ['Every clone, instant or professional, needs the speaker to read a randomly generated phrase out loud. We compare that recording with the uploaded samples, and the voice only switches on if they match.', 'We store a consent record with the user, the time, the phrase and a fingerprint (hash) of the verification audio.'] },
      { id: 'blocklist', heading: '2. Public figures', paragraphs: ['A blocklist stops cloning or mixing the voices of well-known public figures, such as politicians and celebrities, even when verification appears to pass.'] },
      { id: 'mixing', heading: '3. Mixing and lineage', paragraphs: ['You can mix only voices you own or that are licensed for remixing. Every mix records its sources and their weights, and inherits the most restrictive licence among them.', 'If a source voice is taken down, every mix built from it is disabled, and the owners of those mixes are notified.'] },
      { id: 'provenance', heading: '4. Provenance', paragraphs: ['Where the voice engine supports it, generated audio carries a watermark or signed provenance data. Our public checker lets anyone test whether a clip was made with Mimix.'] },
      { id: 'takedowns', heading: '5. Reports and takedowns', paragraphs: ['Anyone can report a voice they believe was cloned without consent. We review reports promptly, may disable the voice while we investigate, and notify the voice owner of the outcome.'] },
      { id: 'deletion', heading: '6. Deleting your voice', paragraphs: ['You can permanently delete any voice you own and its samples at any time. Mixes built from it stop working. Consent records are kept only as long as the law requires.'] },
    ],
  },
}
