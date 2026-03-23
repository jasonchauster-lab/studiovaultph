import React from 'react'
import { LucideIcon } from 'lucide-react'
import clsx from 'clsx'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'forest'
  size?: 'sm' | 'md' | 'lg'
  icon?: LucideIcon
  className?: string
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', icon: Icon, className, children, ...props }, ref) => {
    const variantClasses = {
      primary: 'btn-primary-atelier',
      secondary: 'btn-secondary-atelier',
      outline: 'btn-outline-atelier',
      forest: 'btn-forest px-8 py-4 rounded-md font-bold text-[10px] tracking-[0.2em] uppercase'
    }

    const sizeClasses = {
      sm: 'px-4 py-2 text-[9px]',
      md: '', // Default styles are already in the btn-* classes
      lg: 'px-10 py-5 text-[11px]'
    }

    return (
      <button
        ref={ref}
        className={clsx(variantClasses[variant], sizeClasses[size], className)}
        {...props}
      >
        {children}
        {Icon && <Icon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
      </button>
    )
  }
)

Button.displayName = 'Button'
