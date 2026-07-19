import { Sidebar } from '../components/Sidebar'
import { TabBar } from '../components/TabBar'
import { TopBar } from '../components/TopBar'
import { ToastViewport, type ToastMessage } from '../components/ToastViewport'
import { WebviewArea } from '../components/WebviewArea'
import { CommandPalette } from '../components/CommandPalette'
import { ConfirmationDialog, type ConfirmationRequest } from '../components/ConfirmationDialog'
import { FirstRunGuide, type FirstRunGuideStep } from '../components/FirstRunGuide'
import { ProjectFormPanel, type ProjectDraft } from '../components/ProjectFormPanel'
import { SettingsPanel } from '../components/SettingsPanel'
import { RoleProfileFormPanel, type RoleProfileDraft } from '../components/RoleProfileFormPanel'
import type { BrowserCommand } from '../../shared/browser'
import type { RefObject } from 'react'
import type { AppSettings, BrowserTab, ProjectSummary, RecentUrl, RoleProfile } from '../../shared/workspace'
import type { SessionUsage } from '../../shared/session'
import type { InstalledExtension, RoleExtensionRuntimeState } from '../../shared/extensions'

const privacyPolicyUrl = 'https://rolestab.app/privacy'

type DesktopLayoutProps = {
  projects: ProjectSummary[]
  activeProjectRoleProfiles: RoleProfile[]
  settings: AppSettings
  recentUrls: RecentUrl[]
  sessionUsage: SessionUsage[]
  updateReady: boolean
  activeProject: ProjectSummary | null
  tabs: BrowserTab[]
  activeTab: BrowserTab | null
  activeTabId: string | null
  splitTab: BrowserTab | null
  splitTabId: string | null
  renamingTabId: string | null
  browserCommand: BrowserCommand | null
  activeRoleExtensions: Array<{
    extension: InstalledExtension
    runtimeState?: RoleExtensionRuntimeState
  }>
  sidebarOpen: boolean
  workspaceError: string | null
  toasts: ToastMessage[]
  onClearWorkspaceError: () => void
  onDismissToast: (toastId: string) => void
  onToggleSidebar: () => void
  editingProject: ProjectSummary | null
  editingRoleProfile: RoleProfile | null
  projectFormOpen: boolean
  roleProfileFormOpen: boolean
  settingsPanelOpen: boolean
  firstRunGuideOpen: boolean
  commandPaletteOpen: boolean
  firstRunGuideStep: FirstRunGuideStep
  confirmationRequest: ConfirmationRequest | null
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
  onExportProjectConfig: () => void
  onImportProjectConfig: () => void
  onOpenSettings: () => void
  onOpenFirstRunGuide: () => void
  onOpenCommandPalette: () => void
  onCloseCommandPalette: () => void
  onCloseSettings: () => void
  onSaveSettings: (settings: AppSettings) => Promise<void>
  onResetSettings: () => Promise<void>
  onRequestConfirmation: (request: ConfirmationRequest) => Promise<boolean>
  onFirstRunGuideAction: () => void
  onFirstRunGuideAnalyticsChoice: (enabled: boolean) => void
  onDismissFirstRunGuide: () => void
  onCloseRoleProfileForm: () => void
  onSaveRoleProfile: (draft: RoleProfileDraft) => Promise<void>
  onSelectProject: (projectId: string) => void
  onSelectTab: (tabId: string) => void
  onCloseTab: (tabId: string) => void
  onStartRenameTab: (tabId: string) => void
  onCloseActiveTab: () => void
  onDuplicateTab: () => void
  onToggleSplitView: () => void
  onToggleSplitTab: (tabId: string) => void
  onRenameTab: () => void
  onRenameTabTitle: (tabId: string, title: string) => void
  onCancelRenameTab: () => void
  onResetSession: () => void
  onUpdateTab: (tabId: string, updates: Partial<BrowserTab>) => void
  onBack: () => void
  onForward: () => void
  onReload: () => void
  onStop: () => void
  onHome: () => void
  onNavigate: (url: string) => void
  onRetryActiveTab: () => void
  onCopyUrl: () => Promise<void> | void
  onOpenExternal: () => void
  onOpenDevTools: () => void
  onInspectElement: () => void
  onConfirmAction: () => void
  onCancelAction: () => void
  urlInputRef: RefObject<HTMLInputElement | null>
}

export function DesktopLayout({
  projects,
  activeProjectRoleProfiles,
  settings,
  recentUrls,
  sessionUsage,
  updateReady,
  activeProject,
  tabs,
  activeTab,
  activeTabId,
  splitTab,
  splitTabId,
  renamingTabId,
  browserCommand,
  activeRoleExtensions,
  sidebarOpen,
  workspaceError,
  toasts,
  onClearWorkspaceError,
  onDismissToast,
  onToggleSidebar,
  editingProject,
  editingRoleProfile,
  projectFormOpen,
  roleProfileFormOpen,
  settingsPanelOpen,
  firstRunGuideOpen,
  commandPaletteOpen,
  firstRunGuideStep,
  confirmationRequest,
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
  onExportProjectConfig,
  onImportProjectConfig,
  onOpenSettings,
  onOpenFirstRunGuide,
  onOpenCommandPalette,
  onCloseCommandPalette,
  onCloseSettings,
  onSaveSettings,
  onResetSettings,
  onRequestConfirmation,
  onFirstRunGuideAction,
  onFirstRunGuideAnalyticsChoice,
  onDismissFirstRunGuide,
  onCloseRoleProfileForm,
  onSaveRoleProfile,
  onSelectProject,
  onSelectTab,
  onCloseTab,
  onStartRenameTab,
  onCloseActiveTab,
  onDuplicateTab,
  onToggleSplitView,
  onToggleSplitTab,
  onRenameTab,
  onRenameTabTitle,
  onCancelRenameTab,
  onResetSession,
  onUpdateTab,
  onBack,
  onForward,
  onReload,
  onStop,
  onHome,
  onNavigate,
  onRetryActiveTab,
  onCopyUrl,
  onOpenExternal,
  onOpenDevTools,
  onInspectElement,
  onConfirmAction,
  onCancelAction,
  urlInputRef,
}: DesktopLayoutProps) {
  function openPrivacyPolicy() {
    void window.rolesTab?.app.openExternal(privacyPolicyUrl)
  }

  return (
    <main className="rt-app-shell relative flex h-screen overflow-hidden">
      {sidebarOpen ? (
        <Sidebar
          projects={projects}
          activeProjectRoleProfiles={activeProjectRoleProfiles}
          settings={settings}
          recentUrls={recentUrls}
          sessionUsage={sessionUsage}
          updateReady={updateReady}
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
          onExportProjectConfig={onExportProjectConfig}
          onImportProjectConfig={onImportProjectConfig}
          onOpenSettings={onOpenSettings}
          onOpenFirstRunGuide={onOpenFirstRunGuide}
        />
      ) : null}

      <section className="rt-surface flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {workspaceError ? (
          <div className="rt-alert-danger flex items-center justify-between gap-3 border-b px-4 py-2 text-sm">
            <span>{workspaceError}</span>
            <button
              type="button"
              onClick={onClearWorkspaceError}
              className="rt-button rt-button-secondary rt-button-small"
            >
              Dismiss
            </button>
          </div>
        ) : null}
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          splitTabId={splitTabId}
          renamingTabId={renamingTabId}
          onSelectTab={onSelectTab}
          onCloseTab={onCloseTab}
          onStartRename={onStartRenameTab}
          onRenameTab={onRenameTabTitle}
          onCancelRename={onCancelRenameTab}
          onToggleSplitTab={onToggleSplitTab}
        />
        <TopBar
          currentUrl={activeTab?.url ?? activeProject?.baseUrl ?? ''}
          canGoBack={activeTab?.canGoBack ?? false}
          canGoForward={activeTab?.canGoForward ?? false}
          isLoading={activeTab?.loading ?? false}
          hasActiveProject={Boolean(activeProject)}
          hasActiveTab={Boolean(activeTab)}
          splitViewEnabled={Boolean(splitTab)}
          canSplitView={Boolean(activeTab) && tabs.length > 1}
          sidebarOpen={sidebarOpen}
          onNewTab={onCreateRoleProfile}
          onCloseTab={onCloseActiveTab}
          onDuplicateTab={onDuplicateTab}
          onToggleSplitView={onToggleSplitView}
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
          onInspectElement={onInspectElement}
          onToggleSidebar={onToggleSidebar}
          onOpenCommandPalette={onOpenCommandPalette}
          activeRoleExtensions={activeRoleExtensions}
          urlInputRef={urlInputRef}
        />
        <WebviewArea
          activeProject={activeProject}
          tabs={tabs}
          activeTab={activeTab}
          activeTabId={activeTabId}
          splitTab={splitTab}
          roleProfiles={activeProjectRoleProfiles}
          command={browserCommand}
          onCreateProject={onCreateProject}
          onOpenCommandPalette={onOpenCommandPalette}
          onCreateRoleProfile={onCreateRoleProfile}
          onOpenRoleProfile={onOpenRoleProfile}
          onSelectTab={onSelectTab}
          onNavigate={onNavigate}
          onRetryActiveTab={onRetryActiveTab}
          onCloseActiveTab={onCloseActiveTab}
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
          presetColors={settings.defaultRoleColors}
          onClose={onCloseRoleProfileForm}
          onSubmit={onSaveRoleProfile}
        />
      ) : null}

      {settingsPanelOpen ? (
        <button
          type="button"
          aria-label="Close settings"
          onClick={onCloseSettings}
          className="app-no-drag absolute inset-y-0 left-0 right-[30rem] z-10 cursor-default bg-transparent"
        />
      ) : null}

      {settingsPanelOpen ? (
        <SettingsPanel
          settings={settings}
          projects={projects}
          roleProfiles={activeProjectRoleProfiles}
          onClose={onCloseSettings}
          onOpenPrivacyPolicy={openPrivacyPolicy}
          onSubmit={onSaveSettings}
          onReset={onResetSettings}
          onRequestConfirmation={onRequestConfirmation}
        />
      ) : null}


      <CommandPalette
        open={commandPaletteOpen}
        projects={projects}
        activeProject={activeProject}
        roleProfiles={activeProjectRoleProfiles}
        recentUrls={recentUrls}
        tabs={tabs}
        activeTab={activeTab}
        splitViewEnabled={Boolean(splitTab)}
        canSplitView={Boolean(activeTab) && tabs.length > 1}
        sidebarOpen={sidebarOpen}
        onClose={onCloseCommandPalette}
        onCreateProject={onCreateProject}
        onCreateRoleProfile={onCreateRoleProfile}
        onCreateCommonRoles={onCreateCommonRoles}
        onOpenAllRoles={onOpenAllRoles}
        onSelectProject={onSelectProject}
        onOpenRoleProfile={onOpenRoleProfile}
        onOpenRecentUrl={onOpenRecentUrl}
        onSelectTab={onSelectTab}
        onDuplicateTab={onDuplicateTab}
        onToggleSplitView={onToggleSplitView}
        onResetSession={onResetSession}
        onOpenSettings={onOpenSettings}
        onOpenFirstRunGuide={onOpenFirstRunGuide}
        onToggleSidebar={onToggleSidebar}
        onCopyUrl={onCopyUrl}
        onOpenExternal={onOpenExternal}
        onClearProjectSessions={onClearProjectSessions}
        onClearAllSessions={onClearAllSessions}
      />
      {firstRunGuideOpen ? (
        <FirstRunGuide
          step={firstRunGuideStep}
          onAction={onFirstRunGuideAction}
          onAnalyticsChoice={onFirstRunGuideAnalyticsChoice}
          onDismiss={onDismissFirstRunGuide}
          onOpenPrivacyPolicy={openPrivacyPolicy}
        />
      ) : null}

      <ToastViewport toasts={toasts} onDismiss={onDismissToast} />

      {confirmationRequest ? (
        <ConfirmationDialog
          title={confirmationRequest.title}
          message={confirmationRequest.message}
          confirmLabel={confirmationRequest.confirmLabel}
          onConfirm={onConfirmAction}
          onCancel={onCancelAction}
        />
      ) : null}
    </main>
  )
}
