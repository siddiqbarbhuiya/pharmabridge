import type { HTMLAttributes } from 'react'

type CardTint = 'none' | 'mist' | 'blush' | 'peach' | 'mint' | 'lilac' | 'sky'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tint?: CardTint
}

const tintClasses: Record<CardTint, string> = {
  none: 'bg-paper',
  mist: 'bg-mist',
  blush: 'bg-blush',
  peach: 'bg-peach',
  mint: 'bg-mint',
  lilac: 'bg-lilac',
  sky: 'bg-sky',
}

export function Card({ className = '', tint = 'none', children, ...props }: CardProps) {
  return (
    <div
      className={`${tintClasses[tint]} border border-line rounded-2xl p-6 shadow-soft transition-all duration-150 hover:shadow-card ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
