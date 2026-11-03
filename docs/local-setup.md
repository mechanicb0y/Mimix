# Run Mimix on your own computer

This guide runs the whole of Mimix on one Windows or Mac computer: the website, the app, the admin console and real voices from Kokoro. You need no accounts, no keys and no administrator password. Nothing is installed on the system. Everything goes into one folder inside the project, and deleting that folder removes it.

You never type into a terminal. You double-click **Start Mimix** to start it and **Stop Mimix** to stop it.

> **Marked steps.** Claude tested the start and stop files on Linux, from a clean copy of the project, using the same launcher that Windows and Mac use. Claude couldn't run Windows or a Mac in its workspace. A step marked **(untested here)** has not been seen working on those systems yet. If one of them goes wrong, the "Common problems" section says what to do.

## What you need

- **Windows 10** (version 1803 or newer) or **Windows 11**, 64-bit. Or a **Mac** with macOS 14 (Sonoma) or newer. An older Intel Mac on macOS 13 should also work **(untested here)**.
- 8 GB of memory (16 GB is more comfortable) and about 8 GB of free disk space.
- An internet connection for the first start, which downloads about 2.5 GB. After that, Mimix runs without the internet.
- Optional: an **NVIDIA graphics card** with 8 GB of graphics memory or more, for the graphics-card engines (see "Using a graphics card"). Mimix works without one.
- GitHub Desktop, which you already have.
- A free authenticator app on your phone for the Owner's two-factor sign-in, for example Bitwarden Authenticator, Google Authenticator or Microsoft Authenticator.
- Optional: a free password manager such as **Bitwarden** for your Mimix password and recovery codes.

## Step 1. Get the code with GitHub Desktop

**If you already put Mimix on GitHub** (launch checklist step 1.2):

1. Unzip the new checkpoint zip.
2. Open its `app` folder, select everything inside it, and copy it into your project folder (the folder you added to GitHub Desktop). When asked, choose **Replace the files**.
3. In GitHub Desktop, type a summary such as `Run Mimix locally`, click **Commit to main**, then click **Push origin**.

**On a computer that doesn't have the project yet:**

1. In GitHub Desktop, choose **File, Clone repository**.
2. On the **GitHub.com** tab, pick **mimix**. Leave the local path as it is (usually `Documents\GitHub\mimix` on Windows or `Documents/GitHub/mimix` on a Mac), then click **Clone**.
3. Choose **Repository, Show in Explorer** (Windows) or **Repository, Show in Finder** (Mac). This is your project folder.

You'll see six files at the top of the project folder: **Start Mimix**, **Stop Mimix** and **Tune voice check**, one set for Windows (`.cmd`) and one for Mac (`.command`).

## Step 2. The first start (sets everything up)

**Windows**

1. In the project folder, double-click **Start Mimix** (the one Windows lists as "Windows Command Script").
2. A black window opens. If Windows shows "Windows protected your PC", click **More info**, then **Run anyway** **(untested here)**. Files that GitHub Desktop downloads normally don't trigger this warning.

**Mac**

1. In the project folder, Control-click (or right-click) **Start Mimix.command** and choose **Open**.
2. If macOS asks whether you're sure, click **Open**. You only need to do this the first time **(untested here)**.
3. A Terminal window opens.

**Then, on both:** leave the window open and wait. The first start takes **15 to 30 minutes**, depending on your internet. It shows each step as it goes:

1. Downloads a private copy of Node.js (the program that runs the app) into the project's `local` folder, and checks it.
2. Writes **`.env.local`**, the settings file with fresh secrets for this computer (step 3).
3. Installs the app's packages, including ffmpeg for audio.
4. Installs a private Python 3.12 and the Kokoro voice engine, using uv.
5. Installs voice cloning: PyTorch for the processor (about 200 MB) and sherpa-onnx.
6. Downloads the Kokoro voice model (about 350 MB), the consent check's speaker model (30 MB, from GitHub), OpenVoice v2's voice converter (131 MB, from huggingface.co **(untested here)**), DeepFilterNet for the Voice Isolator, and stripe-mock (a pretend Stripe).
7. Starts the database and creates your Owner account.
8. Starts Kokoro. The first time, it also downloads the Speech to Text model (Whisper "small", about 500 MB) from huggingface.co **(untested here: Claude's workspace can't reach huggingface.co)**.
9. Looks for an NVIDIA graphics card and tells you what it found. If it finds one with enough memory, it asks once whether to use it (see "Using a graphics card").
10. Builds the app (3 to 5 minutes) and opens **http://localhost:3000** in your browser.

Every download is checked against a fingerprint (SHA-256) written in the launcher, and anything that doesn't match is thrown away. If the internet drops, start again: downloads continue where they stopped.

When it's ready, the window shows a box that starts with **Mimix is running**.

## Step 3. Your settings file, .env.local

The first start writes `.env.local` in the project folder. It holds this computer's secrets: the sign-in secret, the encryption key, the voice engine token and your one-time Owner setup token.

- **Keep it private.** Don't send it or paste it anywhere, including into a chat with Claude. Git ignores it, so GitHub Desktop never uploads it.
- **To see it:** on Windows, open it with Notepad. On a Mac, Finder hides files that start with a dot, so press **Command, Shift and full stop** together in the project folder to show them, then open it with TextEdit.
- **To change a setting:** edit the line, save, then stop and start Mimix. For example, `KOKORO_FEATURES=isolate,clone` turns Speech to Text off (and with it cloning, which needs it).
- **If you set Mimix up with 0.7,** the first 0.8 start adds the cloning lines to your `.env.local` (`clone` in `KOKORO_FEATURES`, and `SPEAKER_VERIFIER=neural`). Everything else in it stays as it was.
- **To make new secrets:** stop Mimix, delete `.env.local` and start again. Everyone is then signed out.

## Step 4. Create your Owner account

1. Open `.env.local` and copy the value after `ADMIN_SETUP_TOKEN=`.
2. In your browser, go to **http://localhost:3000/admin/setup**.
3. Fill in the form:
   - **Owner email:** the `ADMIN_EMAIL` value in `.env.local` (`owner@example.com` unless you set `MIMIX_OWNER_EMAIL` before the first start). You can change it later in **Settings, Profile**.
   - **Setup token:** paste the value from step 1.
   - **New password:** choose one (at least 10 characters) and save it in Bitwarden.
4. Click **Set password**, then **Sign in**.
5. Go to **Settings, Security** and turn on two-factor sign-in with your authenticator app. Save the recovery codes in Bitwarden.
6. Open **http://localhost:3000/admin** for the admin console.

The setup token works once. If you lose your password later, the admin guide explains the reset.

**Other people's accounts** (for trying Mimix as a customer): sign up at http://localhost:3000/sign-up with any email address. Mimix doesn't send real email on your computer. Each email it would send appears in the Mimix window with its link, and is also saved in the `.data/outbox` folder. Open the link to confirm the account.

## Step 5. Every day: start and stop

- **Start:** double-click **Start Mimix**. After the first time it takes about a minute, then your browser opens http://localhost:3000.
- **Stop:** close the Mimix window, or double-click **Stop Mimix**. Both stop everything: the app, the database, Kokoro, the graphics-card engine if it is on, and stripe-mock.
- **If you double-click Start while Mimix is already running,** it opens the browser instead of starting twice.
- **After an update:** in GitHub Desktop click **Fetch origin**, then **Pull origin**. The next start notices the change, reinstalls what changed and rebuilds the app (3 to 5 minutes).
- **Your data** (database, audio, emails) is in the `.data` folder. To back it up, stop Mimix and copy the `.data` folder somewhere safe.
- **To remove Mimix's tools,** stop Mimix and delete the `local` folder. The next start sets them up again.

Everything listens on this computer only, so other computers on your network can't open it and no firewall prompt should appear.

## Step 6. Voice cloning and Tune voice check

Cloning works like this on your computer: upload or record 10 seconds to 5 minutes of one person's voice, tick **"I am the speaker in these recordings, or I have their written permission"**, and choose **Create voice**. The voice is ready about a minute later. Mimix keeps your confirmation, with the time, as the voice's consent record. To speak, Kokoro reads the text with a voice close to the speaker's pitch, and OpenVoice v2 gives it the speaker's timbre.

This is the `CLONE_CONSENT=attest` setting, which the launcher writes into `.env.local` (0.8.1). The other setting, `CLONE_CONSENT=recording`, adds a read-aloud step: the speaker reads a random phrase, Mimix checks the words with Speech to Text and checks that the reader is the person in the samples with a speaker model (3D-Speaker's CAM++), and only then makes the voice. Use `recording` for a public site (see the launch checklist). The steps below tune that speaker check, so you only need them with `recording`.

The speaker check passes a recording when it scores at least the **pass mark** (0.5 to start with). Set it from your own recordings, so it suits your microphones and rooms:

1. Make a folder, with one folder inside it for each person (at least 2 people, 5 or more is better). Name each inner folder after the person.
2. Put at least 3 recordings of that person in their folder: WAV or MP3, 5 to 60 seconds each, any words, made on the phones and laptops your customers are likely to use. Ask each person first.
3. Stop Mimix. Then on Windows drag the outer folder onto **Tune voice check.cmd**. On a Mac double-click **Tune voice check.command** and drag the folder into the window, then press Return.
4. It plays the consent check for every recording and prints the scores, the pass mark it chose, and how many same-person checks would have been refused. It saves the mark in `.env.local` as `SPEAKER_MATCH`.
5. Start Mimix again. **Admin, System** shows the pass mark and when it was tuned.

The recordings stay on your computer; Tune voice check doesn't copy them anywhere.

## Using a graphics card

Each start looks for an NVIDIA graphics card (with `nvidia-smi`, which comes with NVIDIA's driver) and shows what it found, for example:

```
Graphics card: NVIDIA GeForce RTX 3060, 12 GB of graphics memory, NVIDIA driver 566.03 (CUDA 12.7).
  Can run Chatterbox Multilingual (Resemble AI, MIT licence): 23 languages, including Arabic, Chinese, Hindi, Japanese, Korean and Malay, voice cloning. Needs 8 GB.
  Can run VoxCPM2 (OpenBMB, Apache-2.0 licence): 30 languages, voice cloning. Needs 10 GB.
```

The first time, it asks which to use. Type its number and press Enter (or 0 for not now). Your choice is saved in `.env.local` as `GPU_ENGINE` (`chatterbox`, `voxcpm` or `off`); change it there to switch. The chosen engine downloads 6 to 8 GB the first time.

With a graphics-card engine on, Kokoro still reads the Voice Library, the Mixer and Voice Design. New cloned voices are made on the graphics card, and text in a language Kokoro doesn't speak (for example Arabic, German, Korean or Malay) is read there. **(Untested here: Claude's workspace has no graphics card.)** On a Mac, or without an NVIDIA card, Mimix runs everything on the processor.

## What works on your computer

| Feature | On your computer | What it needs to work fully |
|---|---|---|
| Website, sign-up, sign-in, settings, team | Works | Nothing |
| Text to Speech and Studio | Works with real Kokoro voices: 9 of the 12 library voices plus all 54 Kokoro voices. English (US and UK), Spanish, French, Hindi, Italian, Brazilian Portuguese, Mandarin and Japanese | Arabic, German and Malay library voices (Noor, Bram, Aisyah) are hidden unless a graphics-card engine is on. More languages: `docs/languages.md` |
| Voice Mixer | Works: blend library voices and Kokoro voices, save mixes | Mixing your own cloned voices comes later |
| Speech to Text | Works once the Whisper model has downloaded **(untested here)**. Every line is labelled "Speaker 1" | Telling speakers apart needs another engine |
| Voice Isolator | Works (DeepFilterNet). Tested here: a noisy clip went from 7 dB to 15 dB signal-to-noise | Nothing |
| Dubbing | Transcribes and re-voices, but the "translation" only tags each line with its language | A Google Cloud Translation key (`TRANSLATOR=google`) |
| Voice cloning | Works (instant clones) once OpenVoice v2 has downloaded **(untested here with OpenVoice v2's own weights)**: your tick is the consent (`CLONE_CONSENT=attest`). With `CLONE_CONSENT=recording` it also needs Speech to Text, and **Tune voice check** sets its speaker check | Professional clones (trained on long recordings) need an engine that trains |
| Voice Design | Works: three Kokoro blends from your description and choices (gender, age, accent, pitch, pace, tone) | Designing from free text alone needs VoxCPM2 or Inworld |
| Voice Changer | Off | A voice conversion engine |
| Sound Effects | Off | A sound effects engine (ElevenLabs SFX licence, or Stable Audio) |
| Plans and billing | Pages open with a pretend Stripe; no real payment can be made | A Stripe account and keys |
| Email | Shown in the Mimix window and saved in `.data/outbox` | A Resend account and key |
| "Continue with Google" | Off | A Google sign-in client ID and secret |
| Developer API and API keys | Works at http://localhost:3000/api/v1 | Nothing |
| Admin console | Works after step 4 | An authenticator app |
| Error alerts, uptime check, nightly backup | Off | Sentry, and the GitHub workflows once it is hosted |

## Common problems

**1. "Couldn't download ..."**
The internet dropped, or the network blocks github.com or nodejs.org (some school and office networks do). Check the connection and double-click **Start Mimix** again: it continues where it stopped. If it fails again, try another network, for example a phone hotspot.

**2. "Another program is using port 3000" (or 5433, 8810, 8820, 12111)**
Mimix is probably still running in another window. Double-click **Stop Mimix**, then start again. If that doesn't help, restart the computer.

**3. Mac: "Start Mimix.command can't be opened" or "You do not have permission"**
- If it says it's from an unidentified developer: Control-click the file, choose **Open**, then **Open** again.
- If it says you don't have permission, the file lost its "can run" mark, usually because it was copied from a zip instead of coming through GitHub Desktop. Open **Terminal** (in Applications, Utilities), type `chmod +x ` (with a space after it), drag **Start Mimix.command** into the Terminal window, press Return, and do the same for **Stop Mimix.command**. You only need to do this once.

**4. Windows: "Windows protected your PC", or antivirus removes a file**
Click **More info**, then **Run anyway**. If your antivirus quarantines `deep-filter.exe`, `stripe-mock.exe` or `uv.exe` inside the `local` folder, restore it from the antivirus's quarantine list and start again. These files come from the official releases of DeepFilterNet, Stripe and Astral, and their fingerprints are checked before use. On a computer managed by a school or company, the administrator may need to allow them.

**5. "Speech to Text and Dubbing are off today"**
The Whisper model couldn't be downloaded from huggingface.co, often because the network blocks it. Mimix runs without it, and everything else works. Start again later or on another network to retry. To stop trying, change `KOKORO_FEATURES=transcribe,isolate` to `KOKORO_FEATURES=isolate` in `.env.local`.

**6. "Voice cloning is off today"**
Its packages or models couldn't be installed or downloaded (OpenVoice v2 comes from huggingface.co), or, with `CLONE_CONSENT=recording`, Speech to Text is off. Everything else works. Start again later or on another network. To stop trying, remove `clone` from `KOKORO_FEATURES` in `.env.local`.

**7. "The graphics-card engine is off today"**
Its packages or model couldn't be installed or downloaded, or it didn't start (see `local/logs/gpu.log` and `local/logs/gpu-python.log`). Mimix carries on with the processor. Updating the NVIDIA driver from nvidia.com often helps. To stop trying, set `GPU_ENGINE=off` in `.env.local`.

**8. "Building the app was stopped before it finished"**
The computer ran out of memory. Building after an update needs the most memory Mimix ever uses (several GB, for a few minutes). Close other programs, especially browsers with many tabs, and double-click **Start Mimix** again. If it keeps happening, restart the computer first.

**Anything else:** the window names the step that failed and points to a log file in `local/logs`. If you ask Claude for help, describe the message, but don't send `.env.local`.

## Later: putting Mimix online, free plans first

Run Mimix on your own computer until you want other people to use it. When you do, these are the free options and their limits. Plans change often, so check each pricing page again before you sign up (checked on 3 November 2026).

| Part | Free option | Can Mimix use it? |
|---|---|---|
| Website and app | Vercel Hobby | **No, once Mimix is a business.** Vercel says Hobby is for "non-commercial, personal use only". Fine for a private preview, not for paying customers |
| | Netlify Free | Allows commercial use, within a monthly credit pool. Not tested with Mimix yet |
| | Render Free | Allowed, but it sleeps after 15 minutes without visitors (about a minute to wake), has 750 hours a month, and Render says not to use it for production |
| Database and files | Supabase Free | Yes, within 500 MB of database and 1 GB of files per project, 2 projects. It pauses after a week with no activity, and has no daily backups |
| Voice engine server (Kokoro) | Railway | Only a one-off $5 trial for 30 days, then $1 of credit a month, which doesn't cover an always-on Kokoro server (it needs about 1 GB of memory). Keep Kokoro on your computer, or budget Railway's Hobby plan when you launch |
| Email | Resend Free | Yes: 3,000 emails a month, at most 100 a day |

**Where Mimix already covers a paid feature**

| Paid feature | What Mimix does instead |
|---|---|
| Supabase Pro daily backups | The nightly encrypted backup to GitHub (the `backup` workflow, launch checklist step 1) |
| Vercel Cron for the clean-up jobs | The housekeeping sweep runs every 60 seconds in the worker, or in the launcher on your computer, so the app doesn't need Vercel Cron |
| A paid uptime monitor | The GitHub `uptime` workflow checks `/api/health` every 10 minutes and emails on failure. Its visits also count as activity, which keeps a free Supabase project from pausing |
| A separate job server | Locally, jobs run inside the app (`QUEUE_DRIVER=inline`), so there is no Redis or worker to pay for until traffic needs it |
| Per-character voice costs | Kokoro runs on a normal computer's processor, with no per-character fee |

Sources: [Vercel Hobby plan](https://vercel.com/docs/plans/hobby), [Railway free trial](https://docs.railway.com/reference/pricing/free-trial), [Render free services](https://render.com/docs/free), [Resend pricing](https://resend.com/pricing), [Supabase free limits](https://automationatlas.io/answers/supabase-free-tier-limits-2026/), [Netlify commercial use](https://agentdeals.dev/hosting-free-tier-comparison-2026).

## What Claude tested, and what it couldn't

| Tested in Claude's workspace (Linux) | Not tested here |
|---|---|
| The launcher's first start from a clean copy: Node.js, packages, Python 3.12 through uv, Kokoro and its models, DeepFilterNet, stripe-mock, `.env.local`, database, Owner account, build, start | The Windows `.cmd` and Mac `.command` files themselves |
| Kokoro speaking English, Spanish, French, Hindi, Italian and Portuguese | The Speech to Text model download from huggingface.co (blocked in Claude's workspace) |
| The Voice Isolator on a noisy clip | Windows SmartScreen and macOS Gatekeeper prompts |
| Stop, and starting again without repeating the setup | Intel Macs (they use an older onnxruntime, 1.23.2) |
| Voice cloning end to end in the app's tests, and on the Kokoro server: the CAM++ consent check, OpenVoice's converter (with its v1 weights, which are on GitHub) and Tune voice check on 5 speakers | OpenVoice v2's own weights (huggingface.co), and cloning through the launcher on Windows or a Mac |
| Mandarin and Japanese voices, and Voice Design | The graphics-card engines (no GPU here): Chatterbox, VoxCPM2, and the routing to them was tested with stand-ins only |
| The graphics-card report, with a pretend nvidia-smi, and with no graphics card | |
| Updating a 0.7.1 install to 0.8: copying the new `app` folder over the old one, then **Start Mimix** adds the cloning lines to `.env.local`, installs the cloning packages, and carries on with cloning and Speech to Text off when huggingface.co can't be reached | |
| | How long each step takes on your computer |
