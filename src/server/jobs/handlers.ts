/**
 * Registers every job handler. Imported by the job runner (web process with QUEUE_DRIVER=inline,
 * or `npm run worker`) before it looks a handler up. Add each module that registers jobs here.
 */
import '@/server/modules/clone'
import '@/server/modules/changer'
import '@/server/modules/audio-tools'
import '@/server/modules/dubbing'
import '@/server/modules/studio'
import '@/server/modules/account'
import '@/server/modules/mixer'
import '@/server/modules/tts'
import '@/server/jobs/test-handlers'
