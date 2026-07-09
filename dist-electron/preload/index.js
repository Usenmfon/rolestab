"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = __importDefault(require("electron"));
const { contextBridge, ipcRenderer } = electron_1.default;
// This preload runs sandboxed, so it can only require `electron` and Node
// built-ins — not app modules. Keep imports type-only (erased at compile) and
// inline any runtime values. Must match `updateStatusChannel` in shared/update.ts.
const updateStatusChannel = 'app:update-status';
const api = {
    app: {
        platform: process.platform,
        versions: {
            electron: process.versions.electron,
            chrome: process.versions.chrome,
            node: process.versions.node,
        },
        getVersion() {
            return ipcRenderer.invoke('app:get-version');
        },
        copyText(text) {
            return ipcRenderer.invoke('app:copy-text', text);
        },
        setTitleBarTheme(theme) {
            return ipcRenderer.invoke('app:set-title-bar-theme', theme);
        },
        getUpdateStatus() {
            return ipcRenderer.invoke('app:get-update-status');
        },
        checkForUpdates() {
            return ipcRenderer.invoke('app:check-for-updates');
        },
        quitAndInstall() {
            return ipcRenderer.invoke('app:quit-and-install');
        },
        onUpdateStatus(callback) {
            const listener = (_event, status) => callback(status);
            ipcRenderer.on(updateStatusChannel, listener);
            return () => ipcRenderer.removeListener(updateStatusChannel, listener);
        },
        openExternal(url) {
            return ipcRenderer.invoke('app:open-external', url);
        },
        logError(entry) {
            return ipcRenderer.invoke('app:log-error', entry);
        },
    },
    sessions: {
        createRolePartition(projectId, roleProfileId) {
            return ipcRenderer.invoke('session:create-role-partition', projectId, roleProfileId);
        },
        clearRoleSession(partition) {
            return ipcRenderer.invoke('session:clear-role-session', partition);
        },
        clearRoleSessions(partitions) {
            return ipcRenderer.invoke('session:clear-role-sessions', partitions);
        },
        getRoleSessionUsage(partition) {
            return ipcRenderer.invoke('session:get-role-session-usage', partition);
        },
        getRoleSessionsUsage(partitions) {
            return ipcRenderer.invoke('session:get-role-sessions-usage', partitions);
        },
    },
    workspace: {
        load() {
            return ipcRenderer.invoke('workspace:load');
        },
        saveProject(project) {
            return ipcRenderer.invoke('workspace:save-project', project);
        },
        deleteProject(projectId) {
            return ipcRenderer.invoke('workspace:delete-project', projectId);
        },
        setLastActiveProject(projectId) {
            return ipcRenderer.invoke('workspace:set-last-active-project', projectId);
        },
        saveRoleProfile(roleProfile) {
            return ipcRenderer.invoke('workspace:save-role-profile', roleProfile);
        },
        deleteRoleProfile(roleProfileId) {
            return ipcRenderer.invoke('workspace:delete-role-profile', roleProfileId);
        },
        saveSettings(settings) {
            return ipcRenderer.invoke('workspace:save-settings', settings);
        },
        saveRecentUrl(recentUrl) {
            return ipcRenderer.invoke('workspace:save-recent-url', recentUrl);
        },
        saveRecentTabs(recentTabs) {
            return ipcRenderer.invoke('workspace:save-recent-tabs', recentTabs);
        },
        exportProjectConfig(projectId) {
            return ipcRenderer.invoke('workspace:export-project-config', projectId);
        },
        importProjectConfig() {
            return ipcRenderer.invoke('workspace:import-project-config');
        },
    },
};
contextBridge.exposeInMainWorld('rolesTab', api);
//# sourceMappingURL=index.js.map