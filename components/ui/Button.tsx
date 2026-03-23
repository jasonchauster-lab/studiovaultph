import React from 'react'
import { LucideIcon } from 'lucide-react'
import clsx from 'clsx'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'forest'
  icon?: LucideIcon
  className?: string
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', icon: Icon, className, children, ...props }, ref) => {
    const variantClasses = {
      primary: 'btn-primary-atelier',
      secondary: 'btn-secondary-atelier',
      outline: 'btn-outline-atelier',
      forest: 'btn-forest px-8 py-4 rounded-md font-bold text-[10px] tracking-[0.2em] uppercase'
    }

    return (
      <button
        ref={ref}
        className={clsx(variantClasses[variant], className)}
        {...props}
      >
        {children}
        {Icon && <Icon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
      </button>
    )
  }
)

Button.displayName = 'Button'
