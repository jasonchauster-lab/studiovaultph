'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface CardProps {
  children: React.ReactNode
  header?: React.ReactNode
  footer?: React.ReactNode
  variant?: 'default' | 'outline' | 'flat' | 'dark' | 'atelier'
  className?: string
  innerClassName?: string
  headerClassName?: string
  footerClassName?: string
  onClick?: () => void
  isHoverable?: boolean
}

export const Card: React.FC<CardProps> = ({
  children,
  header,
  footer,
  variant = 'default',
  className,
  innerClassName,
  headerClassName,
  footerClassName,
  onClick,
  isHoverable = false
}) => {
  const variants = {
    default: 'bg-white border-zinc-100 shadow-sm',
    atelier: 'bg-white/80 backdrop-blur-xl border-zinc-200/50 shadow-xl shadow-zinc-200/20',
    outline: 'bg-transparent border-zinc-100 border-2 border-dashed',
    flat: 'bg-zinc-50 border-transparent',
    dark: 'bg-zinc-900 border-white/5 text-white shadow-2xl shadow-black/20'
  }

  const Component = isHoverable || onClick ? motion.div : 'div'

  return (
    <Component
      {...(isHoverable || onClick ? {
        whileHover: { y: -6, scale: 1.005, shadow: '0 30px 60px rgba(0,0,0,0.12)' },
        whileTap: { scale: 0.99 },
        transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] }
      } : {})}
      onClick={onClick}
      className={cn(
        "rounded-[3rem] border overflow-hidden",
        variants[variant === 'atelier' ? 'atelier' : variant],
        onClick && "cursor-pointer",
        className
      )}
    >
      {header && (
        <div className={cn("px-10 pt-10 pb-4", headerClassName)}>
          {header}
        </div>
      )}

      <div className={cn("px-10 py-10", !header && "pt-10", !footer && "pb-10", innerClassName)}>
        {children}
      </div>

      {footer && (
        <div className={cn("px-10 py-8 border-t border-zinc-50", variant === 'dark' && "border-white/5", footerClassName)}>
          {footer}
        </div>
      )}
    </Component>
  )
}
