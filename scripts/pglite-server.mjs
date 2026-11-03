/**
 * Local Postgres: PGlite served over the Postgres wire protocol, shared by `npm run db` and the
 * integration tests.
 *
 * PGlite has one backend, so pglite-socket multiplexes every client onto it. Upstream keeps a
 * client "sticky" only inside a transaction; outside one, the messages of an extended-protocol
 * query (Parse, Bind, Describe, Execute … Sync) from two clients could interleave and corrupt each
 * other's unnamed statement. This patch also keeps a client sticky from its first extended-protocol
 * message until its Sync, which is what a real Postgres backend per connection guarantees.
 */
import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'

const EXTENDED = new Set([0x50, 0x42, 0x44, 0x45, 0x43, 0x48]) // P B D E C H
const SYNC = 0x53 // S
const QUERY = 0x51 // Q

function patchQueue(queue, db) {
  let sticky = null
  queue.processQueue = async function processQueue() {
    if (this.processing || this.queue.length === 0) return
    this.processing = true
    try {
      while (this.queue.length > 0) {
        const owner = sticky ?? (db.isInTransaction() ? this.lastHandlerId : null)
        let item
        if (owner != null) {
          const i = this.queue.findIndex((q) => q.handlerId === owner)
          if (i === -1) break // wait for that client's next message
          item = this.queue.splice(i, 1)[0]
        } else {
          item = this.queue.shift()
        }
        const type = item.message[0]
        if (EXTENDED.has(type)) sticky = item.handlerId
        try {
          await db.runExclusive(() => db.execProtocolRawStream(item.message, { onRawData: (d) => item.onData(d) }))
        } catch (err) {
          sticky = null
          item.reject(err)
          continue
        }
        if (type === SYNC || type === QUERY) sticky = null
        this.lastHandlerId = item.handlerId
        item.resolve(0)
      }
    } finally {
      this.processing = false
    }
  }
  const clear = queue.clearQueueForHandler.bind(queue)
  queue.clearQueueForHandler = (id) => { if (sticky === id) sticky = null; clear(id) }
}

export async function startPglite({ port, dataDir = 'memory://', host = '127.0.0.1', maxConnections = 50 }) {
  const db = await PGlite.create(dataDir)
  const server = new PGLiteSocketServer({ db, port, host, maxConnections })
  patchQueue(server.queryQueue, db)
  await server.start()
  return { db, server, url: `postgres://postgres:postgres@${host}:${port}/postgres`, stop: async () => { await server.stop(); await db.close() } }
}
