'use client'

import { useState, useRef } from 'react'
import { Image as ImageIcon, X, ChevronLeft, ChevronRight } from 'lucide-react'

interface PublicInstructorGalleryProps {
    images: string[]
}

export default function PublicInstructorGallery({ images }: PublicInstructorGalleryProps) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null)
    const scrollContainerRef = useRef<HTMLDivElement>(null)

    if (!images || images.length === 0) return null

    const openLightbox = (index: number) => {
        setActiveIndex(index)
        document.body.style.overflow = 'hidden'
    }

    const closeLightbox = () => {
        setActiveIndex(null)
        document.body.style.overflow = 'auto'
    }

    const nextImage = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (activeIndex === null) return
        setActiveIndex((activeIndex + 1) % images.length)
    }

    const prevImage = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (activeIndex === null) return
        setActiveIndex((activeIndex - 1 + images.length) % images.length)
    }

    const scroll = (direction: 'left' | 'right') => {
        if (!scrollContainerRef.current) return
        const scrollAmount = 300
        scrollContainerRef.current.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth'
        })
    }

    return (
        <>
            <div className="relative group">
                {/* Desktop Navigation Arrows */}
                <button
                    onClick={() => scroll('left')}
                    className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-white rounded-full shadow-cloud border border-border-grey text-burgundy opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex items-center justify-center hover:bg-off-white"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                    onClick={() => scroll('right')}
                    className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-white rounded-full shadow-cloud border border-border-grey text-burgundy opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex items-center justify-center hover:bg-off-white"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>

                <div 
                    ref={scrollContainerRef}
                    className="flex gap-4 overflow-x-auto pb-4 no-scrollbar snap-x snap-mandatory"
                >
                    {images.map((url: string, index: number) => (
                        <div
                            key={index}
                            className="relative flex-none w-64 aspect-square rounded-2xl overflow-hidden border border-cream-100 bg-cream-50 cursor-zoom-in group snap-start"
                            onClick={() => openLightbox(index)}
                        >
                            <img
                                src={url}
                                alt={`Gallery photo ${index + 1}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-charcoal-900/0 group-hover:bg-charcoal-900/10 transition-colors" />
                        </div>
                    ))}
                </div>
                
                {/* Mobile scroll indicators */}
                <div className="sm:hidden flex flex-col items-center gap-2 mt-2">
                    <div className="flex gap-1.5">
                        {images.map((_, i) => (
                            <div key={i} className="w-1.5 h-1.5 rounded-full bg-gold/20" />
                        ))}
                    </div>
                    <span className="text-[8px] font-black text-gold/40 uppercase tracking-[0.3em] animate-pulse">
                        Swipe to explore
                    </span>
                </div>
            </div>

            {/* Lightbox Modal */}
            {activeIndex !== null && (
                <div
                    className="fixed inset-0 z-[100] bg-charcoal-900/95 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
                    onClick={closeLightbox}
                >
                    <button
                        className="absolute top-6 right-6 text-cream-50/70 hover:text-cream-50 p-2 transition-colors"
                        onClick={closeLightbox}
                    >
                        <X className="w-8 h-8" />
                    </button>

                    {images.length > 1 && (
                        <>
                            <button
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-cream-50/70 hover:text-cream-50 p-2 transition-colors hidden sm:block"
                                onClick={prevImage}
                            >
                                <ChevronLeft className="w-10 h-10" />
                            </button>
                            <button
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-cream-50/70 hover:text-cream-50 p-2 transition-colors hidden sm:block"
                                onClick={nextImage}
                            >
                                <ChevronRight className="w-10 h-10" />
                            </button>
                        </>
                    )}

                    <div
                        className="relative max-w-5xl max-h-[85vh] w-full h-full flex items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={images[activeIndex]}
                            alt={`Gallery photo ${activeIndex + 1}`}
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                        />

                        {/* Mobile Controls */}
                        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-6 sm:hidden">
                            <button
                                className="text-cream-50/70 hover:text-cream-50 p-2"
                                onClick={prevImage}
                            >
                                <ChevronLeft className="w-8 h-8" />
                            </button>
                            <span className="text-cream-50 text-sm font-medium">
                                {activeIndex + 1} / {images.length}
                            </span>
                            <button
                                className="text-cream-50/70 hover:text-cream-50 p-2"
                                onClick={nextImage}
                            >
                                <ChevronRight className="w-8 h-8" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
