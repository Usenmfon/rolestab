import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DesktopLayout } from '../layouts/DesktopLayout'
import type { ProjectDraft } from '../components/ProjectFormPanel'
import type { RoleProfileDraft } from '../components/RoleProfileFormPanel'
import type { FirstRunGuideStep } from '../components/FirstRunGuide'
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
import { defaultAppSettings } from '../../shared/workspace'
import type { SessionUsage } from '../../shared/session'
import type { InstalledExtension, RoleExtensionRuntimeState } from '../../shared/extensions'
import type { UpdateStatus } from '../../shared/update'
import { isProductionUrl, normalizeHttpUrl } from '../utils/url'

const commonRoleNames = ['Admin', 'Manager', 'Staff', 'Customer', 'Guest']

type ConfirmationRequest = {
  title: string
  message: string
  confirmLabel: string
}

type ShortcutAction =
  | 'newTab'
  | 'closeTab'
  | 'reload'
  | 'hardReload'
  | 'focusUrlBar'
  | 'openDevTools'
  | 'nextTab'
  | 'previousTab'
  | 'openAllRoles'
  | 'clearActiveRoleSession'

type ShortcutHandlers = Record<ShortcutAction, () => void>

function App() {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [roleProfiles, setRoleProfiles] = useState<RoleProfile[]>([])
  const [settings, setSettings] = useState<AppSettings>(defaultAppSettings)
  const [recentUrls, setRecentUrls] = useState<RecentUrl[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [tabs, setTabs] = useState<BrowserTab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [projectFormOpen, setProjectFormOpen] = useState(false)
  const [roleProfileFormOpen, setRoleProfileFormOpen] = useState(false)
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false)
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [editingRoleProfileId, setEditingRoleProfileId] = useState<string | null>(null)
  const [workspaceError, setWorkspaceError] = useState<string | null>(null)
  const [browserCommand, setBrowserCommand] = useState<BrowserCommand | null>(null)
  const [workspaceLoaded, setWorkspaceLoaded] = useState(false)
  const [sessionUsage, setSessionUsage] = useState<SessionUsage[]>([])
  const [installedExtensions, setInstalledExtensions] = useState<InstalledExtension[]>([])
  const [extensionRuntimeStates, setExtensionRuntimeStates] = useState<RoleExtensionRuntimeState[]>([])
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ state: 'idle' })
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null)
  const [firstRunGuideAutoOpen, setFirstRunGuideAutoOpen] = useState(false)
  const [firstRunGuideManuallyOpen, setFirstRunGuideManuallyOpen] = useState(false)
  const [confirmationRequest, setConfirmationRequest] = useState<ConfirmationRequest | null>(null)
  const confirmationResolverRef = useRef<((confirmed: boolean) => void) | null>(null)
  const urlInputRef = useRef<HTMLInputElement | null>(null)
  const shortcutHandlersRef = useRef<ShortcutHandlers | null>(null)
  const tabOpenedAtRef = useRef<Record<string, number>>({})

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
    () => tabs.find((tab) => tab.id === activeTabId && tab.projectId === activeProjectId) ?? null,
    [activeProjectId, activeTabId, tabs],
  )
  const activeProjectTabs = useMemo(
    () => tabs.filter((tab) => tab.projectId === activeProject?.id),
    [activeProject?.id, tabs],
  )
  const firstRunGuideStep: FirstRunGuideStep = getFirstRunGuideStep(
    projects.length,
    activeProjectRoleProfiles.length,
    activeProjectTabs.length,
  )
  const firstRunGuideOpen =
    (firstRunGuideAutoOpen || firstRunGuideManuallyOpen) &&
    !projectFormOpen &&
    !roleProfileFormOpen &&
    !settingsPanelOpen &&
    !confirmationRequest
  const updateReady = updateStatus.state === 'downloaded'
  const activeRoleExtensions = useMemo(
    () =>
      activeTab
        ? installedExtensions
            .filter(
              (extension) =>
                extension.globallyEnabled && extension.roleSettings[activeTab.roleProfileId]?.enabled,
            )
            .map((extension) => ({
              extension,
              runtimeState: extensionRuntimeStates.find(
                (runtimeState) =>
                  runtimeState.extensionId === extension.id &&
                  runtimeState.roleId === activeTab.roleProfileId,
              ),
            }))
        : [],
    [activeTab, extensionRuntimeStates, installedExtensions],
  )

  const refreshSessionUsage = useCallback(async (nextRoleProfiles = roleProfiles) => {
    const partitions = nextRoleProfiles.map((roleProfile) => roleProfile.sessionPartition)

    try {
      const usage = await window.rolesTab?.sessions.getRoleSessionsUsage(partitions)
      setSessionUsage(usage ?? [])
    } catch (error) {
      reportError('session-usage', 'Unable to read session usage.', error, setWorkspaceError)
    }
  }, [roleProfiles])

  useEffect(() => {
    let mounted = true

    async function loadWorkspace() {
      try {
        const workspace = await window.rolesTab?.workspace.load()

        if (!mounted || !workspace) {
          return
        }

        applyWorkspace(workspace)
        void refreshExtensions()
        setFirstRunGuideAutoOpen(isFirstTimeWorkspace(workspace))

        if (workspace.settings.restoreTabsOnStartup) {
          const restoredTabs = restoreTabsFromWorkspace(workspace)
          await Promise.all(restoredTabs.map((tab) => loadExtensionsForRole(tab.roleProfileId)))
          setTabs(restoredTabs)
          setActiveTabId(
            restoredTabs.findLast((tab) => tab.projectId === workspace.lastActiveProjectId)?.id ?? null,
          )
        }

        setWorkspaceLoaded(true)
      } catch (error) {
        if (mounted) {
          reportError('workspace-load', 'Unable to load workspace.', error, setWorkspaceError)
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
    function handleOnline() {
      window.rolesTab?.analytics.connectivityRestored()
    }

    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  useEffect(() => {
    function handleExtensionsChanged() {
      void refreshExtensions()
    }

    window.addEventListener('rolestab-extensions-changed', handleExtensionsChanged)

    return () => {
      window.removeEventListener('rolestab-extensions-changed', handleExtensionsChanged)
    }
  }, [])

  useEffect(() => {
    function handleError(event: ErrorEvent) {
      void logError('renderer-error', event.message, event.error)
    }

    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      void logError('renderer-unhandled-rejection', 'Unhandled promise rejection.', event.reason)
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  useEffect(() => {
    let active = true

    void window.rolesTab?.app.getUpdateStatus().then((status) => {
      if (active) {
        setUpdateStatus(status)
      }
    })

    const unsubscribe = window.rolesTab?.app.onUpdateStatus((status) => {
      setUpdateStatus(status)
    })

    return () => {
      active = false
      unsubscribe?.()
    }
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)')

    function applyTheme() {
      const darkTheme = settings.theme === 'dark' || (settings.theme === 'system' && systemThemeQuery.matches)

      root.dataset.theme = settings.theme
      root.classList.toggle('theme-dark', darkTheme)
      root.classList.toggle('theme-light', !darkTheme)
      void window.rolesTab?.app.setTitleBarTheme(darkTheme ? 'dark' : 'light')
    }

    applyTheme()

    if (settings.theme !== 'system') {
      return undefined
    }

    systemThemeQuery.addEventListener('change', applyTheme)

    return () => {
      systemThemeQuery.removeEventListener('change', applyTheme)
    }
  }, [settings.theme])

  useEffect(() => {
    if (!workspaceLoaded) {
      return
    }

    queueMicrotask(() => {
      void refreshSessionUsage(roleProfiles)
    })
  }, [refreshSessionUsage, roleProfiles, workspaceLoaded])

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

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (shouldIgnoreShortcut(event)) {
        return
      }

      const matchedShortcut = getShortcutAction(event, settings.keyboardShortcuts)

      if (!matchedShortcut) {
        return
      }

      event.preventDefault()

      shortcutHandlersRef.current?.[matchedShortcut]()
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [settings.keyboardShortcuts])

  function applyWorkspace(workspace: WorkspaceData) {
    setProjects(workspace.projects)
    setRoleProfiles(workspace.roleProfiles)
    setSettings(workspace.settings)
    setRecentUrls(workspace.recentUrls)
    setActiveProjectId(workspace.lastActiveProjectId)
  }

  async function refreshExtensions() {
    try {
      const result = await window.rolesTab?.extensions.list()

      if (result) {
        setInstalledExtensions(result.extensions)
        setExtensionRuntimeStates(result.runtimeStates)
      }
    } catch (error) {
      await logError('extensions-list', 'Unable to load extension settings.', error)
    }
  }

  function restoreTabsFromWorkspace(workspace: WorkspaceData): BrowserTab[] {
    return workspace.recentTabs
      .map((savedTab) => {
        const roleProfile = workspace.roleProfiles.find(
          (currentRole) =>
            currentRole.id === savedTab.roleProfileId && currentRole.projectId === savedTab.projectId,
        )

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
    setSettingsPanelOpen(false)
    setProjectFormOpen(true)
  }

  function openEditProjectForm(projectId: string) {
    setEditingProjectId(projectId)
    setRoleProfileFormOpen(false)
    setSettingsPanelOpen(false)
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
    setSettingsPanelOpen(false)
    setRoleProfileFormOpen(true)
  }

  function openEditRoleProfileForm(roleProfileId: string) {
    setEditingRoleProfileId(roleProfileId)
    setProjectFormOpen(false)
    setSettingsPanelOpen(false)
    setRoleProfileFormOpen(true)
  }

  function closeRoleProfileForm() {
    setRoleProfileFormOpen(false)
    setEditingRoleProfileId(null)
  }

  function openSettingsPanel() {
    setProjectFormOpen(false)
    setRoleProfileFormOpen(false)
    setEditingProjectId(null)
    setEditingRoleProfileId(null)
    setSettingsPanelOpen(true)
  }

  function closeSettingsPanel() {
    setSettingsPanelOpen(false)
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
    window.rolesTab?.analytics[editingRoleProfile ? 'roleUpdated' : 'roleCreated'](roleProfile.id)
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
    const missingTemplates = commonRoleNames.filter(
      (roleName) => !existingNames.has(roleName.toLowerCase()),
    )

    if (missingTemplates.length === 0) {
      setWorkspaceError('Common roles already exist for this project.')
      return
    }

    let workspace: WorkspaceData | undefined

    for (const [templateIndex, roleName] of missingTemplates.entries()) {
      const now = new Date().toISOString()
      const roleProfileId = crypto.randomUUID()
      const sessionPartition =
        (await window.rolesTab?.sessions.createRolePartition(activeProject.id, roleProfileId)) ??
        `persist:${activeProject.id}-${roleProfileId}`
      const roleProfile: RoleProfile = {
        id: roleProfileId,
        projectId: activeProject.id,
        name: roleName,
        color: settings.defaultRoleColors[templateIndex % settings.defaultRoleColors.length] ?? '#2563eb',
        startUrl: activeProject.baseUrl,
        sessionPartition,
        createdAt: now,
        updatedAt: now,
      }

      workspace = await window.rolesTab?.workspace.saveRoleProfile(roleProfile)

      if (!workspace) {
        await persistRoleProfile(roleProfile)
      }

      window.rolesTab?.analytics.roleCreated(roleProfile.id)
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
    window.rolesTab?.analytics.roleDeleted(roleProfileId)
  }

  async function deleteProject(projectId: string) {
    const project = projects.find((currentProject) => currentProject.id === projectId)

    if (!project) {
      return
    }

    const confirmed = window.confirm(
      `Delete "${project.name}"? Open tabs for this project will close, but persisted role sessions are kept until you clear them.`,
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

  async function exportActiveProjectConfig() {
    if (!activeProject) {
      setWorkspaceError('Select a project before exporting.')
      return
    }

    try {
      const result = await window.rolesTab?.workspace.exportProjectConfig(activeProject.id)

      if (!result?.canceled) {
        window.rolesTab?.analytics.featureUsed('export_project_config')
        setWorkspaceError(null)
      }
    } catch (error) {
      reportError('project-export', 'Unable to export this project configuration.', error, setWorkspaceError)
    }
  }

  async function importProjectConfig() {
    try {
      const result = await window.rolesTab?.workspace.importProjectConfig()

      if (!result || result.canceled) {
        return
      }

      if (result.workspace) {
        applyWorkspace(result.workspace)
      }

      if (result.projectId) {
        setTabs((currentTabs) => currentTabs.filter((tab) => tab.projectId !== result.projectId))
        setActiveTabId((currentActiveTabId) => {
          const nextTabs = tabs.filter((tab) => tab.projectId !== result.projectId)
          return nextTabs.some((tab) => tab.id === currentActiveTabId)
            ? currentActiveTabId
            : nextTabs.at(-1)?.id ?? null
        })
      }

      setProjectFormOpen(false)
      setRoleProfileFormOpen(false)
      setSettingsPanelOpen(false)
      setEditingProjectId(null)
      setEditingRoleProfileId(null)
      window.rolesTab?.analytics.featureUsed('import_project_config')
      setWorkspaceError(null)
    } catch (error) {
      reportError('project-import', 'Unable to import the project configuration.', error, setWorkspaceError)
    }
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
      reportError('project-select', 'Unable to save active project.', error, setWorkspaceError)
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
    if (!activeProject) {
      return
    }

    const existingTab = tabs.find(
      (tab) => tab.projectId === activeProject.id && tab.roleProfileId === roleProfileId,
    )

    if (existingTab) {
      trackTabSwitch(activeTabId, existingTab.id)
      setActiveTabId(existingTab.id)
      setWorkspaceError(null)
      return
    }

    const roleProfile = roleProfiles.find(
      (currentRoleProfile) =>
        currentRoleProfile.projectId === activeProject.id && currentRoleProfile.id === roleProfileId,
    )

    if (!roleProfile) {
      return
    }

    void openRoleProfileTab(roleProfile)
  }

  async function openRoleProfileTab(roleProfile: RoleProfile, initialUrl = roleProfile.startUrl, title = roleProfile.name) {
    if (!confirmProductionUrl(initialUrl)) {
      return
    }

    const sessionPartition = await ensureRoleProfileSession(roleProfile)
    await loadExtensionsForRole(roleProfile.id)
    const tabId = `tab-${crypto.randomUUID()}`
    tabOpenedAtRef.current[tabId] = Date.now()

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
        sessionPartition,
      },
    ])
    window.rolesTab?.analytics.tabOpened('web')
    window.rolesTab?.analytics.urlVisited(initialUrl)
    setActiveTabId(tabId)
  }

  function openAllRoles() {
    if (activeProjectRoleProfiles.length === 0) {
      openCreateRoleProfileForm()
      return
    }

    activeProjectRoleProfiles.forEach((roleProfile) => {
      if (!tabs.some((tab) => tab.projectId === roleProfile.projectId && tab.roleProfileId === roleProfile.id)) {
        void openRoleProfileTab(roleProfile)
      }
    })
  }

  async function ensureRoleProfileSession(roleProfile: RoleProfile): Promise<string> {
    if (isValidRolePartition(roleProfile.sessionPartition)) {
      return roleProfile.sessionPartition
    }

    try {
      const sessionPartition =
        (await window.rolesTab?.sessions.createRolePartition(roleProfile.projectId, roleProfile.id)) ??
        `persist:${roleProfile.projectId}-${roleProfile.id}`
      const repairedRoleProfile = {
        ...roleProfile,
        sessionPartition,
        updatedAt: new Date().toISOString(),
      }

      await persistRoleProfile(repairedRoleProfile)
      await logError('session-partition-repair', `Repaired missing session partition for ${roleProfile.name}.`)

      return sessionPartition
    } catch (error) {
      reportError('session-partition-repair', 'Unable to repair the role session partition.', error, setWorkspaceError)
      throw error
    }
  }

  async function loadExtensionsForRole(roleProfileId: string) {
    try {
      const runtimeStates = await window.rolesTab?.extensions.loadForRole(roleProfileId)

      if (runtimeStates) {
        setExtensionRuntimeStates((currentStates) => [
          ...runtimeStates,
          ...currentStates.filter(
            (currentState) =>
              !runtimeStates.some(
                (runtimeState) =>
                  runtimeState.extensionId === currentState.extensionId &&
                  runtimeState.roleId === currentState.roleId,
              ),
          ),
        ])
      }
    } catch (error) {
      await logError('extensions-role-load', 'Unable to load extensions for this role.', error)
    }
  }

  async function toggleRestoreTabs() {
    await saveAppSettings({
      ...settings,
      restoreTabsOnStartup: !settings.restoreTabsOnStartup,
    })
  }

  async function toggleConfirmSessionClear() {
    await saveAppSettings({
      ...settings,
      confirmBeforeClearingSessions: !settings.confirmBeforeClearingSessions,
    })
  }

  async function saveAppSettings(nextSettings: AppSettings) {
    setSettings(nextSettings)

    try {
      const workspace = await window.rolesTab?.workspace.saveSettings(nextSettings)

      if (workspace) {
        applyWorkspace(workspace)
      }
    } catch (error) {
      reportError('settings-save', 'Unable to save settings.', error, setWorkspaceError)
    }
  }

  async function resetAppSettings() {
    await saveAppSettings({
      ...defaultAppSettings,
      defaultProjectId: null,
      hasSeenOnboarding: settings.hasSeenOnboarding,
    })
  }

  function dismissFirstRunGuide() {
    setFirstRunGuideAutoOpen(false)
    setFirstRunGuideManuallyOpen(false)
    void saveAppSettings({
      ...settings,
      hasSeenOnboarding: true,
    })
  }

  function openFirstRunGuide() {
    setSidebarOpen(true)
    setProjectFormOpen(false)
    setRoleProfileFormOpen(false)
    setSettingsPanelOpen(false)
    setConfirmationRequest(null)
    setFirstRunGuideManuallyOpen(true)
  }

  function handleFirstRunGuideAction() {
    if (firstRunGuideStep === 'project') {
      openCreateProjectForm()
      return
    }

    if (firstRunGuideStep === 'role') {
      openCreateRoleProfileForm()
      return
    }

    if (firstRunGuideStep === 'open') {
      const firstRoleProfile = activeProjectRoleProfiles[0]

      if (firstRoleProfile) {
        openRoleTab(firstRoleProfile.id)
      }
      return
    }

    dismissFirstRunGuide()
  }

  async function shouldClearSessions(request: ConfirmationRequest): Promise<boolean> {
    if (!settings.confirmBeforeClearingSessions) {
      return true
    }

    return new Promise((resolve) => {
      confirmationResolverRef.current = resolve
      setConfirmationRequest(request)
    })
  }

  function resolveConfirmation(confirmed: boolean) {
    confirmationResolverRef.current?.(confirmed)
    confirmationResolverRef.current = null
    setConfirmationRequest(null)
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

    void openRoleProfileTab(roleProfile, recentUrl.url, recentUrl.title || roleProfile.name)
    setWorkspaceError(null)
  }

  function duplicateActiveTab() {
    if (!activeTab) {
      return
    }

    const roleProfile = roleProfiles.find((currentRoleProfile) => currentRoleProfile.id === activeTab.roleProfileId)

    if (roleProfile) {
      void openRoleProfileTab(roleProfile, activeTab.url, `${activeTab.roleName} Copy`)
    }
  }

  function renameActiveTab() {
    if (!activeTab) {
      return
    }

    setActiveTabId(activeTab.id)
    setRenamingTabId(activeTab.id)
  }

  function renameTab(tabId: string, title: string) {
    const nextTitle = title.trim()

    if (nextTitle) {
      updateTab(tabId, { title: nextTitle })
    }

    setRenamingTabId(null)
  }

  async function resetActiveRoleSession() {
    if (!activeTab) {
      return
    }

    const confirmed = await shouldClearSessions({
      title: `Reset ${activeTab.roleName} session`,
      message:
        'Cookies, cache, localStorage, IndexedDB, cache storage, and service worker data for this role partition will be cleared.',
      confirmLabel: 'Reset Session',
    })

    if (!confirmed) {
      return
    }

    try {
      await window.rolesTab?.sessions.clearRoleSession(activeTab.sessionPartition)
      await refreshSessionUsage()
      setTabs((currentTabs) =>
        currentTabs.map((tab) =>
          tab.roleProfileId === activeTab.roleProfileId
            ? {
                ...tab,
                loadError: undefined,
                loadErrorDetails: undefined,
                loading: tab.id === activeTab.id,
              }
            : tab,
        ),
      )
      sendBrowserCommand({ type: 'reload' })
      setWorkspaceError(null)
      window.rolesTab?.analytics.featureUsed('clear_role_session')
    } catch (error) {
      reportError('session-reset', 'Unable to reset the active role session.', error, setWorkspaceError)
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

    const confirmed = await shouldClearSessions({
      title: `Clear ${activeProject.name} sessions`,
      message: `Cookies, cache, localStorage, IndexedDB, cache storage, and service worker data for ${projectRoleProfiles.length} role partition(s) will be cleared.`,
      confirmLabel: 'Clear Sessions',
    })

    if (!confirmed) {
      return
    }

    try {
      const partitions = projectRoleProfiles.map((roleProfile) => roleProfile.sessionPartition)
      await window.rolesTab?.sessions.clearRoleSessions(partitions)
      await refreshSessionUsage()
      const remainingTabs = tabs.filter((tab) => tab.projectId !== activeProject.id)

      setTabs(remainingTabs)
      setActiveTabId((currentActiveTabId) => {
        return remainingTabs.some((tab) => tab.id === currentActiveTabId)
          ? currentActiveTabId
          : remainingTabs.at(-1)?.id ?? null
      })
      setWorkspaceError(null)
      window.rolesTab?.analytics.featureUsed('clear_project_sessions')
    } catch (error) {
      reportError('session-clear-project', 'Unable to clear project sessions.', error, setWorkspaceError)
    }
  }

  async function clearAllSessions() {
    const partitions = roleProfiles.map((roleProfile) => roleProfile.sessionPartition)

    if (partitions.length === 0) {
      setWorkspaceError('There are no role sessions to clear.')
      return
    }

    const confirmed = await shouldClearSessions({
      title: 'Clear all role sessions',
      message: `Cookies, cache, localStorage, IndexedDB, cache storage, and service worker data for ${partitions.length} role partition(s) will be cleared.`,
      confirmLabel: 'Clear All Sessions',
    })

    if (!confirmed) {
      return
    }

    try {
      await window.rolesTab?.sessions.clearRoleSessions(partitions)
      await refreshSessionUsage()
      setTabs([])
      setActiveTabId(null)
      setWorkspaceError(null)
      window.rolesTab?.analytics.featureUsed('clear_all_sessions')
    } catch (error) {
      reportError('session-clear-all', 'Unable to clear all sessions.', error, setWorkspaceError)
    }
  }

  function closeTab(tabId: string) {
    const closingTab = tabs.find((tab) => tab.id === tabId)
    const openedAt = tabOpenedAtRef.current[tabId]

    if (closingTab) {
      window.rolesTab?.analytics.tabClosed(
        'web',
        typeof openedAt === 'number' ? (Date.now() - openedAt) / 1000 : undefined,
      )
    }

    delete tabOpenedAtRef.current[tabId]

    setTabs((currentTabs) => {
      const nextTabs = currentTabs.filter((tab) => tab.id !== tabId)

      if (activeTabId === tabId) {
        setActiveTabId(nextTabs.at(-1)?.id ?? null)
      }

      return nextTabs
    })
    setRenamingTabId((currentRenamingTabId) => (currentRenamingTabId === tabId ? null : currentRenamingTabId))
  }

  function selectAdjacentTab(direction: 1 | -1) {
    if (tabs.length === 0) {
      return
    }

    const currentIndex = Math.max(
      0,
      tabs.findIndex((tab) => tab.id === activeTabId),
    )
    const nextIndex = (currentIndex + direction + tabs.length) % tabs.length
    selectTab(tabs[nextIndex]?.id ?? null)
  }

  function focusUrlBar() {
    urlInputRef.current?.focus()
    urlInputRef.current?.select()
  }

  function updateTab(tabId: string, updates: Partial<BrowserTab>) {
    setTabs((currentTabs) =>
      currentTabs.map((tab) => (tab.id === tabId ? { ...tab, ...updates } : tab)),
    )
  }

  function sendBrowserCommand(command: BrowserCommandInput) {
    if (command.type === 'open-devtools' || command.type === 'inspect-element') {
      window.rolesTab?.analytics.featureUsed('open_devtools')
    }

    setBrowserCommand({ ...command, id: Date.now() } as BrowserCommand)
  }

  function selectTab(tabId: string | null) {
    trackTabSwitch(activeTabId, tabId)
    setActiveTabId(tabId)
  }

  function trackTabSwitch(fromTabId: string | null, toTabId: string | null) {
    if (!fromTabId || !toTabId || fromTabId === toTabId) {
      return
    }

    window.rolesTab?.analytics.tabSwitched('web', 'web')
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
      updateTab(activeTab.id, { consoleErrors: [], loadError: undefined, loadErrorDetails: undefined })
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
    updateTab(activeTab.id, {
      consoleErrors: [],
      loadError: undefined,
      loadErrorDetails: undefined,
      loading: true,
    })
  }

  function homeActiveTab() {
    if (!activeTab) {
      return
    }

    const roleProfile = roleProfiles.find((currentRoleProfile) => currentRoleProfile.id === activeTab.roleProfileId)
    sendBrowserCommand({
      type: 'home',
      url: settings.defaultHomepage || roleProfile?.startUrl || activeProject?.baseUrl || activeTab.url,
    })
  }

  async function copyActiveUrl() {
    if (!activeTab) {
      return
    }

    try {
      if (window.rolesTab?.app.copyText) {
        await window.rolesTab.app.copyText(activeTab.url)
      } else {
        await navigator.clipboard.writeText(activeTab.url)
      }
      window.rolesTab?.analytics.featureUsed('copy_active_url')
      setWorkspaceError(null)
    } catch (error) {
      reportError('clipboard-copy', 'Unable to copy the current URL.', error, setWorkspaceError)
      throw error
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
      reportError('open-external', 'Unable to open the current URL externally.', error, setWorkspaceError)
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

  shortcutHandlersRef.current = {
    newTab: createRoleTab,
    closeTab: () => {
      if (activeTabId) {
        closeTab(activeTabId)
      }
    },
    reload: () => sendBrowserCommand({ type: 'reload' }),
    hardReload: () => sendBrowserCommand({ type: 'hard-reload' }),
    focusUrlBar,
    openDevTools: () => sendBrowserCommand({ type: 'open-devtools' }),
    nextTab: () => selectAdjacentTab(1),
    previousTab: () => selectAdjacentTab(-1),
    openAllRoles,
    clearActiveRoleSession: () => {
      void resetActiveRoleSession()
    },
  }

  return (
    <DesktopLayout
      projects={projects}
      activeProjectRoleProfiles={activeProjectRoleProfiles}
      settings={settings}
      recentUrls={recentUrls}
      sessionUsage={sessionUsage}
      updateReady={updateReady}
      activeProject={activeProject}
      tabs={activeProjectTabs}
      activeTab={activeTab}
      activeTabId={activeTabId}
      renamingTabId={renamingTabId}
      browserCommand={browserCommand}
      activeRoleExtensions={activeRoleExtensions}
      sidebarOpen={sidebarOpen}
      workspaceError={workspaceError}
      onClearWorkspaceError={() => setWorkspaceError(null)}
      onToggleSidebar={() => setSidebarOpen((currentSidebarOpen) => !currentSidebarOpen)}
      editingProject={editingProject}
      editingRoleProfile={editingRoleProfile}
      projectFormOpen={projectFormOpen}
      roleProfileFormOpen={roleProfileFormOpen}
      settingsPanelOpen={settingsPanelOpen}
      firstRunGuideOpen={firstRunGuideOpen}
      firstRunGuideStep={firstRunGuideStep}
      confirmationRequest={confirmationRequest}
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
      onExportProjectConfig={() => {
        void exportActiveProjectConfig()
      }}
      onImportProjectConfig={() => {
        void importProjectConfig()
      }}
      onOpenSettings={openSettingsPanel}
      onOpenFirstRunGuide={openFirstRunGuide}
      onCloseSettings={closeSettingsPanel}
      onSaveSettings={saveAppSettings}
      onResetSettings={resetAppSettings}
      onFirstRunGuideAction={handleFirstRunGuideAction}
      onDismissFirstRunGuide={dismissFirstRunGuide}
      onCloseRoleProfileForm={closeRoleProfileForm}
      onSaveRoleProfile={saveRoleProfile}
      onSelectProject={(projectId) => {
        void selectProject(projectId)
      }}
      onNewTab={createRoleTab}
      onSelectTab={selectTab}
      onCloseTab={closeTab}
      onStartRenameTab={(tabId) => {
        selectTab(tabId)
        setRenamingTabId(tabId)
      }}
      onCloseActiveTab={() => {
        if (activeTabId) {
          closeTab(activeTabId)
        }
      }}
      onDuplicateTab={duplicateActiveTab}
      onRenameTab={renameActiveTab}
      onRenameTabTitle={renameTab}
      onCancelRenameTab={() => setRenamingTabId(null)}
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
      onCopyUrl={copyActiveUrl}
      onOpenExternal={() => {
        void openActiveUrlExternal()
      }}
      onOpenDevTools={() => sendBrowserCommand({ type: 'open-devtools' })}
      onInspectElement={() => sendBrowserCommand({ type: 'inspect-element' })}
      onConfirmAction={() => resolveConfirmation(true)}
      onCancelAction={() => resolveConfirmation(false)}
      urlInputRef={urlInputRef}
    />
  )
}

export default App

function getFirstRunGuideStep(
  projectCount: number,
  roleProfileCount: number,
  activeProjectTabCount: number,
): FirstRunGuideStep {
  if (projectCount === 0) {
    return 'project'
  }

  if (roleProfileCount === 0) {
    return 'role'
  }

  if (activeProjectTabCount === 0) {
    return 'open'
  }

  return 'restore'
}

function isFirstTimeWorkspace(workspace: WorkspaceData): boolean {
  return (
    !workspace.settings.hasSeenOnboarding &&
    workspace.projects.length === 0 &&
    workspace.roleProfiles.length === 0 &&
    workspace.recentTabs.length === 0 &&
    workspace.recentUrls.length === 0
  )
}

function shouldIgnoreShortcut(event: KeyboardEvent): boolean {
  if (event.defaultPrevented || event.isComposing) {
    return true
  }

  const target = event.target

  if (!(target instanceof HTMLElement)) {
    return false
  }

  const editable =
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable

  return editable && normalizeKey(event.key) !== 'escape'
}

function getShortcutAction(
  event: KeyboardEvent,
  shortcuts: Record<string, string>,
): ShortcutAction | null {
  const entries: Array<[ShortcutAction, string | undefined]> = [
    ['newTab', shortcuts.newTab],
    ['closeTab', shortcuts.closeTab],
    ['reload', shortcuts.reload],
    ['hardReload', shortcuts.hardReload ?? 'Ctrl+Shift+R'],
    ['focusUrlBar', shortcuts.focusUrlBar],
    ['openDevTools', shortcuts.openDevTools],
    ['nextTab', shortcuts.nextTab],
    ['previousTab', shortcuts.previousTab],
    ['openAllRoles', shortcuts.openAllRoles],
    ['clearActiveRoleSession', shortcuts.clearActiveRoleSession],
  ]

  return entries.find(([, shortcut]) => shortcut && shortcutMatchesEvent(shortcut, event))?.[0] ?? null
}

function shortcutMatchesEvent(shortcut: string, event: KeyboardEvent): boolean {
  const parsedShortcut = parseShortcut(shortcut)

  if (!parsedShortcut) {
    return false
  }

  return (
    parsedShortcut.key === normalizeKey(event.key) &&
    parsedShortcut.ctrl === event.ctrlKey &&
    parsedShortcut.alt === event.altKey &&
    parsedShortcut.shift === event.shiftKey &&
    parsedShortcut.meta === event.metaKey
  )
}

function parseShortcut(shortcut: string):
  | {
      key: string
      ctrl: boolean
      alt: boolean
      shift: boolean
      meta: boolean
    }
  | null {
  const parts = shortcut
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length === 0) {
    return null
  }

  const key = normalizeKey(parts.at(-1) ?? '')

  return {
    key,
    ctrl: parts.slice(0, -1).some((part) => normalizeKey(part) === 'control'),
    alt: parts.slice(0, -1).some((part) => normalizeKey(part) === 'alt'),
    shift: parts.slice(0, -1).some((part) => normalizeKey(part) === 'shift'),
    meta: parts.slice(0, -1).some((part) => normalizeKey(part) === 'meta'),
  }
}

function normalizeKey(key: string): string {
  const normalized = key.trim().toLowerCase()
  const aliases: Record<string, string> = {
    ctrl: 'control',
    control: 'control',
    cmd: 'meta',
    command: 'meta',
    win: 'meta',
    windows: 'meta',
    option: 'alt',
    esc: 'escape',
    space: ' ',
  }

  return aliases[normalized] ?? normalized
}

function isValidRolePartition(partition: string): boolean {
  return /^persist:[\w-]+-[\w-]+$/.test(partition)
}

function reportError(
  scope: string,
  fallbackMessage: string,
  error: unknown,
  setWorkspaceError: (message: string) => void,
) {
  const message = error instanceof Error ? error.message : fallbackMessage

  setWorkspaceError(message)
  void logError(scope, message, error)
}

async function logError(scope: string, message: string, error?: unknown) {
  try {
    await window.rolesTab?.app.logError({
      scope,
      message,
      stack: error instanceof Error ? error.stack : undefined,
      details:
        error && !(error instanceof Error)
          ? typeof error === 'string'
            ? error
            : JSON.stringify(error)
          : undefined,
    })
  } catch {
    // Logging must never interrupt the user workflow.
  }
}
