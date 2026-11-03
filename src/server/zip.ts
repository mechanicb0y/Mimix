import { crc32, deflateRawSync } from 'node:zlib'

export interface ZipEntry { name: string; data: Uint8Array; date?: Date }

/** DOS date/time fields used by the ZIP headers. */
function dos(d: Date): { time: number; date: number } {
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
    date: ((Math.max(1980, d.getFullYear()) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  }
}

/**
 * Writes a standard ZIP archive (no ZIP64, so under 4 GB and 65,535 files). Text is deflated;
 * audio and other already-compressed files are stored as they are. Names are UTF-8.
 */
export function createZip(entries: ZipEntry[]): Uint8Array {
  const chunks: Buffer[] = []
  const central: Buffer[] = []
  let offset = 0
  for (const e of entries) {
    const name = Buffer.from(e.name.replace(/^\/+/, ''), 'utf8')
    const raw = Buffer.from(e.data.buffer, e.data.byteOffset, e.data.byteLength)
    const compressible = /\.(json|txt|csv|srt|vtt|md)$/i.test(e.name)
    const body = compressible ? deflateRawSync(raw) : raw
    const method = compressible ? 8 : 0
    const crc = crc32(raw) >>> 0
    const { time, date } = dos(e.date ?? new Date())
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(method, 8)
    local.writeUInt16LE(time, 10); local.writeUInt16LE(date, 12); local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(body.length, 18); local.writeUInt32LE(raw.length, 22); local.writeUInt16LE(name.length, 26); local.writeUInt16LE(0, 28)
    chunks.push(local, name, body)
    const cd = Buffer.alloc(46)
    cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(20, 4); cd.writeUInt16LE(20, 6); cd.writeUInt16LE(0x0800, 8); cd.writeUInt16LE(method, 10)
    cd.writeUInt16LE(time, 12); cd.writeUInt16LE(date, 14); cd.writeUInt32LE(crc, 16); cd.writeUInt32LE(body.length, 20); cd.writeUInt32LE(raw.length, 24)
    cd.writeUInt16LE(name.length, 28); cd.writeUInt32LE(offset, 42)
    central.push(cd, name)
    offset += 30 + name.length + body.length
  }
  const cdSize = central.reduce((n, b) => n + b.length, 0)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(cdSize, 12); end.writeUInt32LE(offset, 16)
  return new Uint8Array(Buffer.concat([...chunks, ...central, end]))
}
