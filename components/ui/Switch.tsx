'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  label?: string
  className?: string
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  label,
  className
}) => {
  const toggleSwitch = () => {
    if (!disabled) onChange(!checked)
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={toggleSwitch}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/20",
          checked ? "bg-primary" : "bg-zinc-200",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <span className="sr-only">{label || 'Toggle switch'}</span>
        <motion.span
          animate={{ x: checked ? 20 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={cn(
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out"
          )}
        />
      </button>
      {label && (
        <span 
          className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 cursor-pointer"
          onClick={toggleSwitch}
        >
          {label}
        </span>
      )}
    </div>
  )
}
