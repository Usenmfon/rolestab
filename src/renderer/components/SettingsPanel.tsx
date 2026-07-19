import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Check, Copy, Download, ExternalLink, RefreshCw, RotateCcw } from 'lucide-react'
import type { AppSettings, ProjectSummary } from '../../shared/workspace'
import type { RoleProfile } from '../../shared/workspace'
import type { UpdateStatus } from '../../shared/update'
import { normalizeHttpUrl } from '../utils/url'
import { ExtensionsSettingsSection } from './ExtensionsSettingsSection'
import type { ConfirmationRequest } from './ConfirmationDialog'

type SettingsPanelProps = {
  settings: AppSettings
  projects: ProjectSummary[]
  roleProfiles: RoleProfile[]
  onClose: () => void
  onOpenPrivacyPolicy: () => void
  onSubmit: (settings: AppSettings) => Promise<void>
  onReset: () => Promise<void>
  onRequestConfirmation: (request: ConfirmationRequest) => Promise<boolean>
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
  roleProfiles,
  onClose,
  onOpenPrivacyPolicy,
  onSubmit,
  onReset,
  onRequestConfirmation,
}: SettingsPanelProps) {
  const [draft, setDraft] = useState<AppSettings>(settings)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [appVersion, setAppVersion] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ state: 'idle' })
  const panelRef = useRef<HTMLElement | null>(null)

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

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const panel = panelRef.current

      if (panel && event.target instanceof Node && !panel.contains(event.target)) {
        onClose()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown, true)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
    }
  }, [onClose])
  async function handleCopyDiagnostics() {
    const diagnostics = [
      `RolesTab ${appVersion ?? 'unknown'}`,
      `Platform: ${platform}`,
      `Electron: ${engineVersions?.electron ?? 'unknown'}`,
      `Chrome: ${engineVersions?.chrome ?? 'unknown'}`,
      `Node: ${engineVersions?.node ?? 'unknown'}`,
    ].join('\n')

    try {
      if (window.rolesTab?.app.copyText) {
        await window.rolesTab.app.copyText(diagnostics)
      } else {
        await navigator.clipboard.writeText(diagnostics)
      }
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
    <aside ref={panelRef} className="rt-panel app-no-drag relative z-20 flex w-[30rem] shrink-0 flex-col border-l">
      <div className="flex h-24 items-start border-b border-[var(--rt-border)] px-5 pt-10">
        <div>
          <p className="rt-eyebrow">Workspace</p>
          <h2 className="rt-heading text-lg">Settings</h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="space-y-7">
          <section className="space-y-3.5">
            <h3 className="rt-heading text-sm">Startup</h3>
            <label className="block space-y-1.5">
              <span className="rt-label block">Default Homepage</span>
              <input
                value={draft.defaultHomepage}
                onChange={(event) =>
                  setDraft((currentDraft) => ({ ...currentDraft, defaultHomepage: event.target.value }))
                }
                placeholder="http://localhost:8000"
                className="rt-field"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="rt-label block">Default Project</span>
              <select
                value={draft.defaultProjectId ?? ''}
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    defaultProjectId: event.target.value || null,
                  }))
                }
                className="rt-field"
              >
                <option value="">Last active project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="rt-check-row flex items-center gap-2 px-3 py-2.5 text-sm font-medium">
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

          <section className="space-y-3.5">
            <h3 className="rt-heading text-sm">Appearance</h3>
            <div className="grid grid-cols-3 gap-2">
              {(['system', 'light', 'dark'] as const).map((theme) => (
                <button
                  key={theme}
                  type="button"
                  onClick={() => setDraft((currentDraft) => ({ ...currentDraft, theme }))}
                    className={`h-9 rounded-lg border px-3 text-sm font-semibold capitalize ${
                    draft.theme === theme
                      ? 'border-[var(--rt-primary)] bg-[var(--rt-primary)] text-white shadow-[var(--rt-shadow-sm)]'
                      : 'border-[var(--rt-border)] bg-[var(--rt-surface)] text-[var(--rt-text-muted)] hover:bg-[var(--rt-surface-hover)] hover:text-[var(--rt-text)]'
                  }`}
                >
                  {theme}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3.5">
            <h3 className="rt-heading text-sm">Role Colors</h3>
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
                  className="h-9 w-full cursor-pointer rounded-lg border border-[var(--rt-border)] bg-[var(--rt-surface)] p-1"
                  aria-label={`Default role color ${index + 1}`}
                />
              ))}
            </div>
          </section>

          <section className="space-y-3.5">
            <h3 className="rt-heading text-sm">Sessions</h3>
            <label className="rt-check-row flex items-center gap-2 px-3 py-2.5 text-sm font-medium">
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

          <section className="space-y-3.5">
            <h3 className="rt-heading text-sm">Privacy</h3>
            <label className="rt-check-row flex items-center gap-2 px-3 py-2.5 text-sm font-medium">
              <input
                type="checkbox"
                checked={draft.shareAnonymousAnalytics}
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    shareAnonymousAnalytics: event.target.checked,
                    analyticsConsentVersion: 1,
                  }))
                }
                className="h-4 w-4"
              />
              Share pseudonymous usage analytics
            </label>
            <p className="text-xs leading-5 text-slate-500">
              Off by default. Shares a random installation ID, app and session activity, platform
              details, feature usage, and fixed error codes. It never sends browsing destinations,
              role details, extension details, page content, or error messages.
            </p>
            <button
              type="button"
              onClick={onOpenPrivacyPolicy}
              className="text-xs font-semibold text-blue-700 hover:text-blue-800 hover:underline"
            >
              Read privacy policy
            </button>
          </section>

          <section className="space-y-3.5">
            <h3 className="rt-heading text-sm">Keyboard Shortcuts</h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(draft.keyboardShortcuts).map(([shortcutKey, shortcut]) => (
                <label key={shortcutKey} className="space-y-1">
                  <span className="text-xs font-medium text-slate-500">
                    {shortcutLabels[shortcutKey] ?? shortcutKey}
                  </span>
                  <input
                    value={shortcut}
                    onChange={(event) => updateShortcut(shortcutKey, event.target.value)}
                    className="rt-field rt-field-compact px-2"
                  />
                </label>
              ))}
            </div>
          </section>

          <ExtensionsSettingsSection
            roleProfiles={roleProfiles}
            onRequestConfirmation={onRequestConfirmation}
          />

          <section className="space-y-3.5">
            <h3 className="rt-heading text-sm">About</h3>
            <dl className="overflow-hidden rounded-lg border border-slate-200 text-sm">
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
                  className="flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  <Download aria-hidden="true" size={15} />
                  Restart to install
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCheckForUpdates}
                  disabled={checkingUpdates}
                  className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
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
                className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <ExternalLink aria-hidden="true" size={15} />
                Releases
              </button>
              <button
                type="button"
                onClick={handleCopyDiagnostics}
                className="flex h-9 min-w-[10rem] items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
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
          <div className="rt-alert-danger mt-5 rounded-lg px-3 py-2 text-sm">
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex gap-2 border-t border-[var(--rt-border)] pt-5">
          <button
            type="submit"
            disabled={saving}
            className="settings-save-button rt-button rt-button-primary flex-1"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={saving}
            className="rt-button rt-button-secondary"
          >
            <RotateCcw aria-hidden="true" size={15} />
            Reset
          </button>
        </div>
      </form>
    </aside>
  )
}
