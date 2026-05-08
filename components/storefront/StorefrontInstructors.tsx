'use client'

import React from 'react'
import { Instagram, Linkedin, Twitter } from 'lucide-react'
import clsx from 'clsx'
import Image from 'next/image'
import supabaseLoader from '@/lib/utils/image-loader'

interface Instructor {
    name: string
    specialty: string
    bio: string
    image: string
    instagram?: string
    linkedin?: string
}

interface StorefrontInstructorsProps {
    config: {
        content: {
            title?: string
            items?: Instructor[]
        }
    }
    theme?: any
    isMobile?: boolean
}

export default function StorefrontInstructors({ config, theme, isMobile }: StorefrontInstructorsProps) {
    const { title = 'Meet Our Instructors', items = [] } = config.content
    const primaryColor = theme?.primaryColor || '#2D3282'

    return (
        <section id="instructors" className="py-24 bg-white overflow-hidden">
            <div className="container mx-auto px-6 md:px-12">
                <div className="max-w-3xl mb-16">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-50 rounded-full mb-6 border border-zinc-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-forest animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">The Experts</span>
                    </div>
                    <h2 
                        className="text-4xl md:text-5xl font-serif font-black tracking-tight"
                        style={{ color: theme?.textColor || '#18181b', fontFamily: theme?.headingFont }}
                    >
                        {title}
                    </h2>
                </div>

                {items.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {items.map((inst: Instructor, index: number) => (
                            <div key={index} className="group relative">
                                <div className="aspect-[4/5] rounded-[3rem] overflow-hidden bg-zinc-100 mb-8 relative">
                                    {inst.image ? (
                                        <Image 
                                            loader={supabaseLoader}
                                            src={inst.image} 
                                            alt={inst.name}
                                            fill
                                            className="object-cover transition-transform duration-700 group-hover:scale-110"
                                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-zinc-300 italic font-serif">
                                            Instructor Photo
                                        </div>
                                    )}
                                    
                                    {/* Social Overlay */}
                                    {(inst.instagram || inst.linkedin) && (
                                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-4 group-hover:translate-y-0">
                                            {inst.instagram && (
                                                <a 
                                                    href={inst.instagram.startsWith('http') ? inst.instagram : `https://instagram.com/${inst.instagram.replace('@', '')}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-10 h-10 rounded-full bg-white/90 backdrop-blur shadow-xl flex items-center justify-center text-zinc-900 hover:bg-white transition-colors"
                                                >
                                                    <Instagram className="w-4 h-4" />
                                                </a>
                                            )}
                                            {inst.linkedin && (
                                                <a 
                                                    href={inst.linkedin.startsWith('http') ? inst.linkedin : `https://linkedin.com/in/${inst.linkedin.replace('@', '')}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-10 h-10 rounded-full bg-white/90 backdrop-blur shadow-xl flex items-center justify-center text-zinc-900 hover:bg-white transition-colors"
                                                >
                                                    <Linkedin className="w-4 h-4" />
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3 px-2">
                                    <div className="space-y-1">
                                        <h3 
                                            className="text-2xl font-bold tracking-tight text-zinc-900"
                                            style={{ fontFamily: theme?.headingFont }}
                                        >
                                            {inst.name}
                                        </h3>
                                        <p 
                                            className="text-[10px] font-black uppercase tracking-[0.2em] text-forest"
                                            style={{ fontFamily: theme?.bodyFont }}
                                        >
                                            {inst.specialty}
                                        </p>
                                    </div>
                                    <p 
                                        className="text-sm md:text-base text-zinc-500 leading-relaxed font-light line-clamp-3"
                                        style={{ fontFamily: theme?.bodyFont }}
                                    >
                                        {inst.bio}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-32 text-center border-2 border-dashed border-zinc-100 rounded-[4rem] bg-zinc-50/50">
                        <p className="font-serif italic text-zinc-400 text-xl px-12 capitalize">Add your world-class instructors in the builder to showcase your team's expertise...</p>
                    </div>
                )}
            </div>
        </section>
    )
}
