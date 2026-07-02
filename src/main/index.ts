import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { createAppWindow } from './browserWindow.js'
import { clearRoleSession, clearRoleSessions, createRolePartition } from './sessionManager.js'
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

if (!app.requestSingleInstanceLock()) {
  app.quit()
}

let mainWindow: BrowserWindow | null = null

app.setName('RolesTab')

app.whenReady().then(() => {
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

ipcMain.handle('app:open-external', async (_event, url: string) => {
  const parsed = new URL(url)

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http and https URLs can be opened externally.')
  }

  await shell.openExternal(parsed.toString())
})

ipcMain.handle('session:create-role-partition', (_event, projectId: string, roleProfileId: string) => {
  return createRolePartition(projectId, roleProfileId)
})

ipcMain.handle('session:clear-role-session', async (_event, partition: string) => {
  await clearRoleSession(partition)
})

ipcMain.handle('session:clear-role-sessions', async (_event, partitions: string[]) => {
  await clearRoleSessions(partitions)
})

ipcMain.handle('workspace:load', async () => {
  return loadWorkspace()
})

ipcMain.handle('workspace:save-project', async (_event, project: ProjectSummary) => {
  return saveProject(project)
})

ipcMain.handle('workspace:delete-project', async (_event, projectId: string) => {
  return deleteProject(projectId)
})

ipcMain.handle('workspace:set-last-active-project', async (_event, projectId: string | null) => {
  return setLastActiveProject(projectId)
})

ipcMain.handle('workspace:save-role-profile', async (_event, roleProfile: RoleProfile) => {
  return saveRoleProfile(roleProfile)
})

ipcMain.handle('workspace:delete-role-profile', async (_event, roleProfileId: string) => {
  return deleteRoleProfile(roleProfileId)
})

ipcMain.handle('workspace:save-settings', async (_event, settings: AppSettings) => {
  return saveSettings(settings)
})

ipcMain.handle('workspace:save-recent-url', async (_event, recentUrl: RecentUrl) => {
  return saveRecentUrl(recentUrl)
})

ipcMain.handle('workspace:save-recent-tabs', async (_event, recentTabs: SavedBrowserTab[]) => {
  return saveRecentTabs(recentTabs)
})
