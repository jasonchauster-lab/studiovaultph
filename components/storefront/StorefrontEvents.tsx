'use client'

import React, { memo } from 'react'
import clsx from 'clsx'

interface StorefrontEventsProps {
    config: any
    theme?: any
    isMobile?: boolean
}

function StorefrontEvents({ config, theme, isMobile = false }: StorefrontEventsProps) {
    const content = config?.content || {}
    const events = content.items || []

    return (
        <section id="events" className={clsx(
            "py-24 px-6",
            !isMobile && "md:px-12"
        )}>
            <div className="max-w-7xl mx-auto space-y-16">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-4 max-w-2xl">
                        <h2 
                            className={clsx(
                                "font-serif font-bold leading-tight",
                                isMobile ? "text-3xl" : "text-4xl md:text-5xl"
                            )}
                            style={{ color: 'var(--global-text)', fontFamily: 'var(--font-heading)' }}
                        >
                            {content.title || 'Upcoming Events'}
                        </h2>
                        <p className="text-base md:text-lg opacity-60 font-medium leading-relaxed max-w-xl">
                            {content.description || 'Highlighting popular events informs customers about what you have to offer soon.'}
                        </p>
                    </div>
                    <button 
                        onClick={() => {
                            const link = content.btnLink || '/schedule'
                            if (link.startsWith('#')) {
                                document.getElementById(link.slice(1))?.scrollIntoView({ behavior: 'smooth' })
                            } else {
                                window.location.href = link
                            }
                        }}
                        className="px-8 py-4 border-2 border-zinc-900 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-zinc-900 hover:text-white transition-all w-fit"
                        style={{ borderColor: 'var(--global-text)' }}
                    >
                        {content.btnText || 'See all events'}
                    </button>

                </div>

                <div className="grid gap-6">
                    {events.map((event, i) => (
                        <div key={i} className="group relative bg-white rounded-[2.5rem] overflow-hidden border border-zinc-100 shadow-sm flex flex-col md:flex-row min-h-[300px] transition-all hover:shadow-xl">
                            <div className="md:w-2/5 relative overflow-hidden h-[250px] md:h-auto">
                                <img src={event.image} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={event.title} />
                            </div>
                            <div className="md:w-3/5 p-8 md:p-12 flex flex-col justify-center space-y-6">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full">
                                            Upcoming
                                        </span>
                                        <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">{event.date}</span>
                                    </div>
                                    <h4 className="text-2xl md:text-3xl font-bold text-zinc-900 tracking-tight">{event.title}</h4>
                                </div>
                                <div className="flex items-center gap-2 text-zinc-400">
                                    <span className="text-[11px] font-medium italic">{event.location}</span>
                                </div>
                                <button className="w-fit px-8 py-4 bg-zinc-950 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 shadow-lg">
                                    Reserve Spot
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

export default memo(StorefrontEvents)
