'use client'

import React, { memo } from 'react'
import clsx from 'clsx'

interface StorefrontClassesProps {
    config: any
    theme?: any
    isMobile?: boolean
}

function StorefrontClasses({ config, theme, isMobile = false }: StorefrontClassesProps) {
    const content = config?.content || {}
    const classes = content.items || []

    return (
        <section id="classes" className={clsx(
            "py-24 px-6",
            !isMobile && "md:px-12"
        )}>
            <div className="max-w-7xl mx-auto space-y-16">
                <div className="space-y-4 max-w-2xl">
                    <h2 
                        className={clsx(
                            "font-serif font-bold leading-tight",
                            isMobile ? "text-3xl" : "text-4xl md:text-5xl"
                        )}
                        style={{ color: 'var(--global-text)', fontFamily: 'var(--font-heading)' }}
                    >
                        {content.title || 'Popular Classes'}
                    </h2>
                    <p 
                        className="text-base md:text-lg opacity-60 leading-relaxed font-medium"
                        style={{ color: 'var(--global-text)', fontFamily: 'var(--font-body)' }}
                    >
                        {content.description || 'Highlighting popular classes informs customers about what you have to offer as soon as they visit.'}
                    </p>
                </div>

                <div className={clsx(
                    "grid gap-8",
                    isMobile ? "grid-cols-1" : "md:grid-cols-3"
                )}>
                    {classes.map((cls, i) => (
                        <div key={i} className="group relative bg-white rounded-[2.5rem] overflow-hidden border border-zinc-100 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
                            <div className="aspect-[4/5] relative overflow-hidden">
                                <img src={cls.image} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={cls.name} />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                <div className="absolute bottom-6 left-6 right-6">
                                    <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest text-white mb-2">
                                        {cls.level}
                                    </span>
                                    <h4 className="text-xl font-bold text-white tracking-tight">{cls.name}</h4>
                                </div>
                            </div>
                            <div className="p-6 flex items-center justify-between">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">{cls.duration}</span>
                                <button className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-900 group-hover:text-indigo-600 transition-colors">Book Now →</button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-center pt-8">
                    <button 
                        onClick={() => {
                            const link = content.btnLink || '/schedule'
                            if (link.startsWith('#')) {
                                document.getElementById(link.slice(1))?.scrollIntoView({ behavior: 'smooth' })
                            } else {
                                window.location.href = link
                            }
                        }}
                        className="px-12 py-5 bg-zinc-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl"
                        style={{ borderRadius: 'var(--button-radius)', backgroundColor: 'var(--button-color)' }}
                    >
                        {content.btnText || 'Explore all classes'}
                    </button>

                </div>
            </div>
        </section>
    )
}

export default memo(StorefrontClasses)
