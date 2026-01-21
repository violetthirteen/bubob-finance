'use client'

import * as React from 'react'

type Variant = 'primary' | 'ghost' | 'danger'
type Size = 'md' | 'lg'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  full?: boolean
}

const base =
  'inline-flex items-center justify-center rounded-xl font-semibold transition ' +
  'disabled:opacity-50 disabled:cursor-not-allowed select-none'

const variants: Record<Variant, string> = {
  primary:
    'text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-glow)] shadow-sm',
  ghost:
    'bg-transparent text-[var(--color-text)] hover:bg-black/5 border border-slate-200',
  danger:
    'text-white bg-[var(--color-danger)] hover:brightness-95 shadow-sm',
}

const sizes: Record<Size, string> = {
  md: 'px-4 py-2 text-sm',
  lg: 'px-4 py-3 text-base',
}

export function Button({
  className = '',
  variant = 'primary',
  size = 'md',
  full = false,
  ...props
}: Props) {
  return (
    <button
      {...props}
      className={[
        base,
        variants[variant],
        sizes[size],
        full ? 'w-full' : '',
        className,
      ].join(' ')}
    />
  )
}
