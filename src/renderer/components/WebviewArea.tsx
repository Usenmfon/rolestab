import { Globe2, MonitorUp } from 'lucide-react'
import type { BrowserTab, ProjectSummary } from '../../shared/workspace'

type WebviewAreaProps = {
  activeProject: ProjectSummary | null
  activeTab: BrowserTab | null
  onCreateProject: () => void
  onNewTab: () => void
}

export function WebviewArea({
  activeProject,
  activeTab,
  onCreateProject,
  onNewTab,
}: WebviewAreaProps) {
  if (!activeProject) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-8">
        <div className="w-full max-w-xl rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-slate-900 text-white">
            <MonitorUp aria-hidden="true" size={22} />
          </div>
          <h2 className="mt-5 text-2xl font-semibold text-slate-950">Create a project</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Projects group a target application URL with the role profiles you use to test it.
          </p>
          <button
            type="button"
            onClick={onCreateProject}
            className="mt-6 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            New Project
          </button>
        </div>
      </div>
    )
  }

  if (!activeTab) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-8">
        <div className="w-full max-w-xl rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-slate-900 text-white">
            <Globe2 aria-hidden="true" size={22} />
          </div>
          <h2 className="mt-5 text-2xl font-semibold text-slate-950">Open a role tab</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Role tabs will render isolated browser sessions for {activeProject.name}.
          </p>
          <button
            type="button"
            onClick={onNewTab}
            className="mt-6 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            New Role Tab
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-slate-200 px-4 text-xs text-slate-500">
        <span>{activeTab.roleName} session preview</span>
        <span>{activeTab.loading ? 'Loading' : 'Ready'}</span>
      </div>
      <div className="grid min-h-0 flex-1 place-items-center bg-[linear-gradient(45deg,#f8fafc_25%,transparent_25%),linear-gradient(-45deg,#f8fafc_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f8fafc_75%),linear-gradient(-45deg,transparent_75%,#f8fafc_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0px]">
        <div className="rounded-lg border border-slate-200 bg-white px-8 py-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-950">{activeTab.title}</p>
          <p className="mt-2 max-w-lg truncate text-sm text-slate-500">{activeTab.url}</p>
          <p className="mt-4 text-xs text-slate-400">
            Electron webviews are wired in Phase 5 after project and role data exist.
          </p>
        </div>
      </div>
    </div>
  )
}
