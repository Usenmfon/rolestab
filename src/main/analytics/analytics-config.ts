export const ANALYTICS_CONFIG = {
  baseUrl: process.env.ROLESTAB_ANALYTICS_BASE_URL ?? 'https://api.rolestab.app/api/v1',
  schemaVersion: 1,
  batchSize: 100,
  flushIntervalMs: 30_000,
  requestTimeoutMs: 10_000,
  maxQueueSize: 5_000,
  maxEventAgeDays: 30,
  maxRetryAttempts: 10,
  flushThreshold: 20,
  shutdownFlushTimeoutMs: 1_500,
} as const
