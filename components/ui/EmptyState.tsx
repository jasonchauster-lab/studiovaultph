'use client'

import React from 'react'
import { LucideIcon, Inbox } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className
}) => {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-12 text-center bg-zinc-50/50 rounded-[2.5rem] border-2 border-dashed border-zinc-100",
      className
    )}>
      <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-zinc-50 flex items-center justify-center text-zinc-300 mb-6">
        <Icon size={32} strokeWidth={1.5} />
      </div>
      
      <h3 className="text-lg font-serif text-zinc-900 mb-2">{title}</h3>
      
      {description && (
        <p className="text-sm text-zinc-400 font-medium max-w-xs leading-relaxed mb-8">
          {description}
        </p>
      )}

      {action && (
        <div className="animate-in fade-in zoom-in duration-500 delay-200 fill-mode-both">
          {action}
        </div>
      )}
    </div>
  )
}
