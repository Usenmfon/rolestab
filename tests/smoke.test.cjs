const assert = require('node:assert/strict')
const { existsSync, readFileSync } = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const root = path.resolve(__dirname, '..')

function readProjectFile(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8')
}

test('build artifacts required by Electron exist', () => {
  const requiredArtifacts = [
    'dist/index.html',
    'dist-electron/main/index.js',
    'dist-electron/main/browserWindow.js',
    'dist-electron/main/sessionManager.js',
    'dist-electron/main/workspaceStore.js',
    'dist-electron/main/errorLogger.js',
    'dist-electron/preload/index.js',
    'dist-electron/shared/workspace.js',
  ]

  for (const artifact of requiredArtifacts) {
    assert.equal(existsSync(path.join(root, artifact)), true, `${artifact} should exist after npm run build`)
  }
})

test('package metadata points Electron at the compiled main process', () => {
  const packageJson = JSON.parse(readProjectFile('package.json'))

  assert.equal(packageJson.main, 'dist-electron/main/index.js')
  assert.equal(packageJson.build.appId, 'com.rolestab.app')
  assert.equal(packageJson.build.productName, 'RolesTab')
  assert.equal(packageJson.build.directories.output, 'release')
  assert.equal(packageJson.build.extraMetadata.main, 'dist-electron/main/index.js')
  assert.equal(packageJson.build.asar, true)
  assert.ok(packageJson.build.files.includes('dist/**'))
  assert.ok(packageJson.build.files.includes('dist-electron/**'))
  assert.ok(packageJson.build.files.includes('!tests/**'))
})

test('packaging config includes Windows, macOS, and Linux targets', () => {
  const packageJson = JSON.parse(readProjectFile('package.json'))

  assert.equal(packageJson.scripts['dist:win'], 'npm run build && electron-builder --win')
  assert.equal(packageJson.scripts['dist:mac'], 'npm run build && electron-builder --mac')
  assert.equal(packageJson.scripts['dist:linux'], 'npm run build && electron-builder --linux')
  assert.equal(packageJson.build.win.target[0].target, 'nsis')
  assert.deepEqual(packageJson.build.mac.target, ['dmg', 'zip'])
  assert.deepEqual(packageJson.build.linux.target, ['AppImage', 'deb'])
  assert.equal(packageJson.build.nsis.shortcutName, 'RolesTab')
  assert.equal(packageJson.build.nsis.installerIcon, 'public/favicon.ico')
  assert.equal(packageJson.build.nsis.uninstallerIcon, 'public/favicon.ico')
  assert.equal(existsSync(path.join(root, 'public/favicon.ico')), true)
})

test('packaging-only dependencies stay out of production dependencies', () => {
  const packageJson = JSON.parse(readProjectFile('package.json'))

  assert.equal(packageJson.dependencies.electron, undefined)
  assert.equal(packageJson.dependencies['electron-builder'], undefined)
  assert.equal(typeof packageJson.devDependencies.electron, 'string')
  assert.equal(typeof packageJson.devDependencies['electron-builder'], 'string')
})

test('renderer shell has a content security policy', () => {
  const indexHtml = readProjectFile('dist/index.html')

  assert.match(indexHtml, /Content-Security-Policy/)
  assert.match(indexHtml, /object-src 'none'/)
  assert.match(indexHtml, /frame-src http: https:/)
})

test('default app settings cover MVP keyboard and session behavior', () => {
  const { defaultAppSettings, defaultKeyboardShortcuts, defaultRoleColors } = require('../dist-electron/shared/workspace.js')

  assert.equal(defaultAppSettings.restoreTabsOnStartup, true)
  assert.equal(defaultAppSettings.confirmBeforeClearingSessions, true)
  assert.equal(defaultAppSettings.theme, 'system')
  assert.equal(defaultAppSettings.defaultHomepage, '')
  assert.deepEqual(defaultAppSettings.defaultRoleColors, defaultRoleColors)

  for (const shortcut of [
    'newTab',
    'closeTab',
    'reload',
    'hardReload',
    'focusUrlBar',
    'openDevTools',
    'nextTab',
    'previousTab',
    'openAllRoles',
    'clearActiveRoleSession',
  ]) {
    assert.equal(typeof defaultKeyboardShortcuts[shortcut], 'string', `${shortcut} shortcut should be configured`)
    assert.notEqual(defaultKeyboardShortcuts[shortcut].trim(), '')
  }
})

test('security-sensitive source contracts are present', () => {
  const browserWindowSource = readProjectFile('src/main/browserWindow.ts')
  const webviewSource = readProjectFile('src/renderer/components/BrowserWebview.tsx')
  const ipcSource = readProjectFile('src/main/index.ts')

  assert.match(browserWindowSource, /nodeIntegration:\s*false/)
  assert.match(browserWindowSource, /contextIsolation:\s*true/)
  assert.match(browserWindowSource, /sandbox:\s*true/)
  assert.match(webviewSource, /nodeIntegration=no/)
  assert.match(webviewSource, /contextIsolation=yes/)
  assert.match(webviewSource, /sandbox=yes/)
  assert.match(ipcSource, /assertTrustedSender/)
})

test('project configuration import and export contract is wired', () => {
  const workspaceTypes = readProjectFile('src/shared/workspace.ts')
  const workspaceStoreSource = readProjectFile('src/main/workspaceStore.ts')
  const ipcSource = readProjectFile('src/main/index.ts')
  const preloadSource = readProjectFile('src/preload/index.ts')
  const sidebarSource = readProjectFile('src/renderer/components/Sidebar.tsx')

  assert.match(workspaceTypes, /ProjectExportData/)
  assert.match(workspaceTypes, /WorkspaceImportResult/)
  assert.match(workspaceStoreSource, /exportProjectConfig/)
  assert.match(workspaceStoreSource, /importProjectConfig/)
  assert.match(workspaceStoreSource, /app:\s*'RolesTab'/)
  assert.match(ipcSource, /workspace:export-project-config/)
  assert.match(ipcSource, /workspace:import-project-config/)
  assert.match(ipcSource, /showSaveDialog/)
  assert.match(ipcSource, /showOpenDialog/)
  assert.match(preloadSource, /exportProjectConfig/)
  assert.match(preloadSource, /importProjectConfig/)
  assert.match(sidebarSource, /Export/)
  assert.match(sidebarSource, /Import/)
})
