interface ChipProps {
  label: string
  selected?: boolean
  onClick?: () => void
  onRemove?: () => void
  disabled?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export function Chip({
  label,
  selected,
  onClick,
  onRemove,
  disabled,
  size = 'md',
  className = '',
}: ChipProps) {
  const sizeClass = size === 'sm' ? 'h-7 px-3 text-xs gap-1' : 'h-8 px-3.5 text-sm gap-1.5'

  return (
    <span
      role={onClick ? 'button' : undefined}
      tabIndex={onClick && !disabled ? 0 : undefined}
      onClick={disabled ? undefined : onClick}
      onKeyDown={
        onClick && !disabled
          ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }
          : undefined
      }
      className={`inline-flex items-center rounded-pill border font-medium transition-colors duration-150
        ${sizeClass}
        ${selected
          ? 'bg-ink text-paper border-ink'
          : 'bg-bone text-ink/70 border-line hover:border-ink/30 hover:text-ink'
        }
        ${onClick ? 'cursor-pointer' : ''}
        ${disabled ? 'opacity-40 pointer-events-none' : ''}
        ${className}`}
    >
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); if (!disabled) onRemove() }}
          aria-label={`Remove ${label}`}
          className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full hover:bg-ink/10 transition-colors flex-shrink-0"
        >
          <svg viewBox="0 0 8 8" width="7" height="7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M1.5 1.5l5 5M6.5 1.5l-5 5" />
          </svg>
        </button>
      )}
    </span>
  )
}
