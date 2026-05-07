'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface AccordionProps {
  title: React.ReactNode
  children: React.ReactNode
  isExpanded: boolean
  onToggle: () => void
  actions?: React.ReactNode
  className?: string
  headerClassName?: string
}

export const Accordion: React.FC<AccordionProps> = ({
  title,
  children,
  isExpanded,
  onToggle,
  actions,
  className,
  headerClassName
}) => {
  return (
    <div className={cn("bg-white border border-zinc-100 rounded-2xl shadow-sm overflow-hidden", className)}>
      <div 
        onClick={onToggle}
        className={cn(
          "px-6 py-4 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between group cursor-pointer hover:bg-zinc-100/50 transition-colors",
          headerClassName
        )}
      >
        <div className="flex items-center gap-4 flex-1">
          {title}
        </div>
        
        <div className="flex items-center gap-4">
          {actions}
          <motion.div
            animate={{ rotate: isExpanded ? 0 : -90 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <ChevronDown className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 transition-colors" />
          </motion.div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="border-t border-zinc-100">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
