import { useEffect, useMemo, useState } from 'react'
import { DesktopLayout } from '../layouts/DesktopLayout'
import type { ProjectDraft } from '../components/ProjectFormPanel'
import type { RoleProfileDraft } from '../components/RoleProfileFormPanel'
import type { BrowserCommand, BrowserCommandInput } from '../../shared/browser'
import type {
  AppSettings,
  BrowserTab,
  ProjectSummary,
  RecentUrl,
  RoleProfile,
  SavedBrowserTab,
  WorkspaceData,
} from '../../shared/workspace'
import { isProductionUrl, normalizeHttpUrl } from '../utils/url'

const commonRoleTemplates = [
  { name: 'Admin', color: '#2563eb' },
  { name: 'Manager', color: '#059669' },
  { name: 'Staff', color: '#e11d48' },
  { name: 'Customer', color: '#f59e0b' },
  { name: 'Guest', color: '#64748b' },
]

const defaultSettings: AppSettings = {
  restoreTabsOnStartup: true,
  confirmBeforeClearingSessions: true,
  defaultHomepage: '',
}

function App() {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [roleProfiles, setRoleProfiles] = useState<RoleProfile[]>([])
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)
  const [recentUrls, setRecentUrls] = useState<RecentUrl[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [tabs, setTabs] = useState<BrowserTab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [projectFormOpen, setProjectFormOpen] = useState(false)
  const [roleProfileFormOpen, setRoleProfileFormOpen] = useState(false)
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [editingRoleProfileId, setEditingRoleProfileId] = useState<string | null>(null)
  const [workspaceError, setWorkspaceError] = useState<string | null>(null)
  const [browserCommand, setBrowserCommand] = useState<BrowserCommand | null>(null)
  const [workspaceLoaded, setWorkspaceLoaded] = useState(false)

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

        if (workspace.settings.restoreTabsOnStartup) {
          const restoredTabs = restoreTabsFromWorkspace(workspace)
          setTabs(restoredTabs)
          setActiveTabId(restoredTabs.at(-1)?.id ?? null)
        }

        setWorkspaceLoaded(true)
      } catch (error) {
        if (mounted) {
          setWorkspaceError(error instanceof Error ? error.message : 'Unable to load workspace.')
          setWorkspaceLoaded(true)
        }
      }
    }

    void loadWorkspace()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!workspaceLoaded) {
      return
    }

    const recentTabs: SavedBrowserTab[] = tabs.map((tab) => ({
      id: tab.id,
      projectId: tab.projectId,
      roleProfileId: tab.roleProfileId,
      title: tab.title,
      url: tab.url,
      sessionPartition: tab.sessionPartition,
      savedAt: new Date().toISOString(),
    }))

    void window.rolesTab?.workspace.saveRecentTabs(recentTabs)
  }, [tabs, workspaceLoaded])

  useEffect(() => {
    const currentActiveTab = activeTab

    if (!workspaceLoaded || !currentActiveTab || currentActiveTab.loading || currentActiveTab.loadError) {
      return
    }

    const recentUrl: RecentUrl = {
      id: crypto.randomUUID(),
      url: currentActiveTab.url,
      title: currentActiveTab.title,
      projectId: currentActiveTab.projectId,
      roleProfileId: currentActiveTab.roleProfileId,
      visitedAt: new Date().toISOString(),
    }

    async function persistRecentUrl() {
      try {
        const workspace = await window.rolesTab?.workspace.saveRecentUrl(recentUrl)

        if (workspace) {
          setRecentUrls(workspace.recentUrls)
        }
      } catch {
        setRecentUrls((currentRecentUrls) => [
          recentUrl,
          ...currentRecentUrls.filter((currentRecentUrl) => currentRecentUrl.url !== recentUrl.url),
        ].slice(0, 50))
      }
    }

    void persistRecentUrl()
  }, [activeTab, workspaceLoaded])

  function applyWorkspace(workspace: WorkspaceData) {
    setProjects(workspace.projects)
    setRoleProfiles(workspace.roleProfiles)
    setSettings(workspace.settings)
    setRecentUrls(workspace.recentUrls)
    setActiveProjectId(workspace.lastActiveProjectId)
  }

  function restoreTabsFromWorkspace(workspace: WorkspaceData): BrowserTab[] {
    return workspace.recentTabs
      .map((savedTab) => {
        const roleProfile = workspace.roleProfiles.find((currentRole) => currentRole.id === savedTab.roleProfileId)

        if (!roleProfile) {
          return null
        }

        const restoredTab: BrowserTab = {
          id: `tab-${crypto.randomUUID()}`,
          projectId: savedTab.projectId,
          roleProfileId: savedTab.roleProfileId,
          roleName: roleProfile.name,
          roleColor: roleProfile.color,
          title: savedTab.title,
          url: savedTab.url,
          loading: false,
          sessionPartition: savedTab.sessionPartition,
        }

        return restoredTab
      })
      .filter((tab): tab is BrowserTab => Boolean(tab))
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

  async function persistRoleProfile(roleProfile: RoleProfile) {
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
  }

  async function createCommonRoles() {
    if (!activeProject) {
      openCreateProjectForm()
      return
    }

    const existingNames = new Set(
      activeProjectRoleProfiles.map((roleProfile) => roleProfile.name.trim().toLowerCase()),
    )
    const missingTemplates = commonRoleTemplates.filter(
      (template) => !existingNames.has(template.name.toLowerCase()),
    )

    if (missingTemplates.length === 0) {
      setWorkspaceError('Common roles already exist for this project.')
      return
    }

    let workspace: WorkspaceData | undefined

    for (const template of missingTemplates) {
      const now = new Date().toISOString()
      const roleProfileId = crypto.randomUUID()
      const sessionPartition =
        (await window.rolesTab?.sessions.createRolePartition(activeProject.id, roleProfileId)) ??
        `persist:${activeProject.id}-${roleProfileId}`
      const roleProfile: RoleProfile = {
        id: roleProfileId,
        projectId: activeProject.id,
        name: template.name,
        color: template.color,
        startUrl: activeProject.baseUrl,
        sessionPartition,
        createdAt: now,
        updatedAt: now,
      }

      workspace = await window.rolesTab?.workspace.saveRoleProfile(roleProfile)

      if (!workspace) {
        await persistRoleProfile(roleProfile)
      }
    }

    if (workspace) {
      applyWorkspace(workspace)
    }

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

    openRoleProfileTab(roleProfile)
  }

  function openRoleProfileTab(roleProfile: RoleProfile, initialUrl = roleProfile.startUrl, title = roleProfile.name) {
    if (!confirmProductionUrl(initialUrl)) {
      return
    }

    const tabId = `tab-${crypto.randomUUID()}`

    setTabs((currentTabs) => [
      ...currentTabs,
      {
        id: tabId,
        projectId: roleProfile.projectId,
        roleProfileId: roleProfile.id,
        roleName: roleProfile.name,
        roleColor: roleProfile.color,
        title,
        url: initialUrl,
        loading: false,
        sessionPartition: roleProfile.sessionPartition,
      },
    ])
    setActiveTabId(tabId)
  }

  function openAllRoles() {
    if (activeProjectRoleProfiles.length === 0) {
      openCreateRoleProfileForm()
      return
    }

    activeProjectRoleProfiles.forEach((roleProfile) => openRoleProfileTab(roleProfile))
  }

  async function toggleRestoreTabs() {
    const nextSettings = {
      ...settings,
      restoreTabsOnStartup: !settings.restoreTabsOnStartup,
    }

    setSettings(nextSettings)

    try {
      const workspace = await window.rolesTab?.workspace.saveSettings(nextSettings)

      if (workspace) {
        applyWorkspace(workspace)
      }
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : 'Unable to save settings.')
    }
  }

  async function toggleConfirmSessionClear() {
    const nextSettings = {
      ...settings,
      confirmBeforeClearingSessions: !settings.confirmBeforeClearingSessions,
    }

    setSettings(nextSettings)

    try {
      const workspace = await window.rolesTab?.workspace.saveSettings(nextSettings)

      if (workspace) {
        applyWorkspace(workspace)
      }
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : 'Unable to save settings.')
    }
  }

  function shouldClearSessions(message: string): boolean {
    return !settings.confirmBeforeClearingSessions || window.confirm(message)
  }

  function openRecentUrl(recentUrl: RecentUrl) {
    const roleProfile =
      roleProfiles.find((currentRole) => currentRole.id === recentUrl.roleProfileId) ??
      activeProjectRoleProfiles[0] ??
      roleProfiles.find((currentRole) => currentRole.projectId === recentUrl.projectId)

    if (!roleProfile) {
      setWorkspaceError('Create a role profile before reopening recent URLs.')
      return
    }

    if (activeProjectId !== roleProfile.projectId) {
      setActiveProjectId(roleProfile.projectId)
    }

    openRoleProfileTab(roleProfile, recentUrl.url, recentUrl.title || roleProfile.name)
    setWorkspaceError(null)
  }

  function duplicateActiveTab() {
    if (!activeTab) {
      return
    }

    const roleProfile = roleProfiles.find((currentRoleProfile) => currentRoleProfile.id === activeTab.roleProfileId)

    if (roleProfile) {
      openRoleProfileTab(roleProfile, activeTab.url, `${activeTab.roleName} Copy`)
    }
  }

  function renameActiveTab() {
    if (!activeTab) {
      return
    }

    const nextTitle = window.prompt('Rename tab', activeTab.title)?.trim()

    if (nextTitle) {
      updateTab(activeTab.id, { title: nextTitle })
    }
  }

  async function resetActiveRoleSession() {
    if (!activeTab) {
      return
    }

    if (
      !shouldClearSessions(
        `Reset the persisted browser session for ${activeTab.roleName}? Cookies, cache, localStorage, and IndexedDB for this role partition will be cleared.`,
      )
    ) {
      return
    }

    try {
      await window.rolesTab?.sessions.clearRoleSession(activeTab.sessionPartition)
      setTabs((currentTabs) =>
        currentTabs.map((tab) =>
          tab.roleProfileId === activeTab.roleProfileId
            ? { ...tab, loadError: undefined, loading: tab.id === activeTab.id }
            : tab,
        ),
      )
      sendBrowserCommand({ type: 'reload' })
      setWorkspaceError(null)
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : 'Unable to reset the active role session.')
    }
  }

  async function clearProjectSessions() {
    if (!activeProject) {
      return
    }

    const projectRoleProfiles = roleProfiles.filter((roleProfile) => roleProfile.projectId === activeProject.id)

    if (projectRoleProfiles.length === 0) {
      setWorkspaceError('This project has no role sessions to clear.')
      return
    }

    if (
      !shouldClearSessions(
        `Clear sessions for all roles in ${activeProject.name}? Cookies, cache, localStorage, and IndexedDB for ${projectRoleProfiles.length} role partition(s) will be cleared.`,
      )
    ) {
      return
    }

    try {
      const partitions = projectRoleProfiles.map((roleProfile) => roleProfile.sessionPartition)
      await window.rolesTab?.sessions.clearRoleSessions(partitions)
      const remainingTabs = tabs.filter((tab) => tab.projectId !== activeProject.id)

      setTabs(remainingTabs)
      setActiveTabId((currentActiveTabId) => {
        return remainingTabs.some((tab) => tab.id === currentActiveTabId)
          ? currentActiveTabId
          : remainingTabs.at(-1)?.id ?? null
      })
      setWorkspaceError(null)
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : 'Unable to clear project sessions.')
    }
  }

  async function clearAllSessions() {
    const partitions = roleProfiles.map((roleProfile) => roleProfile.sessionPartition)

    if (partitions.length === 0) {
      setWorkspaceError('There are no role sessions to clear.')
      return
    }

    if (
      !shouldClearSessions(
        `Clear all app role sessions? Cookies, cache, localStorage, and IndexedDB for ${partitions.length} role partition(s) will be cleared.`,
      )
    ) {
      return
    }

    try {
      await window.rolesTab?.sessions.clearRoleSessions(partitions)
      setTabs([])
      setActiveTabId(null)
      setWorkspaceError(null)
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : 'Unable to clear all sessions.')
    }
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

  function sendBrowserCommand(command: BrowserCommandInput) {
    setBrowserCommand({ ...command, id: Date.now() } as BrowserCommand)
  }

  function navigateActiveTab(url: string) {
    if (!activeTab) {
      return
    }

    try {
      const normalizedUrl = normalizeHttpUrl(url)

      if (!confirmProductionUrl(normalizedUrl)) {
        return
      }

      sendBrowserCommand({ type: 'navigate', url: normalizedUrl })
      updateTab(activeTab.id, { consoleErrors: [], loadError: undefined })
      setWorkspaceError(null)
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : 'Enter a valid http(s) URL.')
    }
  }

  function retryActiveTab() {
    if (!activeTab) {
      return
    }

    sendBrowserCommand({ type: 'navigate', url: activeTab.url })
    updateTab(activeTab.id, { consoleErrors: [], loadError: undefined, loading: true })
  }

  function homeActiveTab() {
    if (!activeTab) {
      return
    }

    const roleProfile = roleProfiles.find((currentRoleProfile) => currentRoleProfile.id === activeTab.roleProfileId)
    sendBrowserCommand({ type: 'home', url: roleProfile?.startUrl ?? activeProject?.baseUrl ?? activeTab.url })
  }

  async function copyActiveUrl() {
    if (!activeTab) {
      return
    }

    try {
      await navigator.clipboard.writeText(activeTab.url)
      setWorkspaceError(null)
    } catch {
      setWorkspaceError('Unable to copy the current URL.')
    }
  }

  async function openActiveUrlExternal() {
    if (!activeTab) {
      return
    }

    try {
      if (!window.confirm(`Open this URL in your external browser?\n\n${activeTab.url}`)) {
        return
      }

      await window.rolesTab?.app.openExternal(activeTab.url)
      setWorkspaceError(null)
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : 'Unable to open the current URL externally.')
    }
  }

  function confirmProductionUrl(url: string): boolean {
    return (
      !isProductionUrl(url) ||
      window.confirm(
        `This looks like a production URL:\n\n${url}\n\nContinue only if you intend to test against production.`,
      )
    )
  }

  return (
    <DesktopLayout
      projects={projects}
      activeProjectRoleProfiles={activeProjectRoleProfiles}
      settings={settings}
      recentUrls={recentUrls}
      activeProject={activeProject}
      tabs={tabs}
      activeTab={activeTab}
      activeTabId={activeTabId}
      browserCommand={browserCommand}
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
      onCreateCommonRoles={() => {
        void createCommonRoles()
      }}
      onOpenAllRoles={openAllRoles}
      onToggleRestoreTabs={() => {
        void toggleRestoreTabs()
      }}
      onToggleConfirmSessionClear={() => {
        void toggleConfirmSessionClear()
      }}
      onOpenRecentUrl={openRecentUrl}
      onClearProjectSessions={() => {
        void clearProjectSessions()
      }}
      onClearAllSessions={() => {
        void clearAllSessions()
      }}
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
      onDuplicateTab={duplicateActiveTab}
      onRenameTab={renameActiveTab}
      onResetSession={() => {
        void resetActiveRoleSession()
      }}
      onUpdateTab={updateTab}
      onBack={() => sendBrowserCommand({ type: 'back' })}
      onForward={() => sendBrowserCommand({ type: 'forward' })}
      onReload={() => sendBrowserCommand({ type: 'reload' })}
      onStop={() => sendBrowserCommand({ type: 'stop' })}
      onHome={homeActiveTab}
      onNavigate={navigateActiveTab}
      onRetryActiveTab={retryActiveTab}
      onCopyUrl={() => {
        void copyActiveUrl()
      }}
      onOpenExternal={() => {
        void openActiveUrlExternal()
      }}
      onOpenDevTools={() => sendBrowserCommand({ type: 'open-devtools' })}
    />
  )
}

export default App
