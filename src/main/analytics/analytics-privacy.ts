import type { AnalyticsFeatureName, AnalyticsTabType } from './analytics-types.js'
import { AnalyticsFeatures } from './analytics-types.js'

const allowedTabTypes = new Set<AnalyticsTabType>([
  'web',
  'settings',
  'extensions',
  'internal',
  'new_tab',
  'unknown',
])
const allowedFeatures = new Set<string>(Object.values(AnalyticsFeatures))

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
