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
  Sidebar,
  XCircle,
  X,
} from 'lucide-react'
import { type ChangeEvent, type FormEvent, type RefObject, useEffect, useState } from 'react'
import { IconButton } from './IconButton'

type TopBarProps = {
  currentUrl: string
  canGoBack: boolean
  canGoForward: boolean
  isLoading: boolean
  hasActiveProject: boolean
  hasActiveTab: boolean
  sidebarOpen: boolean
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
  onToggleSidebar: () => void
  urlInputRef: RefObject<HTMLInputElement | null>
}

export function TopBar({
  currentUrl,
  canGoBack,
  canGoForward,
  isLoading,
  hasActiveProject,
  hasActiveTab,
  sidebarOpen,
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
  onToggleSidebar,
  urlInputRef,
}: TopBarProps) {
  const [urlDraft, setUrlDraft] = useState(currentUrl)

  useEffect(() => {
    if (document.activeElement !== urlInputRef.current) {
      setUrlDraft(currentUrl)
    }
  }, [currentUrl, urlInputRef])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const url = urlDraft.trim()

    if (url) {
      onNavigate(url)
    }
  }

  function handleUrlChange(event: ChangeEvent<HTMLInputElement>) {
    setUrlDraft(event.target.value)
  }

  return (
    <header className="relative z-10 flex h-14 shrink-0 items-center gap-1.5 border-b border-[#d8dee8] bg-[#fbfcfe] px-3.5">
      <IconButton
        label={sidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
        icon={Sidebar}
        onClick={onToggleSidebar}
      />
      <div className="mx-1 h-6 w-px bg-slate-200" />
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
          name="url"
          value={urlDraft}
          onChange={handleUrlChange}
          disabled={!hasActiveTab}
          onFocus={(event) => event.currentTarget.select()}
          placeholder="Select a role tab to start browsing"
          className="h-10 w-full rounded-lg border border-transparent bg-[#eef3f8] px-4 text-[13px] text-slate-700 outline-none transition placeholder:text-slate-400 hover:bg-[#e7edf4] focus:border-blue-300 focus:bg-white focus:shadow-[0_0_0_3px_rgba(37,99,235,0.12)] disabled:text-slate-400"
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
