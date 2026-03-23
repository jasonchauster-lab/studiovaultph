import React from 'react'
import clsx from 'clsx'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'atelier' | 'glass' | 'earth'
  className?: string
}

export const Card = ({ variant = 'atelier', className, children, ...props }: CardProps) => {
  const variantClasses = {
    atelier: 'atelier-card',
    glass: 'glass-card',
    earth: 'earth-card p-6'
  }

  return (
    <div
      className={clsx(variantClasses[variant], className)}
      {...props}
    >
      {children}
    </div>
  )
}
