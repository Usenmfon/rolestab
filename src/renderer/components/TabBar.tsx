import { Columns2, Loader2, X } from 'lucide-react'
import { type KeyboardEvent, useEffect, useRef, useState } from 'react'
import type { BrowserTab } from '../../shared/workspace'

type TabBarProps = {
  tabs: BrowserTab[]
  activeTabId: string | null
  splitTabId: string | null
  renamingTabId: string | null
  onSelectTab: (tabId: string) => void
  onCloseTab: (tabId: string) => void
  onStartRename: (tabId: string) => void
  onRenameTab: (tabId: string, title: string) => void
  onCancelRename: () => void
  onToggleSplitTab: (tabId: string) => void
}

export function TabBar({
  tabs,
  activeTabId,
  splitTabId,
  renamingTabId,
  onSelectTab,
  onCloseTab,
  onStartRename,
  onRenameTab,
  onCancelRename,
  onToggleSplitTab,
}: TabBarProps) {
  return (
    <div className="app-drag-region rt-muted-surface relative z-10 flex h-12 shrink-0 items-end gap-1 overflow-x-auto border-b border-[var(--rt-border)] px-2.5 pr-36 pt-2">
      {tabs.length === 0 ? (
        <span className="mb-2.5 px-3 text-sm text-[var(--rt-text-muted)]">No role tabs open</span>
      ) : (
        tabs.map((tab) => {
          const active = tab.id === activeTabId
          const split = tab.id === splitTabId

          return (
            <div
              key={tab.id}
              className={`app-no-drag group relative flex h-9 w-56 shrink-0 items-center gap-2 rounded-t-lg border px-2.5 transition ${
                active
                  ? 'border-[var(--rt-border)] border-b-[var(--rt-surface-raised)] bg-[var(--rt-surface-raised)] text-[var(--rt-text)] shadow-[0_-1px_0_rgba(15,23,42,0.04),1px_0_0_rgba(15,23,42,0.04),-1px_0_0_rgba(15,23,42,0.04)]'
                  : split
                    ? 'border-blue-300 bg-blue-50 text-blue-700'
                    : 'border-transparent bg-transparent text-[var(--rt-text-muted)] hover:border-[var(--rt-border)] hover:bg-[var(--rt-surface)]'
              }`}
            >
              <span
                aria-hidden="true"
                className="absolute inset-x-2 top-0 h-0.5 rounded-full"
                style={{ backgroundColor: tab.roleColor }}
              />
              {renamingTabId === tab.id ? (
                <RenameTabInput
                  key={tab.id}
                  tabId={tab.id}
                  initialTitle={tab.title}
                  onRenameTab={onRenameTab}
                  onCancelRename={onCancelRename}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => onSelectTab(tab.id)}
                  onDoubleClick={() => onStartRename(tab.id)}
                  className="app-no-drag flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  {tab.faviconUrl ? (
                    <img src={tab.faviconUrl} alt="" className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: tab.roleColor }}
                    />
                  )}
                  <span className="truncate text-[13px] font-semibold">{tab.title}</span>
                </button>
              )}
              {tab.loading ? (
                <Loader2 aria-hidden="true" size={13} className="shrink-0 animate-spin text-[var(--rt-text-soft)]" />
              ) : null}
              <button
                type="button"
                title={
                  split
                    ? 'Remove from split view'
                    : active
                      ? 'Active tab is the left pane'
                      : 'Show beside active tab'
                }
                aria-label={
                  split ? `Remove ${tab.title} from split view` : `Show ${tab.title} beside active tab`
                }
                onClick={() => onToggleSplitTab(tab.id)}
                disabled={active}
                className={`app-no-drag grid h-6 w-6 shrink-0 place-items-center rounded-md transition ${
                  split
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    : 'text-[var(--rt-text-soft)] opacity-0 hover:bg-[var(--rt-surface-hover)] hover:text-[var(--rt-text)] group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-30'
                }`}
              >
                <Columns2 aria-hidden="true" size={14} />
              </button>
              <button
                type="button"
                title="Close Tab"
                aria-label={`Close ${tab.title}`}
                onClick={() => onCloseTab(tab.id)}
                className="app-no-drag grid h-6 w-6 shrink-0 place-items-center rounded-md text-[var(--rt-text-soft)] opacity-0 transition hover:bg-[var(--rt-surface-hover)] hover:text-[var(--rt-text)] group-hover:opacity-100"
              >
                <X aria-hidden="true" size={14} />
              </button>
            </div>
          )
        })
      )}
    </div>
  )
}

type RenameTabInputProps = {
  tabId: string
  initialTitle: string
  onRenameTab: (tabId: string, title: string) => void
  onCancelRename: () => void
}

function RenameTabInput({ tabId, initialTitle, onRenameTab, onCancelRename }: RenameTabInputProps) {
  const [titleDraft, setTitleDraft] = useState(initialTitle)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const cancelRenameRef = useRef(false)

  useEffect(() => {
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
  }, [])

  function finishRename() {
    if (cancelRenameRef.current) {
      cancelRenameRef.current = false
      return
    }

    const nextTitle = titleDraft.trim()

    if (nextTitle) {
      onRenameTab(tabId, nextTitle)
    } else {
      onCancelRename()
    }
  }

  function handleRenameKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      finishRename()
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      cancelRenameRef.current = true
      onCancelRename()
    }
  }

  return (
    <input
      ref={inputRef}
      value={titleDraft}
      onChange={(event) => setTitleDraft(event.target.value)}
      onBlur={finishRename}
      onKeyDown={handleRenameKeyDown}
      className="rt-field rt-field-compact app-no-drag min-w-0 flex-1 px-2 text-[13px] font-semibold"
      aria-label="Tab title"
    />
  )
}