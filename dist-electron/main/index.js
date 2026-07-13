"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = __importDefault(require("electron"));
const browserWindow_js_1 = require("./browserWindow.js");
const errorLogger_js_1 = require("./errorLogger.js");
const extension_manager_js_1 = require("./extensions/extension-manager.js");
const extension_ipc_js_1 = require("./extensions/extension-ipc.js");
const index_js_1 = require("./analytics/index.js");
const autoUpdater_js_1 = require("./autoUpdater.js");
const sessionManager_js_1 = require("./sessionManager.js");
const workspaceStore_js_1 = require("./workspaceStore.js");
const { app, BrowserWindow, ipcMain } = electron_1.default;
const { clipboard, dialog, shell } = electron_1.default;
ignoreBrokenConsolePipe(process.stdout);
ignoreBrokenConsolePipe(process.stderr);
ignoreBrokenPipeExceptions();
if (!app.requestSingleInstanceLock()) {
    app.quit();
}
const trustedDevServerUrl = process.env.VITE_DEV_SERVER_URL ?? 'http://127.0.0.1:5174';
const windowsAppUserModelId = 'com.rolestab.app';
let mainWindow = null;
const extensionManager = new extension_manager_js_1.ExtensionManager();
let analytics = null;
app.setName('RolesTab');
if (process.platform === 'win32') {
    app.setAppUserModelId(windowsAppUserModelId);
}
function ignoreBrokenConsolePipe(stream) {
    stream.on('error', (error) => {
        if (error.code !== 'EPIPE') {
            throw error;
        }
    });
}
function ignoreBrokenPipeExceptions() {
    process.on('uncaughtException', (error) => {
        if (error.code === 'EPIPE') {
            return;
        }
        throw error;
    });
}
app.whenReady().then(() => {
    analytics = new index_js_1.AnalyticsClient({
        userDataPath: app.getPath('userData'),
        appVersion: app.getVersion(),
        locale: app.getLocale(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    });
    void analytics.initialize().catch(() => {
        // Analytics failures must never interrupt app startup.
    });
    (0, index_js_1.registerAnalyticsIpcHandlers)({ analytics, assertTrustedSender });
    electron_1.default.session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
        callback(false);
    });
    mainWindow = (0, browserWindow_js_1.createAppWindow)();
    (0, autoUpdater_js_1.initAutoUpdater)(mainWindow);
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            mainWindow = (0, browserWindow_js_1.createAppWindow)();
            (0, autoUpdater_js_1.initAutoUpdater)(mainWindow);
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
app.on('before-quit', (event) => {
    const currentAnalytics = analytics;
    if (!currentAnalytics) {
        return;
    }
    event.preventDefault();
    analytics = null;
    void currentAnalytics.shutdown().finally(() => app.quit());
});
ipcMain.handle('app:get-version', (event) => {
    assertTrustedSender(event);
    return app.getVersion();
});
ipcMain.handle('app:copy-text', (event, text) => {
    assertTrustedSender(event);
    clipboard.writeText(String(text));
});
ipcMain.handle('app:set-title-bar-theme', (event, theme) => {
    assertTrustedSender(event);
    if (!mainWindow || (theme !== 'light' && theme !== 'dark')) {
        return;
    }
    (0, browserWindow_js_1.applyTitleBarTheme)(mainWindow, theme);
});
ipcMain.handle('app:get-update-status', (event) => {
    assertTrustedSender(event);
    return (0, autoUpdater_js_1.getUpdateStatus)();
});
ipcMain.handle('app:check-for-updates', (event) => {
    assertTrustedSender(event);
    void analytics?.track({ event_name: 'feature_used', properties: { feature: 'check_for_updates' } });
    return (0, autoUpdater_js_1.checkForUpdates)();
});
ipcMain.handle('app:quit-and-install', (event) => {
    assertTrustedSender(event);
    void analytics?.track({ event_name: 'feature_used', properties: { feature: 'install_update' } });
    (0, autoUpdater_js_1.quitAndInstall)();
});
ipcMain.handle('app:open-external', async (event, url) => {
    assertTrustedSender(event);
    const parsed = parseHttpUrl(url);
    void analytics?.track({ event_name: 'feature_used', properties: { feature: 'open_external_url' } });
    await shell.openExternal(parsed.toString());
});
ipcMain.handle('app:log-error', async (event, entry) => {
    assertTrustedSender(event);
    await (0, errorLogger_js_1.logInternalError)(entry);
    (0, index_js_1.trackApplicationError)(analytics, (0, index_js_1.getAnalyticsErrorCodeForScope)(entry.scope), 'warning', entry.scope);
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
    const workspace = await (0, workspaceStore_js_1.saveSettings)(settings);
    await analytics?.setEnabled(workspace.settings.shareAnonymousAnalytics);
    return workspace;
});
ipcMain.handle('workspace:save-recent-url', async (event, recentUrl) => {
    assertTrustedSender(event);
    return (0, workspaceStore_js_1.saveRecentUrl)(recentUrl);
});
ipcMain.handle('workspace:save-recent-tabs', async (event, recentTabs) => {
    assertTrustedSender(event);
    return (0, workspaceStore_js_1.saveRecentTabs)(recentTabs);
});
ipcMain.handle('workspace:export-project-config', async (event, projectId) => {
    assertTrustedSender(event);
    if (!isSafeIdentifier(projectId)) {
        throw new Error('Invalid project identifier.');
    }
    const projectName = await getProjectName(projectId);
    const saveOptions = {
        title: 'Export Project Configuration',
        defaultPath: `${sanitizeFileBaseName(projectName)}.rolestab-project.json`,
        filters: [
            { name: 'RolesTab Project', extensions: ['json'] },
            { name: 'JSON', extensions: ['json'] },
        ],
    };
    const result = mainWindow
        ? await dialog.showSaveDialog(mainWindow, saveOptions)
        : await dialog.showSaveDialog(saveOptions);
    if (result.canceled || !result.filePath) {
        return { canceled: true };
    }
    await (0, workspaceStore_js_1.exportProjectConfig)(projectId, result.filePath);
    return {
        canceled: false,
        filePath: result.filePath,
    };
});
ipcMain.handle('workspace:import-project-config', async (event) => {
    assertTrustedSender(event);
    const openOptions = {
        title: 'Import Project Configuration',
        properties: ['openFile'],
        filters: [
            { name: 'RolesTab Project', extensions: ['json'] },
            { name: 'JSON', extensions: ['json'] },
        ],
    };
    const result = mainWindow
        ? await dialog.showOpenDialog(mainWindow, openOptions)
        : await dialog.showOpenDialog(openOptions);
    const filePath = result.filePaths[0];
    if (result.canceled || !filePath) {
        return { canceled: true };
    }
    const importResult = await (0, workspaceStore_js_1.importProjectConfig)(filePath);
    return {
        canceled: false,
        filePath,
        ...importResult,
    };
});
(0, extension_ipc_js_1.registerExtensionIpcHandlers)({
    extensionManager,
    getMainWindow: () => mainWindow,
    assertTrustedSender,
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
async function getProjectName(projectId) {
    const workspace = await (0, workspaceStore_js_1.loadWorkspace)();
    return workspace.projects.find((project) => project.id === projectId)?.name ?? 'rolestab-project';
}
function sanitizeFileBaseName(value) {
    const normalized = value
        .trim()
        .replace(/[<>:"/\\|?*]/g, '-')
        .split('')
        .filter((character) => character.charCodeAt(0) >= 32)
        .join('')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
    return normalized || 'rolestab-project';
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
        if (app.isPackaged) {
            return parsed.protocol === 'file:';
        }
        return parsed.origin === new URL(trustedDevServerUrl).origin;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=index.js.map