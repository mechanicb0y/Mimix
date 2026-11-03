import type { Age, Gender, UseCase } from '@/config/voices'
import type { VoiceParams } from '@/lib/voice/types'

/**
 * Kokoro-82M's voices (Apache-2.0) under Mimix names: the Voice Mixer's sources and, with Kokoro as
 * the main engine, library voices in 8 languages. Seeded as library voices with a remix licence when
 * the Kokoro server is configured; `kokoro` is the voice's id in Kokoro's voice bank. With the 9
 * Mimix library voices mapped in kokoro-voices.ts, all 54 Kokoro voices are in the library.
 * `params` only describe the voice for previews and filters (the mock engine uses them); Kokoro
 * itself reads the style tensor. Mandarin (zh) and Japanese (ja) need the Kokoro server's Chinese
 * and Japanese text tools (engines/kokoro/requirements.txt). Ages and use cases are Mimix's labels.
 */
export interface MixerVoice {
  id: string
  kokoro: string
  name: string
  /** ISO 639-1; English when absent. */
  language?: 'en' | 'es' | 'fr' | 'hi' | 'it' | 'pt' | 'ja' | 'zh'
  accent: 'american' | 'british' | 'castilian' | 'standard' | 'brazilian'
  gender: Gender
  age: Age
  useCase: UseCase
  params: VoiceParams
}

export const MIXER_VOICES: MixerVoice[] = [
  { id: 'hollis', kokoro: 'af_heart', name: 'Hollis', accent: 'american', gender: 'female', age: 'young', useCase: 'narration', params: { f0: 205, formantShift: 1.12, rate: 4.6, breathiness: 0.12, brightness: 0.6, expressiveness: 0.65 } },
  { id: 'brielle', kokoro: 'af_bella', name: 'Brielle', accent: 'american', gender: 'female', age: 'young', useCase: 'conversational', params: { f0: 215, formantShift: 1.14, rate: 4.8, breathiness: 0.14, brightness: 0.64, expressiveness: 0.75 } },
  { id: 'nell', kokoro: 'af_nicole', name: 'Nell', accent: 'american', gender: 'female', age: 'middle', useCase: 'conversational', params: { f0: 190, formantShift: 1.08, rate: 4.2, breathiness: 0.22, brightness: 0.45, expressiveness: 0.5 } },
  { id: 'saoirse', kokoro: 'af_sarah', name: 'Saoirse', accent: 'american', gender: 'female', age: 'middle', useCase: 'education', params: { f0: 198, formantShift: 1.1, rate: 4.5, breathiness: 0.1, brightness: 0.55, expressiveness: 0.55 } },
  { id: 'miles', kokoro: 'am_michael', name: 'Miles', accent: 'american', gender: 'male', age: 'middle', useCase: 'narration', params: { f0: 118, formantShift: 0.93, rate: 4.4, breathiness: 0.08, brightness: 0.45, expressiveness: 0.55 } },
  { id: 'abe', kokoro: 'am_adam', name: 'Abe', accent: 'american', gender: 'male', age: 'middle', useCase: 'advertising', params: { f0: 110, formantShift: 0.92, rate: 4.6, breathiness: 0.07, brightness: 0.5, expressiveness: 0.6 } },
  { id: 'pip', kokoro: 'am_puck', name: 'Pip', accent: 'american', gender: 'male', age: 'young', useCase: 'characters', params: { f0: 130, formantShift: 0.98, rate: 5.0, breathiness: 0.09, brightness: 0.62, expressiveness: 0.85 } },
  { id: 'esme', kokoro: 'bf_emma', name: 'Esme', accent: 'british', gender: 'female', age: 'middle', useCase: 'narration', params: { f0: 195, formantShift: 1.09, rate: 4.3, breathiness: 0.12, brightness: 0.5, expressiveness: 0.55 } },
  { id: 'gideon', kokoro: 'bm_george', name: 'Gideon', accent: 'british', gender: 'male', age: 'older', useCase: 'narration', params: { f0: 105, formantShift: 0.9, rate: 4.0, breathiness: 0.1, brightness: 0.4, expressiveness: 0.5 } },
  { id: 'lowell', kokoro: 'bm_lewis', name: 'Lowell', accent: 'british', gender: 'male', age: 'middle', useCase: 'news', params: { f0: 112, formantShift: 0.92, rate: 4.4, breathiness: 0.08, brightness: 0.48, expressiveness: 0.5 } },
  { id: 'quinn', kokoro: 'af_alloy', name: 'Quinn', language: 'en', accent: 'american', gender: 'female', age: 'middle', useCase: 'conversational', params: { f0: 145, formantShift: 1.1, rate: 4.5, breathiness: 0.1, brightness: 0.2, expressiveness: 0.56 } },
  { id: 'tessa', kokoro: 'af_jessica', name: 'Tessa', language: 'en', accent: 'american', gender: 'female', age: 'young', useCase: 'conversational', params: { f0: 208, formantShift: 1.1, rate: 4.5, breathiness: 0.1, brightness: 0.62, expressiveness: 0.58 } },
  { id: 'vera', kokoro: 'af_nova', name: 'Vera', language: 'en', accent: 'american', gender: 'female', age: 'middle', useCase: 'narration', params: { f0: 155, formantShift: 1.1, rate: 4.5, breathiness: 0.1, brightness: 0.2, expressiveness: 0.9 } },
  { id: 'lark', kokoro: 'af_sky', name: 'Lark', language: 'en', accent: 'american', gender: 'female', age: 'young', useCase: 'characters', params: { f0: 161, formantShift: 1.1, rate: 4.5, breathiness: 0.1, brightness: 0.25, expressiveness: 0.6 } },
  { id: 'rowan', kokoro: 'am_echo', name: 'Rowan', language: 'en', accent: 'american', gender: 'male', age: 'middle', useCase: 'conversational', params: { f0: 105, formantShift: 0.93, rate: 4.5, breathiness: 0.1, brightness: 0.2, expressiveness: 0.77 } },
  { id: 'bastian', kokoro: 'am_fenrir', name: 'Bastian', language: 'en', accent: 'american', gender: 'male', age: 'middle', useCase: 'characters', params: { f0: 132, formantShift: 0.93, rate: 4.5, breathiness: 0.1, brightness: 0.58, expressiveness: 0.78 } },
  { id: 'garrett', kokoro: 'am_onyx', name: 'Garrett', language: 'en', accent: 'american', gender: 'male', age: 'older', useCase: 'narration', params: { f0: 84, formantShift: 0.93, rate: 4.5, breathiness: 0.1, brightness: 0.2, expressiveness: 0.49 } },
  { id: 'nicholas', kokoro: 'am_santa', name: 'Nicholas', language: 'en', accent: 'american', gender: 'male', age: 'older', useCase: 'characters', params: { f0: 160, formantShift: 0.93, rate: 4.5, breathiness: 0.1, brightness: 0.56, expressiveness: 0.83 } },
  { id: 'imogen', kokoro: 'bf_alice', name: 'Imogen', language: 'en', accent: 'british', gender: 'female', age: 'middle', useCase: 'education', params: { f0: 216, formantShift: 1.1, rate: 4.5, breathiness: 0.1, brightness: 0.49, expressiveness: 0.69 } },
  { id: 'rupert', kokoro: 'bm_fable', name: 'Rupert', language: 'en', accent: 'british', gender: 'male', age: 'middle', useCase: 'narration', params: { f0: 103, formantShift: 0.93, rate: 4.5, breathiness: 0.1, brightness: 0.28, expressiveness: 0.9 } },
  { id: 'lucia', kokoro: 'ef_dora', name: 'Lucía', language: 'es', accent: 'castilian', gender: 'female', age: 'middle', useCase: 'conversational', params: { f0: 163, formantShift: 1.1, rate: 4.5, breathiness: 0.1, brightness: 0.42, expressiveness: 0.53 } },
  { id: 'nicolas', kokoro: 'em_santa', name: 'Nicolás', language: 'es', accent: 'castilian', gender: 'male', age: 'older', useCase: 'characters', params: { f0: 124, formantShift: 0.93, rate: 4.5, breathiness: 0.1, brightness: 0.49, expressiveness: 0.8 } },
  { id: 'margaux', kokoro: 'ff_siwis', name: 'Margaux', language: 'fr', accent: 'standard', gender: 'female', age: 'middle', useCase: 'narration', params: { f0: 205, formantShift: 1.1, rate: 4.5, breathiness: 0.1, brightness: 0.77, expressiveness: 0.47 } },
  { id: 'priya', kokoro: 'hf_alpha', name: 'Priya', language: 'hi', accent: 'standard', gender: 'female', age: 'young', useCase: 'conversational', params: { f0: 202, formantShift: 1.1, rate: 4.5, breathiness: 0.1, brightness: 0.37, expressiveness: 0.5 } },
  { id: 'ananya', kokoro: 'hf_beta', name: 'Ananya', language: 'hi', accent: 'standard', gender: 'female', age: 'middle', useCase: 'narration', params: { f0: 177, formantShift: 1.1, rate: 4.5, breathiness: 0.1, brightness: 0.43, expressiveness: 0.57 } },
  { id: 'arjun', kokoro: 'hm_omega', name: 'Arjun', language: 'hi', accent: 'standard', gender: 'male', age: 'middle', useCase: 'news', params: { f0: 118, formantShift: 0.93, rate: 4.5, breathiness: 0.1, brightness: 0.31, expressiveness: 0.74 } },
  { id: 'rohan', kokoro: 'hm_psi', name: 'Rohan', language: 'hi', accent: 'standard', gender: 'male', age: 'young', useCase: 'conversational', params: { f0: 118, formantShift: 0.93, rate: 4.5, breathiness: 0.1, brightness: 0.31, expressiveness: 0.81 } },
  { id: 'giulia', kokoro: 'if_sara', name: 'Giulia', language: 'it', accent: 'standard', gender: 'female', age: 'middle', useCase: 'conversational', params: { f0: 214, formantShift: 1.1, rate: 4.5, breathiness: 0.1, brightness: 0.43, expressiveness: 0.43 } },
  { id: 'matteo', kokoro: 'im_nicola', name: 'Matteo', language: 'it', accent: 'standard', gender: 'male', age: 'middle', useCase: 'narration', params: { f0: 83, formantShift: 0.93, rate: 4.5, breathiness: 0.1, brightness: 0.2, expressiveness: 0.56 } },
  { id: 'yui', kokoro: 'jf_alpha', name: 'Yui', language: 'ja', accent: 'standard', gender: 'female', age: 'young', useCase: 'conversational', params: { f0: 268, formantShift: 1.1, rate: 4.5, breathiness: 0.1, brightness: 0.8, expressiveness: 0.5 } },
  { id: 'haruka', kokoro: 'jf_gongitsune', name: 'Haruka', language: 'ja', accent: 'standard', gender: 'female', age: 'middle', useCase: 'narration', params: { f0: 253, formantShift: 1.1, rate: 4.5, breathiness: 0.1, brightness: 0.43, expressiveness: 0.9 } },
  { id: 'mio', kokoro: 'jf_nezumi', name: 'Mio', language: 'ja', accent: 'standard', gender: 'female', age: 'young', useCase: 'characters', params: { f0: 272, formantShift: 1.1, rate: 4.5, breathiness: 0.1, brightness: 0.41, expressiveness: 0.87 } },
  { id: 'chiyo', kokoro: 'jf_tebukuro', name: 'Chiyo', language: 'ja', accent: 'standard', gender: 'female', age: 'young', useCase: 'characters', params: { f0: 320, formantShift: 1.1, rate: 4.5, breathiness: 0.1, brightness: 0.57, expressiveness: 0.54 } },
  { id: 'ren', kokoro: 'jm_kumo', name: 'Ren', language: 'ja', accent: 'standard', gender: 'male', age: 'middle', useCase: 'narration', params: { f0: 96, formantShift: 0.93, rate: 4.5, breathiness: 0.1, brightness: 0.2, expressiveness: 0.48 } },
  { id: 'beatriz', kokoro: 'pf_dora', name: 'Beatriz', language: 'pt', accent: 'brazilian', gender: 'female', age: 'middle', useCase: 'conversational', params: { f0: 174, formantShift: 1.1, rate: 4.5, breathiness: 0.1, brightness: 0.45, expressiveness: 0.49 } },
  { id: 'thiago', kokoro: 'pm_alex', name: 'Thiago', language: 'pt', accent: 'brazilian', gender: 'male', age: 'middle', useCase: 'advertising', params: { f0: 126, formantShift: 0.93, rate: 4.5, breathiness: 0.1, brightness: 0.44, expressiveness: 0.74 } },
  { id: 'noel', kokoro: 'pm_santa', name: 'Noel', language: 'pt', accent: 'brazilian', gender: 'male', age: 'older', useCase: 'characters', params: { f0: 140, formantShift: 0.93, rate: 4.5, breathiness: 0.1, brightness: 0.56, expressiveness: 0.79 } },
  { id: 'meilin', kokoro: 'zf_xiaobei', name: 'Meilin', language: 'zh', accent: 'standard', gender: 'female', age: 'young', useCase: 'conversational', params: { f0: 241, formantShift: 1.1, rate: 4.5, breathiness: 0.1, brightness: 0.62, expressiveness: 0.55 } },
  { id: 'lan', kokoro: 'zf_xiaoni', name: 'Lan', language: 'zh', accent: 'standard', gender: 'female', age: 'young', useCase: 'narration', params: { f0: 228, formantShift: 1.1, rate: 4.5, breathiness: 0.1, brightness: 0.65, expressiveness: 0.6 } },
  { id: 'yuxin', kokoro: 'zf_xiaoxiao', name: 'Yuxin', language: 'zh', accent: 'standard', gender: 'female', age: 'young', useCase: 'narration', params: { f0: 244, formantShift: 1.1, rate: 4.5, breathiness: 0.1, brightness: 0.71, expressiveness: 0.63 } },
  { id: 'jing', kokoro: 'zf_xiaoyi', name: 'Jing', language: 'zh', accent: 'standard', gender: 'female', age: 'young', useCase: 'characters', params: { f0: 309, formantShift: 1.1, rate: 4.5, breathiness: 0.1, brightness: 0.8, expressiveness: 0.51 } },
  { id: 'haoran', kokoro: 'zm_yunjian', name: 'Haoran', language: 'zh', accent: 'standard', gender: 'male', age: 'middle', useCase: 'news', params: { f0: 135, formantShift: 0.93, rate: 4.5, breathiness: 0.1, brightness: 0.56, expressiveness: 0.89 } },
  { id: 'zihan', kokoro: 'zm_yunxi', name: 'Zihan', language: 'zh', accent: 'standard', gender: 'male', age: 'young', useCase: 'conversational', params: { f0: 186, formantShift: 0.93, rate: 4.5, breathiness: 0.1, brightness: 0.56, expressiveness: 0.56 } },
  { id: 'wei', kokoro: 'zm_yunxia', name: 'Wei', language: 'zh', accent: 'standard', gender: 'male', age: 'young', useCase: 'characters', params: { f0: 302, formantShift: 0.93, rate: 4.5, breathiness: 0.1, brightness: 0.67, expressiveness: 0.55 } },
  { id: 'jun', kokoro: 'zm_yunyang', name: 'Jun', language: 'zh', accent: 'standard', gender: 'male', age: 'middle', useCase: 'news', params: { f0: 127, formantShift: 0.93, rate: 4.5, breathiness: 0.1, brightness: 0.6, expressiveness: 0.74 } },
]

/**
 * Each Kokoro voice measured on one fixed sentence in its own language (pYIN median pitch in Hz,
 * median spectral centroid in Hz, pitch variation in semitones). Voice Design uses them to pick
 * voices for a description. Rough: pitch trackers can halve or double a pitch now and then.
 */
export const KOKORO_MEASURES: Readonly<Record<string, { f0: number; centroid: number; variation: number }>> = {
  af_alloy: { f0: 145.2, centroid: 996, variation: 3.38 },
  af_aoede: { f0: 175.7, centroid: 1287, variation: 3.15 },
  af_bella: { f0: 204.2, centroid: 2183, variation: 2.27 },
  af_heart: { f0: 213.8, centroid: 1955, variation: 2.68 },
  af_jessica: { f0: 207.7, centroid: 1820, variation: 3.5 },
  af_kore: { f0: 145.2, centroid: 1643, variation: 4.63 },
  af_nicole: { f0: 152.9, centroid: 2411, variation: 3.54 },
  af_nova: { f0: 154.7, centroid: 947, variation: 6.79 },
  af_river: { f0: 179.8, centroid: 1919, variation: 2.39 },
  af_sarah: { f0: 184.5, centroid: 2097, variation: 3.97 },
  af_sky: { f0: 161.1, centroid: 1153, variation: 3.63 },
  am_adam: { f0: 115.9, centroid: 1479, variation: 3.34 },
  am_echo: { f0: 105.1, centroid: 922, variation: 4.64 },
  am_eric: { f0: 155.2, centroid: 1251, variation: 4.24 },
  am_fenrir: { f0: 131.6, centroid: 1749, variation: 4.7 },
  am_liam: { f0: 120.0, centroid: 1468, variation: 4.82 },
  am_michael: { f0: 114.6, centroid: 1889, variation: 3.23 },
  am_onyx: { f0: 84.4, centroid: 740, variation: 2.94 },
  am_puck: { f0: 108.5, centroid: 1469, variation: 4.1 },
  am_santa: { f0: 159.7, centroid: 1701, variation: 4.98 },
  bf_alice: { f0: 216.3, centroid: 1579, variation: 4.14 },
  bf_emma: { f0: 180.8, centroid: 2337, variation: 2.14 },
  bf_isabella: { f0: 204.2, centroid: 1919, variation: 2.23 },
  bf_lily: { f0: 177.7, centroid: 1467, variation: 4.01 },
  bm_daniel: { f0: 121.0, centroid: 1305, variation: 3.72 },
  bm_fable: { f0: 103.3, centroid: 1205, variation: 6.44 },
  bm_george: { f0: 141.9, centroid: 1555, variation: 3.83 },
  bm_lewis: { f0: 82.0, centroid: 1655, variation: 3.8 },
  ef_dora: { f0: 163.0, centroid: 1459, variation: 3.17 },
  em_alex: { f0: 123.2, centroid: 1429, variation: 3.3 },
  em_santa: { f0: 123.9, centroid: 1584, variation: 4.82 },
  ff_siwis: { f0: 205.3, centroid: 2081, variation: 2.79 },
  hf_alpha: { f0: 201.8, centroid: 1366, variation: 3.01 },
  hf_beta: { f0: 176.7, centroid: 1470, variation: 3.39 },
  hm_omega: { f0: 118.3, centroid: 1254, variation: 4.44 },
  hm_psi: { f0: 117.9, centroid: 1253, variation: 4.84 },
  if_sara: { f0: 213.8, centroid: 1477, variation: 2.59 },
  im_nicola: { f0: 83.4, centroid: 861, variation: 3.37 },
  jf_alpha: { f0: 267.8, centroid: 2170, variation: 2.97 },
  jf_gongitsune: { f0: 252.8, centroid: 1478, variation: 5.69 },
  jf_nezumi: { f0: 272.5, centroid: 1446, variation: 5.2 },
  jf_tebukuro: { f0: 349.4, centroid: 1725, variation: 3.26 },
  jm_kumo: { f0: 95.8, centroid: 1012, variation: 2.86 },
  pf_dora: { f0: 173.7, centroid: 1510, variation: 2.94 },
  pm_alex: { f0: 126.0, centroid: 1496, variation: 4.43 },
  pm_santa: { f0: 140.3, centroid: 1709, variation: 4.75 },
  zf_xiaobei: { f0: 241.4, centroid: 1820, variation: 3.29 },
  zf_xiaoni: { f0: 228.5, centroid: 1867, variation: 3.58 },
  zf_xiaoxiao: { f0: 244.2, centroid: 1982, variation: 3.78 },
  zf_xiaoyi: { f0: 309.4, centroid: 2407, variation: 3.07 },
  zm_yunjian: { f0: 134.7, centroid: 1711, variation: 5.33 },
  zm_yunxi: { f0: 186.1, centroid: 1706, variation: 3.38 },
  zm_yunxia: { f0: 302.4, centroid: 1902, variation: 3.31 },
  zm_yunyang: { f0: 127.1, centroid: 1776, variation: 4.45 }
}

export const mixerVoiceId = (v: MixerVoice) => `mix_${v.id}`
