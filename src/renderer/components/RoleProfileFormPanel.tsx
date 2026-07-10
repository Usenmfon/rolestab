import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import type { ProjectSummary, RoleProfile } from '../../shared/workspace'
import { normalizeHttpUrl } from '../utils/url'

export type RoleProfileDraft = Pick<RoleProfile, 'name' | 'color' | 'startUrl'>

type RoleProfileFormPanelProps = {
  project: ProjectSummary
  roleProfile: RoleProfile | null
  presetColors: string[]
  onClose: () => void
  onSubmit: (draft: RoleProfileDraft) => Promise<void>
}

export function RoleProfileFormPanel({
  project,
  roleProfile,
  presetColors,
  onClose,
  onSubmit,
}: RoleProfileFormPanelProps) {
  const [name, setName] = useState(roleProfile?.name ?? '')
  const [color, setColor] = useState(roleProfile?.color ?? presetColors[0] ?? '#2563eb')
  const [startUrl, setStartUrl] = useState(roleProfile?.startUrl ?? project.baseUrl)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSaving(true)

    try {
      const trimmedName = name.trim()

      if (!trimmedName) {
        throw new Error('Role name is required.')
      }

      await onSubmit({
        name: trimmedName,
        color,
        startUrl: normalizeHttpUrl(startUrl.trim() || project.baseUrl),
      })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save role profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <aside className="relative z-20 flex w-96 shrink-0 flex-col border-l border-slate-200 bg-white shadow-[-12px_0_28px_rgba(15,23,42,0.08)]">
      <div className="flex h-24 items-start justify-between border-b border-slate-200 px-5 pt-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {project.name}
          </p>
          <h2 className="text-lg font-semibold text-slate-950">
            {roleProfile ? 'Edit Role' : 'New Role'}
          </h2>
        </div>
        <button
          type="button"
          aria-label="Close role form"
          title="Close"
          onClick={onClose}
          className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
        >
          <X aria-hidden="true" size={17} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5 p-5">
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Role Name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Admin"
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-300 focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]"
          />
        </label>

        <div className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Color</span>
          <div className="flex items-center gap-2">
            {presetColors.map((presetColor) => (
              <button
                key={presetColor}
                type="button"
                title={presetColor}
                aria-label={`Use color ${presetColor}`}
                onClick={() => setColor(presetColor)}
                className={`h-8 w-8 rounded-lg border ${
                  color === presetColor ? 'border-slate-950' : 'border-slate-200'
                }`}
                style={{ backgroundColor: presetColor }}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="h-8 w-10 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
              aria-label="Custom role color"
            />
          </div>
        </div>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Start URL</span>
          <input
            value={startUrl}
            onChange={(event) => setStartUrl(event.target.value)}
            placeholder={project.baseUrl}
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-300 focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]"
          />
        </label>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-auto flex gap-2 border-t border-slate-200 pt-5">
          <button
            type="submit"
            disabled={saving}
            className="h-10 flex-1 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {saving ? 'Saving...' : 'Save Role'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </aside>
  )
}
