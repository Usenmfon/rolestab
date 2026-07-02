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
  canGoBack?: boolean
  canGoForward?: boolean
  consoleErrors?: string[]
}
