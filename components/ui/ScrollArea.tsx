'use client'

import React from 'react'
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const ScrollArea: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className
}) => {
  return (
    <ScrollAreaPrimitive.Root className={cn("relative overflow-hidden", className)}>
      <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollAreaPrimitive.Scrollbar
        className="flex touch-none select-none transition-colors duration-150 ease-out data-[orientation=vertical]:w-2 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:h-2 p-[1px] bg-zinc-50/50 hover:bg-zinc-100"
        orientation="vertical"
      >
        <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-[10px] bg-zinc-300 transition-colors hover:bg-zinc-400" />
      </ScrollAreaPrimitive.Scrollbar>
      <ScrollAreaPrimitive.Scrollbar
        className="flex touch-none select-none transition-colors duration-150 ease-out data-[orientation=vertical]:w-2 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:h-2 p-[1px] bg-zinc-50/50 hover:bg-zinc-100"
        orientation="horizontal"
      >
        <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-[10px] bg-zinc-300 transition-colors hover:bg-zinc-400" />
      </ScrollAreaPrimitive.Scrollbar>
      <ScrollAreaPrimitive.Corner className="bg-zinc-50" />
    </ScrollAreaPrimitive.Root>
  )
}
