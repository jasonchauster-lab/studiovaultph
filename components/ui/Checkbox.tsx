'use client'

import React from 'react'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface CheckboxProps {
  checked?: boolean | 'indeterminate'
  onChange?: (checked: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
  className?: string
  id?: string
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled,
  className,
  id
}) => {
  return (
    <div className={cn("flex items-start gap-4", className)}>
      <div className="relative flex items-center pt-0.5">
        <button
          id={id}
          role="checkbox"
          aria-checked={checked === 'indeterminate' ? 'mixed' : checked}
          disabled={disabled}
          onClick={() => onChange?.(!checked)}
          className={cn(
            "w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center outline-none focus:ring-4 focus:ring-primary/10",
            checked 
              ? "bg-primary border-primary shadow-lg shadow-primary/20" 
              : "bg-white border-zinc-200 hover:border-zinc-300",
            disabled && "opacity-50 cursor-not-allowed grayscale"
          )}
        >
          <AnimatePresence>
            {checked && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.1 }}
              >
                <Check className="w-4 h-4 text-white stroke-[3]" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>

      {(label || description) && (
        <div className="flex flex-col gap-0.5 cursor-pointer" onClick={() => !disabled && onChange?.(!checked)}>
          {label && (
            <span className={cn(
              "text-sm font-bold text-zinc-900 transition-colors",
              checked ? "text-primary" : "text-zinc-700",
              disabled && "text-zinc-400"
            )}>
              {label}
            </span>
          )}
          {description && (
            <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest leading-none">
              {description}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
