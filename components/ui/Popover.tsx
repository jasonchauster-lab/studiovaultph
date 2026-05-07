'use client'

import React from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { motion, AnimatePresence } from 'framer-motion'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { X } from 'lucide-react'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface PopoverProps {
  trigger: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  className?: string
  showClose?: boolean
}

export const Popover: React.FC<PopoverProps> = ({
  trigger,
  children,
  side = 'bottom',
  align = 'center',
  className,
  showClose = false
}) => {
  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>
        {trigger}
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side={side}
          align={align}
          sideOffset={8}
          asChild
          className={cn(
            "z-[100] w-72 rounded-2xl border border-zinc-100 bg-white p-4 shadow-xl outline-none",
            className
          )}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            {children}
            {showClose && (
              <PopoverPrimitive.Close 
                className="absolute right-4 top-4 rounded-full p-1 text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600 transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </PopoverPrimitive.Close>
            )}
            <PopoverPrimitive.Arrow className="fill-white stroke-zinc-100 stroke-1" />
          </motion.div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
