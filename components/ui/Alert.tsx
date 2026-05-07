'use client'

import React from 'react'
import { 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  AlertTriangle,
  X
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type AlertVariant = 'success' | 'error' | 'warning' | 'info'

interface AlertProps {
  variant?: AlertVariant
  title?: string
  children: React.ReactNode
  onClose?: () => void
  className?: string
  isVisible?: boolean
}

const variantStyles = {
  success: {
    container: 'bg-emerald-50/80 backdrop-blur-md border-emerald-100/50 text-emerald-900',
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
    close: 'hover:bg-emerald-100 text-emerald-600'
  },
  error: {
    container: 'bg-rose-50/80 backdrop-blur-md border-rose-100/50 text-rose-900',
    icon: <AlertCircle className="w-5 h-5 text-rose-600" />,
    close: 'hover:bg-rose-100 text-rose-600'
  },
  warning: {
    container: 'bg-amber-50/80 backdrop-blur-md border-amber-100/50 text-amber-900',
    icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
    close: 'hover:bg-amber-100 text-amber-600'
  },
  info: {
    container: 'bg-indigo-50/80 backdrop-blur-md border-indigo-100/50 text-indigo-900',
    icon: <Info className="w-5 h-5 text-indigo-600" />,
    close: 'hover:bg-indigo-100 text-indigo-600'
  }
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  children,
  onClose,
  className,
  isVisible = true
}) => {
  const styles = variantStyles[variant]

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          className={cn(
            "relative flex items-start gap-4 p-5 border rounded-[2rem] shadow-sm",
            styles.container,
            className
          )}
        >
          <div className="shrink-0 mt-0.5">
            {styles.icon}
          </div>
          
          <div className="flex-1 min-w-0">
            {title && (
              <h5 className="text-[11px] font-black uppercase tracking-widest mb-1">
                {title}
              </h5>
            )}
            <div className="text-sm font-bold leading-relaxed opacity-90">
              {children}
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className={cn(
                "shrink-0 p-1.5 rounded-xl transition-colors",
                styles.close
              )}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
