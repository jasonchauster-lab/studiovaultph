'use client'

import { useState, useEffect, memo } from 'react'
import { ArrowUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'

interface BackToTopFABProps {
    scrollRef?: React.RefObject<HTMLDivElement | null>
    threshold?: number
    isMobile?: boolean
}

function BackToTopFAB({ scrollRef, threshold = 400, isMobile }: BackToTopFABProps) {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const target = scrollRef?.current || window
        const handleScroll = () => {
            const scrollY = scrollRef?.current ? scrollRef.current.scrollTop : window.scrollY
            setIsVisible(scrollY > threshold)
        }
        
        target.addEventListener('scroll', handleScroll as any)
        // Initial check
        handleScroll()
        
        return () => target.removeEventListener('scroll', handleScroll as any)
    }, [scrollRef, threshold])

    const scrollToTop = () => {
        if (scrollRef?.current) {
            scrollRef.current.scrollTo({
                top: 0,
                behavior: 'smooth'
            })
        } else {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            })
        }
    }

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.button
                    initial={{ opacity: 0, scale: 0.5, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.5, y: 20 }}
                    onClick={scrollToTop}
                    className={clsx(
                        "fixed left-6 z-[60] p-4 bg-white/80 backdrop-blur-md border border-zinc-100 rounded-full shadow-2xl text-zinc-900 transition-all hover:scale-110 active:scale-95 group",
                        // In builder mode (isMobile provided), we bypass media queries to avoid viewport conflicts
                        isMobile === true ? "bottom-32" : isMobile === false ? "bottom-10" : "bottom-24 md:bottom-10"
                    )}
                    aria-label="Back to top"
                >
                    <ArrowUp className="w-5 h-5 group-hover:-translate-y-1 transition-transform duration-300" />
                </motion.button>
            )}
        </AnimatePresence>
    )
}

export default memo(BackToTopFAB)
