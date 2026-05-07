'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface FieldProps {
  label?: string
  error?: string
  hint?: string
  children: React.ReactNode
  className?: string
  labelClassName?: string
  required?: boolean
  actions?: React.ReactNode
}

export const Field: React.FC<FieldProps> = ({
  label,
  error,
  hint,
  children,
  className,
  labelClassName,
  required,
  actions
}) => {
  return (
    <div className={cn("flex flex-col gap-3 w-full", className)}>
      {label && (
        <div className="flex items-center justify-between px-2">
          <label className={cn(
            "text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400",
            error && "text-rose-500",
            labelClassName
          )}>
            {label}
            {required && <span className="text-rose-500 ml-1">*</span>}
          </label>
          
          <div className="flex items-center gap-2">
            {actions}
            {hint && !error && (
              <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">
                {hint}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="relative">
        {children}
      </div>

      <AnimatePresence mode="wait">
        {error ? (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-[10px] font-bold text-rose-500 uppercase tracking-widest px-2"
          >
            {error}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
