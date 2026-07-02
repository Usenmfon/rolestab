"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = __importDefault(require("electron"));
const browserWindow_js_1 = require("./browserWindow.js");
const sessionManager_js_1 = require("./sessionManager.js");
const workspaceStore_js_1 = require("./workspaceStore.js");
const { app, BrowserWindow, ipcMain } = electron_1.default;
const { shell } = electron_1.default;
if (!app.requestSingleInstanceLock()) {
    app.quit();
}
const trustedDevServerUrl = process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173';
let mainWindow = null;
app.setName('RolesTab');
app.whenReady().then(() => {
    electron_1.default.session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
        callback(false);
    });
    mainWindow = (0, browserWindow_js_1.createAppWindow)();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            mainWindow = (0, browserWindow_js_1.createAppWindow)();
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
ipcMain.handle('app:open-external', async (event, url) => {
    assertTrustedSender(event);
    const parsed = parseHttpUrl(url);
    await shell.openExternal(parsed.toString());
});
ipcMain.handle('session:create-role-partition', (event, projectId, roleProfileId) => {
    assertTrustedSender(event);
    if (!isSafeIdentifier(projectId) || !isSafeIdentifier(roleProfileId)) {
        throw new Error('Project and role identifiers must be safe partition identifiers.');
    }
    return (0, sessionManager_js_1.createRolePartition)(projectId, roleProfileId);
});
ipcMain.handle('session:clear-role-session', async (event, partition) => {
    assertTrustedSender(event);
    if (!isSafePartition(partition)) {
        throw new Error('Invalid session partition.');
    }
    await (0, sessionManager_js_1.clearRoleSession)(partition);
});
ipcMain.handle('session:clear-role-sessions', async (event, partitions) => {
    assertTrustedSender(event);
    await (0, sessionManager_js_1.clearRoleSessions)(partitions.filter(isSafePartition));
});
ipcMain.handle('session:get-role-session-usage', async (event, partition) => {
    assertTrustedSender(event);
    if (!isSafePartition(partition)) {
        throw new Error('Invalid session partition.');
    }
    return (0, sessionManager_js_1.getRoleSessionUsage)(partition);
});
ipcMain.handle('session:get-role-sessions-usage', async (event, partitions) => {
    assertTrustedSender(event);
    return (0, sessionManager_js_1.getRoleSessionsUsage)(partitions.filter(isSafePartition));
});
ipcMain.handle('workspace:load', async (event) => {
    assertTrustedSender(event);
    return (0, workspaceStore_js_1.loadWorkspace)();
});
ipcMain.handle('workspace:save-project', async (event, project) => {
    assertTrustedSender(event);
    return (0, workspaceStore_js_1.saveProject)(project);
});
ipcMain.handle('workspace:delete-project', async (event, projectId) => {
    assertTrustedSender(event);
    return (0, workspaceStore_js_1.deleteProject)(projectId);
});
ipcMain.handle('workspace:set-last-active-project', async (event, projectId) => {
    assertTrustedSender(event);
    return (0, workspaceStore_js_1.setLastActiveProject)(projectId);
});
ipcMain.handle('workspace:save-role-profile', async (event, roleProfile) => {
    assertTrustedSender(event);
    return (0, workspaceStore_js_1.saveRoleProfile)(roleProfile);
});
ipcMain.handle('workspace:delete-role-profile', async (event, roleProfileId) => {
    assertTrustedSender(event);
    return (0, workspaceStore_js_1.deleteRoleProfile)(roleProfileId);
});
ipcMain.handle('workspace:save-settings', async (event, settings) => {
    assertTrustedSender(event);
    return (0, workspaceStore_js_1.saveSettings)(settings);
});
ipcMain.handle('workspace:save-recent-url', async (event, recentUrl) => {
    assertTrustedSender(event);
    return (0, workspaceStore_js_1.saveRecentUrl)(recentUrl);
});
ipcMain.handle('workspace:save-recent-tabs', async (event, recentTabs) => {
    assertTrustedSender(event);
    return (0, workspaceStore_js_1.saveRecentTabs)(recentTabs);
});
function parseHttpUrl(url) {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('Only http and https URLs are allowed.');
    }
    return parsed;
}
function isSafeIdentifier(value) {
    return /^[\w-]+$/.test(value);
}
function isSafePartition(partition) {
    return /^persist:[\w-]+-[\w-]+$/.test(partition);
}
function assertTrustedSender(event) {
    const senderUrl = event.senderFrame?.url;
    if (!senderUrl || !isTrustedAppUrl(senderUrl)) {
        throw new Error('Blocked IPC call from an untrusted sender.');
    }
}
function isTrustedAppUrl(url) {
    try {
        const parsed = new URL(url);
        if (process.env.NODE_ENV === 'production') {
            return parsed.protocol === 'file:';
        }
        return parsed.origin === new URL(trustedDevServerUrl).origin;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=index.js.map