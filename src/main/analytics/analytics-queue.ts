import { ANALYTICS_CONFIG } from './analytics-config.js'
import {
  clearQueuedAnalyticsEvents,
  loadQueuedAnalyticsEvents,
  saveQueuedAnalyticsEvents,
} from './analytics-storage.js'
import type { AnalyticsEvent, AnalyticsEventName, AnalyticsQueueItem } from './analytics-types.js'

const highPriorityEvents = new Set<AnalyticsEventName>([
  'application_error',
  'app_updated',
  'session_started',
  'session_ended',
])
const lowPriorityEvents = new Set<AnalyticsEventName>([
  'tab_opened',
  'tab_closed',
  'tab_switched',
])

export class AnalyticsQueue {
  private items: AnalyticsQueueItem[] = []
  private writeQueue = Promise.resolve()

  constructor(private readonly userDataPath: string) {}

  async load(): Promise<void> {
    this.items = pruneExpiredItems(await loadQueuedAnalyticsEvents(this.userDataPath))
    await this.persist()
  }

  get length(): number {
    return this.items.filter((item) => item.status !== 'quarantined').length
  }

  all(): AnalyticsQueueItem[] {
    return [...this.items]
  }

  async enqueue(event: AnalyticsEvent): Promise<void> {
    this.items.push({
      event,
      status: 'pending',
      attempt_count: 0,
      next_retry_at: null,
      created_at: new Date().toISOString(),
    })
    this.enforceLimits()
    await this.persist()
  }

  readyBatch(now = new Date()): AnalyticsQueueItem[] {
    const nowMs = now.getTime()

    return this.items
      .filter((item) => {
        if (item.status === 'quarantined' || item.status === 'sending') {
          return false
        }

        if (!item.next_retry_at) {
          return true
        }

        return Date.parse(item.next_retry_at) <= nowMs
      })
      .slice(0, ANALYTICS_CONFIG.batchSize)
  }

  async markSending(eventIds: string[]): Promise<void> {
    const eventIdSet = new Set(eventIds)
    this.items = this.items.map((item) =>
      eventIdSet.has(item.event.event_id) ? { ...item, status: 'sending' } : item,
    )
    await this.persist()
  }

  async remove(eventIds: string[]): Promise<void> {
    const eventIdSet = new Set(eventIds)
    this.items = this.items.filter((item) => !eventIdSet.has(item.event.event_id))
    await this.persist()
  }

  async quarantine(eventIds: string[], errorCode?: string): Promise<void> {
    const eventIdSet = new Set(eventIds)
    this.items = this.items.map((item) =>
      eventIdSet.has(item.event.event_id)
        ? { ...item, status: 'quarantined', last_error_code: errorCode ?? item.last_error_code }
        : item,
    )
    await this.persist()
  }

  async scheduleRetry(eventIds: string[], delayMs: number, errorCode?: string): Promise<void> {
    const eventIdSet = new Set(eventIds)
    const nextRetryAt = new Date(Date.now() + delayMs).toISOString()

    this.items = this.items.map((item) =>
      eventIdSet.has(item.event.event_id)
        ? {
            ...item,
            status: 'retry',
            attempt_count: item.attempt_count + 1,
            next_retry_at: nextRetryAt,
            last_error_code: errorCode ?? item.last_error_code,
          }
        : item,
    )
    await this.persist()
  }

  async flagRegistrationRetryAttempted(eventIds: string[]): Promise<void> {
    const eventIdSet = new Set(eventIds)
    this.items = this.items.map((item) =>
      eventIdSet.has(item.event.event_id) ? { ...item, registration_retry_attempted: true } : item,
    )
    await this.persist()
  }

  async clear(): Promise<void> {
    this.items = []
    await clearQueuedAnalyticsEvents(this.userDataPath)
  }

  private enforceLimits(): void {
    this.items = pruneExpiredItems(this.items)

    if (this.items.length <= ANALYTICS_CONFIG.maxQueueSize) {
      return
    }

    const overflow = this.items.length - ANALYTICS_CONFIG.maxQueueSize
    const removable = [...this.items]
      .sort((left, right) => {
        const priorityDiff = getPriority(left.event.event_name) - getPriority(right.event.event_name)

        if (priorityDiff !== 0) {
          return priorityDiff
        }

        return Date.parse(left.created_at) - Date.parse(right.created_at)
      })
      .slice(0, overflow)
    const removableIds = new Set(removable.map((item) => item.event.event_id))

    this.items = this.items.filter((item) => !removableIds.has(item.event.event_id))
  }

  private async persist(): Promise<void> {
    const snapshot = [...this.items]

    this.writeQueue = this.writeQueue
      .catch(() => undefined)
      .then(() => saveQueuedAnalyticsEvents(this.userDataPath, snapshot))

    await this.writeQueue
  }
}

function pruneExpiredItems(items: AnalyticsQueueItem[]): AnalyticsQueueItem[] {
  const maxAgeMs = ANALYTICS_CONFIG.maxEventAgeDays * 24 * 60 * 60 * 1_000
  const cutoff = Date.now() - maxAgeMs

  return items.filter((item) => Date.parse(item.created_at) >= cutoff)
}

function getPriority(eventName: AnalyticsEventName): number {
  if (lowPriorityEvents.has(eventName)) {
    return 0
  }

  if (highPriorityEvents.has(eventName)) {
    return 2
  }

  return 1
}
