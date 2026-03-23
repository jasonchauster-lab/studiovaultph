'use client'

import { useState, useEffect } from 'react'
import { Heart } from 'lucide-react'
import clsx from 'clsx'

interface SaveButtonProps {
    id: string
    type: 'instructor' | 'studio'
    className?: string
}

export default function SaveButton({ id, type, className }: SaveButtonProps) {
    const [isSaved, setIsSaved] = useState(false)
    const [isAnimating, setIsAnimating] = useState(false)

    const storageKey = `studiovault_saved_${type}s`

    useEffect(() => {
        const saved = JSON.parse(localStorage.getItem(storageKey) || '[]')
        setIsSaved(saved.includes(id))
    }, [id, storageKey])

    const toggleSave = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        const saved = JSON.parse(localStorage.getItem(storageKey) || '[]')
        let newSaved
        if (isSaved) {
            newSaved = saved.filter((sId: string) => sId !== id)
        } else {
            newSaved = [...saved, id]
            setIsAnimating(true)
            setTimeout(() => setIsAnimating(false), 600)
        }
        
        localStorage.setItem(storageKey, JSON.stringify(newSaved))
        setIsSaved(!isSaved)
        
        // Trigger a custom event so other components (like the "Saved" section) can update
        window.dispatchEvent(new Event('studiovault_saved_changed'))
    }

    return (
        <button
            onClick={toggleSave}
            className={clsx(
                "group/save relative flex items-center justify-center transition-all duration-300 active:scale-90",
                className
            )}
            title={isSaved ? "Remove from favorites" : "Save to favorites"}
        >
            <div className={clsx(
                "absolute inset-0 rounded-full transition-all duration-500",
                isSaved ? "bg-burgundy/10 scale-110" : "bg-charcoal/5 group-hover/save:bg-charcoal/10"
            )} />
            
            <Heart
                className={clsx(
                    "w-5 h-5 transition-all duration-500 relative z-10",
                    isSaved ? "fill-burgundy text-burgundy" : "text-charcoal/20 group-hover/save:text-charcoal/40",
                    isAnimating && "animate-heart-pop"
                )}
            />

            <style jsx global>{`
                @keyframes heart-pop {
                    0% { transform: scale(1); }
                    25% { transform: scale(1.4); }
                    45% { transform: scale(1.1); }
                    65% { transform: scale(1.2); }
                    100% { transform: scale(1); }
                }
                .animate-heart-pop {
                    animation: heart-pop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
            `}</style>
        </button>
    )
}
