import electron from 'electron'
import { createAppWindow } from './browserWindow.js'
import { logInternalError } from './errorLogger.js'
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
const { shell } = electron

if (!app.requestSingleInstanceLock()) {
  app.quit()
}

type AppBrowserWindow = InstanceType<typeof BrowserWindow>
type IpcEvent = Electron.IpcMainInvokeEvent

const trustedDevServerUrl = process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173'

let mainWindow: AppBrowserWindow | null = null

app.setName('RolesTab')

app.whenReady().then(() => {
  electron.session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false)
  })

  mainWindow = createAppWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createAppWindow()
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

ipcMain.handle('app:open-external', async (event, url: string) => {
  assertTrustedSender(event)
  const parsed = parseHttpUrl(url)

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
  return saveSettings(settings)
})

ipcMain.handle('workspace:save-recent-url', async (event, recentUrl: RecentUrl) => {
  assertTrustedSender(event)
  return saveRecentUrl(recentUrl)
})

ipcMain.handle('workspace:save-recent-tabs', async (event, recentTabs: SavedBrowserTab[]) => {
  assertTrustedSender(event)
  return saveRecentTabs(recentTabs)
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

function assertTrustedSender(event: IpcEvent): void {
  const senderUrl = event.senderFrame?.url

  if (!senderUrl || !isTrustedAppUrl(senderUrl)) {
    throw new Error('Blocked IPC call from an untrusted sender.')
  }
}

function isTrustedAppUrl(url: string): boolean {
  try {
    const parsed = new URL(url)

    if (process.env.NODE_ENV === 'production') {
      return parsed.protocol === 'file:'
    }

    return parsed.origin === new URL(trustedDevServerUrl).origin
  } catch {
    return false
  }
}
