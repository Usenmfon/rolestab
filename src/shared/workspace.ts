export type ProjectSummary = {
  id: string
  name: string
  baseUrl: string
  description: string
  createdAt: string
  updatedAt: string
}

export type RoleProfile = {
  id: string
  projectId: string
  name: string
  color: string
  startUrl: string
  sessionPartition: string
  createdAt: string
  updatedAt: string
}

export type AppSettings = {
  restoreTabsOnStartup: boolean
  confirmBeforeClearingSessions: boolean
  defaultHomepage: string
  theme: 'light' | 'dark' | 'system'
  defaultProjectId: string | null
  defaultRoleColors: string[]
  keyboardShortcuts: Record<string, string>
}

export const defaultRoleColors = ['#2563eb', '#059669', '#f59e0b', '#e11d48', '#7c3aed', '#0891b2']

export const defaultKeyboardShortcuts: Record<string, string> = {
  newTab: 'Ctrl+T',
  closeTab: 'Ctrl+W',
  reload: 'Ctrl+R',
  hardReload: 'Ctrl+Shift+R',
  focusUrlBar: 'Ctrl+L',
  openDevTools: 'Ctrl+Shift+I',
  nextTab: 'Ctrl+Tab',
  previousTab: 'Ctrl+Shift+Tab',
  openAllRoles: 'Ctrl+Shift+O',
  clearActiveRoleSession: 'Ctrl+Shift+Backspace',
}

export const defaultAppSettings: AppSettings = {
  restoreTabsOnStartup: true,
  confirmBeforeClearingSessions: true,
  defaultHomepage: '',
  theme: 'system',
  defaultProjectId: null,
  defaultRoleColors,
  keyboardShortcuts: defaultKeyboardShortcuts,
}

export type RecentUrl = {
  id: string
  url: string
  title: string
  projectId: string | null
  roleProfileId: string | null
  visitedAt: string
}

export type SavedBrowserTab = {
  id: string
  projectId: string
  roleProfileId: string
  title: string
  url: string
  sessionPartition: string
  savedAt: string
}

export type WorkspaceData = {
  schemaVersion: number
  projects: ProjectSummary[]
  roleProfiles: RoleProfile[]
  settings: AppSettings
  recentUrls: RecentUrl[]
  recentTabs: SavedBrowserTab[]
  lastActiveProjectId: string | null
}

export type ProjectExportData = {
  app: 'RolesTab'
  schemaVersion: number
  exportedAt: string
  project: ProjectSummary
  roleProfiles: RoleProfile[]
}

export type WorkspaceFileResult = {
  canceled: boolean
  filePath?: string
}

export type WorkspaceImportResult = WorkspaceFileResult & {
  workspace?: WorkspaceData
  projectId?: string
  importedRoleCount?: number
}

export type BrowserTab = {
  id: string
  projectId: string
  roleProfileId: string
  roleName: string
  roleColor: string
  title: string
  url: string
  loading: boolean
  sessionPartition: string
  faviconUrl?: string
  loadError?: string
  loadErrorDetails?: string
  canGoBack?: boolean
  canGoForward?: boolean
  consoleErrors?: string[]
}
