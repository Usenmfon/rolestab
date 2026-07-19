import { Download, FolderPlus, Map, Pencil, Trash2, Settings, Upload } from 'lucide-react'
import type { AppSettings, ProjectSummary, RecentUrl, RoleProfile } from '../../shared/workspace'
import type { SessionUsage } from '../../shared/session'
import { RoleProfileList } from './RoleProfileList'
import { WorkspacePersistencePanel } from './WorkspacePersistencePanel'
import logoUrl from '../../assets/logo.png'

type SidebarProps = {
  projects: ProjectSummary[]
  activeProjectRoleProfiles: RoleProfile[]
  settings: AppSettings
  recentUrls: RecentUrl[]
  sessionUsage: SessionUsage[]
  updateReady: boolean
  activeProjectId: string | null
  onCreateProject: () => void
  onEditProject: (projectId: string) => void
  onDeleteProject: (projectId: string) => void
  onSelectProject: (projectId: string) => void
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
}

export function Sidebar({
  projects,
  activeProjectRoleProfiles,
  settings,
  recentUrls,
  sessionUsage,
  updateReady,
  activeProjectId,
  onCreateProject,
  onEditProject,
  onDeleteProject,
  onSelectProject,
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
}: SidebarProps) {
  return (
    <aside className="rt-surface-raised flex w-[19.5rem] shrink-0 flex-col border-r">
      <div className="mac-titlebar-safe flex h-16 items-center gap-3 border-b border-[var(--rt-border)] px-4">
        <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-lg bg-[var(--rt-surface)] shadow-[var(--rt-shadow-sm)] ring-1 ring-[var(--rt-border)]">
          <img src={logoUrl} alt="" className="h-8 w-8" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="rt-eyebrow text-[10px]">Desktop Browser</p>
          <h1 className="rt-heading truncate text-lg leading-tight">RolesTab</h1>
        </div>
        <span className="rounded-md border border-[var(--rt-border)] bg-[var(--rt-surface)] px-2 py-1 text-[11px] font-semibold text-[var(--rt-text-muted)]">
          {projects.length} {projects.length === 1 ? 'project' : 'projects'}
        </span>
      </div>

      <div className="shrink-0 border-b border-[var(--rt-border)] p-4">
        <button
          type="button"
          onClick={onCreateProject}
          data-tour-id="new-project"
          className="rt-button rt-button-primary w-full"
        >
          <FolderPlus aria-hidden="true" size={17} />
          New Project
        </button>

        <section className="mt-5">
          <div className="flex items-center justify-between px-1">
            <h2 className="rt-eyebrow">Projects</h2>
            {activeProjectId ? (
              <span className="text-[11px] font-medium text-[var(--rt-text-soft)]">
                {activeProjectRoleProfiles.length} roles
              </span>
            ) : null}
          </div>

          {projects.length === 0 ? (
            <div className="mt-3 rounded-lg border border-dashed border-[var(--rt-border)] bg-[var(--rt-surface)] p-4 text-sm leading-6 text-[var(--rt-text-muted)]">
              Create a project to start opening isolated role tabs.
            </div>
          ) : (
            <div className="mt-3 space-y-1.5">
              {projects.map((project) => {
                const active = project.id === activeProjectId

                return (
                  <div
                    key={project.id}
                    className={`group rounded-lg border px-3 py-2.5 transition ${
                      active
                        ? 'border-blue-300 bg-blue-50 text-slate-950 shadow-[var(--rt-shadow-sm)]'
                        : 'border-transparent text-[var(--rt-text-muted)] hover:border-[var(--rt-border)] hover:bg-[var(--rt-surface)]'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectProject(project.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <span className="block truncate text-sm font-semibold text-[var(--rt-text)]">
                          {project.name}
                        </span>
                        <span className={`mt-0.5 block truncate text-xs ${active ? 'text-blue-700' : 'text-[var(--rt-text-muted)]'}`}>
                          {project.baseUrl}
                        </span>
                      </button>
                      <div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                        <button
                          type="button"
                          title="Edit Project"
                          aria-label={`Edit ${project.name}`}
                          onClick={() => onEditProject(project.id)}
                          className="rt-icon-button h-7 w-7"
                        >
                          <Pencil aria-hidden="true" size={14} />
                        </button>
                        <button
                          type="button"
                          title="Delete Project"
                          aria-label={`Delete ${project.name}`}
                          onClick={() => onDeleteProject(project.id)}
                          className="rt-icon-button h-7 w-7"
                        >
                          <Trash2 aria-hidden="true" size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-5">
        <RoleProfileList
          roleProfiles={activeProjectRoleProfiles}
          hasActiveProject={Boolean(activeProjectId)}
          onCreateRoleProfile={onCreateRoleProfile}
          onEditRoleProfile={onEditRoleProfile}
          onDeleteRoleProfile={onDeleteRoleProfile}
          onOpenRoleProfile={onOpenRoleProfile}
          onCreateCommonRoles={onCreateCommonRoles}
          onOpenAllRoles={onOpenAllRoles}
        />

        <WorkspacePersistencePanel
          settings={settings}
          recentUrls={recentUrls}
          sessionUsage={sessionUsage}
          onToggleRestoreTabs={onToggleRestoreTabs}
          onToggleConfirmSessionClear={onToggleConfirmSessionClear}
          onOpenRecentUrl={onOpenRecentUrl}
          onClearProjectSessions={onClearProjectSessions}
          onClearAllSessions={onClearAllSessions}
        />
      </div>

      <div className="shrink-0 space-y-2 border-t border-[var(--rt-border)] bg-[var(--rt-surface)]/90 p-4 shadow-[0_-8px_20px_rgba(15,23,42,0.08)]">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onExportProjectConfig}
            disabled={!activeProjectId}
            className="rt-button rt-button-secondary rt-button-small"
          >
            <Download aria-hidden="true" size={15} />
            Export
          </button>
          <button
            type="button"
            onClick={onImportProjectConfig}
            className="rt-button rt-button-secondary rt-button-small"
          >
            <Upload aria-hidden="true" size={15} />
            Import
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onOpenFirstRunGuide}
            className="rt-button rt-button-secondary rt-button-small"
          >
            <Map aria-hidden="true" size={15} />
            Tour
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="rt-button rt-button-secondary rt-button-small min-w-0"
            aria-label={updateReady ? 'Settings, update ready' : 'Settings'}
          >
            <Settings aria-hidden="true" size={15} className="shrink-0" />
            <span className="min-w-0 truncate">{updateReady ? 'Update ready' : 'Settings'}</span>
            {updateReady ? (
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full bg-red-500 ring-2 ring-[var(--rt-surface)]"
              />
            ) : null}
          </button>
        </div>
      </div>
    </aside>
  )
}