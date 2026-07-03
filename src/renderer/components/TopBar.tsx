import {
  ArrowLeft,
  ArrowRight,
  Bug,
  Clipboard,
  Copy,
  ExternalLink,
  Home,
  PencilLine,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  XCircle,
  X,
} from 'lucide-react'
import { type FormEvent, type RefObject } from 'react'
import { IconButton } from './IconButton'

type TopBarProps = {
  currentUrl: string
  canGoBack: boolean
  canGoForward: boolean
  isLoading: boolean
  hasActiveProject: boolean
  hasActiveTab: boolean
  onNewTab: () => void
  onCloseTab: () => void
  onDuplicateTab: () => void
  onRenameTab: () => void
  onResetSession: () => void
  onBack: () => void
  onForward: () => void
  onReload: () => void
  onStop: () => void
  onHome: () => void
  onNavigate: (url: string) => void
  onCopyUrl: () => void
  onOpenExternal: () => void
  onOpenDevTools: () => void
  onInspectElement: () => void
  urlInputRef: RefObject<HTMLInputElement | null>
}

export function TopBar({
  currentUrl,
  canGoBack,
  canGoForward,
  isLoading,
  hasActiveProject,
  hasActiveTab,
  onNewTab,
  onCloseTab,
  onDuplicateTab,
  onRenameTab,
  onResetSession,
  onBack,
  onForward,
  onReload,
  onStop,
  onHome,
  onNavigate,
  onCopyUrl,
  onOpenExternal,
  onOpenDevTools,
  onInspectElement,
  urlInputRef,
}: TopBarProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const url = String(formData.get('url') ?? '')

    if (url.trim()) {
      onNavigate(url)
    }
  }

  return (
    <header className="relative flex h-12 shrink-0 items-center gap-1 border-b border-[#d7dce3] bg-white px-3">
      <IconButton label="Back" icon={ArrowLeft} onClick={onBack} disabled={!hasActiveTab || !canGoBack} />
      <IconButton
        label="Forward"
        icon={ArrowRight}
        onClick={onForward}
        disabled={!hasActiveTab || !canGoForward}
      />
      {isLoading ? (
        <IconButton label="Stop Loading" icon={XCircle} onClick={onStop} disabled={!hasActiveTab} />
      ) : (
        <IconButton label="Reload" icon={RefreshCw} onClick={onReload} disabled={!hasActiveTab} />
      )}
      <IconButton label="Home" icon={Home} onClick={onHome} disabled={!hasActiveProject} />

      <form onSubmit={handleSubmit} className="mx-2 min-w-0 flex-1">
        <input
          ref={urlInputRef}
          key={currentUrl}
          name="url"
          defaultValue={currentUrl}
          disabled={!hasActiveTab}
          placeholder="Select a role tab to start browsing"
          className="h-9 w-full rounded-full border border-transparent bg-[#edf1f5] px-4 text-[13px] text-slate-700 outline-none transition placeholder:text-slate-400 hover:bg-[#e7ecf2] focus:border-blue-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(59,130,246,0.14)] disabled:text-slate-400"
        />
      </form>

      <IconButton label="New Role Tab" icon={Plus} onClick={onNewTab} disabled={!hasActiveProject} />
      <IconButton label="Duplicate Role Tab" icon={Copy} onClick={onDuplicateTab} disabled={!hasActiveTab} />
      <IconButton label="Rename Tab" icon={PencilLine} onClick={onRenameTab} disabled={!hasActiveTab} />
      <IconButton label="Reset Active Role Session" icon={RotateCcw} onClick={onResetSession} disabled={!hasActiveTab} />
      <IconButton label="Close Tab" icon={X} onClick={onCloseTab} disabled={!hasActiveTab} />
      <IconButton label="Copy Current URL" icon={Clipboard} onClick={onCopyUrl} disabled={!hasActiveTab} />
      <IconButton label="Open External Browser" icon={ExternalLink} onClick={onOpenExternal} disabled={!hasActiveTab} />
      <IconButton label="Open DevTools" icon={Bug} onClick={onOpenDevTools} disabled={!hasActiveTab} />
      <IconButton label="Inspect Element" icon={Search} onClick={onInspectElement} disabled={!hasActiveTab} />

      {isLoading ? (
        <div className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-slate-100">
          <div className="h-full w-1/3 animate-pulse bg-blue-500" />
        </div>
      ) : null}
    </header>
  )
}
