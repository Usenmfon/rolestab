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
      className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
    >
      <Icon aria-hidden="true" size={17} strokeWidth={1.75} />
    </button>
  )
}
