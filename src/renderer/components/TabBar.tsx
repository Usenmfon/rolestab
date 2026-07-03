import { Loader2, X } from 'lucide-react'
import type { BrowserTab } from '../../shared/workspace'

type TabBarProps = {
  tabs: BrowserTab[]
  activeTabId: string | null
  onSelectTab: (tabId: string) => void
  onCloseTab: (tabId: string) => void
}

export function TabBar({ tabs, activeTabId, onSelectTab, onCloseTab }: TabBarProps) {
  return (
    <div className="flex h-10 shrink-0 items-end gap-1 overflow-x-auto border-b border-[#d7dce3] bg-[#e8eaed] px-2 pt-1">
      {tabs.length === 0 ? (
        <span className="mb-2 px-3 text-sm text-slate-500">No role tabs open</span>
      ) : (
        tabs.map((tab) => {
          const active = tab.id === activeTabId

          return (
            <div
              key={tab.id}
              className={`group flex h-9 w-56 shrink-0 items-center gap-2 rounded-t-xl px-3 transition ${
                active
                  ? 'bg-white text-slate-950 shadow-[0_-1px_0_rgba(15,23,42,0.08),1px_0_0_rgba(15,23,42,0.08),-1px_0_0_rgba(15,23,42,0.08)]'
                  : 'bg-[#dfe3e8] text-slate-600 hover:bg-[#e9edf2]'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                {tab.faviconUrl ? (
                  <img src={tab.faviconUrl} alt="" className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: tab.roleColor }}
                  />
                )}
                <span className="truncate text-[13px] font-medium">{tab.title}</span>
              </button>
              {tab.loading ? (
                <Loader2 aria-hidden="true" size={13} className="shrink-0 animate-spin text-slate-400" />
              ) : null}
              <button
                type="button"
                title="Close Tab"
                aria-label={`Close ${tab.title}`}
                onClick={() => onCloseTab(tab.id)}
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700"
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
