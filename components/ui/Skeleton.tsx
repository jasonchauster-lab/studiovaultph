import React from 'react'
import clsx from 'clsx'

interface SkeletonProps {
  className?: string
  variant?: 'rect' | 'circle' | 'text'
}

export const Skeleton = ({ className, variant = 'rect' }: SkeletonProps) => {
  return (
    <div
      className={clsx(
        "relative overflow-hidden bg-surface-container-highest/50",
        variant === 'circle' && "rounded-full",
        variant === 'rect' && "rounded-xl",
        variant === 'text' && "rounded-md h-4 w-full",
        className
      )}
    >
      <div className="absolute inset-0 animate-shimmer" />
    </div>
  )
}
