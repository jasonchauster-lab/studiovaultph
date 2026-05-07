'use client'

import React from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface KbdProps extends React.HTMLAttributes<HTMLElement> {}

export const Kbd: React.FC<KbdProps> = ({ children, className, ...props }) => {
  return (
    <kbd
      className={cn(
        "pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-zinc-200 bg-zinc-50 px-1.5 font-mono text-[10px] font-bold text-zinc-500 opacity-100",
        className
      )}
      {...props}
    >
      {children}
    </kbd>
  )
}
