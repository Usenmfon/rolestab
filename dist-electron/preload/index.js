import { contextBridge, ipcRenderer } from 'electron';
const api = {
    app: {
        platform: process.platform,
        versions: {
            electron: process.versions.electron,
            chrome: process.versions.chrome,
            node: process.versions.node,
        },
    },
    sessions: {
        createRolePartition(projectId, roleProfileId) {
            return ipcRenderer.invoke('session:create-role-partition', projectId, roleProfileId);
        },
        clearRoleSession(partition) {
            return ipcRenderer.invoke('session:clear-role-session', partition);
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
    },
};
contextBridge.exposeInMainWorld('rolesTab', api);
//# sourceMappingURL=index.js.map