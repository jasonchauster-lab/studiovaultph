'use client'

import React from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { EmptyState } from './EmptyState'
import { LucideIcon, Search } from 'lucide-react'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface Column<T> {
  header: string
  accessor: keyof T | ((item: T) => React.ReactNode)
  className?: string
  mobileLabel?: string
  hideOnMobile?: boolean
}

interface TableProps<T> {
  data: T[]
  columns: Column<T>[]
  keyExtractor: (item: T) => string
  onRowClick?: (item: T) => void
  emptyTitle?: string
  emptyDescription?: string
  emptyIcon?: LucideIcon
  className?: string
}

export function Table<T>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  emptyTitle = "No results found",
  emptyDescription = "Try adjusting your search or filters.",
  emptyIcon = Search,
  className
}: TableProps<T>) {
  if (data.length === 0) {
    return (
      <EmptyState 
        title={emptyTitle}
        description={emptyDescription}
        icon={emptyIcon}
        className="my-8"
      />
    )
  }

  return (
    <div className={cn("w-full overflow-hidden", className)}>
      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full border-separate border-spacing-y-3">
          <thead>
            <tr className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">
              {columns.map((col, idx) => (
                <th 
                  key={idx} 
                  className={cn("px-10 py-5 text-left font-black", col.className)}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr 
                key={keyExtractor(item)}
                onClick={() => onRowClick?.(item)}
                className={cn(
                  "group bg-white hover:bg-zinc-50/80 transition-all border border-zinc-100 shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-[0.99]",
                  onRowClick && "cursor-pointer"
                )}
              >
                {columns.map((col, idx) => (
                  <td 
                    key={idx} 
                    className={cn(
                      "px-10 py-6 border-y border-zinc-100 first:border-l first:rounded-l-[2rem] last:border-r last:rounded-r-[2rem]",
                      col.className
                    )}
                  >
                    {typeof col.accessor === 'function' 
                      ? col.accessor(item) 
                      : (item[col.accessor] as React.ReactNode)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="lg:hidden space-y-4">
        {data.map((item) => (
          <div 
            key={keyExtractor(item)}
            onClick={() => onRowClick?.(item)}
            className={cn(
              "bg-white border border-zinc-100 rounded-[2.5rem] p-6 space-y-4 shadow-sm",
              onRowClick && "active:scale-[0.98] transition-transform"
            )}
          >
            {columns.map((col, idx) => (
              <div 
                key={idx} 
                className={cn(
                  "flex justify-between items-start gap-4",
                  col.hideOnMobile && "hidden"
                )}
              >
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest pt-0.5">
                  {col.mobileLabel || col.header}
                </span>
                <div className={cn("text-right", col.className)}>
                  {typeof col.accessor === 'function' 
                    ? col.accessor(item) 
                    : (item[col.accessor] as React.ReactNode)}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
