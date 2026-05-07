'use client'

import React from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'vault' | 'outline'
  size?: 'sm' | 'md'
  showDot?: boolean
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'neutral', 
  size = 'sm', 
  showDot = false,
  className, 
  ...props 
}) => {
  const variantClasses = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    warning: 'bg-amber-50 text-amber-700 border-amber-100',
    error: 'bg-rose-50 text-rose-700 border-rose-100',
    info: 'bg-sky-50 text-sky-700 border-sky-100',
    neutral: 'bg-zinc-50 text-zinc-600 border-zinc-100',
    outline: 'bg-transparent text-zinc-500 border-zinc-200',
    vault: 'vault-badge border-transparent'
  }

  const dotClasses = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error: 'bg-rose-500',
    info: 'bg-sky-500',
    neutral: 'bg-zinc-400',
    outline: 'bg-zinc-300',
    vault: 'bg-white/50'
  }

  const sizeClasses = {
    sm: 'px-2.5 py-0.5 text-[9px]',
    md: 'px-3 py-1 text-[10px]'
  }

  return (
    <div 
      className={cn(
        "inline-flex items-center justify-center gap-1.5 font-bold uppercase tracking-[0.15em] border rounded-full transition-all",
        variantClasses[variant],
        size === 'sm' && variant !== 'vault' && sizeClasses.sm,
        size === 'md' && variant !== 'vault' && sizeClasses.md,
        variant === 'vault' && "border-none",
        className
      )}
      {...props}
    >
      {showDot && (
        <span className={cn("w-1 h-1 rounded-full", dotClasses[variant])} />
      )}
      {children}
    </div>
  )
}
