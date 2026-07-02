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

export type WorkspaceData = {
  projects: ProjectSummary[]
  roleProfiles: RoleProfile[]
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
}
