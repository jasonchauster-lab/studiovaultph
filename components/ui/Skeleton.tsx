'use client'

import React from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'rect' | 'circle' | 'text'
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, variant = 'rect', ...props }) => {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-zinc-100",
        variant === 'circle' ? "rounded-full" : "rounded-md",
        "after:absolute after:inset-0 after:animate-shimmer after:bg-linear-to-r after:from-transparent after:via-white/20 after:to-transparent",
        className
      )}
      {...props}
    />
  )
}

export const SkeletonCircle: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return <Skeleton className={cn("rounded-full", className)} {...props} />
}
