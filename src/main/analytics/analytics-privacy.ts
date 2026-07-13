import type { AnalyticsFeatureName, AnalyticsTabType } from './analytics-types.js'
import { AnalyticsFeatures } from './analytics-types.js'

const safeIdentifierPattern = /^[\w-]{1,128}$/
const allowedTabTypes = new Set<AnalyticsTabType>([
  'web',
  'settings',
  'extensions',
  'internal',
  'new_tab',
  'unknown',
])
const allowedFeatures = new Set<string>(Object.values(AnalyticsFeatures))

export function getSafeHostname(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl)

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null
    }

    const hostname = parsed.hostname.toLowerCase()

    if (!hostname || hostname.length > 253) {
      return null
    }

    return hostname
  } catch {
    return null
  }
}

export function sanitizeIdentifier(value: unknown): string | null {
  return typeof value === 'string' && safeIdentifierPattern.test(value) ? value : null
}

export function sanitizeTabType(value: unknown): AnalyticsTabType {
  return typeof value === 'string' && allowedTabTypes.has(value as AnalyticsTabType)
    ? (value as AnalyticsTabType)
    : 'unknown'
}

export function sanitizeFeatureName(value: unknown): AnalyticsFeatureName | null {
  return typeof value === 'string' && allowedFeatures.has(value) ? (value as AnalyticsFeatureName) : null
}

export function sanitizeLifetimeSeconds(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return undefined
  }

  return Math.min(Math.round(value), 60 * 60 * 24 * 30)
}

export function sanitizeComponent(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const normalized = value.trim().toLowerCase().replace(/[^\w-]/g, '_').slice(0, 64)
  return normalized || undefined
}
