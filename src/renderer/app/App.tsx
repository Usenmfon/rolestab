import { useEffect, useMemo, useState } from 'react'
import { DesktopLayout } from '../layouts/DesktopLayout'
import type { ProjectDraft } from '../components/ProjectFormPanel'
import type { BrowserTab, ProjectSummary, WorkspaceData } from '../../shared/workspace'

const roleSequence = [
  { name: 'Admin', color: 'bg-blue-600' },
  { name: 'Manager', color: 'bg-emerald-600' },
  { name: 'Staff', color: 'bg-rose-500' },
  { name: 'Customer', color: 'bg-amber-500' },
]

function App() {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [tabs, setTabs] = useState<BrowserTab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [projectFormOpen, setProjectFormOpen] = useState(false)
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [workspaceError, setWorkspaceError] = useState<string | null>(null)

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? null,
    [activeProjectId, projects],
  )
  const editingProject = useMemo(
    () => projects.find((project) => project.id === editingProjectId) ?? null,
    [editingProjectId, projects],
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
    setActiveProjectId(workspace.lastActiveProjectId)
  }

  function openCreateProjectForm() {
    setEditingProjectId(null)
    setProjectFormOpen(true)
  }

  function openEditProjectForm(projectId: string) {
    setEditingProjectId(projectId)
    setProjectFormOpen(true)
  }

  function closeProjectForm() {
    setProjectFormOpen(false)
    setEditingProjectId(null)
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

    const role = roleSequence[tabs.length % roleSequence.length]
    const tabId = `tab-${Date.now()}`

    setTabs((currentTabs) => [
      ...currentTabs,
      {
        id: tabId,
        projectId: activeProject.id,
        roleName: role.name,
        roleColor: role.color,
        title: role.name,
        url: activeProject.baseUrl,
        loading: false,
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

  return (
    <DesktopLayout
      projects={projects}
      activeProject={activeProject}
      tabs={tabs}
      activeTab={activeTab}
      activeTabId={activeTabId}
      workspaceError={workspaceError}
      editingProject={editingProject}
      projectFormOpen={projectFormOpen}
      onCreateProject={openCreateProjectForm}
      onEditProject={openEditProjectForm}
      onDeleteProject={(projectId) => {
        void deleteProject(projectId)
      }}
      onCloseProjectForm={closeProjectForm}
      onSaveProject={saveProject}
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
    />
  )
}

export default App
