import { Sidebar } from '../components/Sidebar'
import { TabBar } from '../components/TabBar'
import { TopBar } from '../components/TopBar'
import { WebviewArea } from '../components/WebviewArea'
import { ProjectFormPanel, type ProjectDraft } from '../components/ProjectFormPanel'
import type { BrowserTab, ProjectSummary } from '../../shared/workspace'

type DesktopLayoutProps = {
  projects: ProjectSummary[]
  activeProject: ProjectSummary | null
  tabs: BrowserTab[]
  activeTab: BrowserTab | null
  activeTabId: string | null
  workspaceError: string | null
  editingProject: ProjectSummary | null
  projectFormOpen: boolean
  onCreateProject: () => void
  onEditProject: (projectId: string) => void
  onDeleteProject: (projectId: string) => void
  onCloseProjectForm: () => void
  onSaveProject: (draft: ProjectDraft) => Promise<void>
  onSelectProject: (projectId: string) => void
  onNewTab: () => void
  onSelectTab: (tabId: string) => void
  onCloseTab: (tabId: string) => void
  onCloseActiveTab: () => void
}

export function DesktopLayout({
  projects,
  activeProject,
  tabs,
  activeTab,
  activeTabId,
  workspaceError,
  editingProject,
  projectFormOpen,
  onCreateProject,
  onEditProject,
  onDeleteProject,
  onCloseProjectForm,
  onSaveProject,
  onSelectProject,
  onNewTab,
  onSelectTab,
  onCloseTab,
  onCloseActiveTab,
}: DesktopLayoutProps) {
  return (
    <main className="flex h-screen overflow-hidden bg-slate-100 text-slate-900">
      <Sidebar
        projects={projects}
        activeProjectId={activeProject?.id ?? null}
        onCreateProject={onCreateProject}
        onEditProject={onEditProject}
        onDeleteProject={onDeleteProject}
        onSelectProject={onSelectProject}
      />

      <section className="flex min-w-0 flex-1 flex-col">
        {workspaceError ? (
          <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {workspaceError}
          </div>
        ) : null}
        <TopBar
          currentUrl={activeTab?.url ?? activeProject?.baseUrl ?? ''}
          hasActiveProject={Boolean(activeProject)}
          hasActiveTab={Boolean(activeTab)}
          onNewTab={onNewTab}
          onCloseTab={onCloseActiveTab}
        />
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onSelectTab={onSelectTab}
          onCloseTab={onCloseTab}
        />
        <WebviewArea
          activeProject={activeProject}
          activeTab={activeTab}
          onCreateProject={onCreateProject}
          onNewTab={onNewTab}
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
    </main>
  )
}
