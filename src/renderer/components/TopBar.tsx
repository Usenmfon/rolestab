import {
  ArrowLeft,
  ArrowRight,
  Bug,
  ExternalLink,
  Home,
  Plus,
  RefreshCw,
  X,
} from 'lucide-react'
import { IconButton } from './IconButton'

type TopBarProps = {
  currentUrl: string
  hasActiveProject: boolean
  hasActiveTab: boolean
  onNewTab: () => void
  onCloseTab: () => void
}

export function TopBar({
  currentUrl,
  hasActiveProject,
  hasActiveTab,
  onNewTab,
  onCloseTab,
}: TopBarProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-4">
      <IconButton label="Back" icon={ArrowLeft} disabled={!hasActiveTab} />
      <IconButton label="Forward" icon={ArrowRight} disabled={!hasActiveTab} />
      <IconButton label="Reload" icon={RefreshCw} disabled={!hasActiveTab} />
      <IconButton label="Home" icon={Home} disabled={!hasActiveProject} />

      <div className="mx-2 flex h-9 min-w-0 flex-1 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600">
        <span className="truncate">{currentUrl || 'Select a project to start browsing'}</span>
      </div>

      <IconButton label="New Role Tab" icon={Plus} onClick={onNewTab} disabled={!hasActiveProject} />
      <IconButton label="Close Tab" icon={X} onClick={onCloseTab} disabled={!hasActiveTab} />
      <IconButton label="Open External Browser" icon={ExternalLink} disabled={!hasActiveTab} />
      <IconButton label="Open DevTools" icon={Bug} disabled={!hasActiveTab} />
    </header>
  )
}
