# Languages: the free routes to about 50

Researched 2026-11-03 for Mimix 0.8. Every route below is free to run on your own computer, and every
model and voice in the "use" columns allows commercial use. Where a licence needs a lawyer's eye, it
says so; those points are also listed at the end for the lawyer brief.

**Samples:** open `docs/language-samples/index.html` in a browser. Every language a computer route
can speak has a sample made in Claude's workspace (80 in all: 26 for the extra languages and one
for each of Kokoro's 54 voices), and each sample was played back through Whisper (large-v3-turbo) to
check that it says the right words. Whisper has no Irish, so the Irish sample is unchecked. The graphics-card routes couldn't be sampled
here (no graphics card, and Hugging Face is blocked from the workspace), so the table links their
official demo pages instead.

## The short answer

| Route | Runs on | Languages | Clones voices | Licence | In Mimix 0.8 |
|---|---|---|---|---|---|
| **Kokoro-82M**, 54 voices | Processor | **8**: English (US, UK), Spanish, French, Hindi, Italian, Brazilian Portuguese, Japanese, Mandarin | Yes, through OpenVoice v2 (MIT) | Apache-2.0 (model and voices) | Built in |
| **Coqui VITS voices** in sherpa-onnx | Processor, about 67 MB per language | **+19**: Bengali, Bulgarian, Croatian, Czech, Danish, Dutch, Estonian, Finnish, German, Irish, Latvian, Lithuanian, Maltese, Polish, Romanian, Slovak, Slovenian, Swedish, Ukrainian (plus European Portuguese) | No (one fixed voice per language) | BSD-3-Clause or Apache-2.0; trained on public-domain or CC0 recordings (Bengali: data to check) | Samples only: not wired in yet |
| **Piper voices trained from scratch** in sherpa-onnx | Processor, 20 to 110 MB per voice | **+3**: Catalan, Icelandic, Kazakh (and second voices for Dutch, Spanish and Swedish) | No | Model MIT; recordings CC0, CC BY or CC BY-SA (see the table) | Samples only: not wired in yet |
| **VoxCPM2** (OpenBMB) | NVIDIA card, about 8 to 10 GB | **30**, of which **+16** new: Arabic, Burmese, Greek, Hebrew, Indonesian, Khmer, Korean, Lao, Malay, Norwegian, Russian, Swahili, Tagalog, Thai, Turkish, Vietnamese | Yes, zero-shot | Apache-2.0 | Wired in (`GPU_ENGINE=voxcpm`), untested |
| **Chatterbox Multilingual** (Resemble AI) | NVIDIA card, about 8 GB | **23**, all also in VoxCPM2 | Yes, zero-shot | MIT | Wired in (`GPU_ENGINE=chatterbox`), untested |

**Totals.** On the processor alone: **30 languages** (8 Kokoro + 19 Coqui + 3 Piper). With an NVIDIA
card running VoxCPM2: **46 languages**. Reaching a full 50 would take models that are not yet
available with a commercial licence; the nearest gaps are Tamil, Persian, Hungarian and Serbian
(see "Near misses").

**For Malaysia:** Malay, Arabic and Indonesian are only available on the graphics-card route
(VoxCPM2 has all three; Chatterbox has Malay and Arabic). No processor model with a commercial
licence speaks them well today. Tamil is not covered by any route that passed the licence check.

## What I recommend

1. **Now:** keep Kokoro as the main engine. It has the best quality of the processor routes, it can
   mix and clone, and its 8 languages cover English, Chinese and Hindi.
2. **Next (about a day of work):** add the sherpa-onnx route to the Kokoro server as a second
   speaker for the 22 extra processor languages. sherpa-onnx is already installed for the consent
   check, so it adds no new package; each language's voice would download on first use (about 67 MB)
   and be checked against a pinned SHA-256 like the other models. These voices are plainer than
   Kokoro's, there is one voice per language, and they can't be mixed or cloned; Mimix would label
   them "Basic" in the Voice Library. The Coqui voices spell words out letter by letter instead of
   using espeak-ng, so they don't add the GPL-3 question (below).
3. **When you have an NVIDIA card with 10 GB or more:** turn on VoxCPM2 from the launcher. That adds
   Arabic, Malay, Indonesian, Korean, Thai, Vietnamese and ten more, with cloning in all 30 of its
   languages. Choose Chatterbox instead only on an 8 GB card.

## Per-language detail

`CER` is the share of characters Whisper heard differently from the sentence the voice was given
(0.00 means it heard every character right; below 0.10 is a clear sample, 0.10 to 0.25 understandable
with a few slips, above 0.25 is worth listening to before you rely on it). Whisper itself mishears
some short sentences, so a single sample is a rough check, not a quality score.

<!-- SAMPLES -->
| Language | Voice | Licence | CER | Whisper heard |
|---|---|---|---|---|
| Bengali | Coqui VITS, Bengali (data to check) | Apache-2.0 | 0.70 (listen first) | নমোষকার এটি মিমিক স… |
| Bulgarian | Coqui VITS, Common Voice (CC0) | BSD-3-Clause | 0.14 (understandable) | Правейте, това е примерен глас от гласовата библиотека на Mimix. |
| Catalan | Piper ca_ES-upc_pau-x_low | MIT model, CC BY-SA 3.0 ES data | 0.06 (clear) | Hola, aquesta és una veu de mostra de la Biblioteca de Veus de Mímics. |
| Croatian | Coqui VITS, Common Voice (CC0) | BSD-3-Clause | 0.04 (clear) | Dobar dan, ovo je primjer glasa iz knjišnice Glasova Mimih. |
| Czech | Coqui VITS, Common Voice (CC0) | BSD-3-Clause | 0.02 (clear) | Dobrý den, toto je ukázkový hlas z hlasové knihovny Mimit. |
| Danish | Coqui VITS, Common Voice (CC0) | BSD-3-Clause | 0.26 (listen first) | Ja, dette er en prøvestemme fra min stemmebikæudik. |
| Dutch | Coqui VITS, CSS10 (LibriVox, public domain) | BSD-3-Clause | 0.04 (clear) | Hallo, dit is een voorbeeldstem uit de Stemmenbibliotheek van Mini. |
| Dutch | Piper nl_BE-rdh-medium | MIT model, CC0 data | 0.00 (clear) | Hallo, dit is een voorbeeldstem uit de stemmenbibliotheek van Mimix. |
| Estonian | Coqui VITS, Common Voice (CC0) | BSD-3-Clause | 0.19 (understandable) | Tere, see on meidi saailmimidi häale kogust! |
| Finnish | Coqui VITS, CSS10 (LibriVox, public domain) | BSD-3-Clause | 0.03 (clear) | Hei, tämä on näyteääni mimikin äänikirjastosta. |
| German | Coqui VITS, CSS10 (LibriVox, public domain) | BSD-3-Clause | 0.03 (clear) | Hallo, das ist eine Beispielstimme aus der Stimmenbibliothek von Memis. |
| Icelandic | Piper is_IS-bui-medium | MIT model, CC BY 4.0 data (check) | 0.11 (understandable) | Halló, þetta er sínishorn af röddur rættasafni Mimix. |
| Irish | Coqui VITS, Common Voice (CC0) | BSD-3-Clause | n/a (not checked: Whisper has no Irish) |  |
| Kazakh | Piper kk_KZ-issai-high | MIT model, CC BY 4.0 data | 0.31 (listen first) | Сәлеметсіз бе! Бұл мүмкс дауыс қытап қанасынан алынған |
| Latvian | Coqui VITS, Common Voice (CC0) | BSD-3-Clause | 0.11 (understandable) | Veiki, šī ir paraugabalsu nomīmīt balsu bibliotēkas. |
| Lithuanian | Coqui VITS, Common Voice (CC0) | BSD-3-Clause | 0.06 (clear) | Labą dieną, tai pavyzdinis balsas iš Mimik balsų bibliotekos. |
| Maltese | Coqui VITS, Common Voice (CC0) | BSD-3-Clause | 0.20 (understandable) | Onġu u ddinja vuċi ta kam kiu minn librerijat al vuċi jit tam imix. |
| Polish | Coqui VITS, M-AILABS (LibriVox) | BSD-3-Clause | 0.04 (clear) | Cześć, to jest przykładowy głos z biblioteki głosów Minis. |
| Portuguese (European) | Coqui VITS, Common Voice (CC0) | BSD-3-Clause | 0.10 (understandable) | Oh, esta é uma voz de exemplo da biblioteca de vozes do INIS. |
| Romanian | Coqui VITS, Common Voice (CC0) | BSD-3-Clause | 0.04 (clear) | Bună, aceasta este o voce de probă din Biblioteca de Voci Minit. |
| Slovak | Coqui VITS, Common Voice (CC0) | BSD-3-Clause | 0.06 (clear) | Dobrý deň, po to je ukážkový hlas hlasovej knižnice Minix. |
| Slovenian | Coqui VITS, Common Voice (CC0) | BSD-3-Clause | 0.16 (understandable) | Vzdravljeni, to je vzvočni glas iz knjižnice, da so mimic. |
| Spanish | Piper es_ES-carlfm-x_low | MIT model, Public-domain data | 0.06 (clear) | cola esta es una voz de muestra de la biblioteca de voces de mínix |
| Swedish | Coqui VITS, Common Voice (CC0) | BSD-3-Clause | 0.11 (understandable) | Nej, det här är en exempel rest från min ex-röst bibliotet. |
| Swedish | Piper sv_SE-nst-medium | MIT model, CC0 data | 0.02 (clear) | Hej, det här är en exempel röst från Nimix röstbibliotek. |
| Ukrainian | Coqui VITS, M-AILABS (LibriVox) | BSD-3-Clause | 0.02 (clear) | Добрий день! Це зразок голосу з бібліотеки голосів Мімікса. |

**Kokoro**, all 54 voices (the sentence "Every voice has a story…" in each language):

| Language | Voices | Median CER | Highest CER |
|---|---|---|---|
| English (US) | 20 | 0.00 | 0.00 |
| English (UK) | 8 | 0.00 | 0.00 |
| Spanish | 3 | 0.00 | 0.00 |
| French | 1 | 0.00 | 0.00 |
| Hindi | 4 | 0.29 | 0.39 |
| Italian | 2 | 0.00 | 0.00 |
| Japanese | 5 | 0.16 | 0.16 |
| Portuguese (Brazil) | 3 | 0.00 | 0.00 |
| Mandarin | 8 | 0.00 | 0.43 |
<!-- /SAMPLES -->

Reading the scores:

- **Hindi, Japanese and Bengali** score worse than they sound: Whisper stopped before the end of
  the sentence (it hit its length limit on these scripts), and the missing end counts as errors.
  Every Hindi word it did hear was right; in Japanese it heard 物語 (story) as 物当たり.
  Bengali stopped after two words, so that voice is unjudged: listen first.
- **Kokoro's zf_xiaoni** (Mandarin) is the one Kokoro voice Whisper misheard (wrong tones on
  声音 and 故事); the other seven Mandarin voices scored 0.00.
- **Danish and Kazakh** are the weakest extra languages; listen before offering them.
- Most "errors" in the other rows are the made-up name Mimix, which no model knows how to say.
- One Piper voice, Ukrainian `ukrainian_tts`, produced less than a second of sound and was dropped;
  Ukrainian uses the Coqui voice.

## Licence checks, in detail

**Kokoro-82M** (hexgrad): model and voice packs Apache-2.0, trained on permissive and synthetic data
per its model card. Mandarin and Japanese use misaki (Apache-2.0) with jieba (MIT), pypinyin (MIT),
cn2an (MIT) and pyopenjtalk (MIT, with the BSD-licensed Open JTalk dictionary). Other languages use
espeak-ng for pronunciation, which is GPL-3 (already in the lawyer brief).

**Coqui VITS voices** (Coqui TTS model list, `.models.json`, "license" field per model):
- Common Voice voices (`cv`): bg, cs, da, et, ga, hr, lt, lv, mt, pt, ro, sk, sl, sv are BSD-3-Clause.
  Common Voice recordings are CC0. Each is one Common Voice contributor's voice.
- CSS10 voices (`css10`): de, nl, fi (es and fr too, which Kokoro already covers) are BSD-3-Clause.
  CSS10 is cut from LibriVox audiobooks, which are public domain; the CSS10 repository is Apache-2.0.
- M-AILABS voices (`mai`): Ukrainian (BSD-3-Clause) and Polish (`mai_female`, BSD-3-Clause). The
  M-AILABS audio also comes from public-domain LibriVox books, under M-AILABS' own BSD-style licence.
  I could not open the M-AILABS licence page from the workspace (blocked), so this one needs a check.
- Bengali (`custom/vits-female`, by mobassir94): Apache-2.0; its training data isn't named on the
  model list, so check it before launch.
- sherpa-onnx (Apache-2.0) publishes these as ONNX files on GitHub (`vits-coqui-*` in the
  `tts-models` release), which is how the samples were made. Greek and Hungarian are on Coqui's
  list but not in that release.

**Piper voices:** the Piper program is MIT, but each voice has its own licence, and most voices
are fine-tuned from the US English "lessac" or "ryan" voices. Lessac comes from the Blizzard
Challenge data, whose licence forbids commercial use, and Ryan's is CC BY-NC-SA 4.0, so every voice
trained from them is left out here (Piper's maintainers say the same in discussion #271). That rules
out Piper's Arabic, Persian, Hungarian, Greek, Welsh, Norwegian, Russian, Turkish, Vietnamese,
Swahili, Nepali, Georgian, Malayalam and most German and Italian voices. The voices kept were
trained from scratch:

| Voice | Language | Recordings licence |
|---|---|---|
| ca_ES upc_pau (x_low) | Catalan | CC BY-SA 3.0 ES (UPC Festcat) |
| is_IS bui (medium) | Icelandic | Talrómur, CC BY 4.0 (CLARIN-IS; check) |
| kk_KZ issai (high) | Kazakh | KazakhTTS, CC BY 4.0 |
| nl_BE rdh (medium) | Dutch (Belgium) | CC0 |
| es_ES carlfm (x_low) | Spanish | Public domain |
| sv_SE nst (medium) | Swedish | NST, CC0 |

Piper voices use espeak-ng for pronunciation (GPL-3), like Kokoro's non-English languages.

**VoxCPM2:** Apache-2.0 code and weights (huggingface.co/openbmb/VoxCPM2). **Chatterbox
Multilingual:** MIT code and weights; its audio carries Resemble's Perth watermark, which Mimix can
keep (huggingface.co/ResembleAI/chatterbox).

## Left out, and why

| Model | Languages | Why it's out |
|---|---|---|
| Meta MMS-TTS | 1,100+ | CC BY-NC 4.0 (non-commercial), as you said |
| OmniVoice (k2-fsa) | 646 | Code Apache-2.0, but the weights are CC BY-NC |
| XTTS-v2 (Coqui) | 17 | Coqui Public Model Licence: non-commercial |
| F5-TTS | Chinese, English | Weights CC BY-NC (Emilia data) |
| Fish Audio S2 / OpenAudio | Many | Research licence; commercial use needs a paid licence |
| Voxtral TTS (Mistral) | Several | Non-commercial weights |
| VibeVoice (Microsoft) | English, Chinese | Research use only |
| YourTTS (Coqui) | 3 | Non-commercial licence |
| Most Piper voices | 30+ | Fine-tuned from non-commercial voices (above) |
| edge-tts and similar | 70+ | Unofficial use of a Microsoft service, as you said |

Also permissive but not chosen: Qwen3-TTS (Apache-2.0, 10 languages, GPU), NVIDIA Magpie TTS
Multilingual (NVIDIA Open Model Licence, 12 languages, GPU), Zonos (Apache-2.0, 5 languages, GPU) and
CosyVoice 2 (Apache-2.0, Chinese-first, GPU). Each covers a subset of VoxCPM2's languages.

## Near misses (to reach 50)

- **Tamil, Telugu:** no commercial-licence voice found. The open Indic voices (AI4Bharat
  Indic-Parler-TTS, IndicF5) were not checked in depth here and are worth a look next.
- **Persian:** Coqui's `fa/custom/glow-tts` is CC BY-4.0 but isn't in the sherpa-onnx release; it
  would need converting to ONNX.
- **Hungarian, Greek:** Coqui's CSS10 Hungarian and Common Voice Greek are BSD-3-Clause, but
  sherpa-onnx doesn't publish them; they would need converting too.
- **Serbian, Nepali, Hindi (Piper):** non-commercial recordings.

## Sources (opened 2026-11-03)

- Kokoro-82M model card: huggingface.co/hexgrad/Kokoro-82M
- VoxCPM2 model card: huggingface.co/openbmb/VoxCPM2
- Chatterbox model card: huggingface.co/ResembleAI/chatterbox
- OmniVoice: huggingface.co/k2-fsa/omnivoice
- Qwen3-TTS: simonwillison.net/2026/Jan/22/qwen3-tts
- Overview of open TTS licences: cartesia.ai/learn/open-source-tts (2026-10-09)
- Coqui model list: raw.githubusercontent.com/coqui-ai/TTS/dev/TTS/.models.json
- Piper voice cards: the `MODEL_CARD` files inside each `vits-piper-*` archive of
  github.com/k2-fsa/sherpa-onnx/releases/tag/tts-models
- Piper discussion on lessac-based voices: github.com/rhasspy/piper/discussions/271
- Lessac (Blizzard) licence: cstr.ed.ac.uk (Blizzard Challenge licence page)
- CSS10: github.com/Kyubyong/css10 (Apache-2.0)
- M-AILABS: cisaad.umbc.edu/the-m-ailabs-speech-dataset (mirror; the licence text itself wasn't shown)
