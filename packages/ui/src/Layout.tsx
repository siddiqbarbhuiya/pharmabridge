import type { HTMLAttributes, ReactNode } from 'react'

/* ─── Container ────────────────────────────────────────────────────── */

type ContainerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  size?: ContainerSize
  children?: ReactNode
}

const containerSizes: Record<ContainerSize, string> = {
  sm:   'max-w-2xl',
  md:   'max-w-4xl',
  lg:   'max-w-5xl',
  xl:   'max-w-[1280px]',
  full: 'max-w-none',
}

export function Container({ size = 'xl', className = '', children, ...props }: ContainerProps) {
  return (
    <div className={`${containerSizes[size]} mx-auto px-6 ${className}`} {...props}>
      {children}
    </div>
  )
}

/* ─── Section ──────────────────────────────────────────────────────── */

type SectionTint = 'none' | 'paper' | 'bone' | 'sky' | 'mist' | 'blush' | 'peach' | 'mint' | 'lilac' | 'ink'

export interface SectionProps extends HTMLAttributes<HTMLElement> {
  tint?: SectionTint
  tight?: boolean
  children?: ReactNode
}

const sectionTints: Record<SectionTint, string> = {
  none:  '',
  paper: 'bg-paper',
  bone:  'bg-bone',
  sky:   'bg-sky',
  mist:  'bg-mist',
  blush: 'bg-blush',
  peach: 'bg-peach',
  mint:  'bg-mint',
  lilac: 'bg-lilac',
  ink:   'bg-ink',
}

export function Section({ tint = 'none', tight = false, className = '', children, ...props }: SectionProps) {
  return (
    <section
      className={`${sectionTints[tint]} ${tight ? 'py-12 md:py-16' : 'py-24 md:py-32'} ${className}`}
      {...props}
    >
      {children}
    </section>
  )
}

/* ─── Divider ──────────────────────────────────────────────────────── */

export interface DividerProps {
  invert?: boolean
  className?: string
}

export function Divider({ invert = false, className = '' }: DividerProps) {
  return (
    <hr className={`border-0 border-t ${invert ? 'border-paper/10' : 'border-line'} ${className}`} />
  )
}
