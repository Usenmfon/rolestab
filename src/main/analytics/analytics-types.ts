export type AnalyticsPlatform = 'windows' | 'macos' | 'linux'

export type AnalyticsArchitecture = 'x64' | 'arm64' | 'ia32' | 'universal' | 'unknown'

export type AnalyticsEventName =
  | 'app_launched'
  | 'app_closed'
  | 'session_started'
  | 'session_ended'
  | 'role_created'
  | 'role_updated'
  | 'role_deleted'
  | 'tab_opened'
  | 'tab_closed'
  | 'tab_switched'
  | 'url_visited'
  | 'extension_installed'
  | 'extension_enabled'
  | 'extension_disabled'
  | 'extension_removed'
  | 'feature_used'
  | 'app_updated'
  | 'application_error'

export type AnalyticsProperties = Record<string, string | number | boolean | null>

export type AnalyticsEvent = {
  event_id: string
  installation_id: string
  session_id?: string
  event_name: AnalyticsEventName
  occurred_at: string
  app_version: string
  platform: AnalyticsPlatform
  architecture?: AnalyticsArchitecture
  schema_version: 1
  properties: AnalyticsProperties
}

export type AnalyticsEventInput =
  | { event_name: 'app_launched'; properties: Record<string, never> }
  | { event_name: 'app_closed'; properties: Record<string, never> }
  | { event_name: 'session_started'; properties: Record<string, never> }
  | { event_name: 'session_ended'; properties: Record<string, never> }
  | { event_name: 'role_created'; properties: { role_id: string } }
  | { event_name: 'role_updated'; properties: { role_id: string } }
  | { event_name: 'role_deleted'; properties: { role_id: string } }
  | { event_name: 'tab_opened'; properties: { tab_type: AnalyticsTabType } }
  | { event_name: 'tab_closed'; properties: { tab_type: AnalyticsTabType; lifetime_seconds?: number } }
  | { event_name: 'tab_switched'; properties: { from_tab_type: AnalyticsTabType; to_tab_type: AnalyticsTabType } }
  | { event_name: 'url_visited'; properties: { hostname: string } }
  | { event_name: 'extension_installed'; properties: { extension_id: string } }
  | { event_name: 'extension_enabled'; properties: { extension_id: string } }
  | { event_name: 'extension_disabled'; properties: { extension_id: string } }
  | { event_name: 'extension_removed'; properties: { extension_id: string } }
  | { event_name: 'feature_used'; properties: { feature: AnalyticsFeatureName } }
  | {
      event_name: 'app_updated'
      properties: { previous_version: string; new_version: string }
    }
  | {
      event_name: 'application_error'
      properties: {
        error_code: AnalyticsErrorCode
        severity: AnalyticsErrorSeverity
        component?: string
      }
    }

export type AnalyticsTabType = 'web' | 'settings' | 'extensions' | 'internal' | 'new_tab' | 'unknown'

export type AnalyticsErrorSeverity = 'info' | 'warning' | 'error' | 'fatal'

export const AnalyticsErrorCodes = {
  TAB_RESTORE_FAILED: 'TAB_RESTORE_FAILED',
  ROLE_STORAGE_READ_FAILED: 'ROLE_STORAGE_READ_FAILED',
  ROLE_STORAGE_WRITE_FAILED: 'ROLE_STORAGE_WRITE_FAILED',
  EXTENSION_LOAD_FAILED: 'EXTENSION_LOAD_FAILED',
  SESSION_RESTORE_FAILED: 'SESSION_RESTORE_FAILED',
  ANALYTICS_QUEUE_FAILED: 'ANALYTICS_QUEUE_FAILED',
  UPDATE_CHECK_FAILED: 'UPDATE_CHECK_FAILED',
  WORKSPACE_LOAD_FAILED: 'WORKSPACE_LOAD_FAILED',
  WORKSPACE_SAVE_FAILED: 'WORKSPACE_SAVE_FAILED',
  RENDERER_ERROR: 'RENDERER_ERROR',
} as const

export type AnalyticsErrorCode = (typeof AnalyticsErrorCodes)[keyof typeof AnalyticsErrorCodes]

export const AnalyticsFeatures = {
  CHECK_FOR_UPDATES: 'check_for_updates',
  INSTALL_UPDATE: 'install_update',
  OPEN_EXTERNAL_URL: 'open_external_url',
  COPY_DIAGNOSTICS: 'copy_diagnostics',
  COPY_ACTIVE_URL: 'copy_active_url',
  OPEN_DEVTOOLS: 'open_devtools',
  CLEAR_ROLE_SESSION: 'clear_role_session',
  CLEAR_PROJECT_SESSIONS: 'clear_project_sessions',
  CLEAR_ALL_SESSIONS: 'clear_all_sessions',
  IMPORT_PROJECT_CONFIG: 'import_project_config',
  EXPORT_PROJECT_CONFIG: 'export_project_config',
} as const

export type AnalyticsFeatureName = (typeof AnalyticsFeatures)[keyof typeof AnalyticsFeatures]

export type AnalyticsIdentity = {
  installation_id: string
  installed_at: string
  analytics_enabled: boolean
  schema_version: 1
  registration_pending: boolean
  last_app_version?: string
}

export type AnalyticsQueueStatus = 'pending' | 'sending' | 'retry' | 'quarantined'

export type AnalyticsQueueItem = {
  event: AnalyticsEvent
  status: AnalyticsQueueStatus
  attempt_count: number
  next_retry_at: string | null
  created_at: string
  last_error_code?: string
  registration_retry_attempted?: boolean
}

export type AnalyticsRegistrationPayload = {
  installation_id: string
  installed_at: string
  app_version: string
  platform: AnalyticsPlatform
  architecture: AnalyticsArchitecture
  distribution_channel: string
  locale: string
  timezone: string
  analytics_enabled: boolean
  schema_version: 1
}

export type AnalyticsBatchItemResult = {
  event_id: string
  status: 'accepted' | 'duplicate' | 'rejected'
  error_code?: string
}
