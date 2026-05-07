'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { LucideIcon } from 'lucide-react'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface DropdownItem {
  label: string
  onClick: () => void
  icon?: LucideIcon
  variant?: 'default' | 'destructive'
  disabled?: boolean
}

interface DropdownMenuProps {
  trigger: React.ReactNode
  items: DropdownItem[]
  align?: 'left' | 'right'
  className?: string
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  trigger,
  items,
  align = 'right',
  className
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState({ top: 0, left: 0 })

  useEffect(() => {
    setMounted(true)
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setCoords({
        top: rect.bottom + window.scrollY,
        left: align === 'right' ? rect.right + window.scrollX : rect.left + window.scrollX
      })
    }
  }

  const toggleMenu = () => {
    if (!isOpen) updateCoords()
    setIsOpen(!isOpen)
  }

  if (!mounted) return null

  const menuContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          style={{ 
            position: 'absolute',
            top: coords.top + 4,
            left: align === 'right' ? coords.left - 192 : coords.left, // 192px = w-48
            zIndex: 1000
          }}
          className="w-48 bg-white border border-zinc-100 rounded-2xl shadow-xl py-2 overflow-hidden"
          role="menu"
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((item, index) => (
            <button
              key={index}
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                item.onClick()
                setIsOpen(false)
              }}
              className={cn(
                "w-full px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest flex items-center gap-3 transition-colors",
                item.variant === 'destructive' 
                  ? "text-red-500 hover:bg-red-50" 
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900",
                item.disabled && "opacity-50 cursor-not-allowed grayscale"
              )}
            >
              {item.icon && <item.icon className="w-4 h-4" />}
              {item.label}
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <div className={cn("relative inline-block", className)} ref={containerRef}>
      <div onClick={toggleMenu} className="cursor-pointer">
        {trigger}
      </div>
      {createPortal(menuContent, document.body)}
    </div>
  )
}
