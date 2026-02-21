'use client'

import { useState } from 'react'
import { X, Maximize2 } from 'lucide-react'

interface ExpandableImageProps {
    src: string
    alt: string
    className?: string
}

export default function ExpandableImage({ src, alt, className }: ExpandableImageProps) {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            {/* Thumbnail */}
            <div
                className={`relative group cursor-pointer ${className}`}
                onClick={() => setIsOpen(true)}
                title="Click to expand"
            >
                <img
                    src={src}
                    alt={alt}
                    className="w-full h-full object-contain rounded-lg"
                />

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center rounded-lg">
                    <Maximize2 className="w-6 h-6 text-charcoal-900 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
            </div>

            {/* Modal */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 transition-all"
                    onClick={() => setIsOpen(false)}
                >
                    <div className="relative max-w-4xl max-h-[90vh] bg-white p-2 rounded-xl shadow-2xl overflow-hidden">
                        <button
                            className="absolute top-4 right-4 bg-charcoal-900/50 hover:bg-charcoal-900 text-white p-2 rounded-full transition-colors"
                            onClick={(e) => {
                                e.stopPropagation()
                                setIsOpen(false)
                            }}
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <img
                            src={src}
                            alt={alt}
                            className="max-w-full max-h-[85vh] object-contain"
                        />
                        <p className="text-center text-charcoal-600 mt-2 font-medium">{alt}</p>
                    </div>
                </div>
            )}
        </>
    )
}
