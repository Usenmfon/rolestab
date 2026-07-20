const assert = require('node:assert/strict')
const { existsSync, readFileSync } = require('node:fs')
const { mkdtemp, mkdir, rm, writeFile } = require('node:fs/promises')
const os = require('node:os')
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

test('release prep command is wired for changelog and version updates', () => {
  const packageJson = JSON.parse(readProjectFile('package.json'))
  const releaseChecklist = readProjectFile('docs/release-checklist.md')
  const releaseScript = readProjectFile('scripts/release-prep.mjs')

  assert.equal(packageJson.scripts['release:prep'], 'node scripts/release-prep.mjs')
  assert.match(releaseChecklist, /npm run release:prep -- patch/)
  assert.match(releaseChecklist, /updates\s+`package-lock\.json`/)
  assert.match(releaseScript, /buildChangelogSections/)
  assert.match(releaseScript, /replaceRootVersion/)
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
  assert.equal(defaultAppSettings.shareAnonymousAnalytics, false)
  assert.equal(defaultAppSettings.analyticsConsentVersion, null)
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

test('role launcher keeps tabs isolated by project', () => {
  const appSource = readProjectFile('src/renderer/app/App.tsx')
  const workspaceStoreSource = readProjectFile('src/main/workspaceStore.ts')

  assert.match(
    appSource,
    /tab\.projectId === activeProject\.id && tab\.roleProfileId === roleProfileId/,
  )
  assert.match(
    appSource,
    /currentRoleProfile\.projectId === activeProject\.id && currentRoleProfile\.id === roleProfileId/,
  )
  assert.match(appSource, /setActiveTabId\(existingTab\.id\)/)
  assert.match(appSource, /tabs=\{activeProjectTabs\}/)
  assert.match(
    workspaceStoreSource,
    /roleProfile\.id === recentTab\.roleProfileId && roleProfile\.projectId === recentTab\.projectId/,
  )
})

test('update checker keeps transport errors readable in settings', () => {
  const autoUpdaterSource = readProjectFile('src/main/autoUpdater.ts')
  const appSource = readProjectFile('src/renderer/app/App.tsx')
  const layoutSource = readProjectFile('src/renderer/layouts/DesktopLayout.tsx')
  const sidebarSource = readProjectFile('src/renderer/components/Sidebar.tsx')

  assert.match(autoUpdaterSource, /getUpdateErrorMessage/)
  assert.match(autoUpdaterSource, /GitHub is temporarily unavailable/)
  assert.match(autoUpdaterSource, /message\.split\(\s*\/\\r\?\\n\//)
  assert.match(autoUpdaterSource, /logInternalError\(\{\s*scope:\s*'auto-updater',\s*message:\s*error\.message/)
  assert.match(appSource, /onUpdateStatus/)
  assert.match(appSource, /updateStatus\.state === 'downloaded'/)
  assert.match(layoutSource, /updateReady/)
  assert.match(sidebarSource, /Update ready/)
  assert.match(sidebarSource, /Settings, update ready/)
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

  assert.match(tabBarSource, /overflow-hidden rounded-t-lg/)
  assert.match(tabBarSource, /absolute inset-x-0 top-0 h-0\.5 rounded-t-lg/)
  assert.match(tabBarSource, /backgroundColor:\s*tab\.roleColor/)
})

test('active webviews receive focus without stealing it from editable app controls', () => {
  const browserWebviewSource = readFileSync(
    path.join(root, 'src/renderer/components/BrowserWebview.tsx'),
    'utf8',
  )
  const stylesSource = readProjectFile('src/index.css')

  assert.match(browserWebviewSource, /if \(!active \|\| !domReady \|\| !webview\)/)
  assert.match(browserWebviewSource, /isEditableHostElement\(document\.activeElement\)/)
  assert.match(browserWebviewSource, /window\.setTimeout\(scheduleGuestFocus, 300\)/)
  assert.match(browserWebviewSource, /addEventListener\('did-stop-loading', scheduleGuestFocus\)/)
  assert.match(browserWebviewSource, /window\.addEventListener\('focus', scheduleGuestFocus\)/)
  assert.match(browserWebviewSource, /webviewElement\.focus\(\)/)
  assert.match(browserWebviewSource, /active \? 'is-active' : 'is-inactive'/)
  assert.match(browserWebviewSource, /pane === 'hidden' \? 'is-hidden' : 'is-visible'/)
  assert.match(stylesSource, /\.roles-tab-webview\s*{[^}]*display:\s*inline-flex;/s)
  assert.match(stylesSource, /\.roles-tab-webview\.is-hidden\s*{[^}]*visibility:\s*hidden;/s)
  assert.doesNotMatch(stylesSource, /\.roles-tab-webview\.hidden\s*{[^}]*display:\s*none;/s)
})

test('browser workflows use non-blocking confirmations to preserve Electron input focus', () => {
  const appSource = readProjectFile('src/renderer/app/App.tsx')
  const extensionsSource = readProjectFile('src/renderer/components/ExtensionsSettingsSection.tsx')

  assert.match(appSource, /function requestConfirmation\(request: ConfirmationRequest\)/)
  assert.match(appSource, /title: `Delete \$\{project\.name\}\?`/)
  assert.doesNotMatch(appSource, /window\.confirm\(/)
  assert.match(extensionsSource, /await onRequestConfirmation\(/)
  assert.doesNotMatch(extensionsSource, /window\.confirm\(/)
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
  const settingsSource = readProjectFile('src/renderer/components/SettingsPanel.tsx')

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
  assert.match(appSource, /firstRunGuideAnalyticsStep/)
  assert.match(appSource, /chooseFirstRunAnalytics/)
  assert.match(appSource, /shareAnonymousAnalytics:\s*enabled/)
  assert.match(appSource, /analyticsConsentVersion:\s*1/)
  assert.match(layoutSource, /FirstRunGuide/)
  assert.match(layoutSource, /onAnalyticsChoice/)
  assert.match(layoutSource, /https:\/\/rolestab\.app\/privacy/)
  assert.match(layoutSource, /openPrivacyPolicy/)
  assert.match(layoutSource, /onOpenFirstRunGuide/)
  assert.match(sidebarSource, /data-tour-id="new-project"/)
  assert.match(sidebarSource, /onOpenFirstRunGuide/)
  assert.match(sidebarSource, /Tour/)
  assert.match(roleProfileListSource, /data-tour-id="new-role-profile"/)
  assert.match(roleProfileListSource, /data-tour-id="open-role-tab"/)
  assert.match(workspacePersistenceSource, /data-tour-id="restore-workspace"/)
  assert.match(guideSource, /first-run-tour-target/)
  assert.match(guideSource, /Use the highlighted control/)
  assert.match(guideSource, /Help improve RolesTab/)
  assert.match(guideSource, /Share analytics/)
  assert.match(guideSource, /Not now/)
  assert.match(guideSource, /Analytics is off until you choose to share/)
  assert.match(guideSource, /Read privacy policy/)
  assert.match(settingsSource, /Read privacy policy/)
})

test('role creation can optionally open the new role immediately', () => {
  const roleFormSource = readProjectFile('src/renderer/components/RoleProfileFormPanel.tsx')
  const appSource = readProjectFile('src/renderer/app/App.tsx')
  const layoutSource = readProjectFile('src/renderer/layouts/DesktopLayout.tsx')
  const topBarSource = readProjectFile('src/renderer/components/TopBar.tsx')

  assert.match(roleFormSource, /openImmediately: boolean/)
  assert.match(roleFormSource, /useState\(!roleProfile\)/)
  assert.match(roleFormSource, /checked=\{openImmediately\}/)
  assert.match(roleFormSource, /Open this role after saving/)
  assert.match(roleFormSource, /openImmediately: !roleProfile && openImmediately/)
  assert.match(appSource, /const shouldOpenImmediately = !editingRoleProfile && draft\.openImmediately/)
  assert.match(appSource, /if \(shouldOpenImmediately\) \{\s*await openRoleProfileTab\(roleProfile\)/s)
  assert.match(layoutSource, /onNewTab=\{onCreateRoleProfile\}/)
  assert.match(topBarSource, /label="Add Role"/)
  assert.doesNotMatch(topBarSource, /New Role Tab/)
})
test('right-side panels clear the titlebar overlay', () => {
  const projectFormSource = readProjectFile('src/renderer/components/ProjectFormPanel.tsx')
  const roleFormSource = readProjectFile('src/renderer/components/RoleProfileFormPanel.tsx')
  const settingsSource = readProjectFile('src/renderer/components/SettingsPanel.tsx')
  const layoutSource = readProjectFile('src/renderer/layouts/DesktopLayout.tsx')

  assert.match(projectFormSource, /h-24 items-start justify-between/)
  assert.match(projectFormSource, /pt-10/)
  assert.match(roleFormSource, /h-24 items-start justify-between/)
  assert.match(roleFormSource, /pt-10/)
  assert.match(settingsSource, /h-24 items-start/)
  assert.match(settingsSource, /pt-10/)
  assert.doesNotMatch(settingsSource, /Close settings/)
  assert.match(layoutSource, /aria-label=.Close settings./)
  assert.match(layoutSource, /right-\[30rem\]/)
})

test('session toolbar can be collapsed from the webview area', () => {
  const webviewAreaSource = readProjectFile('src/renderer/components/WebviewArea.tsx')

  assert.match(webviewAreaSource, /sessionPanelOpen/)
  assert.match(webviewAreaSource, /setSessionPanelOpen/)
  assert.match(webviewAreaSource, /Hide session toolbar/)
  assert.match(webviewAreaSource, /Show session toolbar/)
})

test('extension manifest validation covers valid and invalid unpacked extensions', async () => {
  const { validateExtensionManifest } = require('../dist-electron/main/extensions/extension-manifest-validator.js')
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'rolestab-extension-test-'))

  try {
    const validExtension = path.join(tempRoot, 'valid')
    await mkdir(path.join(validExtension, 'icons'), { recursive: true })
    await writeFile(path.join(validExtension, 'icons', 'icon.png'), 'png')
    await writeFile(
      path.join(validExtension, 'manifest.json'),
      JSON.stringify({
        manifest_version: 3,
        name: 'Valid Test Extension',
        version: '1.0.0',
        description: 'A test extension',
        icons: { 16: 'icons/icon.png' },
        permissions: ['storage'],
      }),
    )

    const validResult = await validateExtensionManifest(validExtension)
    assert.equal(validResult.valid, true)
    assert.equal(validResult.manifest.name, 'Valid Test Extension')

    const missingManifest = path.join(tempRoot, 'missing-manifest')
    await mkdir(missingManifest)
    const missingManifestResult = await validateExtensionManifest(missingManifest)
    assert.equal(missingManifestResult.valid, false)
    assert.match(missingManifestResult.errors.join('\n'), /manifest\.json was not found/)

    const invalidJson = path.join(tempRoot, 'invalid-json')
    await mkdir(invalidJson)
    await writeFile(path.join(invalidJson, 'manifest.json'), '{')
    const invalidJsonResult = await validateExtensionManifest(invalidJson)
    assert.equal(invalidJsonResult.valid, false)
    assert.match(invalidJsonResult.errors.join('\n'), /not valid JSON/)

    const missingName = path.join(tempRoot, 'missing-name')
    await mkdir(missingName)
    await writeFile(path.join(missingName, 'manifest.json'), JSON.stringify({ manifest_version: 3, version: '1.0.0' }))
    const missingNameResult = await validateExtensionManifest(missingName)
    assert.equal(missingNameResult.valid, false)
    assert.match(missingNameResult.errors.join('\n'), /name/)

    const missingVersion = path.join(tempRoot, 'missing-version')
    await mkdir(missingVersion)
    await writeFile(path.join(missingVersion, 'manifest.json'), JSON.stringify({ manifest_version: 3, name: 'No Version' }))
    const missingVersionResult = await validateExtensionManifest(missingVersion)
    assert.equal(missingVersionResult.valid, false)
    assert.match(missingVersionResult.errors.join('\n'), /version/)

    const unsupportedManifest = path.join(tempRoot, 'unsupported-manifest')
    await mkdir(unsupportedManifest)
    await writeFile(
      path.join(unsupportedManifest, 'manifest.json'),
      JSON.stringify({ manifest_version: 99, name: 'Unsupported', version: '1.0.0' }),
    )
    const unsupportedResult = await validateExtensionManifest(unsupportedManifest)
    assert.equal(unsupportedResult.valid, false)
    assert.equal(unsupportedResult.compatibility, 'unsupported')

    const missingIcon = path.join(tempRoot, 'missing-icon')
    await mkdir(missingIcon)
    await writeFile(
      path.join(missingIcon, 'manifest.json'),
      JSON.stringify({
        manifest_version: 3,
        name: 'Missing Icon',
        version: '1.0.0',
        icons: { 16: 'icons/nope.png' },
      }),
    )
    const missingIconResult = await validateExtensionManifest(missingIcon)
    assert.equal(missingIconResult.valid, false)
    assert.match(missingIconResult.errors.join('\n'), /Icon "16" file is missing/)
  } finally {
    await rm(tempRoot, { recursive: true, force: true })
  }
})

test('extension persistence and removal preserve role isolation contracts', () => {
  const persistenceSource = readProjectFile('src/main/extensions/extension-persistence.ts')
  const managerSource = readProjectFile('src/main/extensions/extension-manager.ts')
  const ipcSource = readProjectFile('src/main/extensions/extension-ipc.ts')
  const appSource = readProjectFile('src/renderer/app/App.tsx')
  const settingsSource = readProjectFile('src/renderer/components/ExtensionsSettingsSection.tsx')

  assert.match(persistenceSource, /extensions\.json/)
  assert.match(persistenceSource, /sanitizeExtensionsState/)
  assert.match(persistenceSource, /isPathInsideManagedDirectory/)
  assert.match(persistenceSource, /roleSettings/)
  assert.match(managerSource, /extension\.globallyEnabled \|\| !roleSetting\?\.enabled/)
  assert.match(managerSource, /getRoleSession\(partition\)/)
  assert.match(managerSource, /roleSession\.extensions\.loadExtension/)
  assert.match(managerSource, /roleSession\.extensions\s*\.\s*getAllExtensions/)
  assert.match(managerSource, /roleSession\.extensions\.removeExtension/)
  assert.match(managerSource, /Refusing to delete an extension folder outside/)
  assert.match(ipcSource, /dialog\.showOpenDialog/)
  assert.match(ipcSource, /getRoleProfile\(roleId\)/)
  assert.doesNotMatch(ipcSource, /destinationPath/)
  assert.match(appSource, /loadExtensionsForRole\(roleProfile\.id\)/)
  assert.match(appSource, /loadExtensionsForRole\(tab\.roleProfileId\)/)
  assert.match(settingsSource, /Choose the roles that should use it/)
  assert.match(settingsSource, /Globally disabled/)
})
