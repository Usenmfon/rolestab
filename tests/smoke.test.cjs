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
  assert.equal(packageJson.build.icon, 'public/android-chrome-512x512.png')
  assert.equal(packageJson.build.extraMetadata.main, 'dist-electron/main/index.js')
  assert.equal(packageJson.build.asar, true)
  assert.ok(packageJson.build.files.includes('dist/**'))
  assert.ok(packageJson.build.files.includes('dist-electron/**'))
  assert.ok(packageJson.build.files.includes('!tests/**'))
})

test('packaging config includes Windows, macOS, and Linux targets', () => {
  const packageJson = JSON.parse(readProjectFile('package.json'))

  assert.equal(packageJson.scripts['dist:win'], 'npm run build && electron-builder --win --publish never')
  assert.equal(packageJson.scripts['dist:mac'], 'npm run build && electron-builder --mac --publish never')
  assert.equal(packageJson.scripts['dist:mac:x64'], 'npm run build && electron-builder --mac --x64 --publish never')
  assert.equal(packageJson.scripts['dist:linux'], 'npm run build && electron-builder --linux --publish never')
  assert.equal(packageJson.build.win.target[0].target, 'nsis')
  assert.equal(packageJson.build.win.icon, 'public/android-chrome-512x512.png')
  assert.equal(packageJson.build.mac.icon, 'public/android-chrome-512x512.png')
  assert.deepEqual(packageJson.build.mac.target, ['dmg', 'zip'])
  assert.deepEqual(packageJson.build.linux.target, ['AppImage', 'deb'])
  assert.equal(packageJson.desktopName, 'RolesTab')
  assert.equal(packageJson.build.linux.syncDesktopName, true)
  assert.equal(packageJson.build.nsis.shortcutName, 'RolesTab')
  assert.equal(packageJson.build.nsis.installerIcon, 'public/favicon.ico')
  assert.equal(packageJson.build.nsis.uninstallerIcon, 'public/favicon.ico')
  assert.equal(existsSync(path.join(root, 'public/favicon.ico')), true)
  assert.equal(existsSync(path.join(root, 'public/android-chrome-512x512.png')), true)
  assert.equal(existsSync(path.join(root, 'public/apple-touch-icon.png')), true)
  assert.equal(existsSync(path.join(root, 'public/site.webmanifest')), true)
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
  assert.equal(defaultAppSettings.hasSeenOnboarding, false)
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
  assert.match(browserWindowSource, /app\.isPackaged/)
  assert.match(webviewSource, /nodeIntegration=no/)
  assert.match(webviewSource, /contextIsolation=yes/)
  assert.match(webviewSource, /sandbox=yes/)
  assert.match(webviewSource, /dom-ready/)
  assert.match(webviewSource, /shouldIgnorePageConsoleError/)
  assert.match(ipcSource, /assertTrustedSender/)
  assert.match(ipcSource, /app\.isPackaged/)
  assert.match(ipcSource, /setAppUserModelId/)
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

test('workspace storage recovers from trailing JSON corruption and serializes writes', () => {
  const workspaceStoreSource = readProjectFile('src/main/workspaceStore.ts')

  assert.match(workspaceStoreSource, /parseWorkspaceJson/)
  assert.match(workspaceStoreSource, /getFirstJsonObject/)
  assert.match(workspaceStoreSource, /workspaceWriteQueue/)
  assert.match(workspaceStoreSource, /rename\(temporaryPath, filePath\)/)
})

test('role launcher focuses existing tabs instead of creating duplicates', () => {
  const appSource = readProjectFile('src/renderer/app/App.tsx')

  assert.match(appSource, /const existingTab = tabs\.find\(\(tab\) => tab\.roleProfileId === roleProfileId\)/)
  assert.match(appSource, /setActiveTabId\(existingTab\.id\)/)
  assert.match(appSource, /!tabs\.some\(\(tab\) => tab\.roleProfileId === roleProfile\.id\)/)
})

test('update checker keeps transport errors readable in settings', () => {
  const autoUpdaterSource = readProjectFile('src/main/autoUpdater.ts')

  assert.match(autoUpdaterSource, /getUpdateErrorMessage/)
  assert.match(autoUpdaterSource, /GitHub is temporarily unavailable/)
  assert.match(autoUpdaterSource, /message\.split\(\s*\/\\r\?\\n\//)
  assert.match(autoUpdaterSource, /logInternalError\(\{\s*scope:\s*'auto-updater',\s*message:\s*error\.message/)
})

test('sidebar can be shown and hidden from the browser toolbar', () => {
  const appSource = readProjectFile('src/renderer/app/App.tsx')
  const layoutSource = readProjectFile('src/renderer/layouts/DesktopLayout.tsx')
  const topBarSource = readProjectFile('src/renderer/components/TopBar.tsx')

  assert.match(appSource, /sidebarOpen/)
  assert.match(appSource, /setSidebarOpen/)
  assert.match(layoutSource, /sidebarOpen \?/)
  assert.match(topBarSource, /Hide Sidebar/)
  assert.match(topBarSource, /Show Sidebar/)
})

test('browser tabs show the active role color on their top border', () => {
  const tabBarSource = readProjectFile('src/renderer/components/TabBar.tsx')

  assert.match(tabBarSource, /border-t-\[3px\]/)
  assert.match(tabBarSource, /borderTopColor:\s*tab\.roleColor/)
})

test('first-run guide is wired to onboarding settings', () => {
  const workspaceTypes = readProjectFile('src/shared/workspace.ts')
  const workspaceStoreSource = readProjectFile('src/main/workspaceStore.ts')
  const appSource = readProjectFile('src/renderer/app/App.tsx')
  const layoutSource = readProjectFile('src/renderer/layouts/DesktopLayout.tsx')
  const sidebarSource = readProjectFile('src/renderer/components/Sidebar.tsx')
  const roleProfileListSource = readProjectFile('src/renderer/components/RoleProfileList.tsx')
  const workspacePersistenceSource = readProjectFile('src/renderer/components/WorkspacePersistencePanel.tsx')
  const guideSource = readProjectFile('src/renderer/components/FirstRunGuide.tsx')

  assert.match(workspaceTypes, /hasSeenOnboarding:\s*boolean/)
  assert.match(workspaceStoreSource, /settings\?\.hasSeenOnboarding/)
  assert.match(appSource, /firstRunGuideOpen/)
  assert.match(appSource, /firstRunGuideAutoOpen/)
  assert.match(appSource, /firstRunGuideManuallyOpen/)
  assert.match(appSource, /openFirstRunGuide/)
  assert.match(appSource, /getFirstRunGuideStep/)
  assert.match(appSource, /isFirstTimeWorkspace/)
  assert.match(appSource, /workspace\.projects\.length === 0/)
  assert.match(appSource, /hasSeenOnboarding:\s*true/)
  assert.match(layoutSource, /FirstRunGuide/)
  assert.match(layoutSource, /onOpenFirstRunGuide/)
  assert.match(sidebarSource, /data-tour-id="new-project"/)
  assert.match(sidebarSource, /onOpenFirstRunGuide/)
  assert.match(sidebarSource, /Tour/)
  assert.match(roleProfileListSource, /data-tour-id="new-role-profile"/)
  assert.match(roleProfileListSource, /data-tour-id="open-role-tab"/)
  assert.match(workspacePersistenceSource, /data-tour-id="restore-workspace"/)
  assert.match(guideSource, /first-run-tour-target/)
  assert.match(guideSource, /Use the highlighted control/)
})

test('right-side panel close controls clear the titlebar overlay', () => {
  const projectFormSource = readProjectFile('src/renderer/components/ProjectFormPanel.tsx')
  const roleFormSource = readProjectFile('src/renderer/components/RoleProfileFormPanel.tsx')
  const settingsSource = readProjectFile('src/renderer/components/SettingsPanel.tsx')

  assert.match(projectFormSource, /h-24 items-start justify-between/)
  assert.match(projectFormSource, /pt-10/)
  assert.match(roleFormSource, /h-24 items-start justify-between/)
  assert.match(roleFormSource, /pt-10/)
  assert.match(settingsSource, /h-24 items-start justify-between/)
  assert.match(settingsSource, /pt-10/)
})

test('session toolbar can be collapsed from the webview area', () => {
  const webviewAreaSource = readProjectFile('src/renderer/components/WebviewArea.tsx')

  assert.match(webviewAreaSource, /sessionPanelOpen/)
  assert.match(webviewAreaSource, /setSessionPanelOpen/)
  assert.match(webviewAreaSource, /Hide session toolbar/)
  assert.match(webviewAreaSource, /Show session toolbar/)
})
