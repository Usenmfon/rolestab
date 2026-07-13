import electron from 'electron'
import type {
  AppSettings,
  ProjectSummary,
  RecentUrl,
  RoleProfile,
  SavedBrowserTab,
  WorkspaceData,
  WorkspaceFileResult,
  WorkspaceImportResult,
} from '../shared/workspace.js'
import type { SessionUsage } from '../shared/session.js'
import type { UpdateStatus } from '../shared/update.js'
import type {
  ExtensionInstallResult,
  ExtensionListResult,
  InstalledExtension,
  RoleExtensionRuntimeState,
} from '../shared/extensions.js'

const { contextBridge, ipcRenderer } = electron

// This preload runs sandboxed, so it can only require `electron` and Node
// built-ins — not app modules. Keep imports type-only (erased at compile) and
// inline any runtime values. Must match `updateStatusChannel` in shared/update.ts.
const updateStatusChannel = 'app:update-status'

const api = {
  app: {
    platform: process.platform,
    versions: {
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      node: process.versions.node,
    },
    getVersion(): Promise<string> {
      return ipcRenderer.invoke('app:get-version')
    },
    copyText(text: string): Promise<void> {
      return ipcRenderer.invoke('app:copy-text', text)
    },
    setTitleBarTheme(theme: 'light' | 'dark'): Promise<void> {
      return ipcRenderer.invoke('app:set-title-bar-theme', theme)
    },
    getUpdateStatus(): Promise<UpdateStatus> {
      return ipcRenderer.invoke('app:get-update-status')
    },
    checkForUpdates(): Promise<UpdateStatus> {
      return ipcRenderer.invoke('app:check-for-updates')
    },
    quitAndInstall(): Promise<void> {
      return ipcRenderer.invoke('app:quit-and-install')
    },
    onUpdateStatus(callback: (status: UpdateStatus) => void): () => void {
      const listener = (_event: unknown, status: UpdateStatus) => callback(status)
      ipcRenderer.on(updateStatusChannel, listener)
      return () => ipcRenderer.removeListener(updateStatusChannel, listener)
    },
    openExternal(url: string): Promise<void> {
      return ipcRenderer.invoke('app:open-external', url)
    },
    logError(entry: { scope: string; message: string; stack?: string; details?: string }): Promise<void> {
      return ipcRenderer.invoke('app:log-error', entry)
    },
  },
  sessions: {
    createRolePartition(projectId: string, roleProfileId: string): Promise<string> {
      return ipcRenderer.invoke('session:create-role-partition', projectId, roleProfileId)
    },
    clearRoleSession(partition: string): Promise<void> {
      return ipcRenderer.invoke('session:clear-role-session', partition)
    },
    clearRoleSessions(partitions: string[]): Promise<void> {
      return ipcRenderer.invoke('session:clear-role-sessions', partitions)
    },
    getRoleSessionUsage(partition: string): Promise<SessionUsage> {
      return ipcRenderer.invoke('session:get-role-session-usage', partition)
    },
    getRoleSessionsUsage(partitions: string[]): Promise<SessionUsage[]> {
      return ipcRenderer.invoke('session:get-role-sessions-usage', partitions)
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
    saveSettings(settings: AppSettings): Promise<WorkspaceData> {
      return ipcRenderer.invoke('workspace:save-settings', settings)
    },
    saveRecentUrl(recentUrl: RecentUrl): Promise<WorkspaceData> {
      return ipcRenderer.invoke('workspace:save-recent-url', recentUrl)
    },
    saveRecentTabs(recentTabs: SavedBrowserTab[]): Promise<WorkspaceData> {
      return ipcRenderer.invoke('workspace:save-recent-tabs', recentTabs)
    },
    exportProjectConfig(projectId: string): Promise<WorkspaceFileResult> {
      return ipcRenderer.invoke('workspace:export-project-config', projectId)
    },
    importProjectConfig(): Promise<WorkspaceImportResult> {
      return ipcRenderer.invoke('workspace:import-project-config')
    },
  },
  extensions: {
    list(): Promise<ExtensionListResult> {
      return ipcRenderer.invoke('extensions:list')
    },
    install(): Promise<ExtensionInstallResult> {
      return ipcRenderer.invoke('extensions:install')
    },
    remove(extensionId: string): Promise<void> {
      return ipcRenderer.invoke('extensions:remove', extensionId)
    },
    setGlobalEnabled(extensionId: string, enabled: boolean): Promise<InstalledExtension[]> {
      return ipcRenderer.invoke('extensions:set-global-enabled', extensionId, enabled)
    },
    setRoleEnabled(
      extensionId: string,
      roleId: string,
      enabled: boolean,
    ): Promise<RoleExtensionRuntimeState> {
      return ipcRenderer.invoke('extensions:set-role-enabled', extensionId, roleId, enabled)
    },
    loadForRole(roleId: string): Promise<RoleExtensionRuntimeState[]> {
      return ipcRenderer.invoke('extensions:load-for-role', roleId)
    },
    reloadForRole(extensionId: string, roleId: string): Promise<RoleExtensionRuntimeState> {
      return ipcRenderer.invoke('extensions:reload-for-role', extensionId, roleId)
    },
    openFolder(extensionId: string): Promise<void> {
      return ipcRenderer.invoke('extensions:open-folder', extensionId)
    },
  },
  analytics: {
    connectivityRestored(): void {
      ipcRenderer.send('analytics:connectivity-restored')
    },
    roleCreated(roleId: string): void {
      ipcRenderer.send('analytics:role-created', { roleId })
    },
    roleUpdated(roleId: string): void {
      ipcRenderer.send('analytics:role-updated', { roleId })
    },
    roleDeleted(roleId: string): void {
      ipcRenderer.send('analytics:role-deleted', { roleId })
    },
    tabOpened(tabType: string): void {
      ipcRenderer.send('analytics:tab-opened', { tabType })
    },
    tabClosed(tabType: string, lifetimeSeconds?: number): void {
      ipcRenderer.send('analytics:tab-closed', { tabType, lifetimeSeconds })
    },
    tabSwitched(fromTabType: string, toTabType: string): void {
      ipcRenderer.send('analytics:tab-switched', { fromTabType, toTabType })
    },
    urlVisited(url: string): void {
      ipcRenderer.send('analytics:url-visited', { url })
    },
    extensionInstalled(extensionId: string): void {
      ipcRenderer.send('analytics:extension-installed', { extensionId })
    },
    extensionEnabled(extensionId: string): void {
      ipcRenderer.send('analytics:extension-enabled', { extensionId })
    },
    extensionDisabled(extensionId: string): void {
      ipcRenderer.send('analytics:extension-disabled', { extensionId })
    },
    extensionRemoved(extensionId: string): void {
      ipcRenderer.send('analytics:extension-removed', { extensionId })
    },
    featureUsed(feature: string): void {
      ipcRenderer.send('analytics:feature-used', { feature })
    },
  },
}

contextBridge.exposeInMainWorld('rolesTab', api)

export type RolesTabApi = typeof api
