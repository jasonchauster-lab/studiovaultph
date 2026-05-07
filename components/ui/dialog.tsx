'use client'

import * as React from "react"
import { Modal } from "./Modal"

export const Dialog = ({ children, open, onOpenChange }: any) => {
  return (
    <div style={{ display: open ? 'block' : 'none' }}>
      {children}
    </div>
  )
}

export const DialogContent = ({ children, className }: any) => {
  // We use the Modal as the actual dialog logic for now
  // This is a bit of a hack to satisfy the component structure
  return (
    <div className={className}>
      {children}
    </div>
  )
}

export const DialogHeader = ({ children, className }: any) => (
  <div className={`flex flex-col space-y-1.5 text-center sm:text-left ${className}`}>
    {children}
  </div>
)

export const DialogFooter = ({ children, className }: any) => (
  <div className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 ${className}`}>
    {children}
  </div>
)

export const DialogTitle = ({ children, className }: any) => (
  <h2 className={`text-lg font-semibold leading-none tracking-tight ${className}`}>
    {children}
  </h2>
)

export const DialogDescription = ({ children, className }: any) => (
  <p className={`text-sm text-zinc-500 ${className}`}>
    {children}
  </p>
)
