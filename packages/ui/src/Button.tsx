import type { ButtonHTMLAttributes } from 'react'

export type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'icon' | 'rx'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  loading?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'inline-flex items-center justify-center h-11 rounded-md bg-ink px-6 text-sm font-medium uppercase tracking-wider text-paper hover:bg-ink/90 transition-colors duration-150',
  ghost:
    'inline-flex items-center justify-center h-11 rounded-md border border-line bg-paper px-6 text-sm font-medium uppercase tracking-wider text-ink hover:bg-bone transition-colors duration-150',
  rx: 'inline-flex items-center justify-center h-11 rounded-md bg-rx px-6 text-sm font-medium uppercase tracking-wider text-paper hover:bg-rx-dark transition-colors duration-150',
  danger:
    'inline-flex items-center justify-center h-11 rounded-md bg-danger px-6 text-sm font-medium uppercase tracking-wider text-paper hover:bg-danger/90 transition-colors duration-150',
  icon: 'inline-flex items-center justify-center w-10 h-10 rounded-md text-ink/60 hover:text-ink hover:bg-bone transition-all duration-150',
}

export function Button({
  variant = 'primary',
  loading,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${variantClasses[variant]} disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <span className="inline-block w-4 h-4 rounded-full skeleton" /> : children}
    </button>
  )
}
