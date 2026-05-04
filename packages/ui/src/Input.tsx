import type { InputHTMLAttributes } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export function Input({ label, error, hint, className = '', id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-ink/70">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full bg-paper border ${
          error ? 'border-danger' : 'border-line'
        } focus:border-brand-indigo focus:outline-none focus:ring-0 text-ink placeholder-ink/30 rounded-md px-4 py-3 transition-colors duration-150 ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
      {hint && !error && <p className="text-xs text-ink/40">{hint}</p>}
    </div>
  )
}
