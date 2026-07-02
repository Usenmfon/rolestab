import { X } from 'lucide-react'
import type { BrowserTab } from '../../shared/workspace'

type TabBarProps = {
  tabs: BrowserTab[]
  activeTabId: string | null
  onSelectTab: (tabId: string) => void
  onCloseTab: (tabId: string) => void
}

export function TabBar({ tabs, activeTabId, onSelectTab, onCloseTab }: TabBarProps) {
  return (
    <div className="flex h-12 shrink-0 items-center gap-2 overflow-x-auto border-b border-slate-200 bg-slate-50 px-4">
      {tabs.length === 0 ? (
        <span className="text-sm text-slate-500">No role tabs open</span>
      ) : (
        tabs.map((tab) => {
          const active = tab.id === activeTabId

          return (
            <div
              key={tab.id}
              className={`group flex h-8 w-48 shrink-0 items-center gap-2 rounded-md border px-2 ${
                active
                  ? 'border-slate-900 bg-white text-slate-950 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: tab.roleColor }}
                />
                <span className="truncate text-sm font-medium">{tab.title}</span>
              </button>
              <button
                type="button"
                title="Close Tab"
                aria-label={`Close ${tab.title}`}
                onClick={() => onCloseTab(tab.id)}
                className="grid h-6 w-6 shrink-0 place-items-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"
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
