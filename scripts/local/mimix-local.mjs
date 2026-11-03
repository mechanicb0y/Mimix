#!/usr/bin/env node
/**
 * Runs Mimix on one computer, with real Kokoro voices, no accounts and no administrator password.
 * Started by the double-click files at the top of the project:
 *
 *   Start Mimix.cmd / Start Mimix.command   ->  node scripts/local/mimix-local.mjs start
 *   Stop Mimix.cmd  / Stop Mimix.command    ->  node scripts/local/mimix-local.mjs stop
 *   Tune voice check.cmd / .command         ->  node scripts/local/mimix-local.mjs tune <folder>
 *
 * The first start sets everything up inside the project's `local/` folder (ignored by Git):
 * Python 3.12 (through uv), the Kokoro engine and its models, DeepFilterNet's deep-filter program,
 * the voice-cloning models (OpenVoice v2 and the CAM++ consent check),
 * stripe-mock, the app's packages, a `.env.local` with fresh secrets, the database and a production
 * build. Every download is checked against the SHA-256 written below. Later starts reuse it all and
 * only redo a step whose inputs changed (for example after pulling new code in GitHub Desktop).
 *
 * Then it runs, until the window is closed or Stop is double-clicked:
 *   database (PGlite, 127.0.0.1:5433), stripe-mock (127.0.0.1:12111), Kokoro (127.0.0.1:8810),
 *   the app (http://localhost:3000), and the housekeeping sweep every 60 seconds.
 * Everything listens on this computer only (127.0.0.1), so no firewall prompt appears.
 *
 * Only Node's own modules are used, because nothing else is installed yet on the first start.
 */
import { spawn, spawnSync } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'
import { createReadStream, existsSync, mkdirSync, openSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync, chmodSync, copyFileSync } from 'node:fs'
import { createConnection } from 'node:net'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const LOCAL = join(ROOT, 'local')
const LOGS = join(LOCAL, 'logs')
const STATE_FILE = join(LOCAL, 'state.json')
const RUN_FILE = join(LOCAL, 'running.json')
const ENV_FILE = join(ROOT, '.env.local')
const WIN = process.platform === 'win32'
const MAC = process.platform === 'darwin'
const APP_URL = 'http://localhost:3000'
const PORTS = { web: 3000, db: 5433, kokoro: 8810, gpu: 8820, stripe: 12111 }
// The Owner's address written to a new .env.local. Set MIMIX_OWNER_EMAIL before the first start to use
// your own; you can also change your email later in Settings, Profile.
const ADMIN_EMAIL = process.env.MIMIX_OWNER_EMAIL || 'owner@example.com'

/* ------------------------------------------------------------------ downloads (pinned, checked) */

const UV = '0.11.32'
const DEEP_FILTER = '0.5.6'
const STRIPE_MOCK = '0.206.0'
const PLATFORM = WIN ? 'win-x64' : MAC ? (process.arch === 'arm64' ? 'mac-arm64' : 'mac-x64') : 'linux-x64'

const TOOLS = {
  uv: {
    'win-x64': ['uv-x86_64-pc-windows-msvc.zip', 'acfde570451cfdb8689fa159a138ee805ba4e241c466432750302c86254b0984'],
    'mac-arm64': ['uv-aarch64-apple-darwin.tar.gz', 'ed336d0ba49db8ef89b2b41fffa372ce63bd032f22a56f001c265891aec32829'],
    'mac-x64': ['uv-x86_64-apple-darwin.tar.gz', '77f5ca26c0de20e992a3677a174fe1121ee25c36f9b1434a863f75bf077a05eb'],
    'linux-x64': ['uv-x86_64-unknown-linux-gnu.tar.gz', 'aab924fd522efd06f1c5f3b93a243864fc453132c94b2dc49f1371b528a4b967'],
    url: (f) => `https://github.com/astral-sh/uv/releases/download/${UV}/${f}`,
  },
  deepFilter: {
    'win-x64': [`deep-filter-${DEEP_FILTER}-x86_64-pc-windows-msvc.exe`, '75e11fa16445f560cb6b021521ddb89e89270d13b83089705d98776f58fd7915'],
    'mac-arm64': [`deep-filter-${DEEP_FILTER}-aarch64-apple-darwin`, '4601e7f4e4c03e59a4c5b5000216ef3add3e808799cfccd95e14e83ea4611081'],
    'mac-x64': [`deep-filter-${DEEP_FILTER}-x86_64-apple-darwin`, 'd3be84003acb7c23e738ad7f70a158ec779a8d233a82e7fa3e717d112eb5b50f'],
    'linux-x64': [`deep-filter-${DEEP_FILTER}-x86_64-unknown-linux-musl`, '70775e251eee44c0f2451a1e833326cf8bcbbe304d3e7cd12851e6fce72ef7da'],
    url: (f) => `https://github.com/Rikorose/DeepFilterNet/releases/download/v${DEEP_FILTER}/${f}`,
  },
  stripeMock: {
    'win-x64': [`stripe-mock_${STRIPE_MOCK}_windows_amd64.zip`, '3ead9f1c24f8a60db6bf421d306c3c7e71d24393c0c769196fa6ccedbca93109'],
    'mac-arm64': [`stripe-mock_${STRIPE_MOCK}_darwin_arm64.tar.gz`, 'a476275b472d8e2b12e9a9d0d7815afb5042b13474d282e0addb7cd7ba3dc6d2'],
    'mac-x64': [`stripe-mock_${STRIPE_MOCK}_darwin_amd64.tar.gz`, 'bfe2cd0d5da86fb822f3d188d091d8af4c6074ce21b40a89eb08995ef2ff1e93'],
    'linux-x64': [`stripe-mock_${STRIPE_MOCK}_linux_amd64.tar.gz`, 'b6fe5a8f02aaeb5a5001710b304fc93a222f1983a9a6050a38f55cfdc48b8d19'],
    url: (f) => `https://github.com/stripe/stripe-mock/releases/download/v${STRIPE_MOCK}/${f}`,
  },
}
const KOKORO_RELEASE = 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0'
const MODELS = [
  ['kokoro-v1.0.onnx', '7d5df8ecf7d4b1878015a32686053fd0eebe2bc377234608764cc0ef3636a6c5'],
  ['voices-v1.0.bin', 'bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d'],
]
/**
 * Voice cloning (KOKORO_FEATURES=clone): the consent check's speaker model (3D-Speaker CAM++, Apache-2.0,
 * ONNX export published by sherpa-onnx on GitHub) and OpenVoice v2's tone-colour converter (MIT, from
 * Hugging Face). The converter's checksums are those of myshell-ai/OpenVoiceV2 as published.
 */
const OPENVOICE = 'https://huggingface.co/myshell-ai/OpenVoiceV2/resolve/main/converter'
const CLONE_MODELS = [
  [join('speaker', 'campplus_en_voxceleb_16k.onnx'), 'https://github.com/k2-fsa/sherpa-onnx/releases/download/speaker-recongition-models/3dspeaker_speech_campplus_sv_en_voxceleb_16k.onnx', '357a834f702b80161e5b981182c038e18553c1f2ca752ed6cec2052365d4129b', 'consent check model (30 MB)'],
  [join('openvoice', 'converter', 'config.json'), `${OPENVOICE}/config.json`, '9dfff60350b8c63f2c664efd92a61b2516efb22671466960f0e5dfebd881fa47', 'OpenVoice v2 settings'],
  [join('openvoice', 'converter', 'checkpoint.pth'), `${OPENVOICE}/checkpoint.pth`, '9652c27e92b6b2a91632590ac9962ef7ae2b712e5c5b7f4c34ec55ee2b37ab9e', 'OpenVoice v2 voice converter (131 MB)'],
]

const exe = (name) => (WIN ? `${name}.exe` : name)
const PATHS = {
  node: process.execPath,
  npm: [join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'), join(dirname(process.execPath), '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js')].find(existsSync),
  uv: join(LOCAL, 'tools', exe('uv')),
  deepFilter: join(LOCAL, 'models', exe('deep-filter')),
  stripeMock: join(LOCAL, 'tools', exe('stripe-mock')),
  python: WIN ? join(LOCAL, 'py', 'Scripts', 'python.exe') : join(LOCAL, 'py', 'bin', 'python'),
  next: join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next'),
  tsx: join(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs'),
}

/* ------------------------------------------------------------------ small helpers */

const say = (s = '') => console.log(s)
const step = (s) => console.log(`\n> ${s}`)
class Stop extends Error {}
function fail(message, logFile) {
  throw new Stop(`${message}${logFile ? `\n  Details: ${logFile}` : ''}`)
}

function readJson(file, fallback) {
  try { return JSON.parse(readFileSync(file, 'utf8')) } catch { return fallback }
}
const state = () => readJson(STATE_FILE, {})
function saveState(patch) {
  mkdirSync(LOCAL, { recursive: true })
  writeFileSync(STATE_FILE, JSON.stringify({ ...state(), ...patch }, null, 2))
}

const sha256File = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')
const sha256 = (s) => createHash('sha256').update(s).digest('hex')

/**
 * Downloads a file with the system's curl (built into Windows 10 and 11, and macOS): it follows
 * redirects, uses the computer's proxy settings, retries, and resumes a broken download on the next
 * start. Then checks its SHA-256; a mismatch is deleted and refused.
 */
async function download(url, dest, expected, label) {
  mkdirSync(dirname(dest), { recursive: true })
  const tmp = `${dest}.part`
  say(`  Downloading ${label}`)
  const r = spawnSync('curl', ['-fL', '--retry', '5', '--retry-delay', '3', '--progress-bar', '-C', '-', '-o', tmp, url], { stdio: ['ignore', 'inherit', 'inherit'] })
  if (r.error) fail(`Couldn't run curl to download ${label} (${r.error.code}). This needs Windows 10 (version 1803 or newer), Windows 11 or macOS.`)
  if (r.status !== 0) fail(`Couldn't download ${label} (curl error ${r.status}). Check the internet connection and start again: the download continues where it stopped.`)
  const digest = await new Promise((done, reject) => {
    const h = createHash('sha256')
    createReadStream(tmp).on('data', (c) => h.update(c)).on('end', () => done(h.digest('hex'))).on('error', reject)
  })
  if (expected && digest !== expected) {
    rmSync(tmp, { force: true })
    fail(`${label} didn't match its expected checksum, so it wasn't used. Start again; if it happens twice, tell Claude.`)
  }
  renameSync(tmp, dest)
  say(`  ${label}: done (${(statSync(dest).size / 1e6).toFixed(0)} MB)`)
}

/** Unpacks a .zip or .tar.gz with the system's tar (built into Windows 10 and 11, and macOS). */
function unpack(archive, into) {
  mkdirSync(into, { recursive: true })
  const r = spawnSync('tar', ['-xf', archive, '-C', into], { stdio: 'pipe' })
  if (r.status !== 0) fail(`Couldn't unpack ${archive}: ${String(r.stderr).trim()}`)
}

function findFile(dir, name) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isFile() && e.name === name) return p
    if (e.isDirectory()) { const f = findFile(p, name); if (f) return f }
  }
  return null
}

/** Environment for every process: the portable Node first on PATH, and the project's .env.local. */
function childEnv(extra = {}) {
  const sep = WIN ? ';' : ':'
  const env = { ...process.env, ...readEnvFile(), ...extra }
  const pathKey = Object.keys(env).find((k) => k.toUpperCase() === 'PATH') ?? 'PATH'
  env[pathKey] = [dirname(process.execPath), env[pathKey]].filter(Boolean).join(sep)
  return env
}

/** Runs a command to completion, output to a log file. */
function run(label, cmd, args, { log, env, cwd = ROOT } = {}) {
  mkdirSync(LOGS, { recursive: true })
  const logFile = join(LOGS, `${log ?? label}.log`)
  const fd = openSync(logFile, 'a')
  writeFileSync(fd, `\n--- ${new Date().toISOString()} ${cmd} ${args.join(' ')}\n`)
  const r = spawnSync(cmd, args, { cwd, env: env ?? childEnv(), stdio: ['ignore', fd, fd], windowsHide: true })
  // Killed from outside (on a computer short of memory, the system stops the biggest program).
  if (r.signal) fail(`${label} was stopped before it finished, usually because the computer ran out of memory. Close other programs (especially browsers with many tabs) and start Mimix again.`, logFile)
  if (r.status !== 0) fail(`${label} didn't finish.`, logFile)
}

function readEnvFile() {
  if (!existsSync(ENV_FILE)) return {}
  const out = {}
  for (const line of readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (m && m[2] !== '') out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2')
  }
  return out
}

/** A fingerprint of the files a step depends on (paths, sizes and change times). */
function fingerprint(paths) {
  const h = createHash('sha256')
  const walk = (p) => {
    if (!existsSync(p)) return
    const s = statSync(p)
    if (s.isDirectory()) { for (const e of readdirSync(p).sort()) walk(join(p, e)) } else h.update(`${p}|${s.size}|${s.mtimeMs}\n`)
  }
  for (const p of paths) walk(join(ROOT, p))
  return h.digest('hex')
}

function portOpen(port) {
  return new Promise((done) => {
    const s = createConnection({ port, host: '127.0.0.1' })
    s.once('connect', () => { s.destroy(); done(true) })
    s.once('error', () => done(false))
    s.setTimeout(1000, () => { s.destroy(); done(false) })
  })
}

async function waitFor(check, seconds, isDead) {
  for (let i = 0; i < seconds * 2; i++) {
    if (await check()) return true
    if (isDead?.()) return false
    await new Promise((r) => setTimeout(r, 500))
  }
  return false
}

function alive(pid) {
  try { process.kill(pid, 0); return true } catch (e) { return e.code === 'EPERM' }
}

function openBrowser(url) {
  const [cmd, args] = WIN ? ['cmd', ['/c', 'start', '""', url]] : MAC ? ['open', [url]] : ['xdg-open', [url]]
  spawn(cmd, args, { stdio: 'ignore', detached: true, windowsHide: true }).on('error', () => {}).unref()
}

/* ------------------------------------------------------------------ set-up steps */

async function ensureTool(key, dest, label) {
  if (existsSync(dest)) return
  const tool = TOOLS[key]
  const [file, digest] = tool[PLATFORM]
  const tmpDir = join(LOCAL, 'downloads')
  const archive = join(tmpDir, file)
  await download(tool.url(file), archive, digest, label)
  mkdirSync(dirname(dest), { recursive: true })
  if (/\.(zip|tar\.gz)$/.test(file)) {
    const into = join(tmpDir, `${key}-unpacked`)
    rmSync(into, { recursive: true, force: true })
    unpack(archive, into)
    const found = findFile(into, exe(key === 'uv' ? 'uv' : 'stripe-mock'))
    if (!found) fail(`${label} was downloaded but its program wasn't inside.`)
    copyFileSync(found, dest)
    rmSync(into, { recursive: true, force: true })
  } else {
    copyFileSync(archive, dest)
  }
  rmSync(archive, { force: true })
  if (!WIN) chmodSync(dest, 0o755)
}

const CONSENT_ENV = `# How a clone's consent is taken. On this computer: "attest" = whatever you record or upload is
# cloned once you tick "I am the speaker, or have their written permission". "recording" adds the
# read-aloud check (the speaker reads a phrase, and it must match the samples). Keep "recording" for a
# public site until the lawyer clears it.
CLONE_CONSENT=attest
`
const CLONE_ENV = `# Voice cloning's speaker check: the CAM++ speaker model on the Kokoro server. Its pass mark
# (SPEAKER_MATCH) is set by double-clicking "Tune voice check"; until then it is 0.5. With
# CLONE_CONSENT=attest it is used only to refuse voices that were taken down.
SPEAKER_VERIFIER=neural
${CONSENT_ENV}`

/**
 * Brings a .env.local written by an earlier version up to date, keeping everything in it:
 * 0.8 adds voice cloning (KOKORO_FEATURES gains clone, plus the consent check's settings).
 */
function upgradeEnvFile() {
  if (!existsSync(ENV_FILE)) return false
  let text = readFileSync(ENV_FILE, 'utf8')
  if (/^\s*SPEAKER_VERIFIER\s*=/m.test(text)) {
    // 0.8.1: cloning without the read-aloud check on this computer.
    if (/^\s*CLONE_CONSENT\s*=/m.test(text)) return false
    writeFileSync(ENV_FILE, `${text.replace(/\s*$/, '')}\n\n# Added by Mimix 0.8.1 on ${new Date().toISOString().slice(0, 10)}.\n${CONSENT_ENV}`)
    return 'consent'
  }
  text = text.replace(/^(\s*KOKORO_FEATURES\s*=\s*)(.*)$/m, (_, k, v) => `${k}${[...new Set([...v.split(',').map((f) => f.trim()).filter(Boolean), 'clone'])].join(',')}`)
  text = `${text.replace(/\s*$/, '')}\n\n# Added by Mimix 0.8 on ${new Date().toISOString().slice(0, 10)}.\n${CLONE_ENV}`
  writeFileSync(ENV_FILE, text)
  return true
}

function makeEnvFile() {
  if (existsSync(ENV_FILE)) return false
  const r = (n = 32) => randomBytes(n).toString('base64url')
  writeFileSync(ENV_FILE, `# Mimix on this computer. Written by "Start Mimix" on ${new Date().toISOString().slice(0, 10)}.
# This file holds this computer's secrets. Keep it private: never share it or paste it anywhere.
# Git ignores it, so GitHub Desktop never uploads it. Delete it and start again to make new secrets
# (everyone is then signed out).

APP_URL=${APP_URL}
NEXT_PUBLIC_SITE_URL=${APP_URL}

# Secrets, made at random for this computer.
BETTER_AUTH_SECRET=${r(48)}
STORAGE_SIGNING_KEY=${r(48)}
APP_ENCRYPTION_KEY=${randomBytes(32).toString('base64')}
CRON_SECRET=${r(32)}

# The platform Owner. Open ${APP_URL}/admin/setup and enter this token once to choose your password.
ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_SETUP_TOKEN=${r(32)}

# Real voices on this computer: the Kokoro server (local/py), with Speech to Text, the Voice Isolator
# and voice cloning (OpenVoice v2, with the CAM++ consent check).
VOICE_ENGINE=kokoro
MIXER_ENGINE_URL=http://127.0.0.1:${PORTS.kokoro}
MIXER_ENGINE_TOKEN=${r(32)}
KOKORO_FEATURES=transcribe,isolate,clone
WHISPER_MODEL=small
${CLONE_ENV}
# Local stand-ins: a pretend Stripe (no payments), emails saved as files in .data/outbox, jobs in the app.
STRIPE_API_BASE=http://127.0.0.1:${PORTS.stripe}
EMAIL_DRIVER=outbox
QUEUE_DRIVER=inline
FORMS_DELIVERY=log
`)
  return true
}

async function setup() {
  if (!PATHS.npm) fail('npm was not found next to Node.js. Delete the "local" folder and start again.')
  mkdirSync(LOGS, { recursive: true })
  const s = state()

  if (makeEnvFile()) say('\n  Made .env.local with new secrets for this computer.')
  else {
    const up = upgradeEnvFile()
    if (up === 'consent') say('\n  Voice cloning no longer asks for a read-aloud recording on this computer (CLONE_CONSENT=attest in .env.local, new in 0.8.1).')
    else if (up) say('\n  Turned on voice cloning in .env.local (new in 0.8).')
  }

  const lock = sha256File(join(ROOT, 'package-lock.json'))
  if (s.packages !== lock || !existsSync(PATHS.next)) {
    step('Installing the app\'s packages (about 5 minutes the first time)')
    run('Installing packages', PATHS.node, [PATHS.npm, 'ci', '--no-audit', '--no-fund'], { log: 'install' })
    saveState({ packages: lock, build: null })
  }

  step('Checking the voice engine')
  await ensureTool('uv', PATHS.uv, 'uv (Python installer)')
  const reqFiles = ['requirements.txt', 'requirements-stt.txt'].map((f) => join(ROOT, 'engines', 'kokoro', f))
  const cloneReq = join(ROOT, 'engines', 'kokoro', 'requirements-clone.txt')
  const reqs = sha256([...reqFiles, cloneReq].map((f) => readFileSync(f, 'utf8')).join('\n') + PLATFORM)
  const uvEnv = childEnv({ UV_PYTHON_INSTALL_DIR: join(LOCAL, 'python'), UV_CACHE_DIR: join(LOCAL, 'cache', 'uv'), UV_PYTHON_PREFERENCE: 'only-managed' })
  const wantsClone = (readEnvFile().KOKORO_FEATURES ?? '').split(',').map((f) => f.trim()).includes('clone')
  const fresh = state().python !== reqs || !existsSync(PATHS.python)
  if (fresh) {
    say('  Installing Python 3.12 and the Kokoro engine (about 3 minutes the first time)')
    run('Installing Python', PATHS.uv, ['python', 'install', '3.12'], { log: 'python', env: uvEnv })
    if (!existsSync(PATHS.python)) run('Making the Python environment', PATHS.uv, ['venv', join(LOCAL, 'py'), '--python', '3.12'], { log: 'python', env: uvEnv })
    run('Installing the Kokoro engine', PATHS.uv, ['pip', 'install', '--python', PATHS.python, ...reqFiles.flatMap((f) => ['-r', f])], { log: 'python', env: uvEnv })
    saveState({ python: reqs, cloneDeps: null })
  }
  // Voice cloning's packages separately, so a failure there leaves the rest working (retried at each start).
  if (wantsClone && state().cloneDeps !== true) {
    say('  Installing voice cloning (PyTorch for the processor, about 2 minutes the first time)')
    try {
      // --torch-backend cpu: PyTorch without the 3 GB of NVIDIA libraries.
      run('Installing voice cloning', PATHS.uv, ['pip', 'install', '--python', PATHS.python, '--torch-backend', 'cpu', '-r', cloneReq], { log: 'python', env: uvEnv })
      saveState({ cloneDeps: true })
    } catch (e) {
      if (!(e instanceof Stop)) throw e
      saveState({ cloneDeps: false })
      cloneNote = 'Voice cloning is off today: its packages could not be installed (see local/logs/python.log). Start again later to retry.'
    }
  }
  for (const [file, digest] of MODELS) {
    const dest = join(LOCAL, 'models', file)
    if (!existsSync(dest)) await download(`${KOKORO_RELEASE}/${file}`, dest, digest, `Kokoro voice model (${file})`)
  }
  await ensureCloneModels()
  await ensureTool('deepFilter', PATHS.deepFilter, 'DeepFilterNet (Voice Isolator)')
  await ensureTool('stripeMock', PATHS.stripeMock, 'stripe-mock (pretend Stripe)')
}

/** Downloads the cloning models when KOKORO_FEATURES has clone. A failed download turns cloning off for today. */
let cloneNote = null
async function ensureCloneModels() {
  if (!(readEnvFile().KOKORO_FEATURES ?? '').split(',').map((f) => f.trim()).includes('clone') || cloneNote) return
  try {
    for (const [file, url, digest, label] of CLONE_MODELS) {
      const dest = join(LOCAL, 'models', file)
      if (!existsSync(dest)) await download(url, dest, digest, label)
    }
  } catch (e) {
    if (!(e instanceof Stop)) throw e
    cloneNote = `Voice cloning is off today: ${e.message.replace(/\s+Details:.*$/s, '')}`
  }
}
const cloneModelsReady = () => state().cloneDeps === true && CLONE_MODELS.every(([file]) => existsSync(join(LOCAL, 'models', file)))

/* ------------------------------------------------------------------ graphics card (NVIDIA) */

/**
 * GPU engines Mimix can run next to Kokoro (GPU_ENGINE in .env.local). Both clone voices and speak more
 * languages; both licences allow commercial use. Memory needs are from their model cards, rounded up.
 * Neither has been run on a GPU by Claude yet (its workspace has none): treat the first run as a test.
 */
const GPU_ENGINES = {
  chatterbox: { label: 'Chatterbox Multilingual (Resemble AI, MIT licence)', languages: '23 languages, including Arabic, Chinese, Hindi, Japanese, Korean and Malay', minGb: 8, download: 'about 6 GB', python: '3.11', dir: 'chatterbox' },
  voxcpm: { label: 'VoxCPM2 (OpenBMB, Apache-2.0 licence)', languages: '30 languages', minGb: 10, download: 'about 8 GB', python: '3.12', dir: 'voxcpm' },
}

/** Asks nvidia-smi (installed with every NVIDIA driver) what graphics card this computer has. */
function detectGpu() {
  if (MAC) return { found: false, reason: 'mac' }
  const tools = WIN ? ['nvidia-smi', 'C:\\Windows\\System32\\nvidia-smi.exe', 'C:\\Program Files\\NVIDIA Corporation\\NVSMI\\nvidia-smi.exe'] : ['nvidia-smi']
  for (const tool of tools) {
    const r = spawnSync(tool, ['--query-gpu=name,memory.total,driver_version', '--format=csv,noheader,nounits'], { encoding: 'utf8', windowsHide: true, timeout: 20_000 })
    if (r.status !== 0 || !r.stdout?.trim()) continue
    const cards = r.stdout.trim().split(/\r?\n/).map((line) => {
      const [name, mem, driver] = line.split(',').map((x) => x.trim())
      return { name, memoryGb: Math.round((Number(mem) / 1024) * 10) / 10, driver }
    })
    const best = cards.reduce((a, b) => (b.memoryGb > a.memoryGb ? b : a))
    const cuda = spawnSync(tool, [], { encoding: 'utf8', windowsHide: true, timeout: 20_000 }).stdout?.match(/CUDA Version:\s*([\d.]+)/)?.[1] ?? null
    return { found: true, ...best, cuda, count: cards.length }
  }
  return { found: false, reason: 'none' }
}

const fits = (gpu, key) => gpu.found && gpu.memoryGb >= GPU_ENGINES[key].minGb

function report(gpu) {
  if (!gpu.found) {
    say(gpu.reason === 'mac'
      ? '  Graphics card: Macs have no NVIDIA graphics card, so Mimix runs its voices on the processor.'
      : '  Graphics card: no NVIDIA graphics card found (nvidia-smi didn\'t answer). Mimix runs its voices on the processor.')
    return
  }
  say(`  Graphics card: ${gpu.name}, ${gpu.memoryGb} GB of graphics memory, NVIDIA driver ${gpu.driver}${gpu.cuda ? ` (CUDA ${gpu.cuda})` : ''}${gpu.count > 1 ? `, ${gpu.count} cards (using the largest)` : ''}.`)
  for (const [key, e] of Object.entries(GPU_ENGINES)) {
    say(`    ${fits(gpu, key) ? 'Can run' : 'Too little memory for'} ${e.label}: ${e.languages}, voice cloning. Needs ${e.minGb} GB.`)
  }
}

/** Offers the GPU engines once (60 seconds to answer; no answer = not now). The choice goes in .env.local. */
async function askGpu(gpu) {
  const options = Object.keys(GPU_ENGINES).filter((k) => fits(gpu, k))
  if (!options.length || !process.stdin.isTTY) return null
  say('\n  Use the graphics card for cloning and more languages? Kokoro keeps reading the Voice Library.')
  options.forEach((k, i) => say(`    ${i + 1}  ${GPU_ENGINES[k].label}: ${GPU_ENGINES[k].languages}. Downloads ${GPU_ENGINES[k].download} once.`))
  say('    0  Not now (you can change GPU_ENGINE in .env.local later)')
  const { createInterface } = await import('node:readline/promises')
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const timer = setTimeout(() => rl.close(), 60_000)
  let answer = ''
  try { answer = (await rl.question('  Type a number and press Enter: ')).trim() } catch { /* no answer in time */ } finally { clearTimeout(timer); rl.close() }
  return options[Number(answer) - 1] ?? 'off'
}

/** Sets one line in .env.local, keeping the rest. */
function setEnvLine(key, value) {
  const text = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, 'utf8') : ''
  const line = `${key}=${value}`
  const re = new RegExp(`^\\s*${key}\\s*=.*$`, 'm')
  writeFileSync(ENV_FILE, re.test(text) ? text.replace(re, line) : `${text.replace(/\s*$/, '')}\n\n# Graphics-card engine: off, chatterbox or voxcpm (chosen at start-up).\n${line}\n`)
}

const gpuPython = () => (WIN ? join(LOCAL, 'py-gpu', 'Scripts', 'python.exe') : join(LOCAL, 'py-gpu', 'bin', 'python'))

/** Installs the chosen GPU engine in its own Python (local/py-gpu), with the PyTorch build for this driver. */
function setupGpu(key) {
  const e = GPU_ENGINES[key]
  const req = join(ROOT, 'engines', e.dir, 'requirements.txt')
  const digest = sha256(readFileSync(req, 'utf8') + key + PLATFORM)
  if (state().gpuPython === digest && existsSync(gpuPython())) return
  say(`  Installing ${e.label} for the graphics card (${e.download}; 10 to 30 minutes the first time)`)
  const uvEnv = childEnv({ UV_PYTHON_INSTALL_DIR: join(LOCAL, 'python'), UV_CACHE_DIR: join(LOCAL, 'cache', 'uv'), UV_PYTHON_PREFERENCE: 'only-managed' })
  rmSync(join(LOCAL, 'py-gpu'), { recursive: true, force: true })
  run('Installing Python for the graphics card', PATHS.uv, ['python', 'install', e.python], { log: 'gpu-python', env: uvEnv })
  run('Making the graphics-card Python environment', PATHS.uv, ['venv', join(LOCAL, 'py-gpu'), '--python', e.python], { log: 'gpu-python', env: uvEnv })
  // --torch-backend auto: uv picks the PyTorch build that matches this computer's NVIDIA driver.
  run(`Installing ${e.label}`, PATHS.uv, ['pip', 'install', '--python', gpuPython(), '--torch-backend', 'auto', '-r', req], { log: 'gpu-python', env: uvEnv })
  saveState({ gpuPython: digest })
}

/** Two reference clips Kokoro reads for Chatterbox's built-in voices (library voices in other languages). */
async function writeBuiltinVoices(dir) {
  const token = readEnvFile().MIXER_ENGINE_TOKEN
  const text = 'Hello, and welcome. This is the voice you will hear when no other voice is chosen. It reads every language this engine speaks, calmly and clearly.'
  mkdirSync(dir, { recursive: true })
  for (const [name, voice] of [['builtin-low', 'am_michael'], ['builtin-high', 'af_heart']]) {
    const file = join(dir, `${name}.wav`)
    if (existsSync(file)) continue
    const res = await fetch(`http://127.0.0.1:${PORTS.kokoro}/v1/tts`, { method: 'POST', headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ text, recipe: `${voice}:1` }) })
    if (!res.ok) throw new Stop(`Kokoro couldn't read the built-in voice (${res.status}).`)
    writeFileSync(file, Buffer.from(await res.arrayBuffer()))
  }
}

/** Starts the GPU engine; returns false (and Mimix carries on without it) when it can't. */
async function startGpu(key) {
  const e = GPU_ENGINES[key]
  const token = readEnvFile().MIXER_ENGINE_TOKEN
  const voices = join(LOCAL, 'gpu-voices', key)
  try {
    setupGpu(key)
    if (key === 'chatterbox') await writeBuiltinVoices(join(voices, 'builtin'))
  } catch (err) {
    if (!(err instanceof Stop)) throw err
    return { ok: false, note: `The graphics-card engine is off today: ${err.message.replace(/\s+Details:.*$/s, '')} (see local/logs/gpu-python.log).` }
  }
  const env = childEnv({ MIMIX_ENGINE_TOKEN: token, VOICES_DIR: voices, BUILTIN_DIR: join(voices, 'builtin'), FEATURES: 'clone', HF_HOME: join(LOCAL, 'models', 'hf'), PYTHONUNBUFFERED: '1' })
  const g = startProcess('gpu', gpuPython(), ['-m', 'uvicorn', 'server:app', '--app-dir', join(ROOT, 'engines', e.dir), '--host', '127.0.0.1', '--port', String(PORTS.gpu)], { env })
  g.expectedExit = true
  if (!state().gpuReady) say(`  The first start downloads ${e.label.split(' (')[0]}'s model (${e.download}) from huggingface.co.`)
  const healthy = () => fetch(`http://127.0.0.1:${PORTS.gpu}/v1/health`, { headers: { authorization: `Bearer ${token}` } }).then((r) => r.ok).catch(() => false)
  if (await waitFor(healthy, state().gpuReady ? 300 : 3600, () => g.exited)) {
    g.expectedExit = false
    saveState({ gpuReady: true })
    return { ok: true }
  }
  killTree(g.child.pid)
  await waitFor(() => g.exited, 10)
  children.splice(children.indexOf(g), 1)
  return { ok: false, note: 'The graphics-card engine is off today: it didn\'t start (see local/logs/gpu.log). Mimix runs on the processor.' }
}

/* ------------------------------------------------------------------ running */

const children = []
let stopping = false

function startProcess(name, cmd, args, { env, cwd = ROOT } = {}) {
  const logFile = join(LOGS, `${name}.log`)
  const fd = openSync(logFile, 'a')
  writeFileSync(fd, `\n--- ${new Date().toISOString()} start\n`)
  const child = spawn(cmd, args, { cwd, env: env ?? childEnv(), stdio: ['ignore', fd, fd], windowsHide: true })
  const entry = { name, child, logFile, exited: false }
  child.on('exit', (code) => {
    entry.exited = true
    if (!stopping && !entry.expectedExit) {
      console.error(`\n  ${name} stopped unexpectedly (code ${code}). Details: ${logFile}`)
      shutdown(1)
    }
  })
  children.push(entry)
  writeRunFile()
  return entry
}

function writeRunFile() {
  writeFileSync(RUN_FILE, JSON.stringify({ pid: process.pid, children: children.filter((c) => !c.exited).map((c) => ({ name: c.name, pid: c.child.pid })) }, null, 2))
}

function killTree(pid) {
  if (!pid || !alive(pid)) return
  if (WIN) spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true })
  else try { process.kill(pid, 'SIGTERM') } catch {}
}

async function shutdown(code = 0) {
  if (stopping) return
  stopping = true
  say('\n  Stopping Mimix...')
  for (const c of [...children].reverse()) killTree(c.child.pid)
  await waitFor(() => children.every((c) => c.exited), 10)
  for (const c of children) if (!c.exited && !WIN) try { process.kill(c.child.pid, 'SIGKILL') } catch {}
  rmSync(RUN_FILE, { force: true })
  say('  Mimix is stopped.')
  process.exit(code)
}

/** The log of a process's latest run (after its last "--- ... start" line). */
function lastRun(name) {
  try {
    const text = readFileSync(join(LOGS, `${name}.log`), 'utf8')
    return text.slice(text.lastIndexOf('\n--- '))
  } catch { return '' }
}

async function startKokoro(features) {
  const e = readEnvFile()
  const env = childEnv({
    MIMIX_MIXER_TOKEN: e.MIXER_ENGINE_TOKEN, MODELS_DIR: join(LOCAL, 'models'), DEEP_FILTER_BIN: PATHS.deepFilter,
    KOKORO_FEATURES: features.join(','), WHISPER_MODEL: e.WHISPER_MODEL || 'small', HF_HOME: join(LOCAL, 'models', 'hf'),
    PYTHONUNBUFFERED: '1',
  })
  const k = startProcess('kokoro', PATHS.python, ['-m', 'uvicorn', 'server:app', '--app-dir', join(ROOT, 'engines', 'kokoro'), '--host', '127.0.0.1', '--port', String(PORTS.kokoro)], { env })
  k.expectedExit = true // judged below; a crash after start-up is reported by the health check loop
  const healthy = () => fetch(`http://127.0.0.1:${PORTS.kokoro}/v1/health`).then((r) => r.ok).catch(() => false)
  // The first start with Speech to Text downloads the Whisper model (about 500 MB).
  const ok = await waitFor(healthy, features.includes('transcribe') ? 900 : 180, () => k.exited)
  if (ok) { k.expectedExit = false; return true }
  killTree(k.child.pid)
  await waitFor(() => k.exited, 10)
  children.splice(children.indexOf(k), 1)
  return false
}

async function start() {
  const prior = readJson(RUN_FILE, null)
  if (prior && alive(prior.pid)) {
    say(`Mimix is already running. Opening ${APP_URL}`)
    openBrowser(APP_URL)
    return
  }
  for (const [name, port] of Object.entries(PORTS)) {
    if (await portOpen(port)) fail(`Another program is using port ${port} (needed for ${name}). Double-click "Stop Mimix", or restart the computer, then start again.`)
  }

  say('Starting Mimix. Keep this window open while you use it; close it (or double-click "Stop Mimix") to stop.')
  const firstRun = !existsSync(PATHS.python) || !existsSync(join(ROOT, 'node_modules'))
  if (firstRun) say('The first start sets everything up: it downloads about 2 GB and takes 15 to 30 minutes.')
  await setup()

  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK']) process.on(sig, () => shutdown(0))
  writeRunFile()

  step('Starting the database')
  startProcess('database', PATHS.node, [join(ROOT, 'scripts', 'db-server.mjs')])
  if (!(await waitFor(() => portOpen(PORTS.db), 60))) fail('The database didn\'t start.', join(LOGS, 'database.log'))
  run('Updating the database', PATHS.node, [join(ROOT, 'scripts', 'migrate.mjs')], { log: 'database-update' })
  if (!state().ownerSeeded) {
    run('Creating the Owner account', PATHS.node, [PATHS.tsx, '--conditions=react-server', join(ROOT, 'scripts', 'seed-admin.ts')], { log: 'owner' })
    saveState({ ownerSeeded: true })
  }

  startProcess('stripe-mock', PATHS.stripeMock, ['-http-port', String(PORTS.stripe)])

  step('Starting the voice engine (Kokoro)')
  let features = (readEnvFile().KOKORO_FEATURES ?? '').split(',').map((f) => f.trim()).filter(Boolean)
  if (features.includes('transcribe') && !state().whisperReady) say('  The first time, this downloads the Speech to Text model (about 500 MB) from huggingface.co.')
  const notes = []
  if (features.includes('clone') && !cloneModelsReady()) {
    features = features.filter((f) => f !== 'clone')
    notes.push(cloneNote ?? 'Voice cloning is off today: its models are not downloaded yet. Start again to retry.')
  }
  if (features.includes('clone') && !state().cloneReady) say('  Voice cloning is on: the first start loads its models, which takes a minute.')
  // If the engine won't start, try again without the extra its log blames (or, failing that, the extras
  // most likely to blame, one at a time). With CLONE_CONSENT=attest, cloning doesn't need Speech to Text.
  const attest = readEnvFile().CLONE_CONSENT === 'attest'
  const fallbacks = [
    ['clone', 'Voice cloning is off today: its models could not be loaded (see local/logs/kokoro.log). Start again later to retry.', /KOKORO_FEATURES=clone/],
    ['transcribe', `${attest ? 'Speech to Text and Dubbing are' : 'Speech to Text, Dubbing and voice cloning are'} off today: the Whisper model could not be downloaded or loaded (see local/logs/kokoro.log). Start again later to retry.`, /Whisper model/],
  ]
  while (!(await startKokoro(features))) {
    const log = lastRun('kokoro')
    const next = fallbacks.find(([f, , blame]) => features.includes(f) && blame.test(log)) ?? fallbacks.find(([f]) => features.includes(f))
    if (!next) fail('The voice engine didn\'t start.', join(LOGS, 'kokoro.log'))
    features = features.filter((f) => f !== next[0])
    notes.push(next[1])
  }
  if (features.includes('transcribe')) saveState({ whisperReady: true })
  if (features.includes('clone')) saveState({ cloneReady: true })

  step('Checking for a graphics card')
  const gpu = detectGpu()
  report(gpu)
  let gpuChoice = readEnvFile().GPU_ENGINE
  if (gpu.found && !gpuChoice) {
    gpuChoice = await askGpu(gpu)
    if (gpuChoice) setEnvLine('GPU_ENGINE', gpuChoice)
  }
  let gpuOn = false
  if (gpuChoice && GPU_ENGINES[gpuChoice]) {
    if (!fits(gpu, gpuChoice)) notes.push(`GPU_ENGINE=${gpuChoice} is set in .env.local, but ${gpu.found ? 'this graphics card has too little memory for it' : 'no NVIDIA graphics card was found'}, so it is off.`)
    else {
      step(`Starting the graphics-card engine (${GPU_ENGINES[gpuChoice].label.split(' (')[0]})`)
      const r = await startGpu(gpuChoice)
      gpuOn = r.ok
      if (r.note) notes.push(r.note)
    }
  }
  const gpuEnv = gpuOn
    ? { GPU_ENGINE: gpuChoice, GPU_ENGINE_URL: `http://127.0.0.1:${PORTS.gpu}`, GPU_ENGINE_TOKEN: readEnvFile().MIXER_ENGINE_TOKEN, GPU_ENGINE_FEATURES: 'clone' }
    : { GPU_ENGINE: 'off' }

  // The build bakes in public settings; rebuild when the code or .env.local changed.
  const buildInputs = fingerprint(['src', 'public', 'content', 'drizzle', 'next.config.ts', 'package-lock.json', 'tsconfig.json', 'postcss.config.mjs', '.env.local'])
  const appEnv = childEnv({ KOKORO_FEATURES: features.join(','), ...gpuEnv, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1' })
  if (state().build !== buildInputs || !existsSync(join(ROOT, '.next', 'BUILD_ID'))) {
    step('Building the app (about 3 to 5 minutes; only after an update)')
    run('Building the app', PATHS.node, [PATHS.next, 'build'], { log: 'build', env: appEnv })
    saveState({ build: buildInputs })
  }

  step('Starting the app')
  startProcess('app', PATHS.node, [PATHS.next, 'start', '-H', '127.0.0.1', '-p', String(PORTS.web)], { env: appEnv })
  const up = await waitFor(() => fetch(`${APP_URL}/api/health`).then((r) => r.status < 500).catch(() => false), 120, () => stopping)
  if (!up) fail('The app didn\'t start.', join(LOGS, 'app.log'))

  // Housekeeping every 60 seconds (what the hosted worker or Vercel Cron does).
  const secret = readEnvFile().CRON_SECRET
  setInterval(() => { fetch(`${APP_URL}/api/cron/sweep`, { headers: { authorization: `Bearer ${secret}` } }).catch(() => {}) }, 60_000).unref()
  watchOutbox()

  const e = readEnvFile()
  say(`
  ============================================================
   Mimix is running:  ${APP_URL}
  ============================================================
   Voices: Kokoro on this computer. Speech to Text ${features.includes('transcribe') ? 'on' : 'off'}, Voice Isolator ${features.includes('isolate') ? 'on' : 'off'}, voice cloning ${(features.includes('clone') || gpuOn) && (features.includes('transcribe') || attest) ? 'on' : 'off'}.
   Graphics card: ${gpuOn ? `${GPU_ENGINES[gpuChoice].label.split(' (')[0]} on ${gpu.name} (cloning and ${GPU_ENGINES[gpuChoice].languages})` : gpu.found ? `${gpu.name}, not used` : 'none, voices run on the processor'}.
   Emails (sign-up links, password resets) appear in this window and in .data/outbox.
   Owner set-up (once): open ${APP_URL}/admin/setup with
     Email: ${e.ADMIN_EMAIL}
     Setup token: in .env.local, the line ADMIN_SETUP_TOKEN
   To stop: close this window, or double-click "Stop Mimix".
  ============================================================`)
  for (const n of notes) say(`\n  Note: ${n}`)
  openBrowser(APP_URL)
  // Keep running; a process that stops unexpectedly stops the rest (startProcess).
  setInterval(() => {}, 1 << 30)
}

/** Prints each new email's subject and link, so sign-up and reset links are easy to open locally. */
function watchOutbox() {
  const dir = join(ROOT, '.data', 'outbox')
  const seen = new Set(existsSync(dir) ? readdirSync(dir) : [])
  setInterval(() => {
    if (!existsSync(dir)) return
    for (const f of readdirSync(dir)) {
      if (seen.has(f)) continue
      seen.add(f)
      const m = readJson(join(dir, f), null)
      const link = m?.text?.match(/https?:\/\/\S+/)?.[0]
      if (m) say(`\n  Email to ${m.to}: "${m.subject ?? m.tag}"${link ? `\n    Link: ${link}` : ''}`)
    }
  }, 2000).unref()
}

async function stop() {
  const r = readJson(RUN_FILE, null)
  if (!r || !alive(r.pid)) {
    // Nothing recorded as running: clean up any leftovers we started before.
    for (const c of r?.children ?? []) killTree(c.pid)
    rmSync(RUN_FILE, { force: true })
    say('Mimix is not running.')
    return
  }
  say('Stopping Mimix...')
  killTree(r.pid)
  await waitFor(() => !alive(r.pid), 15)
  for (const c of r.children) killTree(c.pid)
  rmSync(RUN_FILE, { force: true })
  say('Mimix is stopped.')
}

/**
 * Sets the consent check's pass mark from the Owner's own recordings (engines/kokoro/calibrate_verifier.py):
 * a folder with one subfolder per person, three or more recordings each. Writes SPEAKER_MATCH to .env.local.
 */
async function tune(folder) {
  if (!existsSync(PATHS.python) || !existsSync(join(LOCAL, 'models', CLONE_MODELS[0][0]))) {
    fail('Start Mimix once first, so the voice check is installed. Then run this again.')
  }
  if (!folder) {
    const { createInterface } = await import('node:readline/promises')
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    say('Choose a folder with one subfolder per person, each holding three or more recordings of that person (WAV or MP3).')
    folder = (await rl.question('Drag the folder into this window (or type its path), then press Enter: ')).trim().replace(/^(['"])(.*)\1$/, '$2').replace(/\\ /g, ' ')
    rl.close()
  }
  if (!folder || !existsSync(folder) || !statSync(folder).isDirectory()) fail(`That isn't a folder: ${folder || '(nothing chosen)'}`)
  say('\nMeasuring the recordings (about a second each)...\n')
  const r = spawnSync(PATHS.python, ['-I', join(ROOT, 'engines', 'kokoro', 'calibrate_verifier.py'), folder, '--env', ENV_FILE, '--models', join(LOCAL, 'models')], { stdio: 'inherit', env: childEnv(), windowsHide: true })
  if (r.status !== 0) process.exitCode = 1
}

/* ------------------------------------------------------------------ main */

const cmd = process.argv[2]
try {
  if (cmd === 'start') await start()
  else if (cmd === 'stop') await stop()
  else if (cmd === 'setup') { await setup(); say('\nSet-up is complete.') }
  else if (cmd === 'tune') await tune(process.argv[3])
  else if (cmd === 'gpu') report(detectGpu())
  else { say('Usage: node scripts/local/mimix-local.mjs start | stop | setup | tune [folder] | gpu'); process.exitCode = 2 }
} catch (e) {
  console.error(`\n  Mimix couldn't start: ${e instanceof Stop ? e.message : e.stack ?? e}`)
  console.error('  See "Common problems" in the local setup guide (docs/local-setup.md).')
  if (children.length) await shutdown(1)
  process.exitCode = 1
}
