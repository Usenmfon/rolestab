export function normalizeHttpUrl(value: string): string {
  const trimmed = value.trim()
  const withProtocol = /^[a-z][a-z\d+\-.]*:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`
  const parsed = new URL(withProtocol)

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http and https URLs are supported.')
  }

  return parsed.toString().replace(/\/$/, '')
}

export function isProductionUrl(value: string): boolean {
  try {
    const hostname = new URL(value).hostname.toLowerCase()

    return (
      hostname !== 'localhost' &&
      hostname !== '127.0.0.1' &&
      !hostname.endsWith('.test') &&
      !hostname.includes('staging') &&
      !hostname.includes('stage') &&
      !hostname.includes('dev')
    )
  } catch {
    return false
  }
}
