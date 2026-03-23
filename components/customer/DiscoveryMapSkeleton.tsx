'use client'

import React from 'react'

export default function DiscoveryMapSkeleton() {
    return (
        <div className="w-full h-[calc(100vh-200px)] min-h-[500px] rounded-[2.5rem] overflow-hidden border border-burgundy/5 shadow-2xl relative bg-[#f5f2eb] animate-pulse">
            {/* Map Placeholder Texture */}
            <div className="absolute inset-0 opacity-[0.03] mix-blend-multiply" 
                style={{ backgroundImage: `url("https://www.transparenttextures.com/patterns/felt.png")` }} 
            />
            
            {/* Top Badge Skeleton */}
            <div className="absolute top-6 left-6 z-10 hidden sm:flex items-center gap-3 bg-white/60 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-burgundy/5 shadow-xl">
                <div className="w-2 h-2 rounded-full bg-burgundy/10" />
                <div className="w-24 h-2 bg-burgundy/10 rounded-full" />
            </div>

            {/* Central Map Loading Indicator */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-forest/20 border-t-forest rounded-full animate-spin" />
                    <span className="text-[10px] font-black text-burgundy/20 uppercase tracking-[0.3em]">Initializing Atlas</span>
                </div>
            </div>

            {/* Marker Skeletons */}
            {[...Array(5)].map((_, i) => (
                <div 
                    key={i}
                    className="absolute"
                    style={{ 
                        top: `${20 + Math.random() * 60}%`, 
                        left: `${20 + Math.random() * 60}%` 
                    }}
                >
                    <div className="w-16 h-6 bg-white/40 rounded-full border border-burgundy/5" />
                </div>
            ))}

            {/* Carousel Skeletons at the bottom */}
            <div className="absolute bottom-10 left-0 right-0 z-10 flex gap-4 px-6 overflow-hidden">
                {[...Array(4)].map((_, i) => (
                    <div 
                        key={i}
                        className="flex-shrink-0 w-[280px] h-64 bg-white/40 backdrop-blur-xl rounded-[2rem] border border-burgundy/5 p-8 flex flex-col gap-4"
                    >
                        <div className="w-full h-32 bg-burgundy/[0.03] rounded-xl" />
                        <div className="w-2/3 h-4 bg-burgundy/[0.05] rounded-full" />
                        <div className="w-1/2 h-2 bg-burgundy/[0.03] rounded-full" />
                        <div className="mt-auto w-full h-10 bg-burgundy/[0.02] rounded-xl" />
                    </div>
                ))}
            </div>
        </div>
    )
}
