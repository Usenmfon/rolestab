import electron from 'electron';
const { contextBridge, ipcRenderer } = electron;
const api = {
    app: {
        platform: process.platform,
        versions: {
            electron: process.versions.electron,
            chrome: process.versions.chrome,
            node: process.versions.node,
        },
        openExternal(url) {
            return ipcRenderer.invoke('app:open-external', url);
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
    },
};
contextBridge.exposeInMainWorld('rolesTab', api);
//# sourceMappingURL=index.js.map