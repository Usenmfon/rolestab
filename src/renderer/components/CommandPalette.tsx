import {
  Clock3,
  Columns2,
  Copy,
  ExternalLink,
  Folder,
  FolderPlus,
  Layers,
  LifeBuoy,
  PanelLeft,
  Play,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Sparkles,
  X,
  type LucideIcon,
} from 'lucide-react'
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import type { BrowserTab, ProjectSummary, RecentUrl, RoleProfile } from '../../shared/workspace'

type CommandPaletteProps = {
  open: boolean
  projects: ProjectSummary[]
  activeProject: ProjectSummary | null
  roleProfiles: RoleProfile[]
  recentUrls: RecentUrl[]
  tabs: BrowserTab[]
  activeTab: BrowserTab | null
  splitViewEnabled: boolean
  canSplitView: boolean
  sidebarOpen: boolean
  onClose: () => void
  onCreateProject: () => void
  onCreateRoleProfile: () => void
  onCreateCommonRoles: () => void
  onOpenAllRoles: () => void
  onSelectProject: (projectId: string) => void
  onOpenRoleProfile: (roleProfileId: string) => void
  onOpenRecentUrl: (recentUrl: RecentUrl) => void
  onSelectTab: (tabId: string) => void
  onDuplicateTab: () => void
  onToggleSplitView: () => void
  onResetSession: () => void
  onOpenSettings: () => void
  onOpenFirstRunGuide: () => void
  onToggleSidebar: () => void
  onCopyUrl: () => Promise<void> | void
  onOpenExternal: () => void
  onClearProjectSessions: () => void
  onClearAllSessions: () => void
}

type CommandItem = {
  id: string
  title: string
  subtitle: string
  group: string
  icon: LucideIcon
  keywords: string
  disabled?: boolean
  action: () => void | Promise<void>
}

export function CommandPalette({
  open,
  projects,
  activeProject,
  roleProfiles,
  recentUrls,
  tabs,
  activeTab,
  splitViewEnabled,
  canSplitView,
  sidebarOpen,
  onClose,
  onCreateProject,
  onCreateRoleProfile,
  onCreateCommonRoles,
  onOpenAllRoles,
  onSelectProject,
  onOpenRoleProfile,
  onOpenRecentUrl,
  onSelectTab,
  onDuplicateTab,
  onToggleSplitView,
  onResetSession,
  onOpenSettings,
  onOpenFirstRunGuide,
  onToggleSidebar,
  onCopyUrl,
  onOpenExternal,
  onClearProjectSessions,
  onClearAllSessions,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const commands = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [
      {
        id: 'create-project',
        title: 'New project',
        subtitle: 'Create a workspace target and base URL',
        group: 'Actions',
        icon: FolderPlus,
        keywords: 'create add workspace project base url',
        action: onCreateProject,
      },
      {
        id: 'create-role',
        title: 'New role profile',
        subtitle: activeProject ? `Add a role for ${activeProject.name}` : 'Create a project first',
        group: 'Actions',
        icon: Plus,
        keywords: 'create add role profile session user',
        disabled: !activeProject,
        action: onCreateRoleProfile,
      },
      {
        id: 'common-roles',
        title: 'Create common roles',
        subtitle: activeProject ? 'Add Admin, Manager, Staff, Customer, and Guest' : 'Create a project first',
        group: 'Actions',
        icon: Sparkles,
        keywords: 'common roles admin manager staff customer guest templates',
        disabled: !activeProject,
        action: onCreateCommonRoles,
      },
      {
        id: 'open-all-roles',
        title: 'Open all roles',
        subtitle: roleProfiles.length > 0 ? `Open ${roleProfiles.length} role tabs` : 'No roles in this project yet',
        group: 'Actions',
        icon: Layers,
        keywords: 'open all roles tabs sessions',
        disabled: roleProfiles.length === 0,
        action: onOpenAllRoles,
      },
      {
        id: 'toggle-split',
        title: splitViewEnabled ? 'Exit split view' : 'Start split view',
        subtitle: canSplitView ? 'Compare two role sessions side by side' : 'Open another role tab first',
        group: 'Actions',
        icon: Columns2,
        keywords: 'split view compare side by side panes',
        disabled: !canSplitView && !splitViewEnabled,
        action: onToggleSplitView,
      },
      {
        id: 'duplicate-tab',
        title: 'Duplicate active role tab',
        subtitle: activeTab ? activeTab.title : 'Open a role tab first',
        group: 'Actions',
        icon: Copy,
        keywords: 'duplicate clone copy tab role',
        disabled: !activeTab,
        action: onDuplicateTab,
      },
      {
        id: 'reset-session',
        title: 'Reset active role session',
        subtitle: activeTab ? activeTab.roleName : 'Open a role tab first',
        group: 'Session',
        icon: RotateCcw,
        keywords: 'reset clear active role session cookies storage cache',
        disabled: !activeTab,
        action: onResetSession,
      },
      {
        id: 'clear-project-sessions',
        title: 'Clear project sessions',
        subtitle: activeProject ? activeProject.name : 'Select a project first',
        group: 'Session',
        icon: RotateCcw,
        keywords: 'clear project sessions cookies storage cache',
        disabled: !activeProject,
        action: onClearProjectSessions,
      },
      {
        id: 'clear-all-sessions',
        title: 'Clear all sessions',
        subtitle: 'Reset every stored role partition',
        group: 'Session',
        icon: RotateCcw,
        keywords: 'clear all sessions cookies storage cache',
        disabled: roleProfiles.length === 0,
        action: onClearAllSessions,
      },
      {
        id: 'copy-url',
        title: 'Copy current URL',
        subtitle: activeTab ? activeTab.url : 'Open a role tab first',
        group: 'Browser',
        icon: Copy,
        keywords: 'copy current url clipboard address',
        disabled: !activeTab,
        action: onCopyUrl,
      },
      {
        id: 'open-external',
        title: 'Open current URL externally',
        subtitle: activeTab ? activeTab.url : 'Open a role tab first',
        group: 'Browser',
        icon: ExternalLink,
        keywords: 'open external browser current url',
        disabled: !activeTab,
        action: onOpenExternal,
      },
      {
        id: 'toggle-sidebar',
        title: sidebarOpen ? 'Hide sidebar' : 'Show sidebar',
        subtitle: 'Toggle the workspace navigator',
        group: 'View',
        icon: PanelLeft,
        keywords: 'sidebar navigator show hide view layout',
        action: onToggleSidebar,
      },
      {
        id: 'settings',
        title: 'Open settings',
        subtitle: 'Preferences, shortcuts, updates, extensions',
        group: 'View',
        icon: Settings,
        keywords: 'settings preferences shortcuts updates extensions',
        action: onOpenSettings,
      },
      {
        id: 'tour',
        title: 'Open guided tour',
        subtitle: 'Walk through project and role setup',
        group: 'Help',
        icon: LifeBuoy,
        keywords: 'help guide tour onboarding first run',
        action: onOpenFirstRunGuide,
      },
    ]

    for (const project of projects) {
      items.push({
        id: `project-${project.id}`,
        title: project.name,
        subtitle: project.baseUrl,
        group: 'Projects',
        icon: Folder,
        keywords: `project workspace ${project.name} ${project.baseUrl} ${project.description}`,
        action: () => onSelectProject(project.id),
      })
    }

    for (const roleProfile of roleProfiles) {
      items.push({
        id: `role-${roleProfile.id}`,
        title: `Open ${roleProfile.name}`,
        subtitle: roleProfile.startUrl,
        group: 'Role Profiles',
        icon: Play,
        keywords: `role profile session open ${roleProfile.name} ${roleProfile.startUrl}`,
        action: () => onOpenRoleProfile(roleProfile.id),
      })
    }

    for (const tab of tabs) {
      items.push({
        id: `tab-${tab.id}`,
        title: tab.title,
        subtitle: `${tab.roleName} tab`,
        group: 'Open Tabs',
        icon: Play,
        keywords: `tab switch active open ${tab.title} ${tab.roleName} ${tab.url}`,
        action: () => onSelectTab(tab.id),
      })
    }

    for (const recentUrl of recentUrls.slice(0, 12)) {
      items.push({
        id: `recent-${recentUrl.id}`,
        title: recentUrl.title || recentUrl.url,
        subtitle: recentUrl.url,
        group: 'Recent URLs',
        icon: Clock3,
        keywords: `recent history url ${recentUrl.title} ${recentUrl.url}`,
        action: () => onOpenRecentUrl(recentUrl),
      })
    }

    return items
  }, [
    activeProject,
    activeTab,
    canSplitView,
    onClearAllSessions,
    onClearProjectSessions,
    onCopyUrl,
    onCreateCommonRoles,
    onCreateProject,
    onCreateRoleProfile,
    onDuplicateTab,
    onOpenAllRoles,
    onOpenExternal,
    onOpenFirstRunGuide,
    onOpenRecentUrl,
    onOpenRoleProfile,
    onOpenSettings,
    onResetSession,
    onSelectProject,
    onSelectTab,
    onToggleSidebar,
    onToggleSplitView,
    projects,
    recentUrls,
    roleProfiles,
    sidebarOpen,
    splitViewEnabled,
    tabs,
  ])

  const visibleCommands = useMemo(() => {
    const normalizedQuery = normalizeSearch(query)

    if (!normalizedQuery) {
      return commands
    }

    return commands.filter((command) =>
      normalizeSearch(`${command.title} ${command.subtitle} ${command.group} ${command.keywords}`).includes(
        normalizedQuery,
      ),
    )
  }, [commands, query])

  useEffect(() => {
    if (!open) {
      return undefined
    }

    const frameId = window.requestAnimationFrame(() => {
      inputRef.current?.focus()
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [open])

  if (!open) {
    return null
  }

  const activeCommand = visibleCommands[Math.min(activeIndex, visibleCommands.length - 1)]

  function closePalette() {
    setQuery('')
    setActiveIndex(0)
    onClose()
  }

  function runCommand(command: CommandItem | undefined) {
    if (!command || command.disabled) {
      return
    }

    closePalette()
    void Promise.resolve(command.action())
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((currentIndex) => Math.min(currentIndex + 1, visibleCommands.length - 1))
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((currentIndex) => Math.max(currentIndex - 1, 0))
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      runCommand(activeCommand)
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      closePalette()
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-slate-950/30 px-4 pt-[10vh] backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="rt-surface w-full max-w-2xl overflow-hidden rounded-lg border shadow-2xl"
      >
        <div className="flex h-14 items-center gap-3 border-b border-[var(--rt-border)] px-4">
          <Search aria-hidden="true" size={18} className="shrink-0 text-[var(--rt-text-soft)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setActiveIndex(0)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Find an action, project, role, tab, or URL"
            className="rt-command-input h-full min-w-0 flex-1 bg-transparent text-sm text-[var(--rt-text)] outline-none placeholder:text-[var(--rt-text-soft)]"
          />
          <button type="button" onClick={closePalette} className="rt-icon-button" aria-label="Close command palette">
            <X aria-hidden="true" size={17} />
          </button>
        </div>

        <div className="max-h-[28rem] overflow-y-auto p-2">
          {visibleCommands.length === 0 ? (
            <div className="px-3 py-10 text-center text-sm text-[var(--rt-text-muted)]">
              No matching commands.
            </div>
          ) : (
            <CommandList commands={visibleCommands} activeCommandId={activeCommand?.id ?? null} onRun={runCommand} />
          )}
        </div>
        <div className="flex items-center justify-between border-t border-[var(--rt-border)] px-4 py-2 text-[11px] font-medium text-[var(--rt-text-soft)]">
          <span>Navigate with Up/Down</span>
          <span>Enter to run - Esc to close</span>
        </div>      </section>
    </div>
  )
}

type CommandListProps = {
  commands: CommandItem[]
  activeCommandId: string | null
  onRun: (command: CommandItem) => void
}

function CommandList({ commands, activeCommandId, onRun }: CommandListProps) {
  let currentGroup = ''

  return commands.map((command) => {
    const Icon = command.icon
    const groupChanged = command.group !== currentGroup
    currentGroup = command.group

    return (
      <div key={command.id}>
        {groupChanged ? <p className="rt-eyebrow px-2 pb-1 pt-3 text-[10px]">{command.group}</p> : null}
        <button
          type="button"
          disabled={command.disabled}
          onClick={() => onRun(command)}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
            command.id === activeCommandId
              ? 'bg-[var(--rt-surface-hover)] text-[var(--rt-text)]'
              : 'text-[var(--rt-text-muted)] hover:bg-[var(--rt-surface-hover)] hover:text-[var(--rt-text)]'
          } disabled:cursor-not-allowed disabled:opacity-45`}
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[var(--rt-border)] bg-[var(--rt-surface)]">
            <Icon aria-hidden="true" size={16} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{command.title}</span>
            <span className="mt-0.5 block truncate text-xs text-[var(--rt-text-muted)]">
              {command.subtitle}
            </span>
          </span>
        </button>
      </div>
    )
  })
}

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}