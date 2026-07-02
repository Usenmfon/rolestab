import { contextBridge, ipcRenderer } from 'electron'
import type { ProjectSummary, RoleProfile, WorkspaceData } from '../shared/workspace.js'

const api = {
  app: {
    platform: process.platform,
    versions: {
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      node: process.versions.node,
    },
    openExternal(url: string): Promise<void> {
      return ipcRenderer.invoke('app:open-external', url)
    },
  },
  sessions: {
    createRolePartition(projectId: string, roleProfileId: string): Promise<string> {
      return ipcRenderer.invoke('session:create-role-partition', projectId, roleProfileId)
    },
    clearRoleSession(partition: string): Promise<void> {
      return ipcRenderer.invoke('session:clear-role-session', partition)
    },
  },
  workspace: {
    load(): Promise<WorkspaceData> {
      return ipcRenderer.invoke('workspace:load')
    },
    saveProject(project: ProjectSummary): Promise<WorkspaceData> {
      return ipcRenderer.invoke('workspace:save-project', project)
    },
    deleteProject(projectId: string): Promise<WorkspaceData> {
      return ipcRenderer.invoke('workspace:delete-project', projectId)
    },
    setLastActiveProject(projectId: string | null): Promise<WorkspaceData> {
      return ipcRenderer.invoke('workspace:set-last-active-project', projectId)
    },
    saveRoleProfile(roleProfile: RoleProfile): Promise<WorkspaceData> {
      return ipcRenderer.invoke('workspace:save-role-profile', roleProfile)
    },
    deleteRoleProfile(roleProfileId: string): Promise<WorkspaceData> {
      return ipcRenderer.invoke('workspace:delete-role-profile', roleProfileId)
    },
  },
}

contextBridge.exposeInMainWorld('rolesTab', api)

export type RolesTabApi = typeof api
