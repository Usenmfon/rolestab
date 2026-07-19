import { AlertTriangle } from 'lucide-react'

export type ConfirmationRequest = {
  title: string
  message: string
  confirmLabel: string
}

type ConfirmationDialogProps = ConfirmationRequest & {
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmationDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-title"
        className="rt-surface w-full max-w-md rounded-lg border p-5 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-red-100 text-red-700">
            <AlertTriangle aria-hidden="true" size={19} />
          </div>
          <div className="min-w-0">
            <h2 id="confirmation-title" className="rt-heading text-base">
              {title}
            </h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[var(--rt-text-muted)]">{message}</p>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rt-button rt-button-secondary h-9">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rt-button h-9 bg-red-700 text-white hover:bg-red-800"
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}