'use client'

import React from 'react'
import { Award, Instagram, CheckCircle } from 'lucide-react'
import StarRating from '@/components/reviews/StarRating'
import Image from 'next/image'
import { getSupabaseAssetUrl } from '@/lib/supabase/utils'

interface InstructorProfileCardProps {
    instructor: {
        id: string
        full_name: string
        avatar_url?: string | null
        bio?: string | null
        instagram_handle?: string | null
        certifications?: Array<{
            certification_body: string
            verified: boolean
        }>
        rates?: Record<string, number>
        teaching_equipment?: string[]
        offers_home_sessions?: boolean
        max_travel_km?: number
        home_base_address?: string | null
    }
    averageRating?: number
    totalReviews?: number
    isSticky?: boolean
}

export default function InstructorProfileCard({
    instructor,
    averageRating = 0,
    totalReviews = 0,
    isSticky = true
}: InstructorProfileCardProps) {
    const initial = instructor.full_name ? instructor.full_name.charAt(0).toUpperCase() : 'I'

    return (
        <div className={`atelier-card p-10 text-center ${isSticky ? 'sm:sticky sm:top-24' : ''}`}>
            {/* Avatar Section */}
            <div className="relative w-40 h-40 bg-white rounded-full flex items-center justify-center mx-auto mb-8 overflow-hidden border-4 border-white shadow-2xl ring-1 ring-burgundy/5 group hover:scale-105 transition-transform duration-700">
                <Image
                    src={getSupabaseAssetUrl(instructor.avatar_url, 'avatars') || '/default-avatar.svg'}
                    alt={instructor.full_name}
                    fill
                    className="object-cover"
                    sizes="128px"
                    priority={true}
                />
            </div>

            {/* Name and Instagram */}
            <h3 className="text-3xl font-serif font-bold text-burgundy mb-2 tracking-tight">
                {instructor.full_name}
            </h3>
            
            {instructor.instagram_handle && (
                <a
                    href={`https://instagram.com/${instructor.instagram_handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-3 text-[11px] font-black text-forest uppercase tracking-[0.2em] hover:text-burgundy transition-all duration-300 group mb-6 px-6 py-2 rounded-full bg-forest/5 hover:bg-burgundy/5 border border-forest/10 hover:border-burgundy/10"
                >
                    <Instagram className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
                    @{instructor.instagram_handle}
                </a>
            )}

            {/* Average Rating */}
            <div className="flex justify-center mb-6">
                <StarRating rating={averageRating} count={totalReviews} size="sm" />
            </div>

            {/* Bio Quote */}
            {instructor.bio && (
                <div className="text-[13px] font-medium text-burgundy/80 leading-relaxed italic px-4 mb-8">
                    &ldquo;{instructor.bio}&rdquo;
                </div>
            )}

            {/* Certifications */}
            {instructor.certifications && instructor.certifications.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2.5 mb-8">
                    {instructor.certifications.map((c: any, i: number) => (
                        <span
                            key={i}
                            className={`text-[9px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-xl flex items-center gap-2 border transition-all duration-300 ${c.verified
                                ? "bg-forest text-white border-forest shadow-lg shadow-forest/10"
                                : "bg-white text-burgundy/40 border-burgundy/5"
                                }`}
                            title={c.verified ? 'Verified Master' : 'Pending Verification'}
                        >
                            <Award className="w-3.5 h-3.5" />
                            {c.certification_body}
                        </span>
                    ))}
                </div>
            )}

            {/* Home Sessions Badge */}
            {instructor.offers_home_sessions && (
                <div className="mb-10 p-6 bg-forest/5 border border-forest/10 rounded-[2rem] flex flex-col items-center gap-3 shadow-inner">
                    <div className="flex items-center gap-3 text-forest font-black text-[11px] uppercase tracking-[0.2em]">
                        <div className="w-8 h-8 rounded-full bg-forest text-white flex items-center justify-center shadow-lg shadow-forest/20">
                            <CheckCircle className="w-4 h-4" />
                        </div>
                        Home Sessions
                    </div>
                    {instructor.max_travel_km && (
                        <span className="text-[10px] text-forest/50 font-black uppercase tracking-[0.15em]">
                            Within {instructor.max_travel_km}km Range
                        </span>
                    )}
                </div>
            )}

            {/* Teaching Equipment */}
            {(instructor.teaching_equipment?.length || (instructor.rates && Object.keys(instructor.rates).length > 0)) && (
                <div className="pt-10 border-t border-burgundy/5">
                    <h3 className="text-[10px] font-black text-burgundy/20 uppercase tracking-[0.3em] mb-6">
                        Expertise & Specializations
                    </h3>
                    <div className="flex flex-wrap justify-center gap-2.5">
                        {(instructor.teaching_equipment || Object.keys(instructor.rates || {})).map((eq) => (
                            <span 
                                key={eq} 
                                className="bg-white text-burgundy/60 text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-xl border border-burgundy/5 shadow-sm hover:border-burgundy/10 transition-colors"
                            >
                                {eq}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
