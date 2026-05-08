import React from 'react'
import { LucideIcon, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { motion, HTMLMotionProps } from 'framer-motion'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "ref"> {
  variant?: 'primary' | 'secondary' | 'outline' | 'forest' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  icon?: LucideIcon
  isLoading?: boolean
  href?: string
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', icon: Icon, isLoading, className, children, href, disabled, ...props }, ref) => {
    const variantClasses = {
      primary: 'btn-primary-atelier',
      secondary: 'btn-secondary-atelier',
      outline: 'btn-outline-atelier',
      forest: 'btn-forest px-8 py-4 rounded-md font-bold text-[10px] tracking-[0.2em] uppercase',
      ghost: 'bg-transparent text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg p-2'
    }

    const sizeClasses = {
      sm: 'px-4 py-2 text-[9px]',
      md: '',
      lg: 'px-10 py-5 text-[11px]'
    }

    const classes = cn(
      variantClasses[variant], 
      variant !== 'ghost' && sizeClasses[size], 
      'group inline-flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed', 
      className
    )

    const content = (
      <>
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            {children}
            {Icon && <Icon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
          </>
        )}
      </>
    )

    if (href) {
      return (
        <Link href={href}>
          <motion.div 
            whileTap={{ scale: 0.97 }}
            className={classes}
          >
            {content}
          </motion.div>
        </Link>
      )
    }

    return (
      <motion.button
        ref={ref}
        disabled={disabled || isLoading}
        whileTap={{ scale: 0.97 }}
        className={classes}
        {...props}
      >
        {content}
      </motion.button>
    )
  }
)

Button.displayName = 'Button'
