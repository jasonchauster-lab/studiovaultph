'use client'

import React from 'react'
import * as SeparatorPrimitive from '@radix-ui/react-separator'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical'
  className?: string
  decorative?: boolean
}

export const Separator: React.FC<SeparatorProps> = ({
  orientation = 'horizontal',
  className,
  decorative = true
}) => {
  return (
    <SeparatorPrimitive.Root
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-zinc-100",
        orientation === 'horizontal' ? "h-[1px] w-full" : "h-full w-[1px]",
        className
      )}
    />
  )
}
