'use client'

import React from 'react'
import { MapPin } from 'lucide-react'
import Image from 'next/image'
import clsx from 'clsx'
import Avatar from '@/components/shared/Avatar'

interface DashboardHeroProps {
    title: string
    subtitle?: string
    profile?: {
        name: string
        location?: string
        image?: string
    }
    actions?: React.ReactNode
    className?: string
}

export const DashboardHero = ({ title, subtitle, profile, actions, className }: DashboardHeroProps) => {
    return (
        <div className={clsx("sticky-header-antigravity -mx-4 sm:-mx-8 lg:-mx-12 mb-8 sm:mb-16 px-4 sm:px-8 lg:px-12 py-10 sm:py-14", className)}>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                <div className="space-y-4">
                    <h1 className="text-3xl sm:text-5xl md:text-6xl font-serif font-black text-burgundy tracking-tighter leading-none animate-in fade-in slide-in-from-left-4 duration-700">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="text-[9px] sm:text-[11px] font-black text-burgundy/40 uppercase tracking-[0.3em] sm:tracking-[0.4em] max-w-2xl leading-relaxed animate-in fade-in slide-in-from-left-4 duration-700 delay-100">
                            {subtitle}
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-6 animate-in fade-in slide-in-from-right-4 duration-700 delay-200">
                    {profile && (
                        <div className="flex items-center gap-4 bg-white/40 backdrop-blur-md p-3 pr-6 rounded-[2rem] border border-burgundy/5 shadow-tight ring-1 ring-white/20">
                            <Avatar 
                                src={profile.image} 
                                fallbackName={profile.name} 
                                size={48} 
                                className="!border-2 !border-white !shadow-tight"
                            />
                            <div className="min-w-0">
                                <p className="text-sm font-black text-burgundy tracking-tight truncate">{profile.name}</p>
                                {profile.location && (
                                    <p className="text-[10px] text-burgundy/40 flex items-center gap-1.5 font-bold uppercase tracking-wider truncate">
                                        <MapPin className="w-3 h-3 text-forest" />
                                        {profile.location}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                    {actions && (
                        <div className="flex items-center gap-3">
                            {actions}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
