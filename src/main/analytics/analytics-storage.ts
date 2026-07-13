import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { ANALYTICS_CONFIG } from './analytics-config.js'
import type { AnalyticsIdentity, AnalyticsQueueItem } from './analytics-types.js'

type AnalyticsDiskState = {
  installation_id?: unknown
  installed_at?: unknown
  analytics_enabled?: unknown
  consent_version?: unknown
  schema_version?: unknown
  registration_pending?: unknown
  last_app_version?: unknown
}

const analyticsFileName = 'analytics.json'
const queueFileName = 'analytics-queue.json'
const retiredEventNames = new Set([
  'url_visited',
  'role_created',
  'role_updated',
  'role_deleted',
  'extension_installed',
  'extension_enabled',
  'extension_disabled',
  'extension_removed',
])

export function getAnalyticsStoragePaths(userDataPath: string): { identityPath: string; queuePath: string } {
  return {
    identityPath: path.join(userDataPath, analyticsFileName),
    queuePath: path.join(userDataPath, queueFileName),
  }
}

export async function loadAnalyticsIdentity(userDataPath: string): Promise<AnalyticsIdentity> {
  const { identityPath } = getAnalyticsStoragePaths(userDataPath)

  try {
    const raw = await readFile(identityPath, 'utf8')
    const parsed = JSON.parse(raw) as AnalyticsDiskState

    if (typeof parsed.installation_id === 'string' && typeof parsed.installed_at === 'string') {
      if (parsed.consent_version !== 1) {
        const migratedIdentity = createAnalyticsIdentity(false)
        await saveAnalyticsIdentity(userDataPath, migratedIdentity)
        return migratedIdentity
      }

      const hasCurrentConsent = parsed.consent_version === 1 && parsed.analytics_enabled === true

      return {
        installation_id: parsed.installation_id,
        installed_at: parsed.installed_at,
        analytics_enabled: hasCurrentConsent,
        consent_version: 1,
        schema_version: ANALYTICS_CONFIG.schemaVersion,
        registration_pending:
          hasCurrentConsent && typeof parsed.registration_pending === 'boolean'
            ? parsed.registration_pending
            : hasCurrentConsent,
        last_app_version:
          typeof parsed.last_app_version === 'string' ? parsed.last_app_version : undefined,
      }
    }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code

    if (code !== 'ENOENT') {
      throw error
    }
  }

  const identity = createAnalyticsIdentity(false)

  await saveAnalyticsIdentity(userDataPath, identity)

  return identity
}

export function createAnalyticsIdentity(analyticsEnabled: boolean): AnalyticsIdentity {
  return {
    installation_id: randomUUID(),
    installed_at: new Date().toISOString(),
    analytics_enabled: analyticsEnabled,
    consent_version: 1,
    schema_version: ANALYTICS_CONFIG.schemaVersion,
    registration_pending: analyticsEnabled,
  }
}

export async function saveAnalyticsIdentity(
  userDataPath: string,
  identity: AnalyticsIdentity,
): Promise<void> {
  const { identityPath } = getAnalyticsStoragePaths(userDataPath)
  await writeJsonAtomic(identityPath, identity)
}

export async function loadQueuedAnalyticsEvents(userDataPath: string): Promise<AnalyticsQueueItem[]> {
  const { queuePath } = getAnalyticsStoragePaths(userDataPath)

  try {
    const raw = await readFile(queuePath, 'utf8')
    const parsed = JSON.parse(raw) as unknown

    return Array.isArray(parsed) ? parsed.filter(isQueueItem) : []
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code

    if (code === 'ENOENT') {
      return []
    }

    throw error
  }
}

export async function saveQueuedAnalyticsEvents(
  userDataPath: string,
  items: AnalyticsQueueItem[],
): Promise<void> {
  const { queuePath } = getAnalyticsStoragePaths(userDataPath)
  await writeJsonAtomic(queuePath, items)
}

export async function clearQueuedAnalyticsEvents(userDataPath: string): Promise<void> {
  const { queuePath } = getAnalyticsStoragePaths(userDataPath)
  await rm(queuePath, { force: true })
}

async function writeJsonAtomic(filePath: string, value: unknown): Promise<void> {
  const temporaryPath = `${filePath}.tmp`

  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  await rename(temporaryPath, filePath)
}

function isQueueItem(item: unknown): item is AnalyticsQueueItem {
  if (!item || typeof item !== 'object') {
    return false
  }

  const candidate = item as Partial<AnalyticsQueueItem>
  const event = candidate.event as { event_id?: unknown; event_name?: unknown } | undefined

  return (
    typeof event?.event_id === 'string' &&
    typeof event.event_name === 'string' &&
    !retiredEventNames.has(event.event_name) &&
    typeof candidate.created_at === 'string' &&
    typeof candidate.attempt_count === 'number'
  )
}
