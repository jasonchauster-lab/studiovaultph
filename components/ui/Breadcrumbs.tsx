'use client'

import React from 'react'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ReactNode
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className }) => {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex", className)}>
      <ol className="flex items-center gap-2">
        <li>
          <Link 
            href="/studio"
            className="text-zinc-400 hover:text-zinc-900 transition-colors"
          >
            <Home className="w-4 h-4" />
          </Link>
        </li>

        {items.map((item, idx) => {
          const isLast = idx === items.length - 1

          return (
            <li key={idx} className="flex items-center gap-2">
              <ChevronRight className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
              
              {isLast || !item.href ? (
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-900">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors"
                >
                  {item.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
