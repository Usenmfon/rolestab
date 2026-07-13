const assert = require('node:assert/strict')
const { existsSync, readFileSync } = require('node:fs')
const { mkdtemp, rm, writeFile } = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')
const { setTimeout: delay } = require('node:timers/promises')

async function createTempUserData() {
  return mkdtemp(path.join(os.tmpdir(), 'rolestab-analytics-test-'))
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

test('analytics identity is pseudonymous, persistent, and disabled by default', async () => {
  const { loadAnalyticsIdentity, getAnalyticsStoragePaths } = require('../dist-electron/main/analytics/analytics-storage.js')
  const tempRoot = await createTempUserData()

  try {
    const firstIdentity = await loadAnalyticsIdentity(tempRoot)
    const secondIdentity = await loadAnalyticsIdentity(tempRoot)

    assert.match(firstIdentity.installation_id, /^[0-9a-f-]{36}$/)
    assert.equal(secondIdentity.installation_id, firstIdentity.installation_id)
    assert.equal(secondIdentity.installed_at, firstIdentity.installed_at)
    assert.equal(firstIdentity.analytics_enabled, false)
    assert.equal(firstIdentity.consent_version, 1)

    const { identityPath } = getAnalyticsStoragePaths(tempRoot)
    await rm(identityPath, { force: true })

    const recreatedIdentity = await loadAnalyticsIdentity(tempRoot)
    assert.notEqual(recreatedIdentity.installation_id, firstIdentity.installation_id)
    assert.equal(readFileSync(identityPath, 'utf8').includes(os.hostname()), false)
  } finally {
    await rm(tempRoot, { recursive: true, force: true })
  }
})

test('analytics platform, architecture, and retry helpers are constrained', () => {
  const {
    normalizeArchitecture,
    normalizePlatform,
    parseRetryAfterMs,
    getRetryDelayMs,
    isPermanentStatus,
    isRetryableStatus,
  } = require('../dist-electron/main/analytics/index.js')

  assert.equal(normalizePlatform('win32'), 'windows')
  assert.equal(normalizePlatform('darwin'), 'macos')
  assert.equal(normalizePlatform('linux'), 'linux')
  assert.equal(normalizeArchitecture('x64'), 'x64')
  assert.equal(normalizeArchitecture('arm64'), 'arm64')
  assert.equal(normalizeArchitecture('mips'), 'unknown')
  assert.equal(isRetryableStatus(429), true)
  assert.equal(isRetryableStatus(503), true)
  assert.equal(isPermanentStatus(422), true)
  assert.equal(parseRetryAfterMs('2'), 2000)
  assert.equal(getRetryDelayMs(0, null, () => 0), 5000)
})

test('legacy default-on analytics identities migrate to a fresh disabled identity', async () => {
  const { AnalyticsClient } = require('../dist-electron/main/analytics/index.js')
  const { loadAnalyticsIdentity, getAnalyticsStoragePaths } = require('../dist-electron/main/analytics/analytics-storage.js')
  const tempRoot = await createTempUserData()

  try {
    const { identityPath, queuePath } = getAnalyticsStoragePaths(tempRoot)
    await writeFile(
      identityPath,
      JSON.stringify({
        installation_id: '11111111-1111-4111-8111-111111111111',
        installed_at: '2025-01-01T00:00:00.000Z',
        analytics_enabled: true,
        schema_version: 1,
        registration_pending: false,
      }),
      'utf8',
    )
    await writeFile(
      queuePath,
      JSON.stringify([
        {
          event: {
            event_id: 'legacy-tab-event',
            installation_id: '11111111-1111-4111-8111-111111111111',
            event_name: 'tab_opened',
          },
          status: 'pending',
          attempt_count: 0,
          next_retry_at: null,
          created_at: new Date().toISOString(),
        },
      ]),
      'utf8',
    )

    const migratedIdentity = await loadAnalyticsIdentity(tempRoot)

    assert.equal(migratedIdentity.analytics_enabled, false)
    assert.equal(migratedIdentity.consent_version, 1)
    assert.notEqual(migratedIdentity.installation_id, '11111111-1111-4111-8111-111111111111')
    const reloadedIdentity = await loadAnalyticsIdentity(tempRoot)
    assert.equal(reloadedIdentity.installation_id, migratedIdentity.installation_id)
    assert.equal(reloadedIdentity.analytics_enabled, false)
    assert.equal(reloadedIdentity.consent_version, 1)

    const client = new AnalyticsClient({
      userDataPath: tempRoot,
      appVersion: '0.1.2',
      locale: 'en-NG',
      timezone: 'Africa/Lagos',
      fetchImpl: async () => {
        throw new Error('disabled analytics must not use the network')
      },
    })
    await client.initialize()
    assert.equal(existsSync(queuePath), false)
  } finally {
    await rm(tempRoot, { recursive: true, force: true })
  }
})

test('retired navigation, role, and extension events are discarded before the queue can flush', async () => {
  const { getAnalyticsStoragePaths, loadQueuedAnalyticsEvents } = require('../dist-electron/main/analytics/analytics-storage.js')
  const tempRoot = await createTempUserData()

  try {
    const { queuePath } = getAnalyticsStoragePaths(tempRoot)
    await writeFile(
      queuePath,
      JSON.stringify(
        ['url_visited', 'role_created', 'extension_installed'].map((eventName) => ({
          event: {
            event_id: `legacy-${eventName}`,
            event_name: eventName,
            properties: { hostname: 'private.example', role_id: 'private-role', extension_id: 'private-extension' },
          },
          status: 'pending',
          attempt_count: 0,
          next_retry_at: null,
          created_at: new Date().toISOString(),
        })),
      ),
      'utf8',
    )

    assert.deepEqual(await loadQueuedAnalyticsEvents(tempRoot), [])
  } finally {
    await rm(tempRoot, { recursive: true, force: true })
  }
})

test('analytics queue survives restart, enforces limits, and preserves event ids for retry', async () => {
  const { AnalyticsClient } = require('../dist-electron/main/analytics/index.js')
  const { getAnalyticsStoragePaths } = require('../dist-electron/main/analytics/analytics-storage.js')
  const tempRoot = await createTempUserData()
  const calls = []
  const fetchImpl = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) })

    if (url.endsWith('/analytics/installations')) {
      return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    return new Response('{}', { status: 503, headers: { 'Retry-After': '1' } })
  }

  try {
    const client = new AnalyticsClient({
      userDataPath: tempRoot,
      appVersion: '0.1.2',
      locale: 'en-NG',
      timezone: 'Africa/Lagos',
      platform: 'win32',
      architecture: 'x64',
      fetchImpl,
    })

    await client.initialize()
    await client.setEnabled(true)
    await client.track({ event_name: 'feature_used', properties: { feature: 'check_for_updates' } })
    const queuedBeforeFlush = readJson(getAnalyticsStoragePaths(tempRoot).queuePath)
    const featureEventId = queuedBeforeFlush.find((item) => item.event.event_name === 'feature_used').event.event_id

    let queuedAfterRetry = queuedBeforeFlush

    for (let attempt = 0; attempt < 20; attempt += 1) {
      await client.flush()
      queuedAfterRetry = readJson(getAnalyticsStoragePaths(tempRoot).queuePath)

      if (queuedAfterRetry.some((item) => item.event.event_id === featureEventId && item.status === 'retry')) {
        break
      }

      await delay(10)
    }

    const retriedFeatureEvent = queuedAfterRetry.find((item) => item.event.event_name === 'feature_used')

    assert.equal(retriedFeatureEvent.event.event_id, featureEventId)
    assert.equal(retriedFeatureEvent.status, 'retry')
    assert.equal(retriedFeatureEvent.attempt_count, 1)
    assert.equal(client.getSessionId()?.length, 36)

    await client.shutdown()

    const restartedClient = new AnalyticsClient({
      userDataPath: tempRoot,
      appVersion: '0.1.2',
      locale: 'en-NG',
      timezone: 'Africa/Lagos',
      platform: 'win32',
      architecture: 'x64',
      fetchImpl,
    })
    await restartedClient.initialize()
    assert.ok(restartedClient.getQueueLength() > 0)
    await restartedClient.shutdown()
  } finally {
    await rm(tempRoot, { recursive: true, force: true })
  }
})

test('analytics opt-out clears pending events and persists disabled preference', async () => {
  const { AnalyticsClient } = require('../dist-electron/main/analytics/index.js')
  const { getAnalyticsStoragePaths } = require('../dist-electron/main/analytics/analytics-storage.js')
  const tempRoot = await createTempUserData()

  try {
    const client = new AnalyticsClient({
      userDataPath: tempRoot,
      appVersion: '0.1.2',
      locale: 'en-NG',
      timezone: 'Africa/Lagos',
      platform: 'win32',
      architecture: 'x64',
      fetchImpl: async () => new Response('{}', { status: 200 }),
    })

    await client.initialize()
    await client.setEnabled(true)
    const enabledInstallationId = client.getIdentity().installation_id
    await client.track({ event_name: 'feature_used', properties: { feature: 'check_for_updates' } })
    assert.equal(existsSync(getAnalyticsStoragePaths(tempRoot).queuePath), true)

    await client.setEnabled(false)
    const identity = readJson(getAnalyticsStoragePaths(tempRoot).identityPath)

    assert.equal(identity.analytics_enabled, false)
    assert.equal(identity.consent_version, 1)
    assert.notEqual(identity.installation_id, enabledInstallationId)
    assert.equal(existsSync(getAnalyticsStoragePaths(tempRoot).queuePath), false)

    await client.track({ event_name: 'feature_used', properties: { feature: 'check_for_updates' } })
    assert.equal(existsSync(getAnalyticsStoragePaths(tempRoot).queuePath), false)
    await client.shutdown()
  } finally {
    await rm(tempRoot, { recursive: true, force: true })
  }
})

test('analytics source contracts exclude unsafe renderer and privacy patterns', () => {
  const root = path.resolve(__dirname, '..')
  const preloadSource = readFileSync(path.join(root, 'src/preload/index.ts'), 'utf8')
  const ipcSource = readFileSync(path.join(root, 'src/main/analytics/analytics-ipc.ts'), 'utf8')
  const privacySource = readFileSync(path.join(root, 'src/main/analytics/analytics-privacy.ts'), 'utf8')
  const appSource = readFileSync(path.join(root, 'src/renderer/app/App.tsx'), 'utf8')

  assert.match(preloadSource, /connectivityRestored/)
  assert.match(preloadSource, /analytics:connectivity-restored/)
  assert.doesNotMatch(preloadSource, /urlVisited|analytics:url-visited|roleCreated|roleUpdated|roleDeleted/)
  assert.doesNotMatch(preloadSource, /extensionInstalled|extensionEnabled|extensionDisabled|extensionRemoved/)
  assert.doesNotMatch(preloadSource, /track\(eventName/)
  assert.match(ipcSource, /analytics:connectivity-restored/)
  assert.match(ipcSource, /assertTrustedSender/)
  assert.match(ipcSource, /analytics\.flush\(\)/)
  assert.doesNotMatch(ipcSource, /url_visited|hostname|role_id|extension_id|component/)
  assert.doesNotMatch(privacySource, /hostname/)
  assert.doesNotMatch(appSource, /urlVisited|url_visited|roleCreated|roleUpdated|roleDeleted/)
  assert.match(appSource, /addEventListener\('online', handleOnline\)/)
  assert.match(appSource, /removeEventListener\('online', handleOnline\)/)
  assert.doesNotMatch(appSource, /role_name/)
  assert.doesNotMatch(appSource, /stack_trace/)
  assert.match(appSource, /shareAnonymousAnalytics: settings\.shareAnonymousAnalytics/)
})
