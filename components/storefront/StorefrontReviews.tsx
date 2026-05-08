'use client'

import React, { memo } from 'react'
import { Star, Quote, ChevronLeft, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import clsx from 'clsx'

interface Review {
    id: string
    rating: number
    comment: string
    user_name: string
    user_avatar?: string
    created_at: string
}

interface StorefrontReviewsProps {
    reviews: Review[]
    config: any
    theme: any
    isMobile?: boolean
}

function StorefrontReviews({ reviews: dbReviews, config, theme, isMobile = false }: StorefrontReviewsProps) {
    const content = config?.content || {}
    const isPremium = theme?.layoutStyle === 'premium'
    const source = content.source || 'database' // 'database', 'manual', 'hybrid'
    
    // Resolve reviews based on source
    const manualReviews = (content.reviews || []).map((r: any, idx: number) => ({
        id: `manual-${idx}`,
        rating: r.rating || 5,
        comment: r.text,
        user_name: r.name,
        user_avatar: r.avatar,
        created_at: new Date().toISOString()
    }))

    const displayReviews = React.useMemo(() => {
        if (source === 'manual') return manualReviews
        if (source === 'hybrid') return [...manualReviews, ...dbReviews]
        return dbReviews
    }, [source, manualReviews, dbReviews])

    if (!displayReviews || displayReviews.length === 0) return null

    return (
        <section 
            id="reviews" 
            className={clsx(
                "relative overflow-hidden transition-all duration-500",
                isMobile ? "px-4" : "px-6 md:px-12"
            )}
            style={{ 
                backgroundColor: content.customBgColor || 'var(--global-bg)',
                color: 'var(--global-text)',
                paddingBlock: content.verticalSpacing || (isMobile ? '5rem' : '8rem')
            }}
        >
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col items-center text-center space-y-6 mb-16 md:mb-24">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary-brand)]/5 rounded-full border border-[var(--primary-brand)]/10 text-[var(--primary-brand)] text-[10px] font-black uppercase tracking-[0.2em]">
                        {content.tagline || "Social Proof"}
                    </div>
                    <h2 
                        className={clsx(
                            "font-bold leading-tight tracking-tightest uppercase",
                            isMobile ? "text-4xl" : "text-5xl md:text-7xl"
                        )}
                        style={{ fontFamily: 'var(--font-heading)' }}
                    >
                        {content.title || "Community Love"}
                    </h2>
                    <p className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.4em] max-w-lg">
                        {content.subtitle || "Voices from our studio community"}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {displayReviews.slice(0, 9).map((review: any, index: number) => (
                        <motion.div 
                            key={review.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-white p-10 shadow-tight border border-zinc-100 flex flex-col justify-between group hover:shadow-2xl hover:scale-[1.02] transition-all duration-500"
                            style={{ borderRadius: 'var(--card-radius, 3rem)' }}
                        >
                            <div className="space-y-8">
                                <div className="flex gap-1">
                                    {[...Array(5)].map((_, i) => (
                                        <Star 
                                            key={i} 
                                            className={clsx(
                                                "w-4 h-4",
                                                i < review.rating ? "text-amber-400 fill-amber-400" : "text-zinc-200"
                                            )} 
                                        />
                                    ))}
                                </div>
                                <Quote className="w-10 h-10 text-[var(--primary-brand)] opacity-10 group-hover:opacity-20 transition-opacity" />
                                <p className="text-lg font-medium leading-relaxed italic text-zinc-600">
                                    "{review.comment}"
                                </p>
                            </div>
                            <div className="mt-12 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-[var(--primary-brand)]/10 flex items-center justify-center font-black text-[var(--primary-brand)] uppercase tracking-tighter overflow-hidden border border-zinc-50">
                                    {review.user_avatar ? (
                                        <img src={review.user_avatar} alt={review.user_name} className="w-full h-full object-cover" />
                                    ) : (
                                        review.user_name.charAt(0)
                                    )}
                                </div>
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-widest text-zinc-900">{review.user_name}</h4>
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                        {review.id.startsWith('manual-') ? 'Verified Story' : 'Verified Member'}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}

export default memo(StorefrontReviews)
