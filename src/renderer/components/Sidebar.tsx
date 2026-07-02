import { FolderPlus, Pencil, Trash2, PanelsTopLeft } from 'lucide-react'
import type { ProjectSummary } from '../../shared/workspace'

type SidebarProps = {
  projects: ProjectSummary[]
  activeProjectId: string | null
  onCreateProject: () => void
  onEditProject: (projectId: string) => void
  onDeleteProject: (projectId: string) => void
  onSelectProject: (projectId: string) => void
}

export function Sidebar({
  projects,
  activeProjectId,
  onCreateProject,
  onEditProject,
  onDeleteProject,
  onSelectProject,
}: SidebarProps) {
  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
        <div className="grid h-9 w-9 place-items-center rounded-md bg-slate-900 text-white">
          <PanelsTopLeft aria-hidden="true" size={18} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Desktop Browser
          </p>
          <h1 className="text-xl font-semibold leading-tight">RolesTab</h1>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 p-4">
        <button
          type="button"
          onClick={onCreateProject}
          className="flex h-10 items-center justify-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          <FolderPlus aria-hidden="true" size={17} />
          New Project
        </button>

        <section className="min-h-0">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Projects
          </h2>

          {projects.length === 0 ? (
            <div className="mt-3 rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-500">
              No project selected. Create a project to start opening isolated role tabs.
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {projects.map((project) => {
                const active = project.id === activeProjectId

                return (
                  <div
                    key={project.id}
                    className={`w-full rounded-md border px-3 py-3 text-left transition ${
                      active
                        ? 'border-slate-900 bg-slate-900 text-white'
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
                          active ? 'text-slate-300' : 'text-slate-500'
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
                            ? 'border-slate-700 text-slate-200 hover:bg-slate-800'
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
                            ? 'border-slate-700 text-slate-200 hover:bg-slate-800'
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

      <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
        Phase 3: projects persist locally
      </div>
    </aside>
  )
}
