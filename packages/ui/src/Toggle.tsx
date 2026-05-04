import type { InputHTMLAttributes } from 'react'

interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  label?: string
  size?: 'sm' | 'md'
}

const sizes = {
  sm: {
    track: 'w-8 h-4',
    thumb: 'w-3 h-3',
    active: 'peer-checked:translate-x-4',
  },
  md: {
    track: 'w-11 h-6',
    thumb: 'w-5 h-5',
    active: 'peer-checked:translate-x-5',
  },
}

export function Toggle({ label, size = 'md', disabled, className = '', id, ...props }: ToggleProps) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)
  const s = sizes[size]

  return (
    <label
      htmlFor={inputId}
      className={`inline-flex items-center gap-3 ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
    >
      <span className="relative inline-flex flex-shrink-0">
        <input
          {...props}
          id={inputId}
          type="checkbox"
          role="switch"
          disabled={disabled}
          className="peer sr-only"
        />
        {/* Track */}
        <span
          className={`${s.track} rounded-pill border border-line bg-bone transition-colors duration-200
            peer-checked:bg-rx peer-checked:border-rx
            peer-focus-visible:ring-2 peer-focus-visible:ring-brand-indigo peer-focus-visible:ring-offset-2`}
        />
        {/* Thumb */}
        <span
          className={`absolute top-0.5 left-0.5 ${s.thumb} ${s.active} rounded-full bg-ink/30 shadow-soft transition-all duration-200
            peer-checked:bg-paper`}
        />
      </span>
      {label && (
        <span className="text-sm font-medium text-ink select-none">{label}</span>
      )}
    </label>
  )
}
