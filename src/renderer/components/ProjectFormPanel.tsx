import { useEffect, useRef, useState, type FormEvent } from 'react'
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
  const nameInputRef = useRef<HTMLInputElement | null>(null)
  const [name, setName] = useState(project?.name ?? '')
  const [baseUrl, setBaseUrl] = useState(project?.baseUrl ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      nameInputRef.current?.focus()
      nameInputRef.current?.select()
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [project?.id])

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
    <aside className="rt-panel app-no-drag relative z-20 flex w-96 shrink-0 flex-col border-l">
      <div className="flex h-24 items-start justify-between border-b border-[var(--rt-border)] px-5 pt-10">
        <div>
          <p className="rt-eyebrow">
            Project
          </p>
          <h2 className="rt-heading text-lg">
            {project ? 'Edit Project' : 'New Project'}
          </h2>
        </div>
        <button
          type="button"
          aria-label="Close project form"
          title="Close"
          onClick={onClose}
          className="rt-icon-button h-9 w-9 border border-[var(--rt-border)]"
        >
          <X aria-hidden="true" size={17} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5 p-5">
        <label className="space-y-2">
          <span className="rt-label">Name</span>
          <input
            ref={nameInputRef}
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Local Laravel App"
            className="rt-field"
          />
        </label>

        <label className="space-y-2">
          <span className="rt-label">Base URL</span>
          <input
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            placeholder="http://localhost:8000"
            className="rt-field"
          />
        </label>

        <label className="space-y-2">
          <span className="rt-label">Description</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Testing different user roles"
            rows={4}
            className="rt-field resize-none"
          />
        </label>

        {error ? (
          <div className="rt-alert-danger rounded-lg px-3 py-2 text-sm">
            {error}
          </div>
        ) : null}

        <div className="mt-auto flex gap-2 border-t border-[var(--rt-border)] pt-5">
          <button
            type="submit"
            disabled={saving}
            className="rt-button rt-button-primary flex-1"
          >
            {saving ? 'Saving...' : 'Save Project'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rt-button rt-button-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </aside>
  )
}
