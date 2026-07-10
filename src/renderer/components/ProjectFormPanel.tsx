import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import type { ProjectSummary } from '../../shared/workspace'
import { normalizeHttpUrl } from '../utils/url'

export type ProjectDraft = Pick<ProjectSummary, 'name' | 'baseUrl' | 'description'>

type ProjectFormPanelProps = {
  project: ProjectSummary | null
  onClose: () => void
  onSubmit: (draft: ProjectDraft) => Promise<void>
}

export function ProjectFormPanel({ project, onClose, onSubmit }: ProjectFormPanelProps) {
  const [name, setName] = useState(project?.name ?? '')
  const [baseUrl, setBaseUrl] = useState(project?.baseUrl ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSaving(true)

    try {
      const normalizedUrl = normalizeHttpUrl(baseUrl)
      const trimmedName = name.trim()

      if (!trimmedName) {
        throw new Error('Project name is required.')
      }

      await onSubmit({
        name: trimmedName,
        baseUrl: normalizedUrl,
        description: description.trim(),
      })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save project.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <aside className="relative z-20 flex w-96 shrink-0 flex-col border-l border-slate-200 bg-white shadow-[-12px_0_28px_rgba(15,23,42,0.08)]">
      <div className="flex h-24 items-start justify-between border-b border-slate-200 px-5 pt-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Project
          </p>
          <h2 className="text-lg font-semibold text-slate-950">
            {project ? 'Edit Project' : 'New Project'}
          </h2>
        </div>
        <button
          type="button"
          aria-label="Close project form"
          title="Close"
          onClick={onClose}
          className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
        >
          <X aria-hidden="true" size={17} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5 p-5">
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Local Laravel App"
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-300 focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Base URL</span>
          <input
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            placeholder="http://localhost:8000"
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-300 focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Description</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Testing different user roles"
            rows={4}
            className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-300 focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]"
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
            {saving ? 'Saving...' : 'Save Project'}
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
