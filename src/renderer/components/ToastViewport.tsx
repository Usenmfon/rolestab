import { CheckCircle2, Info, X } from 'lucide-react'

export type ToastMessage = {
  id: string
  title: string
  detail?: string
  tone?: 'success' | 'info'
}

type ToastViewportProps = {
  toasts: ToastMessage[]
  onDismiss: (toastId: string) => void
}

export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  if (toasts.length === 0) {
    return null
  }

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[22rem] max-w-[calc(100vw-2rem)] flex-col gap-2"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const Icon = toast.tone === 'info' ? Info : CheckCircle2

        return (
          <div
            key={toast.id}
            className="rt-surface pointer-events-auto flex items-start gap-3 rounded-lg border p-3 shadow-2xl"
          >
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
              <Icon aria-hidden="true" size={17} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--rt-text)]">{toast.title}</p>
              {toast.detail ? (
                <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-[var(--rt-text-muted)]">
                  {toast.detail}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="rt-icon-button h-7 w-7 shrink-0"
              aria-label="Dismiss notification"
            >
              <X aria-hidden="true" size={15} />
            </button>
          </div>
        )
      })}
    </div>
  )
}