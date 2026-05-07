'use client'

import React, { useState, useRef, useEffect, useId } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface Option {
  label: string
  value: string
}

interface SelectProps {
  label?: string
  value: string
  options: Option[]
  onChange?: (value: string) => void
  onValueChange?: (value: string) => void
  placeholder?: string
  error?: string
  className?: string
  variant?: 'atelier' | 'outline'
}

export const Select: React.FC<SelectProps> = ({
  label,
  value,
  options,
  onChange,
  onValueChange,
  placeholder = 'Select an option',
  error,
  className,
  variant = 'outline'
}) => {
  const handleChange = (val: string) => {
    onChange?.(val)
    onValueChange?.(val)
  }
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const listboxRef = useRef<HTMLDivElement>(null)
  const generatedId = useId()
  const selectId = `select-${generatedId}`
  const labelId = `label-${generatedId}`

  const selectedOption = options.find(opt => opt.value === value)

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (isOpen && activeIndex >= 0) {
          handleChange(options[activeIndex].value)
          setIsOpen(false)
        } else {
          setIsOpen(true)
        }
        break
      case 'ArrowDown':
        e.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
          setActiveIndex(0)
        } else {
          setActiveIndex(prev => (prev < options.length - 1 ? prev + 1 : prev))
        }
        break
      case 'ArrowUp':
        e.preventDefault()
        if (isOpen) {
          setActiveIndex(prev => (prev > 0 ? prev - 1 : 0))
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
      case 'Tab':
        setIsOpen(false)
        break
    }
  }

  useEffect(() => {
    if (isOpen) {
      const index = options.findIndex(opt => opt.value === value)
      setActiveIndex(index >= 0 ? index : 0)
    }
  }, [isOpen, value, options])

  const variants = {
    atelier: 'input-atelier flex items-center justify-between text-left cursor-pointer rounded-none',
    outline: 'w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-lg text-sm flex items-center justify-between text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm'
  }

  return (
    <div className={cn("space-y-1.5 w-full", className)} ref={containerRef}>
      {label && (
        <label 
          id={labelId} 
          suppressHydrationWarning
          className="label-atelier block mb-2"
        >
          {label}
        </label>
      )}

      <div className="relative">
        <button
          type="button"
          id={selectId}
          suppressHydrationWarning
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-labelledby={`${labelId} ${selectId}`}
          onKeyDown={handleKeyDown}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            variants[variant],
            error && "border-red-500",
            isOpen && variant === 'outline' && "ring-2 ring-primary/20 border-primary"
          )}
        >
          <span className={cn(!selectedOption && "text-zinc-400")}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown 
            className={cn(
              "w-4 h-4 text-zinc-400 transition-transform duration-200",
              isOpen && "rotate-180"
            )} 
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute z-[100] w-full mt-2 bg-white border border-zinc-100 rounded-2xl shadow-xl overflow-hidden py-2"
              role="listbox"
              ref={listboxRef}
              suppressHydrationWarning
              aria-labelledby={labelId}
            >
              {options.map((option, index) => (
                <div
                  key={option.value}
                  role="option"
                  aria-selected={value === option.value}
                  className={cn(
                    "px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest cursor-pointer flex items-center justify-between transition-colors",
                    index === activeIndex ? "bg-zinc-50 text-primary" : "text-zinc-500 hover:bg-zinc-50",
                    value === option.value && "bg-primary/5 text-primary"
                  )}
                  onClick={() => {
                    handleChange(option.value)
                    setIsOpen(false)
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  {option.label}
                  {value === option.value && <Check className="w-3.5 h-3.5" />}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {error && (
        <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mt-1">
          {error}
        </p>
      )}
    </div>
  )
}
