import React, { type CSSProperties, type ReactNode } from 'react'

/* ─── Heading ──────────────────────────────────────────────────────── */

type HeadingSize = 'hero' | 'display' | '3xl' | '2xl' | 'xl' | 'lg' | 'md'
type HeadingTag  = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span'

export interface HeadingProps {
  as?: HeadingTag
  size?: HeadingSize
  muted?: boolean
  balance?: boolean
  children?: ReactNode
  className?: string
  id?: string
  style?: CSSProperties
}

const headingSizes: Record<HeadingSize, string> = {
  hero:    'text-hero',
  display: 'text-display',
  '3xl':   'text-3xl',
  '2xl':   'text-2xl',
  xl:      'text-xl',
  lg:      'text-lg',
  md:      'text-base',
}

export function Heading({
  as = 'h2',
  size = 'display',
  muted = false,
  balance = false,
  className = '',
  children,
  ...rest
}: HeadingProps) {
  return React.createElement(
    as,
    {
      className: [
        'font-display font-medium tracking-tight leading-[1.1]',
        headingSizes[size],
        muted ? 'text-ink/40' : 'text-ink',
        balance ? 'text-balance' : '',
        className,
      ].join(' '),
      ...rest,
    },
    children,
  )
}

/* ─── Text ─────────────────────────────────────────────────────────── */

type TextSize   = 'xs' | 'sm' | 'base' | 'lg' | 'xl'
type TextWeight = 'normal' | 'medium' | 'semibold'
type TextTag    = 'p' | 'span' | 'div' | 'label' | 'li' | 'dt' | 'dd'

export interface TextProps {
  as?: TextTag
  size?: TextSize
  weight?: TextWeight
  muted?: boolean
  balance?: boolean
  children?: ReactNode
  className?: string
  id?: string
  style?: CSSProperties
  htmlFor?: string
}

const textSizes: Record<TextSize, string> = {
  xs:   'text-xs leading-relaxed',
  sm:   'text-sm leading-relaxed',
  base: 'text-base leading-relaxed',
  lg:   'text-lg leading-relaxed',
  xl:   'text-xl leading-relaxed',
}

const textWeights: Record<TextWeight, string> = {
  normal:   'font-normal',
  medium:   'font-medium',
  semibold: 'font-semibold',
}

export function Text({
  as = 'p',
  size = 'base',
  weight = 'normal',
  muted = false,
  balance = false,
  className = '',
  children,
  ...rest
}: TextProps) {
  return React.createElement(
    as,
    {
      className: [
        'font-sans',
        textSizes[size],
        textWeights[weight],
        muted ? 'text-ink/50' : 'text-ink',
        balance ? 'text-balance' : '',
        className,
      ].join(' '),
      ...rest,
    },
    children,
  )
}

/* ─── Mono ─────────────────────────────────────────────────────────── */

type MonoTag = 'span' | 'p' | 'div' | 'label'

export interface MonoProps {
  as?: MonoTag
  muted?: boolean
  children?: ReactNode
  className?: string
  id?: string
  style?: CSSProperties
}

export function Mono({ as = 'span', muted = false, className = '', children, ...rest }: MonoProps) {
  return React.createElement(
    as,
    {
      className: [
        'font-mono text-[11px] uppercase tracking-[0.12em]',
        muted ? 'text-ink/40' : 'text-ink',
        className,
      ].join(' '),
      ...rest,
    },
    children,
  )
}
