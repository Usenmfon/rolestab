import { randomUUID } from 'node:crypto'

export type AnalyticsSession = {
  id: string
  startedAt: string
}

export function createAnalyticsSession(): AnalyticsSession {
  return {
    id: randomUUID(),
    startedAt: new Date().toISOString(),
  }
}
