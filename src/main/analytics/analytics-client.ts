import { ANALYTICS_CONFIG } from './analytics-config.js'
import { createAnalyticsEvent } from './analytics-events.js'
import { normalizeArchitecture, normalizePlatform } from './analytics-platform.js'
import { getRetryDelayMs, isPermanentStatus, isRetryableStatus } from './analytics-retry.js'
import { createAnalyticsSession, type AnalyticsSession } from './analytics-session.js'
import { createAnalyticsIdentity, loadAnalyticsIdentity, saveAnalyticsIdentity } from './analytics-storage.js'
import { AnalyticsQueue } from './analytics-queue.js'
import type {
  AnalyticsArchitecture,
  AnalyticsBatchItemResult,
  AnalyticsEventInput,
  AnalyticsIdentity,
  AnalyticsPlatform,
  AnalyticsQueueItem,
  AnalyticsRegistrationPayload,
} from './analytics-types.js'

type AnalyticsHttpClient = (
  url: string,
  init: {
    method: 'POST'
    headers: Record<string, string>
    body: string
    signal?: AbortSignal
  },
) => Promise<Response>

type AnalyticsClientOptions = {
  userDataPath: string
  appVersion: string
  locale: string
  timezone: string
  distributionChannel?: string
  platform?: NodeJS.Platform
  architecture?: string
  fetchImpl?: AnalyticsHttpClient
  log?: (message: string) => void
}

export class AnalyticsClient {
  private identity: AnalyticsIdentity | null = null
  private session: AnalyticsSession | null = null
  private readonly queue: AnalyticsQueue
  private readonly platform: AnalyticsPlatform
  private readonly architecture: AnalyticsArchitecture
  private readonly fetchImpl: AnalyticsHttpClient
  private readonly distributionChannel: string
  private readonly log: (message: string) => void
  private readonly activeRequests = new Set<AbortController>()
  private flushTimer: NodeJS.Timeout | null = null
  private flushing = false
  private flushCompletion: Promise<void> | null = null
  private resolveFlushCompletion: (() => void) | null = null

  constructor(private readonly options: AnalyticsClientOptions) {
    this.queue = new AnalyticsQueue(options.userDataPath)
    this.platform = normalizePlatform(options.platform ?? process.platform)
    this.architecture = normalizeArchitecture(options.architecture ?? process.arch)
    this.fetchImpl = options.fetchImpl ?? fetch
    this.distributionChannel = options.distributionChannel ?? 'github'
    this.log = options.log ?? (() => undefined)
  }

  async initialize(): Promise<void> {
    this.identity = await loadAnalyticsIdentity(this.options.userDataPath)
    await this.queue.load()

    if (this.queue.all().some((item) => item.event.installation_id !== this.identity?.installation_id)) {
      await this.queue.clear()
    }

    if (!this.identity.analytics_enabled) {
      return
    }

    this.session = createAnalyticsSession()
    await this.trackAppUpdatedIfNeeded()
    void this.registerInstallation().then(() => this.flush()).catch(() => undefined)
    await this.track({ event_name: 'app_launched', properties: {} })
    await this.track({ event_name: 'session_started', properties: {} })
    this.startFlushTimer()
  }

  getIdentity(): AnalyticsIdentity | null {
    return this.identity
  }

  getSessionId(): string | null {
    return this.session?.id ?? null
  }

  getQueueLength(): number {
    return this.queue.length
  }

  async track(input: AnalyticsEventInput): Promise<void> {
    if (!this.identity?.analytics_enabled) {
      return
    }

    const event = createAnalyticsEvent({
      input,
      identity: this.identity,
      sessionId: this.session?.id,
      appVersion: this.options.appVersion,
      platform: this.platform,
      architecture: this.architecture,
    })

    await this.queue.enqueue(event)

    if (this.queue.length >= ANALYTICS_CONFIG.flushThreshold) {
      void this.flush().catch(() => undefined)
    }
  }

  async setEnabled(enabled: boolean): Promise<void> {
    if (!this.identity) {
      this.identity = await loadAnalyticsIdentity(this.options.userDataPath)
    }

    if (!enabled) {
      this.stopFlushTimer()
      this.session = null

      if (this.identity.analytics_enabled) {
        this.identity = createAnalyticsIdentity(false)
      } else {
        this.identity = { ...this.identity, analytics_enabled: false, consent_version: 1 }
      }

      for (const controller of this.activeRequests) {
        controller.abort()
      }

      await this.flushCompletion
      await this.queue.clear()
      await saveAnalyticsIdentity(this.options.userDataPath, this.identity)
      return
    }

    this.identity = {
      ...this.identity,
      analytics_enabled: true,
      consent_version: 1,
      registration_pending: true,
    }
    await saveAnalyticsIdentity(this.options.userDataPath, this.identity)

    if (!this.session) {
      this.session = createAnalyticsSession()
    }

    this.startFlushTimer()
    void this.registerInstallation().then(() => this.flush()).catch(() => undefined)
  }

  async shutdown(): Promise<void> {
    this.stopFlushTimer()

    if (!this.identity?.analytics_enabled) {
      return
    }

    await this.track({ event_name: 'session_ended', properties: {} })
    await this.track({ event_name: 'app_closed', properties: {} })

    await Promise.race([
      this.flush(),
      new Promise<void>((resolve) => {
        setTimeout(resolve, ANALYTICS_CONFIG.shutdownFlushTimeoutMs)
      }),
    ])
  }

  async registerInstallation(): Promise<void> {
    if (!this.identity?.analytics_enabled) {
      return
    }

    const payload: AnalyticsRegistrationPayload = {
      installation_id: this.identity.installation_id,
      installed_at: this.identity.installed_at,
      app_version: this.options.appVersion,
      platform: this.platform,
      architecture: this.architecture,
      distribution_channel: this.distributionChannel,
      locale: this.options.locale,
      timezone: this.options.timezone,
      analytics_enabled: this.identity.analytics_enabled,
      schema_version: ANALYTICS_CONFIG.schemaVersion,
    }

    try {
      const response = await this.post('/analytics/installations', payload)

      if (!this.identity?.analytics_enabled) {
        return
      }

      if (response.ok || response.status === 409) {
        this.identity = { ...this.identity, registration_pending: false }
        await saveAnalyticsIdentity(this.options.userDataPath, this.identity)
        return
      }

      if (!isRetryableStatus(response.status)) {
        this.log(`Analytics registration failed permanently: ${response.status}`)
      }
    } catch {
      this.log('Analytics registration failed temporarily.')
    }
  }

  private async trackAppUpdatedIfNeeded(): Promise<void> {
    if (!this.identity) {
      return
    }

    const previousVersion = this.identity.last_app_version

    if (previousVersion && previousVersion !== this.options.appVersion) {
      await this.track({
        event_name: 'app_updated',
        properties: {
          previous_version: previousVersion,
          new_version: this.options.appVersion,
        },
      })
    }

    this.identity = { ...this.identity, last_app_version: this.options.appVersion }
    await saveAnalyticsIdentity(this.options.userDataPath, this.identity)
  }

  async flush(): Promise<void> {
    if (this.flushing || !this.identity?.analytics_enabled) {
      return
    }

    const batch = this.queue.readyBatch()

    if (batch.length === 0) {
      return
    }

    this.flushing = true
    this.flushCompletion = new Promise<void>((resolve) => {
      this.resolveFlushCompletion = resolve
    })

    try {
      await this.queue.markSending(batch.map((item) => item.event.event_id))

      const endpoint = batch.length === 1 ? '/analytics/events' : '/analytics/events/batch'
      const body =
        batch.length === 1
          ? { event: batch[0]?.event }
          : { events: batch.map((item) => item.event) }
      const response = await this.post(endpoint, body)

      if (response.ok) {
        await this.handleSuccessfulFlush(response, batch)
        return
      }

      if (isPermanentStatus(response.status)) {
        await this.queue.quarantine(
          batch.map((item) => item.event.event_id),
          String(response.status),
        )
        return
      }

      if (isRetryableStatus(response.status)) {
        await this.queue.scheduleRetry(
          batch.map((item) => item.event.event_id),
          getRetryDelayMs(getHighestAttemptCount(batch), response.headers.get('Retry-After')),
          String(response.status),
        )
        return
      }

      await this.queue.scheduleRetry(batch.map((item) => item.event.event_id), getRetryDelayMs(getHighestAttemptCount(batch)), String(response.status))
    } catch (error) {
      const name = error instanceof Error ? error.name : 'NETWORK_ERROR'
      await this.queue.scheduleRetry(
        batch.map((item) => item.event.event_id),
        getRetryDelayMs(getHighestAttemptCount(batch)),
        name,
      )
    } finally {
      this.flushing = false
      this.resolveFlushCompletion?.()
      this.resolveFlushCompletion = null
      this.flushCompletion = null
    }
  }

  private async handleSuccessfulFlush(response: Response, batch: AnalyticsQueueItem[]): Promise<void> {
    const results = await readBatchResults(response, batch)
    const acceptedIds: string[] = []
    const rejectedIds: string[] = []
    const notRegisteredIds: string[] = []

    for (const result of results) {
      if (result.status === 'accepted' || result.status === 'duplicate') {
        acceptedIds.push(result.event_id)
      } else if (result.error_code === 'INSTALLATION_NOT_REGISTERED') {
        notRegisteredIds.push(result.event_id)
      } else {
        rejectedIds.push(result.event_id)
      }
    }

    if (acceptedIds.length > 0) {
      await this.queue.remove(acceptedIds)
    }

    if (rejectedIds.length > 0) {
      await this.queue.quarantine(rejectedIds, 'REJECTED')
    }

    if (notRegisteredIds.length > 0) {
      const retryableIds = batch
        .filter((item) => notRegisteredIds.includes(item.event.event_id) && !item.registration_retry_attempted)
        .map((item) => item.event.event_id)
      const exhaustedIds = notRegisteredIds.filter((eventId) => !retryableIds.includes(eventId))

      if (retryableIds.length > 0) {
        await this.queue.flagRegistrationRetryAttempted(retryableIds)
        await this.registerInstallation()
        await this.queue.scheduleRetry(retryableIds, 0, 'INSTALLATION_NOT_REGISTERED')
      }

      if (exhaustedIds.length > 0) {
        await this.queue.quarantine(exhaustedIds, 'INSTALLATION_NOT_REGISTERED')
      }
    }
  }

  private async post(path: string, payload: unknown): Promise<Response> {
    const controller = new AbortController()
    this.activeRequests.add(controller)
    const timeout = setTimeout(() => controller.abort(), ANALYTICS_CONFIG.requestTimeoutMs)

    try {
      return await this.fetchImpl(`${ANALYTICS_CONFIG.baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeout)
      this.activeRequests.delete(controller)
    }
  }

  private startFlushTimer(): void {
    if (this.flushTimer) {
      return
    }

    this.flushTimer = setInterval(() => {
      void this.flush().catch(() => undefined)
    }, ANALYTICS_CONFIG.flushIntervalMs)
    this.flushTimer.unref()
  }

  private stopFlushTimer(): void {
    if (!this.flushTimer) {
      return
    }

    clearInterval(this.flushTimer)
    this.flushTimer = null
  }
}

async function readBatchResults(
  response: Response,
  batch: AnalyticsQueueItem[],
): Promise<AnalyticsBatchItemResult[]> {
  const fallback = batch.map((item) => ({
    event_id: item.event.event_id,
    status: 'accepted' as const,
  }))

  try {
    const json = (await response.json()) as { results?: AnalyticsBatchItemResult[] } | AnalyticsBatchItemResult

    if (Array.isArray((json as { results?: AnalyticsBatchItemResult[] }).results)) {
      return (json as { results: AnalyticsBatchItemResult[] }).results
    }

    if ('event_id' in json && 'status' in json) {
      return [json]
    }
  } catch {
    return fallback
  }

  return fallback
}

function getHighestAttemptCount(batch: AnalyticsQueueItem[]): number {
  return Math.max(0, ...batch.map((item) => item.attempt_count))
}
