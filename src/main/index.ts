import electron from 'electron'
import { applyTitleBarTheme, createAppWindow } from './browserWindow.js'
import { logInternalError } from './errorLogger.js'
import { ExtensionManager } from './extensions/extension-manager.js'
import { registerExtensionIpcHandlers } from './extensions/extension-ipc.js'
import {
  AnalyticsClient,
  getAnalyticsErrorCodeForScope,
  registerAnalyticsIpcHandlers,
  trackApplicationError,
} from './analytics/index.js'
import {
  checkForUpdates,
  getUpdateStatus,
  initAutoUpdater,
  quitAndInstall,
} from './autoUpdater.js'
import {
  clearRoleSession,
  clearRoleSessions,
  createRolePartition,
  getRoleSessionUsage,
  getRoleSessionsUsage,
} from './sessionManager.js'
import {
  deleteProject,
  deleteRoleProfile,
  exportProjectConfig,
  importProjectConfig,
  loadWorkspace,
  saveRecentTabs,
  saveRecentUrl,
  saveSettings,
  saveProject,
  saveRoleProfile,
  setLastActiveProject,
} from './workspaceStore.js'
import type { AppSettings, ProjectSummary, RecentUrl, RoleProfile, SavedBrowserTab } from '../shared/workspace.js'

const { app, BrowserWindow, ipcMain } = electron
const { clipboard, dialog, shell } = electron

ignoreBrokenConsolePipe(process.stdout)
ignoreBrokenConsolePipe(process.stderr)
ignoreBrokenPipeExceptions()

if (!app.requestSingleInstanceLock()) {
  app.quit()
}

type AppBrowserWindow = InstanceType<typeof BrowserWindow>
type IpcEvent = Electron.IpcMainInvokeEvent

const trustedDevServerUrl = process.env.VITE_DEV_SERVER_URL ?? 'http://127.0.0.1:5174'
const windowsAppUserModelId = 'com.rolestab.app'

let mainWindow: AppBrowserWindow | null = null
const extensionManager = new ExtensionManager()
let analytics: AnalyticsClient | null = null

app.setName('RolesTab')

if (process.platform === 'win32') {
  app.setAppUserModelId(windowsAppUserModelId)
}

function ignoreBrokenConsolePipe(stream: NodeJS.WriteStream): void {
  stream.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code !== 'EPIPE') {
      throw error
    }
  })
}

function ignoreBrokenPipeExceptions(): void {
  process.on('uncaughtException', (error: Error & { code?: string }) => {
    if (error.code === 'EPIPE') {
      return
    }

    throw error
  })
}

app.whenReady().then(() => {
  analytics = new AnalyticsClient({
    userDataPath: app.getPath('userData'),
    appVersion: app.getVersion(),
    locale: app.getLocale(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  })
  void analytics.initialize().catch(() => {
    // Analytics failures must never interrupt app startup.
  })
  registerAnalyticsIpcHandlers({ analytics, assertTrustedSender })

  electron.session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false)
  })

  mainWindow = createAppWindow()
  initAutoUpdater(mainWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createAppWindow()
      initAutoUpdater(mainWindow)
    }
  })
})

app.on('second-instance', () => {
  if (!mainWindow) {
    return
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore()
  }

  mainWindow.focus()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', (event) => {
  const currentAnalytics = analytics

  if (!currentAnalytics) {
    return
  }

  event.preventDefault()
  analytics = null
  void currentAnalytics.shutdown().finally(() => app.quit())
})

ipcMain.handle('app:get-version', (event) => {
  assertTrustedSender(event)

  return app.getVersion()
})

ipcMain.handle('app:copy-text', (event, text: string) => {
  assertTrustedSender(event)

  clipboard.writeText(String(text))
})

ipcMain.handle('app:set-title-bar-theme', (event, theme: 'light' | 'dark') => {
  assertTrustedSender(event)

  if (!mainWindow || (theme !== 'light' && theme !== 'dark')) {
    return
  }

  applyTitleBarTheme(mainWindow, theme)
})

ipcMain.handle('app:get-update-status', (event) => {
  assertTrustedSender(event)

  return getUpdateStatus()
})

ipcMain.handle('app:check-for-updates', (event) => {
  assertTrustedSender(event)
  void analytics?.track({ event_name: 'feature_used', properties: { feature: 'check_for_updates' } })

  return checkForUpdates()
})

ipcMain.handle('app:quit-and-install', (event) => {
  assertTrustedSender(event)
  void analytics?.track({ event_name: 'feature_used', properties: { feature: 'install_update' } })

  quitAndInstall()
})

ipcMain.handle('app:open-external', async (event, url: string) => {
  assertTrustedSender(event)
  const parsed = parseHttpUrl(url)
  void analytics?.track({ event_name: 'feature_used', properties: { feature: 'open_external_url' } })

  await shell.openExternal(parsed.toString())
})

ipcMain.handle(
  'app:log-error',
  async (
    event,
    entry: {
      scope: string
      message: string
      stack?: string
      details?: string
    },
  ) => {
    assertTrustedSender(event)

    await logInternalError(entry)
    trackApplicationError(
      analytics,
      getAnalyticsErrorCodeForScope(entry.scope),
      'warning',
    )
  },
)

ipcMain.handle('session:create-role-partition', (event, projectId: string, roleProfileId: string) => {
  assertTrustedSender(event)

  if (!isSafeIdentifier(projectId) || !isSafeIdentifier(roleProfileId)) {
    throw new Error('Project and role identifiers must be safe partition identifiers.')
  }

  return createRolePartition(projectId, roleProfileId)
})

ipcMain.handle('session:clear-role-session', async (event, partition: string) => {
  assertTrustedSender(event)

  if (!isSafePartition(partition)) {
    throw new Error('Invalid session partition.')
  }

  await clearRoleSession(partition)
})

ipcMain.handle('session:clear-role-sessions', async (event, partitions: string[]) => {
  assertTrustedSender(event)
  await clearRoleSessions(partitions.filter(isSafePartition))
})

ipcMain.handle('session:get-role-session-usage', async (event, partition: string) => {
  assertTrustedSender(event)

  if (!isSafePartition(partition)) {
    throw new Error('Invalid session partition.')
  }

  return getRoleSessionUsage(partition)
})

ipcMain.handle('session:get-role-sessions-usage', async (event, partitions: string[]) => {
  assertTrustedSender(event)
  return getRoleSessionsUsage(partitions.filter(isSafePartition))
})

ipcMain.handle('workspace:load', async (event) => {
  assertTrustedSender(event)
  return loadWorkspace()
})

ipcMain.handle('workspace:save-project', async (event, project: ProjectSummary) => {
  assertTrustedSender(event)
  return saveProject(project)
})

ipcMain.handle('workspace:delete-project', async (event, projectId: string) => {
  assertTrustedSender(event)
  return deleteProject(projectId)
})

ipcMain.handle('workspace:set-last-active-project', async (event, projectId: string | null) => {
  assertTrustedSender(event)
  return setLastActiveProject(projectId)
})

ipcMain.handle('workspace:save-role-profile', async (event, roleProfile: RoleProfile) => {
  assertTrustedSender(event)
  return saveRoleProfile(roleProfile)
})

ipcMain.handle('workspace:delete-role-profile', async (event, roleProfileId: string) => {
  assertTrustedSender(event)
  return deleteRoleProfile(roleProfileId)
})

ipcMain.handle('workspace:save-settings', async (event, settings: AppSettings) => {
  assertTrustedSender(event)
  const workspace = await saveSettings(settings)
  await analytics?.setEnabled(workspace.settings.shareAnonymousAnalytics)
  return workspace
})

ipcMain.handle('workspace:save-recent-url', async (event, recentUrl: RecentUrl) => {
  assertTrustedSender(event)
  return saveRecentUrl(recentUrl)
})

ipcMain.handle('workspace:save-recent-tabs', async (event, recentTabs: SavedBrowserTab[]) => {
  assertTrustedSender(event)
  return saveRecentTabs(recentTabs)
})

ipcMain.handle('workspace:export-project-config', async (event, projectId: string) => {
  assertTrustedSender(event)

  if (!isSafeIdentifier(projectId)) {
    throw new Error('Invalid project identifier.')
  }

  const projectName = await getProjectName(projectId)
  const saveOptions: Electron.SaveDialogOptions = {
    title: 'Export Project Configuration',
    defaultPath: `${sanitizeFileBaseName(projectName)}.rolestab-project.json`,
    filters: [
      { name: 'RolesTab Project', extensions: ['json'] },
      { name: 'JSON', extensions: ['json'] },
    ],
  }
  const result = mainWindow
    ? await dialog.showSaveDialog(mainWindow, saveOptions)
    : await dialog.showSaveDialog(saveOptions)

  if (result.canceled || !result.filePath) {
    return { canceled: true }
  }

  await exportProjectConfig(projectId, result.filePath)

  return {
    canceled: false,
    filePath: result.filePath,
  }
})

ipcMain.handle('workspace:import-project-config', async (event) => {
  assertTrustedSender(event)

  const openOptions: Electron.OpenDialogOptions = {
    title: 'Import Project Configuration',
    properties: ['openFile'],
    filters: [
      { name: 'RolesTab Project', extensions: ['json'] },
      { name: 'JSON', extensions: ['json'] },
    ],
  }
  const result = mainWindow
    ? await dialog.showOpenDialog(mainWindow, openOptions)
    : await dialog.showOpenDialog(openOptions)

  const filePath = result.filePaths[0]

  if (result.canceled || !filePath) {
    return { canceled: true }
  }

  const importResult = await importProjectConfig(filePath)

  return {
    canceled: false,
    filePath,
    ...importResult,
  }
})

registerExtensionIpcHandlers({
  extensionManager,
  getMainWindow: () => mainWindow,
  assertTrustedSender,
})

function parseHttpUrl(url: string): URL {
  const parsed = new URL(url)

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http and https URLs are allowed.')
  }

  return parsed
}

function isSafeIdentifier(value: string): boolean {
  return /^[\w-]+$/.test(value)
}

function isSafePartition(partition: string): boolean {
  return /^persist:[\w-]+-[\w-]+$/.test(partition)
}

async function getProjectName(projectId: string): Promise<string> {
  const workspace = await loadWorkspace()
  return workspace.projects.find((project) => project.id === projectId)?.name ?? 'rolestab-project'
}

function sanitizeFileBaseName(value: string): string {
  const normalized = value
    .trim()
    .replace(/[<>:"/\\|?*]/g, '-')
    .split('')
    .filter((character) => character.charCodeAt(0) >= 32)
    .join('')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

  return normalized || 'rolestab-project'
}

function assertTrustedSender(event: IpcEvent): void {
  const senderUrl = event.senderFrame?.url

  if (!senderUrl || !isTrustedAppUrl(senderUrl)) {
    throw new Error('Blocked IPC call from an untrusted sender.')
  }
}

function isTrustedAppUrl(url: string): boolean {
  try {
    const parsed = new URL(url)

    if (app.isPackaged) {
      return parsed.protocol === 'file:'
    }

    return parsed.origin === new URL(trustedDevServerUrl).origin
  } catch {
    return false
  }
}
