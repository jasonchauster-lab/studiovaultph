'use client'

import React from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: 'default' | 'atelier'
  error?: boolean
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant = 'default', error, ...props }, ref) => {
    const variants = {
      default: "bg-white border-zinc-200 focus:border-zinc-400 focus:ring-zinc-100",
      atelier: "bg-zinc-50 border-zinc-100 focus:bg-white focus:border-primary/30 focus:ring-primary/10 rounded-[2rem]"
    }

    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full px-8 py-6 text-sm font-bold text-zinc-900 placeholder:text-zinc-400 placeholder:font-black placeholder:uppercase placeholder:tracking-widest transition-all outline-none border focus:ring-4 min-h-[120px] resize-none",
          variants[variant],
          error && "border-rose-500 focus:border-rose-500 focus:ring-rose-50",
          className
        )}
        {...props}
      />
    )
  }
)

Textarea.displayName = "Textarea"
