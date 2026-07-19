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
      className="rt-icon-button"
    >
      <Icon aria-hidden="true" size={17} strokeWidth={1.75} />
    </button>
  )
}
