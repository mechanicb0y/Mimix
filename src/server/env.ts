import { z } from '@/lib/zod'

/**
 * Server environment, validated once. Every integration defaults to its local stand-in, so the app
 * runs and its tests pass with no accounts. Switching to a real service is an env change only:
 *
 *   DATABASE_URL        local PGlite server  → Supabase Postgres
 *   STORAGE_DRIVER      local                → s3 (Supabase Storage S3 endpoint, or R2)
 *   STRIPE_API_BASE     stripe-mock          → unset (api.stripe.com)
 *   EMAIL_DRIVER        outbox (files)       → resend
 *   QUEUE_DRIVER        inline               → bullmq (Redis)
 *   VOICE_ENGINE        mock                 → inworld (INWORLD_API_KEY), voxcpm (SELF_HOSTED_ENGINE_URL)
 *                                              or kokoro (our CPU server, MIXER_ENGINE_URL; real voices, no account)
 *   TRANSLATOR          mock (tags lines)    → google (Cloud Translation, for Dubbing)
 */
const bool = z.enum(['0', '1', 'true', 'false']).transform((v) => v === '1' || v === 'true')

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  DATABASE_URL: z.string().default('postgres://postgres:postgres@127.0.0.1:5433/postgres'),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(5),
  /** Named prepared statements; only for a direct (non-pooled) Postgres connection. */
  DATABASE_PREPARE: bool.default(false),

  BETTER_AUTH_SECRET: z.string().min(32).default('dev-only-secret-change-me-dev-only-secret-change-me'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  /** "online" checks Have I Been Pwned (k-anonymity); "local" uses the bundled list of common breached passwords. */
  BREACHED_PASSWORD_CHECK: z.enum(['online', 'local']).default('local'),
  /** 32-byte key, base64, for encrypting webhook secrets at rest. */
  APP_ENCRYPTION_KEY: z.string().default('ZGV2LW9ubHkta2V5LWRldi1vbmx5LWtleS0xMjM0NTY='),

  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  /** Where local stand-ins keep files: storage, email outbox. */
  MIMIX_DATA_DIR: z.string().default('.data'),
  /** Local storage folder; defaults to <MIMIX_DATA_DIR>/storage. */
  STORAGE_LOCAL_DIR: z.string().optional(),
  STORAGE_SIGNING_KEY: z.string().default('dev-only-storage-signing-key'),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('auto'),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  /** Optional CDN in front of signed media URLs. */
  MEDIA_CDN_URL: z.string().url().optional(),

  STRIPE_SECRET_KEY: z.string().default('sk_test_mock'),
  STRIPE_WEBHOOK_SECRET: z.string().default('whsec_dev_only'),
  /** Set to http://localhost:12111 for stripe-mock. Unset = real Stripe. */
  STRIPE_API_BASE: z.string().url().optional(),
  /** Stripe Tax: calculate and collect tax at checkout (needs tax registrations in the Stripe dashboard). */
  STRIPE_AUTOMATIC_TAX: bool.default(false),

  EMAIL_DRIVER: z.enum(['outbox', 'resend']).default('outbox'),
  EMAIL_FROM: z.string().default('Mimix <no-reply@example.com>'),
  RESEND_API_KEY: z.string().optional(),

  QUEUE_DRIVER: z.enum(['inline', 'bullmq']).default('inline'),
  REDIS_URL: z.string().default('redis://127.0.0.1:6379'),

  VOICE_ENGINE: z.enum(['mock', 'inworld', 'voxcpm', 'kokoro']).default('mock'),
  /** Inworld API key as shown in the Inworld portal (already base64; sent as Basic auth). */
  INWORLD_API_KEY: z.string().min(1).optional(),
  INWORLD_API_BASE: z.string().url().default('https://api.inworld.ai'),
  INWORLD_TTS_MODEL: z.string().min(1).default('inworld-tts-2'),
  INWORLD_STT_MODEL: z.string().min(1).default('inworld/inworld-stt-1'),
  /** Stock Inworld voices for library voices with no Inworld voice of their own (lower / higher pitch). */
  INWORLD_VOICE_LOW: z.string().min(1).default('Dennis'),
  INWORLD_VOICE_HIGH: z.string().min(1).default('Ashley'),
  /** Our GPU server running engines/voxcpm/server.py. */
  SELF_HOSTED_ENGINE_URL: z.string().url().optional(),
  SELF_HOSTED_ENGINE_TOKEN: z.string().min(16).optional(),
  /** Optional endpoints that server runs, comma-separated: stream, clone, design, transcribe, isolate. */
  SELF_HOSTED_FEATURES: z.string().default('stream,clone,design'),
  /**
   * Voice Mixer engine. `none` uses the main engine's mixing (the mock engine mixes; Inworld and
   * VoxCPM2 can't). `kokoro` uses our Kokoro-82M server (engines/kokoro, CPU), whose library voices
   * become the Mixer's sources.
   */
  MIXER_ENGINE: z.enum(['none', 'kokoro']).default('none'),
  MIXER_ENGINE_URL: z.string().url().optional(),
  MIXER_ENGINE_TOKEN: z.string().optional(),
  /**
   * With VOICE_ENGINE=kokoro, the extras the Kokoro server runs (its KOKORO_FEATURES), comma-separated:
   * transcribe (faster-whisper on CPU: Speech to Text, Dubbing) and isolate (DeepFilterNet: Voice Isolator).
   */
  KOKORO_FEATURES: z.string().default(''),
  /**
   * "Mix, then clone": after a Kokoro mix is saved, render about 30 seconds of it and use that as the
   * reference for the main engine's instant clone, so the mix gets the main engine's quality and
   * languages. Off until tested against the chosen engine and cleared in its terms (lawyer brief).
   */
  MIX_CLONE_TO_MAIN: bool.default(false),
  /**
   * Speaker verification for consent recordings. "dsp" is the built-in acoustic stand-in, fit only for
   * the preview engine's synthetic voices, so with it cloning stays off on real engines. "neural" is
   * 3D-Speaker's CAM++ model on the Kokoro server (KOKORO_FEATURES=clone, at MIXER_ENGINE_URL).
   */
  SPEAKER_VERIFIER: z.enum(['dsp', 'neural']).default('dsp'),
  /**
   * How a clone's consent is taken. "recording" (the default): the speaker reads a random phrase, and the
   * voice switches on only if the words and the speaker match the samples. "attest": no recording; the
   * voice switches on as soon as its samples are ready, on the uploader's confirmation that they are the
   * speaker or have the speaker's written permission (kept as a consent record and in the audit log).
   * The local launcher uses "attest" on your own computer; keep "recording" for a public site until the
   * lawyer clears it (launch checklist).
   */
  CLONE_CONSENT: z.enum(['recording', 'attest']).default('recording'),
  /**
   * The neural verifier's pass mark (cosine similarity, 0 to 1) for the consent check and the takedown
   * match. Unset = 0.5. "Tune voice check" (engines/kokoro/calibrate_verifier.py) measures it on your
   * own recordings and writes it here, with SPEAKER_MATCH_TUNED (the date and number of recordings).
   */
  SPEAKER_MATCH: z.coerce.number().min(0.2).max(0.95).optional(),
  SPEAKER_MATCH_TUNED: z.string().max(200).optional(),
  /**
   * The graphics-card engine, next to Kokoro (the local launcher sets these when it finds an NVIDIA GPU
   * and you choose an engine): cloned voices are made there, and text in a language Kokoro doesn't speak
   * is read there. chatterbox = Chatterbox Multilingual (MIT, 23 languages, engines/chatterbox);
   * voxcpm = VoxCPM2 (Apache-2.0, 30 languages, engines/voxcpm). Same protocol as SELF_HOSTED_ENGINE_URL.
   */
  GPU_ENGINE: z.enum(['off', 'chatterbox', 'voxcpm']).default('off'),
  GPU_ENGINE_URL: z.string().url().optional(),
  GPU_ENGINE_TOKEN: z.string().optional(),
  GPU_ENGINE_FEATURES: z.string().default('clone'),
  /** Machine translation for Dubbing. "google" needs GOOGLE_TRANSLATE_API_KEY (Cloud Translation Basic, v2). */
  TRANSLATOR: z.enum(['mock', 'google']).default('mock'),
  GOOGLE_TRANSLATE_API_KEY: z.string().optional(),

  /** Shared secret Vercel Cron sends to /api/cron/sweep. Unset = the route is off. */
  CRON_SECRET: z.string().min(16).optional(),
  ADMIN_EMAIL: z.string().email().optional(),
  /** Inbox that gets an alert for each abuse report (optional). */
  SAFETY_EMAIL: z.string().email().optional(),
  /** One-time token for the super-admin's first password (scripts/seed-admin.mjs, /admin/setup). At least 32 characters. */
  ADMIN_SETUP_TOKEN: z.string().min(32).optional(),
  /** Optional: only these IP addresses or IPv4 CIDR ranges (comma-separated) can reach /admin. */
  ADMIN_IP_ALLOWLIST: z.string().optional(),
  ENABLE_TEST_ROUTES: bool.default(false),
})

export type Env = z.infer<typeof schema>
let cached: Env | undefined

export function env(): Env {
  if (cached) return cached
  // An empty value (KEY= in a copied .env.example) means "not set", so defaults and optionals apply.
  const parsed = schema.safeParse(Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== '')))
  if (!parsed.success) throw new Error(`Invalid environment: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`)
  const e = parsed.data
  if (e.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build') {
    const devDefaults: Array<[keyof Env, string]> = [['BETTER_AUTH_SECRET', 'dev-only'], ['STORAGE_SIGNING_KEY', 'dev-only'], ['APP_ENCRYPTION_KEY', 'ZGV2LW9ubHkt']]
    for (const [k, marker] of devDefaults) if (String(e[k]).startsWith(marker)) throw new Error(`${k} must be set in production`)
    // Live deployments (Vercel production and staging) refuse the test helpers and the dev Stripe secret.
    if (process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview') {
      if (e.ENABLE_TEST_ROUTES) throw new Error('ENABLE_TEST_ROUTES must be off on a live deployment')
      if (e.STRIPE_WEBHOOK_SECRET === 'whsec_dev_only') throw new Error('STRIPE_WEBHOOK_SECRET must be set on a live deployment')
    }
  }
  cached = e
  return e
}

/** Tests only: forget the parsed environment so the next env() reads process.env again. */
export function resetEnvForTests() { cached = undefined }
