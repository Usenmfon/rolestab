import { randomUUID } from 'node:crypto'
import { ANALYTICS_CONFIG } from './analytics-config.js'
import type {
  AnalyticsArchitecture,
  AnalyticsEvent,
  AnalyticsEventInput,
  AnalyticsIdentity,
  AnalyticsPlatform,
} from './analytics-types.js'

export function createAnalyticsEvent(options: {
  input: AnalyticsEventInput
  identity: AnalyticsIdentity
  sessionId?: string
  appVersion: string
  platform: AnalyticsPlatform
  architecture: AnalyticsArchitecture
}): AnalyticsEvent {
  return {
    event_id: randomUUID(),
    installation_id: options.identity.installation_id,
    session_id: options.sessionId,
    event_name: options.input.event_name,
    occurred_at: new Date().toISOString(),
    app_version: options.appVersion,
    platform: options.platform,
    architecture: options.architecture,
    schema_version: ANALYTICS_CONFIG.schemaVersion,
    properties: options.input.properties,
  }
}
