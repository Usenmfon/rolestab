import { AlertTriangle, ChevronDown, ChevronUp, Command, Globe2, MonitorUp, X } from 'lucide-react'
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
  onOpenCommandPalette: () => void
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
  onOpenCommandPalette,
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
      <div className="rt-muted-surface flex min-h-0 flex-1 items-center justify-center p-8">
        <div className="w-full max-w-xl text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-[var(--rt-text)] text-[var(--rt-surface)]">
            <MonitorUp aria-hidden="true" size={22} />
          </div>
          <h2 className="rt-heading mt-5 text-2xl">Create a project</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--rt-text-muted)]">
            Projects group a target application URL with the role profiles you use to test it.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={onCreateProject} className="rt-button rt-button-primary">
              New Project
            </button>
            <button type="button" onClick={onOpenCommandPalette} className="rt-button rt-button-secondary">
              <Command aria-hidden="true" size={16} />
              Browse actions
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!activeTab) {
    return (
      <div className="rt-muted-surface flex min-h-0 flex-1 items-center justify-center p-8">
        <div className="w-full max-w-xl text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-[var(--rt-text)] text-[var(--rt-surface)]">
            <Globe2 aria-hidden="true" size={22} />
          </div>
          <h2 className="rt-heading mt-5 text-2xl">Open a role tab</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--rt-text-muted)]">
            Role tabs render isolated browser sessions for {activeProject.name}.
          </p>
          {roleProfiles.length === 0 ? (
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={onCreateRoleProfile} className="rt-button rt-button-primary">
                New Role Profile
              </button>
              <button type="button" onClick={onOpenCommandPalette} className="rt-button rt-button-secondary">
                <Command aria-hidden="true" size={16} />
                Browse actions
              </button>
            </div>
          ) : (
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {roleProfiles.map((roleProfile) => (
                <button
                  key={roleProfile.id}
                  type="button"
                  onClick={() => onOpenRoleProfile(roleProfile.id)}
                  className="rt-button rt-button-secondary h-10"
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
  const statusLabel = activeTab.loading ? 'Loading' : activeTab.loadError ? 'Load failed' : 'Ready'

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
    <div className="rt-surface flex min-h-0 flex-1 flex-col">
      <div className="flex h-10 shrink-0 items-center gap-3 border-b border-[var(--rt-border)] bg-[var(--rt-surface-raised)] px-4 text-xs">
        <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${environment.className}`}>
          {environment.label}
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-2 text-[var(--rt-text-muted)]">
          <span className="truncate font-semibold text-[var(--rt-text)]">
            {splitView && splitTab ? `${activeTab.roleName} + ${splitTab.roleName}` : activeTab.roleName}
          </span>
          <span className="hidden text-[var(--rt-text-soft)] lg:inline">session</span>
          {sessionPanelOpen ? (
            <span className="min-w-0 truncate font-mono text-[11px] text-[var(--rt-text-soft)]">
              {activeTab.sessionPartition}
            </span>
          ) : null}
        </span>
        <span className="flex shrink-0 items-center gap-2 whitespace-nowrap text-[var(--rt-text-muted)]">
          <span>{tabs.length} role tabs</span>
          <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${activeTab.loadError ? 'bg-red-100 text-red-700' : activeTab.loading ? 'bg-blue-50 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {statusLabel}
          </span>
          <button
            type="button"
            title={sessionPanelOpen ? 'Hide session toolbar' : 'Show session toolbar'}
            aria-label={sessionPanelOpen ? 'Hide session toolbar' : 'Show session toolbar'}
            onClick={() => setSessionPanelOpen((currentSessionPanelOpen) => !currentSessionPanelOpen)}
            className="rt-icon-button h-7 w-7"
          >
            {sessionPanelOpen ? <ChevronUp aria-hidden="true" size={15} /> : <ChevronDown aria-hidden="true" size={15} />}
          </button>
        </span>
      </div>
      {sessionPanelOpen ? (
        <div className="flex h-10 shrink-0 items-center gap-2 overflow-x-auto border-b border-[var(--rt-border)] bg-[var(--rt-surface)] px-4">
          <span className="rt-eyebrow shrink-0 text-[10px]">Shortcuts</span>
          {localhostShortcuts.map((shortcut) => (
            <button
              key={shortcut}
              type="button"
              onClick={() => onNavigate(shortcut)}
              className="rt-button rt-button-secondary rt-button-small shrink-0"
            >
              {shortcut.replace('http://', '')}
            </button>
          ))}
        </div>
      ) : null}
      <div className="roles-tab-webview-frame relative z-0 min-h-0 flex-1 overflow-hidden bg-[var(--rt-surface)]">
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
          <div className="rt-alert-danger absolute inset-x-4 bottom-4 z-10 rounded-lg px-4 py-3 text-sm shadow-[var(--rt-shadow-sm)]">
            <div className="flex items-start justify-between gap-3">
              <span className="min-w-0">
                <span className="block font-semibold">{activeTab.loadError}</span>
                {activeTab.loadErrorDetails ? (
                  <span className="mt-1 block truncate font-mono text-[11px]">
                    {activeTab.loadErrorDetails}
                  </span>
                ) : null}
              </span>
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={onRetryActiveTab} className="rt-button rt-button-secondary rt-button-small">
                  Retry
                </button>
                <button type="button" onClick={onCloseActiveTab} className="rt-button rt-button-secondary rt-button-small">
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {activeTab.consoleErrors && activeTab.consoleErrors.length > 0 ? (
          <div className="absolute bottom-4 right-4 z-10 max-w-xl rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-900 shadow-[var(--rt-shadow-sm)]">
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
        className="min-w-0 flex-1 truncate text-left text-xs font-semibold text-[var(--rt-text-muted)] hover:text-[var(--rt-text)]"
      >
        {tab.title}
      </button>
      <span
        className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
          active ? 'bg-blue-100 text-blue-700' : 'bg-[var(--rt-surface-muted)] text-[var(--rt-text-muted)]'
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