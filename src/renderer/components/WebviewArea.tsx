import { ChevronDown, ChevronUp, Globe2, MonitorUp } from 'lucide-react'
import { useState } from 'react'
import type { BrowserCommand } from '../../shared/browser'
import type { BrowserTab, ProjectSummary, RoleProfile } from '../../shared/workspace'
import { BrowserWebview } from './BrowserWebview'

const localhostShortcuts = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8000',
  'http://localhost:8080',
]

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
  onNavigate: (url: string) => void
  onRetryActiveTab: () => void
  onCloseActiveTab: () => void
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
  onNavigate,
  onRetryActiveTab,
  onCloseActiveTab,
  onUpdateTab,
}: WebviewAreaProps) {
  const environment = getEnvironment(activeTab?.url ?? activeProject?.baseUrl ?? '')
  const [sessionPanelOpen, setSessionPanelOpen] = useState(true)

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
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 text-xs text-slate-500">
        <span className="flex min-w-0 items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${environment.className}`}
          >
            {environment.label}
          </span>
          <span className="truncate">{activeTab.roleName} session</span>
          {sessionPanelOpen ? (
            <span className="ml-2 font-mono text-[11px] text-slate-400">
              {activeTab.sessionPartition}
            </span>
          ) : null}
        </span>
        <span>
          {tabs.filter((tab) => tab.projectId === activeTab.projectId).length} active role tabs
          <span className="mx-2 text-slate-300">/</span>
          {activeTab.loading ? 'Loading' : activeTab.loadError ? 'Load failed' : 'Ready'}
          <button
            type="button"
            title={sessionPanelOpen ? 'Hide session toolbar' : 'Show session toolbar'}
            aria-label={sessionPanelOpen ? 'Hide session toolbar' : 'Show session toolbar'}
            onClick={() => setSessionPanelOpen((currentSessionPanelOpen) => !currentSessionPanelOpen)}
            className="ml-3 inline-grid h-6 w-6 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            {sessionPanelOpen ? (
              <ChevronUp aria-hidden="true" size={15} />
            ) : (
              <ChevronDown aria-hidden="true" size={15} />
            )}
          </button>
        </span>
      </div>
      {sessionPanelOpen ? (
        <div className="flex h-9 shrink-0 items-center gap-2 border-b border-slate-200 bg-[#f8fafd] px-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Shortcuts
          </span>
          {localhostShortcuts.map((shortcut) => (
            <button
              key={shortcut}
              type="button"
              onClick={() => onNavigate(shortcut)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              {shortcut.replace('http://', '')}
            </button>
          ))}
        </div>
      ) : null}
      <div className="roles-tab-webview-frame relative min-h-0 flex-1 overflow-hidden bg-white">
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
          <div className="absolute inset-x-4 bottom-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <span className="min-w-0">
                <span className="block font-semibold">{activeTab.loadError}</span>
                {activeTab.loadErrorDetails ? (
                  <span className="mt-1 block truncate font-mono text-[11px] text-red-600">
                    {activeTab.loadErrorDetails}
                  </span>
                ) : null}
              </span>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={onRetryActiveTab}
                  className="rounded border border-red-200 bg-white px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={onCloseActiveTab}
                  className="rounded border border-red-200 bg-white px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {activeTab.consoleErrors && activeTab.consoleErrors.length > 0 ? (
          <div className="absolute bottom-4 right-4 max-w-xl rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 shadow-sm">
            <p className="font-semibold">Console errors</p>
            <ul className="mt-2 space-y-1">
              {activeTab.consoleErrors.slice(0, 3).map((error) => (
                <li key={error} className="truncate">
                  {error}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function getEnvironment(url: string): { label: string; className: string } {
  try {
    const hostname = new URL(url).hostname.toLowerCase()

    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.test')) {
      return { label: 'Local', className: 'bg-emerald-100 text-emerald-700' }
    }

    if (hostname.includes('staging') || hostname.includes('stage') || hostname.includes('dev')) {
      return { label: 'Staging', className: 'bg-amber-100 text-amber-700' }
    }

    return { label: 'Production', className: 'bg-red-100 text-red-700' }
  } catch {
    return { label: 'Unknown', className: 'bg-slate-200 text-slate-700' }
  }
}
