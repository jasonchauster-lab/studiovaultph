import React, { useId } from 'react'
import { LucideIcon } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utility to merge tailwind classes safely
 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: LucideIcon
  suffix?: React.ReactNode
  variant?: 'atelier' | 'outline'
  containerClassName?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon: Icon, suffix, variant = 'outline', containerClassName, className, id, ...props }, ref) => {
    const generatedId = useId()
    const inputId = id || generatedId
    const errorId = `${inputId}-error`

    const variants = {
      atelier: 'input-atelier rounded-none',
      outline: 'w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm'
    }

    return (
      <div className={cn("space-y-1.5 w-full", containerClassName)}>
        {label && (
          <label 
            htmlFor={inputId}
            suppressHydrationWarning
            className="label-atelier block mb-2 cursor-pointer"
          >
            {label}
          </label>
        )}
        
        <div className="relative group">
          {Icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-primary transition-colors pointer-events-none">
              <Icon size={18} />
            </div>
          )}
          
          <input
            ref={ref}
            id={inputId}
            suppressHydrationWarning
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            className={cn(
              variants[variant],
              Icon && variant === 'outline' && "pl-11",
              Icon && variant === 'atelier' && "pl-8",
              suffix && "pr-11",
              error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
              className
            )}
            {...props}
          />

          {suffix && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400">
              {suffix}
            </div>
          )}
        </div>

        {error && (
          <p 
            id={errorId}
            suppressHydrationWarning
            className="text-[10px] font-bold text-red-500 uppercase tracking-widest animate-in fade-in slide-in-from-top-1 duration-200"
          >
            {error}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
