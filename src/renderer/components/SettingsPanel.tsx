import { useState, type FormEvent } from 'react'
import { RotateCcw, X } from 'lucide-react'
import type { AppSettings, ProjectSummary } from '../../shared/workspace'
import { normalizeHttpUrl } from '../utils/url'

type SettingsPanelProps = {
  settings: AppSettings
  projects: ProjectSummary[]
  onClose: () => void
  onSubmit: (settings: AppSettings) => Promise<void>
  onReset: () => Promise<void>
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
