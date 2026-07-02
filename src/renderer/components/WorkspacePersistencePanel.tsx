import { Clock3, RotateCcw, ShieldAlert } from 'lucide-react'
import type { AppSettings, RecentUrl } from '../../shared/workspace'

type WorkspacePersistencePanelProps = {
  settings: AppSettings
  recentUrls: RecentUrl[]
  onToggleRestoreTabs: () => void
  onToggleConfirmSessionClear: () => void
  onOpenRecentUrl: (recentUrl: RecentUrl) => void
  onClearProjectSessions: () => void
  onClearAllSessions: () => void
}

export function WorkspacePersistencePanel({
  settings,
  recentUrls,
  onToggleRestoreTabs,
  onToggleConfirmSessionClear,
  onOpenRecentUrl,
  onClearProjectSessions,
  onClearAllSessions,
}: WorkspacePersistencePanelProps) {
  return (
    <section className="min-h-0">
      <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
        <input
          type="checkbox"
          checked={settings.restoreTabsOnStartup}
          onChange={onToggleRestoreTabs}
          className="h-4 w-4"
        />
        Restore tabs on startup
      </label>

      <label className="mt-2 flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
        <input
          type="checkbox"
          checked={settings.confirmBeforeClearingSessions}
          onChange={onToggleConfirmSessionClear}
          className="h-4 w-4"
        />
        Confirm session clears
      </label>

      <div className="mt-4 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <ShieldAlert aria-hidden="true" size={14} />
        Sessions
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onClearProjectSessions}
          className="flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RotateCcw aria-hidden="true" size={14} />
          Project
        </button>
        <button
          type="button"
          onClick={onClearAllSessions}
          className="flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RotateCcw aria-hidden="true" size={14} />
          All
        </button>
      </div>

      <div className="mt-4 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <Clock3 aria-hidden="true" size={14} />
        Recent URLs
      </div>

      {recentUrls.length === 0 ? (
        <div className="mt-3 rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-xs leading-5 text-slate-500">
          Visited URLs will appear here.
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {recentUrls.slice(0, 5).map((recentUrl) => (
            <button
              key={recentUrl.id}
              type="button"
              onClick={() => onOpenRecentUrl(recentUrl)}
              className="block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-left hover:bg-slate-50"
            >
              <span className="block truncate text-xs font-semibold text-slate-700">
                {recentUrl.title || recentUrl.url}
              </span>
              <span className="mt-1 block truncate text-[11px] text-slate-500">{recentUrl.url}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
