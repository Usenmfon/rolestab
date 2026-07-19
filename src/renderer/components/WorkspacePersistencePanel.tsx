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
    <section className="border-t border-[var(--rt-border)] pt-5">
      <div className="flex items-center gap-2 px-1">
        <ShieldAlert aria-hidden="true" size={14} className="text-[var(--rt-text-soft)]" />
        <h2 className="rt-eyebrow">Sessions</h2>
      </div>

      <div className="mt-3 space-y-2">
        <label data-tour-id="restore-workspace" className="rt-check-row flex items-center gap-2 px-3 py-2 text-xs font-semibold">
          <input
            type="checkbox"
            checked={settings.restoreTabsOnStartup}
            onChange={onToggleRestoreTabs}
            className="h-4 w-4 accent-blue-600"
          />
          Restore tabs on startup
        </label>

        <label className="rt-check-row flex items-center gap-2 px-3 py-2 text-xs font-semibold">
          <input
            type="checkbox"
            checked={settings.confirmBeforeClearingSessions}
            onChange={onToggleConfirmSessionClear}
            className="h-4 w-4 accent-blue-600"
          />
          Confirm session clears
        </label>
      </div>

      <div className="mt-3 rounded-lg border border-[var(--rt-border)] bg-[var(--rt-surface)] px-3 py-2.5">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="font-semibold text-[var(--rt-text)]">Stored role data</span>
          <span className="font-mono text-[11px] text-[var(--rt-text-muted)]">{formatBytes(totalSessionBytes)}</span>
        </div>
        <p className="mt-1 text-[11px] leading-4 text-[var(--rt-text-muted)]">
          {sessionUsage.length === 0
            ? 'No persistent role sessions yet.'
            : `${sessionUsage.length} persistent role partition${sessionUsage.length === 1 ? '' : 's'}.`}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={onClearProjectSessions} className="rt-button rt-button-secondary rt-button-small">
          <RotateCcw aria-hidden="true" size={14} />
          Project
        </button>
        <button type="button" onClick={onClearAllSessions} className="rt-button rt-button-secondary rt-button-small">
          <RotateCcw aria-hidden="true" size={14} />
          All
        </button>
      </div>

      <div className="mt-5 flex items-center gap-2 px-1">
        <Clock3 aria-hidden="true" size={14} className="text-[var(--rt-text-soft)]" />
        <h2 className="rt-eyebrow">Recent URLs</h2>
      </div>

      {recentUrls.length === 0 ? (
        <div className="mt-3 rounded-lg border border-dashed border-[var(--rt-border)] bg-[var(--rt-surface)] p-3 text-xs leading-5 text-[var(--rt-text-muted)]">
          Visited URLs will appear here.
        </div>
      ) : (
        <div className="mt-3 space-y-1.5">
          {recentUrls.slice(0, 5).map((recentUrl) => (
            <button
              key={recentUrl.id}
              type="button"
              onClick={() => onOpenRecentUrl(recentUrl)}
              className="block w-full rounded-lg border border-transparent px-3 py-2 text-left transition hover:border-[var(--rt-border)] hover:bg-[var(--rt-surface)]"
            >
              <span className="block truncate text-xs font-semibold text-[var(--rt-text)]">
                {recentUrl.title || recentUrl.url}
              </span>
              <span className="mt-1 block truncate text-[11px] text-[var(--rt-text-muted)]">
                {recentUrl.url}
              </span>
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