import { Clock3, RotateCcw, ShieldAlert } from 'lucide-react'
import type { AppSettings, RecentUrl } from '../../shared/workspace'
import type { SessionUsage } from '../../shared/session'

type WorkspacePersistencePanelProps = {
  settings: AppSettings
  recentUrls: RecentUrl[]
  sessionUsage: SessionUsage[]
  onToggleRestoreTabs: () => void
  onToggleConfirmSessionClear: () => void
  onOpenRecentUrl: (recentUrl: RecentUrl) => void
  onClearProjectSessions: () => void
  onClearAllSessions: () => void
}

export function WorkspacePersistencePanel({
  settings,
  recentUrls,
  sessionUsage,
  onToggleRestoreTabs,
  onToggleConfirmSessionClear,
  onOpenRecentUrl,
  onClearProjectSessions,
  onClearAllSessions,
}: WorkspacePersistencePanelProps) {
  const totalSessionBytes = sessionUsage.reduce((total, usage) => total + usage.totalBytes, 0)

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
        <input
          type="checkbox"
          checked={settings.restoreTabsOnStartup}
          onChange={onToggleRestoreTabs}
          className="h-4 w-4"
        />
        Restore tabs on startup
      </label>

      <label className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
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

      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="font-semibold text-slate-700">Stored role data</span>
          <span className="font-mono text-[11px] text-slate-500">{formatBytes(totalSessionBytes)}</span>
        </div>
        <p className="mt-1 text-[11px] leading-4 text-slate-500">
          {sessionUsage.length === 0
            ? 'No persistent role sessions yet.'
            : `${sessionUsage.length} persistent role partition${sessionUsage.length === 1 ? '' : 's'}.`}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onClearProjectSessions}
          className="flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RotateCcw aria-hidden="true" size={14} />
          Project
        </button>
        <button
          type="button"
          onClick={onClearAllSessions}
          className="flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
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
        <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-xs leading-5 text-slate-500">
          Visited URLs will appear here.
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {recentUrls.slice(0, 5).map((recentUrl) => (
            <button
              key={recentUrl.id}
              type="button"
              onClick={() => onOpenRecentUrl(recentUrl)}
              className="block w-full rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-left transition hover:border-slate-300 hover:bg-white"
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

function formatBytes(bytes: number): string {
  if (bytes <= 0) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB']
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** unitIndex

  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`
}
