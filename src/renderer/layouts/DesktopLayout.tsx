import { Sidebar } from '../components/Sidebar'
import { TabBar } from '../components/TabBar'
import { TopBar } from '../components/TopBar'
import { WebviewArea } from '../components/WebviewArea'
import { ProjectFormPanel, type ProjectDraft } from '../components/ProjectFormPanel'
import {
  RoleProfileFormPanel,
  type RoleProfileDraft,
} from '../components/RoleProfileFormPanel'
import type { BrowserCommand } from '../../shared/browser'
import type {
  AppSettings,
  BrowserTab,
  ProjectSummary,
  RecentUrl,
  RoleProfile,
} from '../../shared/workspace'

type DesktopLayoutProps = {
  projects: ProjectSummary[]
  activeProjectRoleProfiles: RoleProfile[]
  settings: AppSettings
  recentUrls: RecentUrl[]
  activeProject: ProjectSummary | null
  tabs: BrowserTab[]
  activeTab: BrowserTab | null
  activeTabId: string | null
  browserCommand: BrowserCommand | null
  workspaceError: string | null
  editingProject: ProjectSummary | null
  editingRoleProfile: RoleProfile | null
  projectFormOpen: boolean
  roleProfileFormOpen: boolean
  onCreateProject: () => void
  onEditProject: (projectId: string) => void
  onDeleteProject: (projectId: string) => void
  onCloseProjectForm: () => void
  onSaveProject: (draft: ProjectDraft) => Promise<void>
  onCreateRoleProfile: () => void
  onEditRoleProfile: (roleProfileId: string) => void
  onDeleteRoleProfile: (roleProfileId: string) => void
  onOpenRoleProfile: (roleProfileId: string) => void
  onCreateCommonRoles: () => void
  onOpenAllRoles: () => void
  onToggleRestoreTabs: () => void
  onToggleConfirmSessionClear: () => void
  onOpenRecentUrl: (recentUrl: RecentUrl) => void
  onClearProjectSessions: () => void
  onClearAllSessions: () => void
  onCloseRoleProfileForm: () => void
  onSaveRoleProfile: (draft: RoleProfileDraft) => Promise<void>
  onSelectProject: (projectId: string) => void
  onNewTab: () => void
  onSelectTab: (tabId: string) => void
  onCloseTab: (tabId: string) => void
  onCloseActiveTab: () => void
  onDuplicateTab: () => void
  onRenameTab: () => void
  onResetSession: () => void
  onUpdateTab: (tabId: string, updates: Partial<BrowserTab>) => void
  onBack: () => void
  onForward: () => void
  onReload: () => void
  onStop: () => void
  onHome: () => void
  onNavigate: (url: string) => void
  onCopyUrl: () => void
  onOpenExternal: () => void
  onOpenDevTools: () => void
}

export function DesktopLayout({
  projects,
  activeProjectRoleProfiles,
  settings,
  recentUrls,
  activeProject,
  tabs,
  activeTab,
  activeTabId,
  browserCommand,
  workspaceError,
  editingProject,
  editingRoleProfile,
  projectFormOpen,
  roleProfileFormOpen,
  onCreateProject,
  onEditProject,
  onDeleteProject,
  onCloseProjectForm,
  onSaveProject,
  onCreateRoleProfile,
  onEditRoleProfile,
  onDeleteRoleProfile,
  onOpenRoleProfile,
  onCreateCommonRoles,
  onOpenAllRoles,
  onToggleRestoreTabs,
  onToggleConfirmSessionClear,
  onOpenRecentUrl,
  onClearProjectSessions,
  onClearAllSessions,
  onCloseRoleProfileForm,
  onSaveRoleProfile,
  onSelectProject,
  onNewTab,
  onSelectTab,
  onCloseTab,
  onCloseActiveTab,
  onDuplicateTab,
  onRenameTab,
  onResetSession,
  onUpdateTab,
  onBack,
  onForward,
  onReload,
  onStop,
  onHome,
  onNavigate,
  onCopyUrl,
  onOpenExternal,
  onOpenDevTools,
}: DesktopLayoutProps) {
  return (
    <main className="flex h-screen overflow-hidden bg-slate-100 text-slate-900">
      <Sidebar
        projects={projects}
        activeProjectRoleProfiles={activeProjectRoleProfiles}
        settings={settings}
        recentUrls={recentUrls}
        activeProjectId={activeProject?.id ?? null}
        onCreateProject={onCreateProject}
        onEditProject={onEditProject}
        onDeleteProject={onDeleteProject}
        onSelectProject={onSelectProject}
        onCreateRoleProfile={onCreateRoleProfile}
        onEditRoleProfile={onEditRoleProfile}
        onDeleteRoleProfile={onDeleteRoleProfile}
        onOpenRoleProfile={onOpenRoleProfile}
        onCreateCommonRoles={onCreateCommonRoles}
        onOpenAllRoles={onOpenAllRoles}
        onToggleRestoreTabs={onToggleRestoreTabs}
        onToggleConfirmSessionClear={onToggleConfirmSessionClear}
        onOpenRecentUrl={onOpenRecentUrl}
        onClearProjectSessions={onClearProjectSessions}
        onClearAllSessions={onClearAllSessions}
      />

      <section className="flex min-w-0 flex-1 flex-col">
        {workspaceError ? (
          <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {workspaceError}
          </div>
        ) : null}
        <TopBar
          currentUrl={activeTab?.url ?? activeProject?.baseUrl ?? ''}
          canGoBack={activeTab?.canGoBack ?? false}
          canGoForward={activeTab?.canGoForward ?? false}
          isLoading={activeTab?.loading ?? false}
          hasActiveProject={Boolean(activeProject)}
          hasActiveTab={Boolean(activeTab)}
          onNewTab={onNewTab}
          onCloseTab={onCloseActiveTab}
          onDuplicateTab={onDuplicateTab}
          onRenameTab={onRenameTab}
          onResetSession={onResetSession}
          onBack={onBack}
          onForward={onForward}
          onReload={onReload}
          onStop={onStop}
          onHome={onHome}
          onNavigate={onNavigate}
          onCopyUrl={onCopyUrl}
          onOpenExternal={onOpenExternal}
          onOpenDevTools={onOpenDevTools}
        />
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onSelectTab={onSelectTab}
          onCloseTab={onCloseTab}
        />
        <WebviewArea
          activeProject={activeProject}
          tabs={tabs}
          activeTab={activeTab}
          activeTabId={activeTabId}
          roleProfiles={activeProjectRoleProfiles}
          command={browserCommand}
          onCreateProject={onCreateProject}
          onCreateRoleProfile={onCreateRoleProfile}
          onOpenRoleProfile={onOpenRoleProfile}
          onUpdateTab={onUpdateTab}
        />
      </section>

      {projectFormOpen ? (
        <ProjectFormPanel
          key={editingProject?.id ?? 'new-project'}
          project={editingProject}
          onClose={onCloseProjectForm}
          onSubmit={onSaveProject}
        />
      ) : null}

      {roleProfileFormOpen && activeProject ? (
        <RoleProfileFormPanel
          key={editingRoleProfile?.id ?? 'new-role-profile'}
          project={activeProject}
          roleProfile={editingRoleProfile}
          onClose={onCloseRoleProfileForm}
          onSubmit={onSaveRoleProfile}
        />
      ) : null}
    </main>
  )
}
