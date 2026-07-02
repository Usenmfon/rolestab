import { Globe2, MonitorUp } from 'lucide-react'
import type { BrowserCommand } from '../../shared/browser'
import type { BrowserTab, ProjectSummary, RoleProfile } from '../../shared/workspace'
import { BrowserWebview } from './BrowserWebview'

type WebviewAreaProps = {
  activeProject: ProjectSummary | null
  tabs: BrowserTab[]
  activeTab: BrowserTab | null
  activeTabId: string | null
  roleProfiles: RoleProfile[]
  command: BrowserCommand | null
  onCreateProject: () => void
  onCreateRoleProfile: () => void
  onOpenRoleProfile: (roleProfileId: string) => void
  onUpdateTab: (tabId: string, updates: Partial<BrowserTab>) => void
}

export function WebviewArea({
  activeProject,
  tabs,
  activeTab,
  activeTabId,
  roleProfiles,
  command,
  onCreateProject,
  onCreateRoleProfile,
  onOpenRoleProfile,
  onUpdateTab,
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
          {roleProfiles.length === 0 ? (
            <button
              type="button"
              onClick={onCreateRoleProfile}
              className="mt-6 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              New Role Profile
            </button>
          ) : (
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {roleProfiles.map((roleProfile) => (
                <button
                  key={roleProfile.id}
                  type="button"
                  onClick={() => onOpenRoleProfile(roleProfile.id)}
                  className="flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: roleProfile.color }}
                  />
                  {roleProfile.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-slate-200 px-4 text-xs text-slate-500">
        <span>
          {activeTab.roleName} session
          <span className="ml-2 font-mono text-[11px] text-slate-400">
            {activeTab.sessionPartition}
          </span>
        </span>
        <span>
          {tabs.filter((tab) => tab.projectId === activeTab.projectId).length} active role tabs
          <span className="mx-2 text-slate-300">/</span>
          {activeTab.loading ? 'Loading' : activeTab.loadError ? 'Load failed' : 'Ready'}
        </span>
      </div>
      <div className="relative min-h-0 flex-1 bg-white">
        {tabs.map((tab) => (
          <BrowserWebview
            key={tab.id}
            tab={tab}
            active={tab.id === activeTabId}
            command={command}
            onUpdate={onUpdateTab}
          />
        ))}

        {activeTab.loadError ? (
          <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
            {activeTab.loadError}
          </div>
        ) : null}
      </div>
    </div>
  )
}
