import { app } from 'electron'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { ProjectSummary, RoleProfile, WorkspaceData } from '../shared/workspace.js'

const defaultWorkspace: WorkspaceData = {
  projects: [],
  roleProfiles: [],
  lastActiveProjectId: null,
}

function workspacePath(): string {
  return path.join(app.getPath('userData'), 'workspace.json')
}

function sanitizeWorkspace(data: WorkspaceData): WorkspaceData {
  const projects = Array.isArray(data.projects) ? data.projects.filter(isValidProject) : []
  const roleProfiles = Array.isArray(data.roleProfiles)
    ? data.roleProfiles.filter((roleProfile) => isValidRoleProfile(roleProfile, projects))
    : []
  const lastActiveProjectId =
    typeof data.lastActiveProjectId === 'string' &&
    projects.some((project) => project.id === data.lastActiveProjectId)
      ? data.lastActiveProjectId
      : projects[0]?.id ?? null

  return { projects, roleProfiles, lastActiveProjectId }
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

async function writeWorkspace(workspace: WorkspaceData): Promise<WorkspaceData> {
  const nextWorkspace = sanitizeWorkspace(workspace)
  const filePath = workspacePath()

  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(nextWorkspace, null, 2)}\n`, 'utf8')

  return nextWorkspace
}

export async function loadWorkspace(): Promise<WorkspaceData> {
  try {
    const raw = await readFile(workspacePath(), 'utf8')
    const parsed = JSON.parse(raw) as WorkspaceData
    return sanitizeWorkspace(parsed)
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code

    if (code === 'ENOENT') {
      return defaultWorkspace
    }

    throw error
  }
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
    lastActiveProjectId: project.id,
  })
}

export async function deleteProject(projectId: string): Promise<WorkspaceData> {
  const workspace = await loadWorkspace()
  const projects = workspace.projects.filter((project) => project.id !== projectId)
  const roleProfiles = workspace.roleProfiles.filter((roleProfile) => roleProfile.projectId !== projectId)
  const lastActiveProjectId =
    workspace.lastActiveProjectId === projectId ? projects[0]?.id ?? null : workspace.lastActiveProjectId

  return writeWorkspace({ projects, roleProfiles, lastActiveProjectId })
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

  return writeWorkspace({ ...workspace, roleProfiles })
}
