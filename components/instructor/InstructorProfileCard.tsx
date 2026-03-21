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
        <div className={`glass-card p-8 rounded-[32px] text-center border-border-grey shadow-cloud bg-white ${isSticky ? 'sticky top-24' : ''}`}>
            {/* Avatar Section */}
            <div className="relative w-32 h-32 bg-white/40 rounded-full flex items-center justify-center mx-auto mb-6 overflow-hidden border-2 border-white/80 shadow-cloud ring-1 ring-border-grey/10">
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
                    className="inline-flex items-center justify-center gap-2 text-[10px] font-bold text-sage uppercase tracking-widest hover:text-burgundy transition-colors group mb-4"
                >
                    <Instagram className="w-4 h-4 group-hover:scale-110 transition-transform" />
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
                <div className="flex flex-wrap justify-center gap-2 mb-8">
                    {instructor.certifications.map((c, i) => (
                        <span
                            key={i}
                            className={`text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-1.5 border ${c.verified
                                ? "bg-sage/10 text-sage border-sage/20"
                                : "bg-white/40 text-burgundy/60 border-white/60"
                                }`}
                            title={c.verified ? 'Verified Certification' : 'Pending Verification'}
                        >
                            <Award className="w-3 h-3" />
                            {c.certification_body}
                            {!c.verified && <span className="opacity-50">(Pending)</span>}
                        </span>
                    ))}
                </div>
            )}

            {/* Home Sessions Badge */}
            {instructor.offers_home_sessions && (
                <div className="mb-8 p-4 bg-forest/5 border border-forest/10 rounded-2xl flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 text-forest font-black text-[10px] uppercase tracking-widest">
                        <CheckCircle className="w-4 h-4" />
                        Home Sessions Available
                    </div>
                    {instructor.max_travel_km && (
                        <span className="text-[9px] text-forest/40 font-bold uppercase tracking-widest">
                            Within {instructor.max_travel_km}km of {instructor.home_base_address?.split(',')[0] || 'Base'}
                        </span>
                    )}
                </div>
            )}

            {/* Teaching Equipment */}
            {(instructor.teaching_equipment || (instructor.rates && Object.keys(instructor.rates).length > 0)) && (
                <div className="pt-8 border-t border-burgundy/5">
                    <h3 className="text-[10px] font-bold text-burgundy/60 uppercase tracking-[0.2em] mb-4">
                        Certified Equipment
                    </h3>
                    <div className="flex flex-wrap justify-center gap-2">
                        {(instructor.teaching_equipment || Object.keys(instructor.rates || {})).map((eq) => (
                            <span 
                                key={eq} 
                                className="bg-white/60 text-burgundy text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-[12px] border border-border-grey shadow-tight"
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
