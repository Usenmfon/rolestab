import { useEffect, useMemo, useState } from 'react'
import { DesktopLayout } from '../layouts/DesktopLayout'
import type { ProjectDraft } from '../components/ProjectFormPanel'
import type { RoleProfileDraft } from '../components/RoleProfileFormPanel'
import type { BrowserTab, ProjectSummary, RoleProfile, WorkspaceData } from '../../shared/workspace'

function App() {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [roleProfiles, setRoleProfiles] = useState<RoleProfile[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [tabs, setTabs] = useState<BrowserTab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [projectFormOpen, setProjectFormOpen] = useState(false)
  const [roleProfileFormOpen, setRoleProfileFormOpen] = useState(false)
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [editingRoleProfileId, setEditingRoleProfileId] = useState<string | null>(null)
  const [workspaceError, setWorkspaceError] = useState<string | null>(null)

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? null,
    [activeProjectId, projects],
  )
  const editingProject = useMemo(
    () => projects.find((project) => project.id === editingProjectId) ?? null,
    [editingProjectId, projects],
  )
  const activeProjectRoleProfiles = useMemo(
    () => roleProfiles.filter((roleProfile) => roleProfile.projectId === activeProjectId),
    [activeProjectId, roleProfiles],
  )
  const editingRoleProfile = useMemo(
    () => roleProfiles.find((roleProfile) => roleProfile.id === editingRoleProfileId) ?? null,
    [editingRoleProfileId, roleProfiles],
  )
  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? null,
    [activeTabId, tabs],
  )

  useEffect(() => {
    let mounted = true

    async function loadWorkspace() {
      try {
        const workspace = await window.rolesTab?.workspace.load()

        if (!mounted || !workspace) {
          return
        }

        applyWorkspace(workspace)
      } catch (error) {
        if (mounted) {
          setWorkspaceError(error instanceof Error ? error.message : 'Unable to load workspace.')
        }
      }
    }

    void loadWorkspace()

    return () => {
      mounted = false
    }
  }, [])

  function applyWorkspace(workspace: WorkspaceData) {
    setProjects(workspace.projects)
    setRoleProfiles(workspace.roleProfiles)
    setActiveProjectId(workspace.lastActiveProjectId)
  }

  function openCreateProjectForm() {
    setEditingProjectId(null)
    setRoleProfileFormOpen(false)
    setProjectFormOpen(true)
  }

  function openEditProjectForm(projectId: string) {
    setEditingProjectId(projectId)
    setRoleProfileFormOpen(false)
    setProjectFormOpen(true)
  }

  function closeProjectForm() {
    setProjectFormOpen(false)
    setEditingProjectId(null)
  }

  function openCreateRoleProfileForm() {
    if (!activeProject) {
      openCreateProjectForm()
      return
    }

    setEditingRoleProfileId(null)
    setProjectFormOpen(false)
    setRoleProfileFormOpen(true)
  }

  function openEditRoleProfileForm(roleProfileId: string) {
    setEditingRoleProfileId(roleProfileId)
    setProjectFormOpen(false)
    setRoleProfileFormOpen(true)
  }

  function closeRoleProfileForm() {
    setRoleProfileFormOpen(false)
    setEditingRoleProfileId(null)
  }

  async function saveProject(draft: ProjectDraft) {
    const now = new Date().toISOString()
    const project: ProjectSummary = {
      id: editingProject?.id ?? crypto.randomUUID(),
      name: draft.name,
      baseUrl: draft.baseUrl,
      description: draft.description,
      createdAt: editingProject?.createdAt ?? now,
      updatedAt: now,
    }

    const workspace = await window.rolesTab?.workspace.saveProject(project)

    if (workspace) {
      applyWorkspace(workspace)
    } else {
      setProjects((currentProjects) => {
        const existingIndex = currentProjects.findIndex((currentProject) => currentProject.id === project.id)
        const nextProjects = [...currentProjects]

        if (existingIndex >= 0) {
          nextProjects[existingIndex] = project
        } else {
          nextProjects.unshift(project)
        }

        return nextProjects
      })
      setActiveProjectId(project.id)
    }

    closeProjectForm()
    setWorkspaceError(null)
  }

  async function saveRoleProfile(draft: RoleProfileDraft) {
    if (!activeProject) {
      throw new Error('Select a project before saving a role profile.')
    }

    const now = new Date().toISOString()
    const roleProfileId = editingRoleProfile?.id ?? crypto.randomUUID()
    const sessionPartition =
      editingRoleProfile?.sessionPartition ??
      (await window.rolesTab?.sessions.createRolePartition(activeProject.id, roleProfileId)) ??
      `persist:${activeProject.id}-${roleProfileId}`

    const roleProfile: RoleProfile = {
      id: roleProfileId,
      projectId: activeProject.id,
      name: draft.name,
      color: draft.color,
      startUrl: draft.startUrl,
      sessionPartition,
      createdAt: editingRoleProfile?.createdAt ?? now,
      updatedAt: now,
    }

    const workspace = await window.rolesTab?.workspace.saveRoleProfile(roleProfile)

    if (workspace) {
      applyWorkspace(workspace)
    } else {
      setRoleProfiles((currentRoleProfiles) => {
        const existingIndex = currentRoleProfiles.findIndex(
          (currentRoleProfile) => currentRoleProfile.id === roleProfile.id,
        )
        const nextRoleProfiles = [...currentRoleProfiles]

        if (existingIndex >= 0) {
          nextRoleProfiles[existingIndex] = roleProfile
        } else {
          nextRoleProfiles.unshift(roleProfile)
        }

        return nextRoleProfiles
      })
    }

    closeRoleProfileForm()
    setWorkspaceError(null)
  }

  async function deleteRoleProfile(roleProfileId: string) {
    const roleProfile = roleProfiles.find((currentRoleProfile) => currentRoleProfile.id === roleProfileId)

    if (!roleProfile) {
      return
    }

    const confirmed = window.confirm(
      `Delete "${roleProfile.name}"? Open tabs for this role will close, but its persisted browser session is not cleared.`,
    )

    if (!confirmed) {
      return
    }

    const workspace = await window.rolesTab?.workspace.deleteRoleProfile(roleProfileId)

    if (workspace) {
      applyWorkspace(workspace)
    } else {
      setRoleProfiles((currentRoleProfiles) =>
        currentRoleProfiles.filter((currentRoleProfile) => currentRoleProfile.id !== roleProfileId),
      )
    }

    const remainingTabs = tabs.filter((tab) => tab.roleProfileId !== roleProfileId)

    setTabs(remainingTabs)
    setActiveTabId((currentActiveTabId) => {
      return remainingTabs.some((tab) => tab.id === currentActiveTabId)
        ? currentActiveTabId
        : remainingTabs.at(-1)?.id ?? null
    })
    setWorkspaceError(null)
  }

  async function deleteProject(projectId: string) {
    const project = projects.find((currentProject) => currentProject.id === projectId)

    if (!project) {
      return
    }

    const confirmed = window.confirm(
      `Delete "${project.name}"? Open tabs for this project will close, but role sessions are kept until session management is added.`,
    )

    if (!confirmed) {
      return
    }

    const workspace = await window.rolesTab?.workspace.deleteProject(projectId)

    if (workspace) {
      applyWorkspace(workspace)
    } else {
      setProjects((currentProjects) => currentProjects.filter((currentProject) => currentProject.id !== projectId))
      setRoleProfiles((currentRoleProfiles) =>
        currentRoleProfiles.filter((currentRoleProfile) => currentRoleProfile.projectId !== projectId),
      )
      setActiveProjectId((currentActiveProjectId) =>
        currentActiveProjectId === projectId ? null : currentActiveProjectId,
      )
    }

    const remainingTabs = tabs.filter((tab) => tab.projectId !== projectId)

    setTabs(remainingTabs)
    setActiveTabId((currentActiveTabId) => {
      return remainingTabs.some((tab) => tab.id === currentActiveTabId)
        ? currentActiveTabId
        : remainingTabs.at(-1)?.id ?? null
    })
    setWorkspaceError(null)
  }

  async function selectProject(projectId: string) {
    setActiveProjectId(projectId)
    setActiveTabId(null)

    try {
      const workspace = await window.rolesTab?.workspace.setLastActiveProject(projectId)

      if (workspace) {
        applyWorkspace(workspace)
      }
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : 'Unable to save active project.')
    }
  }

  function createRoleTab() {
    if (!activeProject) {
      openCreateProjectForm()
      return
    }

    const firstRoleProfile = activeProjectRoleProfiles[0]

    if (!firstRoleProfile) {
      openCreateRoleProfileForm()
      return
    }

    openRoleTab(firstRoleProfile.id)
  }

  function openRoleTab(roleProfileId: string) {
    const roleProfile = roleProfiles.find((currentRoleProfile) => currentRoleProfile.id === roleProfileId)

    if (!roleProfile) {
      return
    }

    const tabId = `tab-${Date.now()}`

    setTabs((currentTabs) => [
      ...currentTabs,
      {
        id: tabId,
        projectId: roleProfile.projectId,
        roleProfileId: roleProfile.id,
        roleName: roleProfile.name,
        roleColor: roleProfile.color,
        title: roleProfile.name,
        url: roleProfile.startUrl,
        loading: false,
        sessionPartition: roleProfile.sessionPartition,
      },
    ])
    setActiveTabId(tabId)
  }

  function closeTab(tabId: string) {
    setTabs((currentTabs) => {
      const nextTabs = currentTabs.filter((tab) => tab.id !== tabId)

      if (activeTabId === tabId) {
        setActiveTabId(nextTabs.at(-1)?.id ?? null)
      }

      return nextTabs
    })
  }

  function updateTab(tabId: string, updates: Partial<BrowserTab>) {
    setTabs((currentTabs) =>
      currentTabs.map((tab) => (tab.id === tabId ? { ...tab, ...updates } : tab)),
    )
  }

  return (
    <DesktopLayout
      projects={projects}
      activeProjectRoleProfiles={activeProjectRoleProfiles}
      activeProject={activeProject}
      tabs={tabs}
      activeTab={activeTab}
      activeTabId={activeTabId}
      workspaceError={workspaceError}
      editingProject={editingProject}
      editingRoleProfile={editingRoleProfile}
      projectFormOpen={projectFormOpen}
      roleProfileFormOpen={roleProfileFormOpen}
      onCreateProject={openCreateProjectForm}
      onEditProject={openEditProjectForm}
      onDeleteProject={(projectId) => {
        void deleteProject(projectId)
      }}
      onCloseProjectForm={closeProjectForm}
      onSaveProject={saveProject}
      onCreateRoleProfile={openCreateRoleProfileForm}
      onEditRoleProfile={openEditRoleProfileForm}
      onDeleteRoleProfile={(roleProfileId) => {
        void deleteRoleProfile(roleProfileId)
      }}
      onOpenRoleProfile={openRoleTab}
      onCloseRoleProfileForm={closeRoleProfileForm}
      onSaveRoleProfile={saveRoleProfile}
      onSelectProject={(projectId) => {
        void selectProject(projectId)
      }}
      onNewTab={createRoleTab}
      onSelectTab={setActiveTabId}
      onCloseTab={closeTab}
      onCloseActiveTab={() => {
        if (activeTabId) {
          closeTab(activeTabId)
        }
      }}
      onUpdateTab={updateTab}
    />
  )
}

export default App
