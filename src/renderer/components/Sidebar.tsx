import { Download, FolderPlus, Pencil, Trash2, PanelsTopLeft, Settings, Upload } from 'lucide-react'
import type { AppSettings, ProjectSummary, RecentUrl, RoleProfile } from '../../shared/workspace'
import type { SessionUsage } from '../../shared/session'
import { RoleProfileList } from './RoleProfileList'
import { WorkspacePersistencePanel } from './WorkspacePersistencePanel'

type SidebarProps = {
  projects: ProjectSummary[]
  activeProjectRoleProfiles: RoleProfile[]
  settings: AppSettings
  recentUrls: RecentUrl[]
  sessionUsage: SessionUsage[]
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
}

export function Sidebar({
  projects,
  activeProjectRoleProfiles,
  settings,
  recentUrls,
  sessionUsage,
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
}: SidebarProps) {
  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-[#d7dce3] bg-[#f8fafd]">
      <div className="flex h-[50px] items-center gap-3 border-b border-[#d7dce3] px-4">
        <div className="grid h-8 w-8 place-items-center rounded-md bg-blue-600 text-white">
          <PanelsTopLeft aria-hidden="true" size={18} />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Desktop Browser
          </p>
          <h1 className="text-lg font-semibold leading-tight">RolesTab</h1>
        </div>
      </div>

      <div className="shrink-0 border-b border-slate-200 p-3">
        <button
          type="button"
          onClick={onCreateProject}
          className="flex h-10 items-center justify-center gap-2 rounded-full bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          <FolderPlus aria-hidden="true" size={17} />
          New Project
        </button>

        <section className="mt-4">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Projects
          </h2>

          {projects.length === 0 ? (
            <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm leading-6 text-slate-500">
              No project selected. Create a project to start opening isolated role tabs.
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {projects.map((project) => {
                const active = project.id === activeProjectId

                return (
                  <div
                    key={project.id}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                      active
                        ? 'border-blue-200 bg-blue-50 text-slate-950'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectProject(project.id)}
                      className="block w-full text-left"
                    >
                      <span className="block text-sm font-semibold">{project.name}</span>
                      <span
                        className={`mt-1 block truncate text-xs ${
                          active ? 'text-blue-700' : 'text-slate-500'
                        }`}
                      >
                        {project.baseUrl}
                      </span>
                    </button>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        title="Edit Project"
                        aria-label={`Edit ${project.name}`}
                        onClick={() => onEditProject(project.id)}
                        className={`grid h-7 w-7 place-items-center rounded border ${
                          active
                            ? 'border-blue-200 bg-white text-blue-700 hover:bg-blue-100'
                            : 'border-slate-200 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        <Pencil aria-hidden="true" size={14} />
                      </button>
                      <button
                        type="button"
                        title="Delete Project"
                        aria-label={`Delete ${project.name}`}
                        onClick={() => onDeleteProject(project.id)}
                        className={`grid h-7 w-7 place-items-center rounded border ${
                          active
                            ? 'border-blue-200 bg-white text-blue-700 hover:bg-blue-100'
                            : 'border-slate-200 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        <Trash2 aria-hidden="true" size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3">
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

      <div className="shrink-0 space-y-2 border-t border-[#d7dce3] bg-white p-3 shadow-[0_-8px_16px_rgba(148,163,184,0.12)]">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onExportProjectConfig}
            disabled={!activeProjectId}
            className="flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download aria-hidden="true" size={15} />
            Export
          </button>
          <button
            type="button"
            onClick={onImportProjectConfig}
            className="flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Upload aria-hidden="true" size={15} />
            Import
          </button>
        </div>
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex h-9 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Settings aria-hidden="true" size={15} />
          Settings
        </button>
      </div>
    </aside>
  )
}
