/** The first row, or a test failure if there is none. */
export function first<T>(rows: readonly T[]): T {
  if (rows.length === 0) throw new Error('Expected at least one row')
  return rows[0] as T
}
