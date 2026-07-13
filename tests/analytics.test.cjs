const assert = require('node:assert/strict')
const { existsSync, readFileSync } = require('node:fs')
const { mkdtemp, rm } = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')

async function createTempUserData() {
  return mkdtemp(path.join(os.tmpdir(), 'rolestab-analytics-test-'))
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

test('analytics identity is anonymous, persistent, and recreated only after deletion', async () => {
  const { loadAnalyticsIdentity, getAnalyticsStoragePaths } = require('../dist-electron/main/analytics/analytics-storage.js')
  const tempRoot = await createTempUserData()

  try {
    const firstIdentity = await loadAnalyticsIdentity(tempRoot)
    const secondIdentity = await loadAnalyticsIdentity(tempRoot)

    assert.match(firstIdentity.installation_id, /^[0-9a-f-]{36}$/)
    assert.equal(secondIdentity.installation_id, firstIdentity.installation_id)
    assert.equal(secondIdentity.installed_at, firstIdentity.installed_at)
    assert.equal(firstIdentity.analytics_enabled, true)

    const { identityPath } = getAnalyticsStoragePaths(tempRoot)
    await rm(identityPath, { force: true })

    const recreatedIdentity = await loadAnalyticsIdentity(tempRoot)
    assert.notEqual(recreatedIdentity.installation_id, firstIdentity.installation_id)
    assert.equal(readFileSync(identityPath, 'utf8').includes(os.hostname()), false)
  } finally {
    await rm(tempRoot, { recursive: true, force: true })
  }
})

test('analytics platform, architecture, retry, and URL privacy helpers are constrained', () => {
  const {
    getSafeHostname,
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
  assert.equal(getSafeHostname('https://User:pass@GitHub.com:443/org/repo?token=secret#frag'), 'github.com')
  assert.equal(getSafeHostname('file:///C:/Users/name/private.txt'), null)
  assert.equal(getSafeHostname('rolestab://settings'), null)
  assert.equal(isRetryableStatus(429), true)
  assert.equal(isRetryableStatus(503), true)
  assert.equal(isPermanentStatus(422), true)
  assert.equal(parseRetryAfterMs('2'), 2000)
  assert.equal(getRetryDelayMs(0, null, () => 0), 5000)
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
    await client.track({ event_name: 'role_created', properties: { role_id: 'role-123' } })
    const queuedBeforeFlush = readJson(getAnalyticsStoragePaths(tempRoot).queuePath)
    const roleEventId = queuedBeforeFlush.find((item) => item.event.event_name === 'role_created').event.event_id

    await client.flush()
    const queuedAfterRetry = readJson(getAnalyticsStoragePaths(tempRoot).queuePath)
    const retriedRoleEvent = queuedAfterRetry.find((item) => item.event.event_name === 'role_created')

    assert.equal(retriedRoleEvent.event.event_id, roleEventId)
    assert.equal(retriedRoleEvent.status, 'retry')
    assert.equal(retriedRoleEvent.attempt_count, 1)
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
    await client.track({ event_name: 'role_deleted', properties: { role_id: 'role-123' } })
    assert.equal(existsSync(getAnalyticsStoragePaths(tempRoot).queuePath), true)

    await client.setEnabled(false)
    const identity = readJson(getAnalyticsStoragePaths(tempRoot).identityPath)

    assert.equal(identity.analytics_enabled, false)
    assert.equal(existsSync(getAnalyticsStoragePaths(tempRoot).queuePath), false)

    await client.track({ event_name: 'role_created', properties: { role_id: 'role-456' } })
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
  assert.match(preloadSource, /roleCreated/)
  assert.match(preloadSource, /urlVisited/)
  assert.doesNotMatch(preloadSource, /track\(eventName/)
  assert.match(ipcSource, /analytics:connectivity-restored/)
  assert.match(ipcSource, /assertTrustedSender/)
  assert.match(ipcSource, /analytics\.flush\(\)/)
  assert.match(ipcSource, /sanitizeIdentifier/)
  assert.match(privacySource, /parsed\.hostname\.toLowerCase\(\)/)
  assert.match(appSource, /addEventListener\('online', handleOnline\)/)
  assert.match(appSource, /removeEventListener\('online', handleOnline\)/)
  assert.doesNotMatch(appSource, /role_name/)
  assert.doesNotMatch(appSource, /stack_trace/)
})
