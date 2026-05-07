'use client'

import React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { motion, AnimatePresence } from 'framer-motion'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const TooltipProvider = TooltipPrimitive.Provider

interface TooltipProps {
  children: React.ReactNode
  content: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  className?: string
  delayDuration?: number
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  side = 'top',
  align = 'center',
  className,
  delayDuration = 200
}) => {
  return (
    <TooltipPrimitive.Root delayDuration={delayDuration}>
      <TooltipPrimitive.Trigger asChild>
        {children}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          align={align}
          sideOffset={8}
          asChild
          className={cn(
            "z-[100] overflow-hidden rounded-lg bg-zinc-900 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white shadow-xl",
            className
          )}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: side === 'top' ? 4 : side === 'bottom' ? -4 : 0 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-zinc-900" />
          </motion.div>
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

// Shadcn-style exports for compatibility
export const TooltipRoot = TooltipPrimitive.Root
export const TooltipTrigger = TooltipPrimitive.Trigger
export const TooltipContent = TooltipPrimitive.Content
export const TooltipPortal = TooltipPrimitive.Portal
export const TooltipArrow = TooltipPrimitive.Arrow
