import electron from 'electron'
import { sanitizeFeatureName, sanitizeLifetimeSeconds, sanitizeTabType } from './analytics-privacy.js'
import type { AnalyticsClient } from './analytics-client.js'
import type { AnalyticsErrorCode, AnalyticsErrorSeverity } from './analytics-types.js'
import { AnalyticsErrorCodes } from './analytics-types.js'

const { ipcMain } = electron

type IpcEvent = Electron.IpcMainEvent
type TrustedSenderAssertion = (event: IpcEvent) => void

export function registerAnalyticsIpcHandlers(options: {
  analytics: AnalyticsClient
  assertTrustedSender: TrustedSenderAssertion
}): void {
  const { analytics, assertTrustedSender } = options

  ipcMain.on('analytics:connectivity-restored', (event) => {
    assertTrustedSender(event)
    void analytics.flush().catch(() => undefined)
  })

  ipcMain.on('analytics:tab-opened', (event, payload: { tabType?: unknown }) => {
    assertTrustedSender(event)
    void analytics.track({
      event_name: 'tab_opened',
      properties: { tab_type: sanitizeTabType(payload?.tabType) },
    })
  })

  ipcMain.on('analytics:tab-closed', (event, payload: { tabType?: unknown; lifetimeSeconds?: unknown }) => {
    assertTrustedSender(event)
    const lifetimeSeconds = sanitizeLifetimeSeconds(payload?.lifetimeSeconds)
    void analytics.track({
      event_name: 'tab_closed',
      properties: {
        tab_type: sanitizeTabType(payload?.tabType),
        ...(typeof lifetimeSeconds === 'number' ? { lifetime_seconds: lifetimeSeconds } : {}),
      },
    })
  })

  ipcMain.on('analytics:tab-switched', (event, payload: { fromTabType?: unknown; toTabType?: unknown }) => {
    assertTrustedSender(event)
    void analytics.track({
      event_name: 'tab_switched',
      properties: {
        from_tab_type: sanitizeTabType(payload?.fromTabType),
        to_tab_type: sanitizeTabType(payload?.toTabType),
      },
    })
  })

  ipcMain.on('analytics:feature-used', (event, payload: { feature?: unknown }) => {
    assertTrustedSender(event)
    const feature = sanitizeFeatureName(payload?.feature)
    if (feature) {
      void analytics.track({ event_name: 'feature_used', properties: { feature } })
    }
  })
}

export function trackApplicationError(
  analytics: AnalyticsClient | null,
  errorCode: AnalyticsErrorCode,
  severity: AnalyticsErrorSeverity,
): void {
  void analytics?.track({
    event_name: 'application_error',
    properties: {
      error_code: errorCode,
      severity,
    },
  })
}

export function getAnalyticsErrorCodeForScope(scope: string): AnalyticsErrorCode {
  switch (scope) {
    case 'workspace-load':
      return AnalyticsErrorCodes.WORKSPACE_LOAD_FAILED
    case 'settings-save':
      return AnalyticsErrorCodes.WORKSPACE_SAVE_FAILED
    case 'auto-updater':
      return AnalyticsErrorCodes.UPDATE_CHECK_FAILED
    case 'session-usage':
    case 'session-reset':
    case 'session-clear-project':
    case 'session-clear-all':
      return AnalyticsErrorCodes.SESSION_RESTORE_FAILED
    case 'extensions-list':
      return AnalyticsErrorCodes.EXTENSION_LOAD_FAILED
    default:
      return AnalyticsErrorCodes.RENDERER_ERROR
  }
}
