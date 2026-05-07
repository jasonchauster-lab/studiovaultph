'use client'

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check } from 'lucide-react'
import clsx from 'clsx'

interface OnboardingTooltipProps {
    id: string
    title: string
    content: string
    position?: 'top' | 'bottom' | 'left' | 'right'
    onDismiss: () => void
    show: boolean
    className?: string
    targetRef?: React.RefObject<HTMLElement | null>
}

export default function OnboardingTooltip({
    id,
    title,
    content,
    position = 'right',
    onDismiss,
    show,
    className,
    targetRef
}: OnboardingTooltipProps) {
    const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
    const [mounted, setMounted] = useState(false)
    const tooltipRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        setMounted(true)
    }, [])

    const updatePosition = () => {
        if (!show || !targetRef?.current) return

        const targetRect = targetRef.current.getBoundingClientRect()
        const scrollY = window.scrollY
        const scrollX = window.scrollX

        let top = 0
        let left = 0

        // Calculate position based on the trigger's coordinates
        switch (position) {
            case 'top':
                top = targetRect.top + scrollY
                left = targetRect.left + scrollX + targetRect.width / 2
                break
            case 'bottom':
                top = targetRect.bottom + scrollY
                left = targetRect.left + scrollX + targetRect.width / 2
                break
            case 'left':
                top = targetRect.top + scrollY + targetRect.height / 2
                left = targetRect.left + scrollX
                break
            case 'right':
                top = targetRect.top + scrollY + targetRect.height / 2
                left = targetRect.right + scrollX
                break
        }

        setCoords({ top, left })
    }

    // Update position on show, scroll, or resize
    useLayoutEffect(() => {
        if (show && targetRef?.current) {
            updatePosition()
            
            // Capture scroll events anywhere in the document to keep tooltip anchored
            window.addEventListener('scroll', updatePosition, true)
            window.addEventListener('resize', updatePosition)
            
            return () => {
                window.removeEventListener('scroll', updatePosition, true)
                window.removeEventListener('resize', updatePosition)
            }
        }
    }, [show, targetRef, position])

    const arrowClasses = {
        top: 'bottom-[-6px] left-1/2 -translate-x-1/2 border-t-zinc-900',
        bottom: 'top-[-6px] left-1/2 -translate-x-1/2 border-b-zinc-900',
        left: 'right-[-6px] top-1/2 -translate-y-1/2 border-l-zinc-900',
        right: 'left-[-6px] top-1/2 -translate-y-1/2 border-r-zinc-900',
    }

    const positionClasses = {
        top: '-translate-x-1/2 -translate-y-full mb-4',
        bottom: '-translate-x-1/2 mt-4',
        left: '-translate-x-full -translate-y-1/2 mr-4',
        right: 'translate-y-1/2 ml-4', // Changed to match the visual logic
    }

    // Specific logic for right position to actually center vertically if we use translate-y-1/2
    // Wait, if coords are center-y, then -translate-y-1/2 is correct.
    const transformClasses = {
        top: '-translate-x-1/2 -translate-y-full mb-4',
        bottom: '-translate-x-1/2 mt-4',
        left: '-translate-x-full -translate-y-1/2 mr-4',
        right: 'translate-y-[-50%] ml-4',
    }

    if (!mounted) return null

    const tooltipContent = (
        <AnimatePresence mode="wait">
            {show && (
                <motion.div
                    ref={tooltipRef}
                    key={id}
                    initial={{ opacity: 0, scale: 0.9, y: position === 'bottom' ? -10 : 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    style={coords ? {
                        position: 'absolute',
                        top: coords.top,
                        left: coords.left,
                        zIndex: 10000,
                    } : {}}
                    className={clsx(
                        "z-[10000] min-w-[240px] max-w-[280px] pointer-events-auto",
                        !targetRef && "absolute", // Fallback for legacy usage without ref
                        !targetRef && {
                            top: 'bottom-full mb-4 left-1/2 -translate-x-1/2',
                            bottom: 'top-full mt-4 left-1/2 -translate-x-1/2',
                            left: 'right-full mr-4 top-1/2 -translate-y-1/2',
                            right: 'left-full ml-4 top-1/2 -translate-y-1/2',
                        }[position],
                        targetRef && transformClasses[position],
                        className
                    )}
                >
                    {/* Glassmorphism Card */}
                    <div className="relative bg-[#0d0d12] text-white p-5 rounded-2xl shadow-2xl border border-white/10 backdrop-blur-xl">
                        {/* Tiny Arrow */}
                        <div className={clsx(
                            "absolute w-0 h-0 border-4 border-transparent",
                            arrowClasses[position]
                        )} />

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[13px] font-black uppercase tracking-widest text-indigo-400">
                                    Tip
                                </h4>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDismiss();
                                    }}
                                    className="text-zinc-500 hover:text-white transition-colors"
                                    aria-label="Close tip"
                                >
                                    <X className="w-4 h-4" />
                                </button>

                            </div>
                            
                            <h3 className="text-[15px] font-bold leading-tight tracking-tight">
                                {title}
                            </h3>
                            
                            <p className="text-[13px] text-zinc-400 leading-relaxed font-medium">
                                {content}
                            </p>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDismiss();
                                }}
                                className="mt-4 w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 group active:scale-[0.98]"
                            >
                                Got it
                                <Check className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                            </button>
                        </div>
                    </div>

                    {/* Subtle Pulse Background */}
                    <div className="absolute -inset-2 bg-indigo-500/20 rounded-[2rem] blur-xl -z-10 animate-pulse" />
                </motion.div>
            )}
        </AnimatePresence>
    )

    if (targetRef) {
        return createPortal(tooltipContent, document.body)
    }

    return tooltipContent
}
