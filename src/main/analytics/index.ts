export { AnalyticsClient } from './analytics-client.js'
export { ANALYTICS_CONFIG } from './analytics-config.js'
export { createAnalyticsEvent } from './analytics-events.js'
export { registerAnalyticsIpcHandlers, getAnalyticsErrorCodeForScope, trackApplicationError } from './analytics-ipc.js'
export { normalizeArchitecture, normalizePlatform } from './analytics-platform.js'
export { getRetryDelayMs, isPermanentStatus, isRetryableStatus, parseRetryAfterMs } from './analytics-retry.js'
export { createAnalyticsIdentity, loadAnalyticsIdentity, getAnalyticsStoragePaths } from './analytics-storage.js'
export type {
  AnalyticsArchitecture,
  AnalyticsErrorCode,
  AnalyticsEvent,
  AnalyticsEventInput,
  AnalyticsEventName,
  AnalyticsFeatureName,
  AnalyticsPlatform,
  AnalyticsQueueItem,
  AnalyticsRegistrationPayload,
  AnalyticsTabType,
} from './analytics-types.js'
