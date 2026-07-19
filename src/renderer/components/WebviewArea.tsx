import { AlertTriangle, ChevronDown, ChevronUp, Globe2, MonitorUp, X } from 'lucide-react'
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
  splitTab: BrowserTab | null
  roleProfiles: RoleProfile[]
  command: BrowserCommand | null
  onCreateProject: () => void
  onCreateRoleProfile: () => void
  onOpenRoleProfile: (roleProfileId: string) => void
  onSelectTab: (tabId: string) => void
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
  splitTab,
  roleProfiles,
  command,
  onCreateProject,
  onCreateRoleProfile,
  onOpenRoleProfile,
  onSelectTab,
  onNavigate,
  onRetryActiveTab,
  onCloseActiveTab,
  onUpdateTab,
}: WebviewAreaProps) {
  const environment = getEnvironment(activeTab?.url ?? activeProject?.baseUrl ?? '')
  const [sessionPanelOpen, setSessionPanelOpen] = useState(true)
  const [consolePanelOpen, setConsolePanelOpen] = useState(false)

  if (!activeProject) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-[#f6f8fb] p-8">
        <div className="w-full max-w-xl rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-slate-900 text-white">
            <MonitorUp aria-hidden="true" size={22} />
          </div>
          <h2 className="mt-5 text-2xl font-semibold text-slate-950">Create a project</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Projects group a target application URL with the role profiles you use to test it.
          </p>
          <button
            type="button"
            onClick={onCreateProject}
            className="mt-6 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            New Project
          </button>
        </div>
      </div>
    )
  }

  if (!activeTab) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-[#f6f8fb] p-8">
        <div className="w-full max-w-xl rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-slate-900 text-white">
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
              className="mt-6 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
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
                  className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: roleProfile.color }} />
                  {roleProfile.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  const primaryTab = activeTab
  const splitView = Boolean(splitTab && splitTab.id !== primaryTab.id)

  function getWebviewPane(tab: BrowserTab): 'full' | 'left' | 'right' | 'hidden' {
    if (!splitView) {
      return tab.id === activeTabId ? 'full' : 'hidden'
    }

    if (tab.id === primaryTab.id) {
      return 'left'
    }

    if (tab.id === splitTab?.id) {
      return 'right'
    }

    return 'hidden'
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <div className="flex h-9 shrink-0 items-center gap-3 border-b border-slate-200 bg-[#fbfcfe] px-4 text-xs text-slate-500">
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${environment.className}`}>
            {environment.label}
          </span>
          <span className="truncate">
            {splitView && splitTab
              ? `${activeTab.roleName} + ${splitTab.roleName} sessions`
              : `${activeTab.roleName} session`}
          </span>
          {sessionPanelOpen ? (
            <span className="min-w-0 truncate font-mono text-[11px] text-slate-400">
              {activeTab.sessionPartition}
            </span>
          ) : null}
        </span>
        <span className="flex shrink-0 items-center whitespace-nowrap">
          {tabs.length} active role tabs
          <span className="mx-2 text-slate-300">/</span>
          {activeTab.loading ? 'Loading' : activeTab.loadError ? 'Load failed' : 'Ready'}
          <button
            type="button"
            title={sessionPanelOpen ? 'Hide session toolbar' : 'Show session toolbar'}
            aria-label={sessionPanelOpen ? 'Hide session toolbar' : 'Show session toolbar'}
            onClick={() => setSessionPanelOpen((currentSessionPanelOpen) => !currentSessionPanelOpen)}
            className="ml-3 inline-grid h-6 w-6 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
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
        <div className="flex h-10 shrink-0 items-center gap-2 border-b border-slate-200 bg-[#f7f9fc] px-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Shortcuts</span>
          {localhostShortcuts.map((shortcut) => (
            <button
              key={shortcut}
              type="button"
              onClick={() => onNavigate(shortcut)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              {shortcut.replace('http://', '')}
            </button>
          ))}
        </div>
      ) : null}
      <div className="roles-tab-webview-frame relative z-0 min-h-0 flex-1 overflow-hidden bg-white">
        {splitView && splitTab ? (
          <>
            <SplitPaneHeader tab={activeTab} label="Primary" side="left" active onSelectTab={onSelectTab} />
            <SplitPaneHeader
              tab={splitTab}
              label="Secondary"
              side="right"
              active={false}
              onSelectTab={onSelectTab}
            />
          </>
        ) : null}

        {tabs.map((tab) => (
          <BrowserWebview
            key={tab.id}
            tab={tab}
            active={tab.id === activeTabId}
            pane={getWebviewPane(tab)}
            command={command}
            onUpdate={onUpdateTab}
          />
        ))}

        {activeTab.loadError ? (
          <div className="absolute inset-x-4 bottom-4 z-10 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
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
                  className="rounded-md border border-red-200 bg-white px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={onCloseActiveTab}
                  className="rounded-md border border-red-200 bg-white px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {activeTab.consoleErrors && activeTab.consoleErrors.length > 0 ? (
          <div className="absolute bottom-4 right-4 z-10 max-w-xl rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-900 shadow-sm">
            <div className="flex items-center gap-2 px-3 py-2">
              <AlertTriangle aria-hidden="true" className="shrink-0 text-amber-600" size={15} />
              <button
                type="button"
                onClick={() => setConsolePanelOpen((currentConsolePanelOpen) => !currentConsolePanelOpen)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left font-semibold"
                aria-expanded={consolePanelOpen}
              >
                <span className="shrink-0">Console errors ({activeTab.consoleErrors.length})</span>
                <span className="truncate font-normal text-amber-800">{activeTab.consoleErrors[0]}</span>
                {consolePanelOpen ? (
                  <ChevronUp aria-hidden="true" className="shrink-0" size={14} />
                ) : (
                  <ChevronDown aria-hidden="true" className="shrink-0" size={14} />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateTab(activeTab.id, { consoleErrors: [] })
                  setConsolePanelOpen(false)
                }}
                className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-amber-700 hover:bg-amber-100 hover:text-amber-950"
                title="Dismiss console errors"
                aria-label="Dismiss console errors"
              >
                <X aria-hidden="true" size={14} />
              </button>
            </div>
            {consolePanelOpen ? (
              <ul className="max-h-36 space-y-1 overflow-auto border-t border-amber-200 px-3 py-2 font-mono text-[11px] text-amber-800">
                {activeTab.consoleErrors.map((error) => (
                  <li key={error} className="break-all">
                    {error}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

type SplitPaneHeaderProps = {
  tab: BrowserTab
  label: string
  side: 'left' | 'right'
  active: boolean
  onSelectTab: (tabId: string) => void
}

function SplitPaneHeader({ tab, label, side, active, onSelectTab }: SplitPaneHeaderProps) {
  return (
    <div className={`roles-tab-split-header roles-tab-split-header-${side}`}>
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: tab.roleColor }} />
      <button
        type="button"
        onClick={() => onSelectTab(tab.id)}
        className="min-w-0 flex-1 truncate text-left text-xs font-semibold text-slate-700 hover:text-slate-950"
      >
        {tab.title}
      </button>
      <span
        className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
          active ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
        }`}
      >
        {label}
      </span>
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
