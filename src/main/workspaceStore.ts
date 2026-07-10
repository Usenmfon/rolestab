import electron from 'electron'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type {
  AppSettings,
  ProjectExportData,
  ProjectSummary,
  RecentUrl,
  RoleProfile,
  SavedBrowserTab,
  WorkspaceData,
} from '../shared/workspace.js'
import { defaultAppSettings, defaultKeyboardShortcuts, defaultRoleColors } from '../shared/workspace.js'

const { app } = electron

const workspaceSchemaVersion = 1
const projectExportSchemaVersion = 1

const defaultWorkspace: WorkspaceData = {
  schemaVersion: workspaceSchemaVersion,
  projects: [],
  roleProfiles: [],
  settings: defaultAppSettings,
  recentUrls: [],
  recentTabs: [],
  lastActiveProjectId: null,
}

let workspaceWriteQueue = Promise.resolve<WorkspaceData>(defaultWorkspace)

function workspacePath(): string {
  return path.join(app.getPath('userData'), 'workspace.json')
}

function sanitizeWorkspace(data: WorkspaceData): WorkspaceData {
  const projects = Array.isArray(data.projects) ? data.projects.filter(isValidProject) : []
  const roleProfiles = Array.isArray(data.roleProfiles)
    ? data.roleProfiles.filter((roleProfile) => isValidRoleProfile(roleProfile, projects))
    : []
  const settings = sanitizeSettings(data.settings, projects)
  const recentUrls = Array.isArray(data.recentUrls)
    ? data.recentUrls.filter((recentUrl) => isValidRecentUrl(recentUrl, projects, roleProfiles)).slice(0, 50)
    : []
  const recentTabs = Array.isArray(data.recentTabs)
    ? data.recentTabs.filter((recentTab) => isValidSavedTab(recentTab, projects, roleProfiles)).slice(0, 20)
    : []
  const lastActiveProjectId =
    typeof data.lastActiveProjectId === 'string' &&
    projects.some((project) => project.id === data.lastActiveProjectId)
      ? data.lastActiveProjectId
      : settings.defaultProjectId ?? projects[0]?.id ?? null

  return {
    schemaVersion: workspaceSchemaVersion,
    projects,
    roleProfiles,
    settings,
    recentUrls,
    recentTabs,
    lastActiveProjectId,
  }
}

function isValidProject(project: ProjectSummary): boolean {
  return (
    typeof project.id === 'string' &&
    typeof project.name === 'string' &&
    typeof project.baseUrl === 'string' &&
    typeof project.description === 'string' &&
    typeof project.createdAt === 'string' &&
    typeof project.updatedAt === 'string' &&
    isAllowedUrl(project.baseUrl)
  )
}

function isValidRoleProfile(roleProfile: RoleProfile, projects: ProjectSummary[]): boolean {
  return (
    typeof roleProfile.id === 'string' &&
    typeof roleProfile.projectId === 'string' &&
    projects.some((project) => project.id === roleProfile.projectId) &&
    typeof roleProfile.name === 'string' &&
    roleProfile.name.trim().length > 0 &&
    typeof roleProfile.color === 'string' &&
    /^#[\da-f]{6}$/i.test(roleProfile.color) &&
    typeof roleProfile.startUrl === 'string' &&
    isAllowedUrl(roleProfile.startUrl) &&
    typeof roleProfile.sessionPartition === 'string' &&
    roleProfile.sessionPartition.startsWith('persist:') &&
    typeof roleProfile.createdAt === 'string' &&
    typeof roleProfile.updatedAt === 'string'
  )
}

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function sanitizeSettings(settings: AppSettings | undefined, projects: ProjectSummary[]): AppSettings {
  const defaultProjectId =
    typeof settings?.defaultProjectId === 'string' &&
    projects.some((project) => project.id === settings.defaultProjectId)
      ? settings.defaultProjectId
      : null
  const defaultRoleColorSettings = Array.isArray(settings?.defaultRoleColors)
    ? settings.defaultRoleColors.filter((color) => /^#[\da-f]{6}$/i.test(color)).slice(0, 8)
    : []

  return {
    restoreTabsOnStartup:
      typeof settings?.restoreTabsOnStartup === 'boolean'
        ? settings.restoreTabsOnStartup
        : defaultAppSettings.restoreTabsOnStartup,
    confirmBeforeClearingSessions:
      typeof settings?.confirmBeforeClearingSessions === 'boolean'
        ? settings.confirmBeforeClearingSessions
        : defaultAppSettings.confirmBeforeClearingSessions,
    defaultHomepage:
      typeof settings?.defaultHomepage === 'string' && (!settings.defaultHomepage || isAllowedUrl(settings.defaultHomepage))
        ? settings.defaultHomepage
        : defaultAppSettings.defaultHomepage,
    theme:
      settings?.theme === 'light' || settings?.theme === 'dark' || settings?.theme === 'system'
        ? settings.theme
        : defaultAppSettings.theme,
    defaultProjectId,
    defaultRoleColors: defaultRoleColorSettings.length > 0 ? defaultRoleColorSettings : defaultRoleColors,
    keyboardShortcuts: {
      ...defaultKeyboardShortcuts,
      ...(settings?.keyboardShortcuts && typeof settings.keyboardShortcuts === 'object'
        ? settings.keyboardShortcuts
        : {}),
    },
    hasSeenOnboarding:
      typeof settings?.hasSeenOnboarding === 'boolean'
        ? settings.hasSeenOnboarding
        : defaultAppSettings.hasSeenOnboarding,
  }
}

function isValidRecentUrl(
  recentUrl: RecentUrl,
  projects: ProjectSummary[],
  roleProfiles: RoleProfile[],
): boolean {
  return (
    typeof recentUrl.id === 'string' &&
    typeof recentUrl.url === 'string' &&
    isAllowedUrl(recentUrl.url) &&
    typeof recentUrl.title === 'string' &&
    (recentUrl.projectId === null || projects.some((project) => project.id === recentUrl.projectId)) &&
    (recentUrl.roleProfileId === null ||
      roleProfiles.some((roleProfile) => roleProfile.id === recentUrl.roleProfileId)) &&
    typeof recentUrl.visitedAt === 'string'
  )
}

function isValidSavedTab(
  recentTab: SavedBrowserTab,
  projects: ProjectSummary[],
  roleProfiles: RoleProfile[],
): boolean {
  return (
    typeof recentTab.id === 'string' &&
    projects.some((project) => project.id === recentTab.projectId) &&
    roleProfiles.some((roleProfile) => roleProfile.id === recentTab.roleProfileId) &&
    typeof recentTab.title === 'string' &&
    typeof recentTab.url === 'string' &&
    isAllowedUrl(recentTab.url) &&
    typeof recentTab.sessionPartition === 'string' &&
    recentTab.sessionPartition.startsWith('persist:') &&
    typeof recentTab.savedAt === 'string'
  )
}

async function writeWorkspace(workspace: WorkspaceData): Promise<WorkspaceData> {
  const nextWorkspace = sanitizeWorkspace(workspace)
  const filePath = workspacePath()
  const temporaryPath = `${filePath}.tmp`

  workspaceWriteQueue = workspaceWriteQueue
    .catch(() => defaultWorkspace)
    .then(async () => {
      await mkdir(path.dirname(filePath), { recursive: true })
      await writeFile(temporaryPath, `${JSON.stringify(nextWorkspace, null, 2)}\n`, 'utf8')
      await rename(temporaryPath, filePath)

      return nextWorkspace
    })

  return workspaceWriteQueue
}

export async function loadWorkspace(): Promise<WorkspaceData> {
  try {
    const raw = await readFile(workspacePath(), 'utf8')
    const parsed = parseWorkspaceJson(raw)
    const workspace = sanitizeWorkspace(parsed)

    if (raw.trim() !== `${JSON.stringify(workspace, null, 2)}`) {
      void writeWorkspace(workspace)
    }

    return workspace
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code

    if (code === 'ENOENT') {
      return defaultWorkspace
    }

    throw error
  }
}

function parseWorkspaceJson(raw: string): WorkspaceData {
  try {
    return JSON.parse(raw) as WorkspaceData
  } catch (error) {
    if (!(error instanceof SyntaxError)) {
      throw error
    }

    const jsonPrefix = getFirstJsonObject(raw)

    if (!jsonPrefix) {
      throw error
    }

    return JSON.parse(jsonPrefix) as WorkspaceData
  }
}

function getFirstJsonObject(raw: string): string | null {
  let depth = 0
  let objectStart = -1
  let inString = false
  let escaped = false

  for (let index = 0; index < raw.length; index += 1) {
    const character = raw[index]

    if (objectStart < 0) {
      if (character === '{') {
        objectStart = index
        depth = 1
      }

      continue
    }

    if (inString) {
      if (escaped) {
        escaped = false
      } else if (character === '\\') {
        escaped = true
      } else if (character === '"') {
        inString = false
      }

      continue
    }

    if (character === '"') {
      inString = true
    } else if (character === '{') {
      depth += 1
    } else if (character === '}') {
      depth -= 1

      if (depth === 0) {
        return raw.slice(objectStart, index + 1)
      }
    }
  }

  return null
}

export async function saveProject(project: ProjectSummary): Promise<WorkspaceData> {
  if (!isValidProject(project)) {
    throw new Error('Project name and a valid http(s) base URL are required.')
  }

  const workspace = await loadWorkspace()
  const existingIndex = workspace.projects.findIndex((currentProject) => currentProject.id === project.id)
  const projects = [...workspace.projects]

  if (existingIndex >= 0) {
    projects[existingIndex] = project
  } else {
    projects.unshift(project)
  }

  return writeWorkspace({
    projects,
    roleProfiles: workspace.roleProfiles,
    settings: workspace.settings,
    recentUrls: workspace.recentUrls,
    recentTabs: workspace.recentTabs,
    lastActiveProjectId: project.id,
    schemaVersion: workspaceSchemaVersion,
  })
}

export async function deleteProject(projectId: string): Promise<WorkspaceData> {
  const workspace = await loadWorkspace()
  const projects = workspace.projects.filter((project) => project.id !== projectId)
  const roleProfiles = workspace.roleProfiles.filter((roleProfile) => roleProfile.projectId !== projectId)
  const lastActiveProjectId =
    workspace.lastActiveProjectId === projectId ? projects[0]?.id ?? null : workspace.lastActiveProjectId

  const recentUrls = workspace.recentUrls.filter((recentUrl) => recentUrl.projectId !== projectId)
  const recentTabs = workspace.recentTabs.filter((recentTab) => recentTab.projectId !== projectId)

  return writeWorkspace({ ...workspace, projects, roleProfiles, recentUrls, recentTabs, lastActiveProjectId })
}

export async function setLastActiveProject(projectId: string | null): Promise<WorkspaceData> {
  const workspace = await loadWorkspace()
  const lastActiveProjectId = workspace.projects.some((project) => project.id === projectId)
    ? projectId
    : null

  return writeWorkspace({ ...workspace, lastActiveProjectId })
}

export async function saveRoleProfile(roleProfile: RoleProfile): Promise<WorkspaceData> {
  const workspace = await loadWorkspace()

  if (!isValidRoleProfile(roleProfile, workspace.projects)) {
    throw new Error('Role name, color, session partition, and a valid start URL are required.')
  }

  const existingIndex = workspace.roleProfiles.findIndex((currentRole) => currentRole.id === roleProfile.id)
  const roleProfiles = [...workspace.roleProfiles]

  if (existingIndex >= 0) {
    roleProfiles[existingIndex] = roleProfile
  } else {
    roleProfiles.unshift(roleProfile)
  }

  return writeWorkspace({ ...workspace, roleProfiles })
}

export async function deleteRoleProfile(roleProfileId: string): Promise<WorkspaceData> {
  const workspace = await loadWorkspace()
  const roleProfiles = workspace.roleProfiles.filter((roleProfile) => roleProfile.id !== roleProfileId)
  const recentUrls = workspace.recentUrls.filter((recentUrl) => recentUrl.roleProfileId !== roleProfileId)
  const recentTabs = workspace.recentTabs.filter((recentTab) => recentTab.roleProfileId !== roleProfileId)

  return writeWorkspace({ ...workspace, roleProfiles, recentUrls, recentTabs })
}

export async function saveSettings(settings: AppSettings): Promise<WorkspaceData> {
  const workspace = await loadWorkspace()

  return writeWorkspace({ ...workspace, settings: sanitizeSettings(settings, workspace.projects) })
}

export async function saveRecentUrl(recentUrl: RecentUrl): Promise<WorkspaceData> {
  const workspace = await loadWorkspace()
  const nextRecentUrl = {
    ...recentUrl,
    visitedAt: recentUrl.visitedAt || new Date().toISOString(),
  }

  if (!isValidRecentUrl(nextRecentUrl, workspace.projects, workspace.roleProfiles)) {
    throw new Error('Recent URL must be a valid http(s) URL for an existing project and role.')
  }

  const recentUrls = [
    nextRecentUrl,
    ...workspace.recentUrls.filter((currentUrl) => currentUrl.url !== nextRecentUrl.url),
  ].slice(0, 50)

  return writeWorkspace({ ...workspace, recentUrls })
}

export async function saveRecentTabs(recentTabs: SavedBrowserTab[]): Promise<WorkspaceData> {
  const workspace = await loadWorkspace()

  return writeWorkspace({ ...workspace, recentTabs })
}

export async function exportProjectConfig(projectId: string, filePath: string): Promise<void> {
  const workspace = await loadWorkspace()
  const project = workspace.projects.find((currentProject) => currentProject.id === projectId)

  if (!project) {
    throw new Error('Select an existing project before exporting.')
  }

  const projectExport: ProjectExportData = {
    app: 'RolesTab',
    schemaVersion: projectExportSchemaVersion,
    exportedAt: new Date().toISOString(),
    project,
    roleProfiles: workspace.roleProfiles.filter((roleProfile) => roleProfile.projectId === projectId),
  }

  await writeFile(filePath, `${JSON.stringify(projectExport, null, 2)}\n`, 'utf8')
}

export async function importProjectConfig(filePath: string): Promise<{
  workspace: WorkspaceData
  projectId: string
  importedRoleCount: number
}> {
  const raw = await readFile(filePath, 'utf8')
  const projectExport = parseProjectExport(raw)
  const workspace = await loadWorkspace()
  const existingProjectIndex = workspace.projects.findIndex(
    (currentProject) => currentProject.id === projectExport.project.id,
  )
  const importedProject =
    existingProjectIndex >= 0
      ? {
          ...projectExport.project,
          updatedAt: new Date().toISOString(),
        }
      : projectExport.project
  const projects = [...workspace.projects]

  if (existingProjectIndex >= 0) {
    projects[existingProjectIndex] = importedProject
  } else {
    projects.unshift(importedProject)
  }

  const roleProfiles = [
    ...projectExport.roleProfiles,
    ...workspace.roleProfiles.filter((roleProfile) => roleProfile.projectId !== importedProject.id),
  ]

  const nextWorkspace = await writeWorkspace({
    ...workspace,
    projects,
    roleProfiles,
    recentUrls: workspace.recentUrls.filter((recentUrl) => recentUrl.projectId !== importedProject.id),
    recentTabs: workspace.recentTabs.filter((recentTab) => recentTab.projectId !== importedProject.id),
    lastActiveProjectId: importedProject.id,
  })

  return {
    workspace: nextWorkspace,
    projectId: importedProject.id,
    importedRoleCount: projectExport.roleProfiles.length,
  }
}

function parseProjectExport(raw: string): ProjectExportData {
  let parsed: Partial<ProjectExportData>

  try {
    parsed = JSON.parse(raw) as Partial<ProjectExportData>
  } catch {
    throw new Error('Choose a valid RolesTab project export JSON file.')
  }

  if (
    parsed.app !== 'RolesTab' ||
    parsed.schemaVersion !== projectExportSchemaVersion ||
    !parsed.project ||
    !isValidProject(parsed.project)
  ) {
    throw new Error('This file is not a compatible RolesTab project export.')
  }

  const roleProfiles = Array.isArray(parsed.roleProfiles)
    ? parsed.roleProfiles.filter(
        (roleProfile) =>
          roleProfile.projectId === parsed.project?.id && isValidRoleProfile(roleProfile, [parsed.project]),
      )
    : []

  if (roleProfiles.length !== (parsed.roleProfiles?.length ?? 0)) {
    throw new Error('The project export contains invalid role profile data.')
  }

  return {
    app: 'RolesTab',
    schemaVersion: projectExportSchemaVersion,
    exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : new Date().toISOString(),
    project: parsed.project,
    roleProfiles,
  }
}
