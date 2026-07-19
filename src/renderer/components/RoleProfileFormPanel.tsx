import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { ProjectSummary, RoleProfile } from '../../shared/workspace'
import { normalizeHttpUrl } from '../utils/url'

export type RoleProfileDraft = Pick<RoleProfile, 'name' | 'color' | 'startUrl'> & {
  openImmediately: boolean
}

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
  const nameInputRef = useRef<HTMLInputElement | null>(null)
  const [name, setName] = useState(roleProfile?.name ?? '')
  const [color, setColor] = useState(roleProfile?.color ?? presetColors[0] ?? '#2563eb')
  const [startUrl, setStartUrl] = useState(roleProfile?.startUrl ?? project.baseUrl)
  const [openImmediately, setOpenImmediately] = useState(!roleProfile)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      nameInputRef.current?.focus()
      nameInputRef.current?.select()
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [roleProfile?.id, project.id])

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
        openImmediately: !roleProfile && openImmediately,
      })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save role profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <aside className="rt-panel app-no-drag relative z-20 flex w-96 shrink-0 flex-col border-l">
      <div className="flex h-24 items-start justify-between border-b border-[var(--rt-border)] px-5 pt-10">
        <div>
          <p className="rt-eyebrow">
            {project.name}
          </p>
          <h2 className="rt-heading text-lg">
            {roleProfile ? 'Edit Role' : 'New Role'}
          </h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5 p-5">
        <label className="space-y-2">
          <span className="rt-label">Role Name</span>
          <input
            ref={nameInputRef}
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Admin"
            className="rt-field"
          />
        </label>

        <div className="space-y-2">
          <span className="rt-label">Color</span>
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
              className="h-8 w-10 cursor-pointer rounded-lg border border-[var(--rt-border)] bg-[var(--rt-surface)] p-1"
              aria-label="Custom role color"
            />
          </div>
        </div>

        <label className="space-y-2">
          <span className="rt-label">Start URL</span>
          <input
            value={startUrl}
            onChange={(event) => setStartUrl(event.target.value)}
            placeholder={project.baseUrl}
            className="rt-field"
          />
        </label>

        {!roleProfile ? (
          <label className="rt-check-row flex items-start gap-3 px-3 py-3 text-sm">
            <input
              type="checkbox"
              checked={openImmediately}
              onChange={(event) => setOpenImmediately(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-blue-600"
            />
            <span>
              <span className="block font-medium text-[var(--rt-text)]">Open this role after saving</span>
            </span>
          </label>
        ) : null}
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
            {saving ? 'Saving...' : 'Save Role'}
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
