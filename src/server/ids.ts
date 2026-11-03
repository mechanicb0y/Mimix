import { randomBytes } from 'node:crypto'

/** Short, URL-safe, prefixed ids (e.g. "gen_3kq9x0v1m2c4b7n8"). The prefix tells you what a row is in logs. */
export function newId(prefix: string): string {
  return `${prefix}_${randomBytes(12).toString('base64url')}`
}
