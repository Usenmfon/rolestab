import type { ComponentType } from 'react'
import type { LucideProps } from 'lucide-react'

type IconButtonProps = {
  label: string
  icon: ComponentType<LucideProps>
  onClick?: () => void
  disabled?: boolean
}

export function IconButton({ label, icon: Icon, onClick, disabled = false }: IconButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white"
    >
      <Icon aria-hidden="true" size={17} strokeWidth={2.2} />
    </button>
  )
}
