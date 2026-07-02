import { app, BrowserWindow, ipcMain } from 'electron';
import { createAppWindow } from './browserWindow.js';
import { clearRoleSession, createRolePartition } from './sessionManager.js';
import { deleteProject, loadWorkspace, saveProject, setLastActiveProject } from './workspaceStore.js';
if (!app.requestSingleInstanceLock()) {
    app.quit();
}
let mainWindow = null;
app.setName('RolesTab');
app.whenReady().then(() => {
    mainWindow = createAppWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            mainWindow = createAppWindow();
        }
    });
});
app.on('second-instance', () => {
    if (!mainWindow) {
        return;
    }
    if (mainWindow.isMinimized()) {
        mainWindow.restore();
    }
    mainWindow.focus();
});
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
ipcMain.handle('session:create-role-partition', (_event, projectId, roleProfileId) => {
    return createRolePartition(projectId, roleProfileId);
});
ipcMain.handle('session:clear-role-session', async (_event, partition) => {
    await clearRoleSession(partition);
});
ipcMain.handle('workspace:load', async () => {
    return loadWorkspace();
});
ipcMain.handle('workspace:save-project', async (_event, project) => {
    return saveProject(project);
});
ipcMain.handle('workspace:delete-project', async (_event, projectId) => {
    return deleteProject(projectId);
});
ipcMain.handle('workspace:set-last-active-project', async (_event, projectId) => {
    return setLastActiveProject(projectId);
});
//# sourceMappingURL=index.js.map