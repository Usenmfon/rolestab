import { app, BrowserWindow, ipcMain } from 'electron'
import { createAppWindow } from './browserWindow.js'
import { clearRoleSession, createRolePartition } from './sessionManager.js'
import {
  deleteProject,
  deleteRoleProfile,
  loadWorkspace,
  saveProject,
  saveRoleProfile,
  setLastActiveProject,
} from './workspaceStore.js'
import type { ProjectSummary, RoleProfile } from '../shared/workspace.js'

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

ipcMain.handle('session:create-role-partition', (_event, projectId: string, roleProfileId: string) => {
  return createRolePartition(projectId, roleProfileId)
})

ipcMain.handle('session:clear-role-session', async (_event, partition: string) => {
  await clearRoleSession(partition)
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
