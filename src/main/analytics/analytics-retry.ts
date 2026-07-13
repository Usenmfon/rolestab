const retryableStatusCodes = new Set([429, 500, 502, 503, 504])
const permanentStatusCodes = new Set([400, 413, 422])

export function isRetryableStatus(statusCode: number): boolean {
  return retryableStatusCodes.has(statusCode)
}

export function isPermanentStatus(statusCode: number): boolean {
  return permanentStatusCodes.has(statusCode)
}

export function getRetryDelayMs(
  attemptCount: number,
  retryAfterHeader?: string | null,
  random = Math.random,
): number {
  const retryAfter = parseRetryAfterMs(retryAfterHeader)

  if (retryAfter !== null) {
    return retryAfter
  }

  const baseDelayMs = 5_000
  const maxDelayMs = 60 * 60 * 1_000
  const jitterMs = 1_000

  return Math.min(baseDelayMs * 2 ** Math.max(0, attemptCount), maxDelayMs) + Math.floor(random() * jitterMs)
}

export function parseRetryAfterMs(header: string | null | undefined, now = Date.now()): number | null {
  if (!header) {
    return null
  }

  const seconds = Number(header)
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.round(seconds * 1_000)
  }

  const dateMs = Date.parse(header)
  if (Number.isFinite(dateMs)) {
    return Math.max(0, dateMs - now)
  }

  return null
}
