import { useEffect, useState, type FormEvent } from 'react'
import { Check, Copy, Download, ExternalLink, RefreshCw, RotateCcw, X } from 'lucide-react'
import type { AppSettings, ProjectSummary } from '../../shared/workspace'
import type { UpdateStatus } from '../../shared/update'
import { normalizeHttpUrl } from '../utils/url'

type SettingsPanelProps = {
  settings: AppSettings
  projects: ProjectSummary[]
  onClose: () => void
  onSubmit: (settings: AppSettings) => Promise<void>
  onReset: () => Promise<void>
}

const releasesUrl = 'https://github.com/Usenmfon/rolestab/releases'

function describeUpdateStatus(status: UpdateStatus): string {
  switch (status.state) {
    case 'checking':
      return 'Checking for updates…'
    case 'available':
      return `Downloading version ${status.version}…`
    case 'downloading':
      return `Downloading update… ${status.percent}%`
    case 'downloaded':
      return `Version ${status.version} is ready to install.`
    case 'not-available':
      return 'You are on the latest version.'
    case 'error':
      return `Update check failed: ${status.message}`
    case 'unsupported':
      return status.reason
    default:
      return ''
  }
}

const shortcutLabels: Record<string, string> = {
  newTab: 'New tab',
  closeTab: 'Close tab',
  reload: 'Reload',
  hardReload: 'Hard reload',
  focusUrlBar: 'Focus URL',
  openDevTools: 'Open DevTools',
  nextTab: 'Next tab',
  previousTab: 'Previous tab',
  openAllRoles: 'Open all roles',
  clearActiveRoleSession: 'Clear active session',
}

export function SettingsPanel({
  settings,
  projects,
  onClose,
  onSubmit,
  onReset,
}: SettingsPanelProps) {
  const [draft, setDraft] = useState<AppSettings>(settings)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [appVersion, setAppVersion] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ state: 'idle' })

  const engineVersions = window.rolesTab?.app.versions
  const platform = window.rolesTab?.app.platform ?? 'unknown'
  const checkingUpdates =
    updateStatus.state === 'checking' ||
    updateStatus.state === 'available' ||
    updateStatus.state === 'downloading'

  useEffect(() => {
    let active = true

    void window.rolesTab?.app.getVersion().then((version) => {
      if (active) {
        setAppVersion(version)
      }
    })

    void window.rolesTab?.app.getUpdateStatus().then((status) => {
      if (active) {
        setUpdateStatus(status)
      }
    })

    const unsubscribe = window.rolesTab?.app.onUpdateStatus((status) => {
      setUpdateStatus(status)
    })

    return () => {
      active = false
      unsubscribe?.()
    }
  }, [])

  useEffect(() => {
    if (!copied) {
      return
    }

    const timer = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])

  async function handleCopyDiagnostics() {
    const diagnostics = [
      `RolesTab ${appVersion ?? 'unknown'}`,
      `Platform: ${platform}`,
      `Electron: ${engineVersions?.electron ?? 'unknown'}`,
      `Chrome: ${engineVersions?.chrome ?? 'unknown'}`,
      `Node: ${engineVersions?.node ?? 'unknown'}`,
    ].join('\n')

    try {
      await navigator.clipboard.writeText(diagnostics)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  function handleOpenReleases() {
    void window.rolesTab?.app.openExternal(releasesUrl)
  }

  function handleCheckForUpdates() {
    void window.rolesTab?.app.checkForUpdates().then((status) => {
      setUpdateStatus(status)
    })
  }

  function handleInstallUpdate() {
    void window.rolesTab?.app.quitAndInstall()
  }

  const updateMessage = describeUpdateStatus(updateStatus)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSaving(true)

    try {
      const defaultHomepage = draft.defaultHomepage.trim()

      await onSubmit({
        ...draft,
        defaultHomepage: defaultHomepage ? normalizeHttpUrl(defaultHomepage) : '',
        defaultRoleColors: draft.defaultRoleColors.filter((color) => /^#[\da-f]{6}$/i.test(color)),
      })
      onClose()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save settings.')
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    setError(null)
    setSaving(true)

    try {
      await onReset()
      onClose()
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Unable to reset settings.')
    } finally {
      setSaving(false)
    }
  }

  function updateShortcut(shortcutKey: string, value: string) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      keyboardShortcuts: {
        ...currentDraft.keyboardShortcuts,
        [shortcutKey]: value,
      },
    }))
  }

  return (
    <aside className="relative z-20 flex w-[30rem] shrink-0 flex-col border-l border-slate-200 bg-white">
      <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Workspace</p>
          <h2 className="text-lg font-semibold text-slate-950">Settings</h2>
        </div>
        <button
          type="button"
          aria-label="Close settings"
          title="Close"
          onClick={onClose}
          className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
        >
          <X aria-hidden="true" size={17} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-950">Startup</h3>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Default Homepage</span>
              <input
                value={draft.defaultHomepage}
                onChange={(event) =>
                  setDraft((currentDraft) => ({ ...currentDraft, defaultHomepage: event.target.value }))
                }
                placeholder="http://localhost:8000"
                className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none transition focus:border-slate-900"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Default Project</span>
              <select
                value={draft.defaultProjectId ?? ''}
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    defaultProjectId: event.target.value || null,
                  }))
                }
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-900"
              >
                <option value="">Last active project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={draft.restoreTabsOnStartup}
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    restoreTabsOnStartup: event.target.checked,
                  }))
                }
                className="h-4 w-4"
              />
              Restore previous tabs on startup
            </label>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-950">Appearance</h3>
            <div className="grid grid-cols-3 gap-2">
              {(['system', 'light', 'dark'] as const).map((theme) => (
                <button
                  key={theme}
                  type="button"
                  onClick={() => setDraft((currentDraft) => ({ ...currentDraft, theme }))}
                  className={`h-9 rounded-md border px-3 text-sm font-semibold capitalize ${
                    draft.theme === theme
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {theme}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-950">Role Colors</h3>
            <div className="grid grid-cols-6 gap-2">
              {draft.defaultRoleColors.map((color, index) => (
                <input
                  key={`${color}-${index}`}
                  type="color"
                  value={color}
                  onChange={(event) =>
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      defaultRoleColors: currentDraft.defaultRoleColors.map((currentColor, colorIndex) =>
                        colorIndex === index ? event.target.value : currentColor,
                      ),
                    }))
                  }
                  className="h-9 w-full cursor-pointer rounded border border-slate-200 bg-white p-1"
                  aria-label={`Default role color ${index + 1}`}
                />
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-950">Sessions</h3>
            <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={draft.confirmBeforeClearingSessions}
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    confirmBeforeClearingSessions: event.target.checked,
                  }))
                }
                className="h-4 w-4"
              />
              Confirm before clearing sessions
            </label>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-950">Keyboard Shortcuts</h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(draft.keyboardShortcuts).map(([shortcutKey, shortcut]) => (
                <label key={shortcutKey} className="space-y-1">
                  <span className="text-xs font-medium text-slate-500">
                    {shortcutLabels[shortcutKey] ?? shortcutKey}
                  </span>
                  <input
                    value={shortcut}
                    onChange={(event) => updateShortcut(shortcutKey, event.target.value)}
                    className="h-9 w-full rounded-md border border-slate-200 px-2 text-sm outline-none transition focus:border-slate-900"
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-950">About</h3>
            <dl className="overflow-hidden rounded-md border border-slate-200 text-sm">
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-3 py-2">
                <dt className="font-medium text-slate-500">Version</dt>
                <dd className="font-semibold text-slate-900">{appVersion ?? '—'}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-3 py-2">
                <dt className="font-medium text-slate-500">Platform</dt>
                <dd className="text-slate-700">{platform}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-3 py-2">
                <dt className="font-medium text-slate-500">Electron</dt>
                <dd className="text-slate-700">{engineVersions?.electron ?? '—'}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-3 py-2">
                <dt className="font-medium text-slate-500">Chrome</dt>
                <dd className="text-slate-700">{engineVersions?.chrome ?? '—'}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-3 py-2">
                <dt className="font-medium text-slate-500">Node</dt>
                <dd className="text-slate-700">{engineVersions?.node ?? '—'}</dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2">
              {updateStatus.state === 'downloaded' ? (
                <button
                  type="button"
                  onClick={handleInstallUpdate}
                  className="flex h-9 items-center gap-2 rounded-md bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  <Download aria-hidden="true" size={15} />
                  Restart to install
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCheckForUpdates}
                  disabled={checkingUpdates}
                  className="flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  <RefreshCw
                    aria-hidden="true"
                    size={15}
                    className={checkingUpdates ? 'animate-spin' : undefined}
                  />
                  Check for updates
                </button>
              )}
              <button
                type="button"
                onClick={handleOpenReleases}
                className="flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <ExternalLink aria-hidden="true" size={15} />
                Releases
              </button>
              <button
                type="button"
                onClick={handleCopyDiagnostics}
                className="flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {copied ? <Check aria-hidden="true" size={15} /> : <Copy aria-hidden="true" size={15} />}
                {copied ? 'Copied' : 'Copy diagnostics'}
              </button>
            </div>
            {updateMessage ? (
              <p
                className={`text-xs ${
                  updateStatus.state === 'error' ? 'text-red-600' : 'text-slate-500'
                }`}
              >
                {updateMessage}
              </p>
            ) : null}
          </section>
        </div>

        {error ? (
          <div className="mt-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex gap-2 border-t border-slate-200 pt-5">
          <button
            type="submit"
            disabled={saving}
            className="h-10 flex-1 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={saving}
            className="flex h-10 items-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            <RotateCcw aria-hidden="true" size={15} />
            Reset
          </button>
        </div>
      </form>
    </aside>
  )
}
