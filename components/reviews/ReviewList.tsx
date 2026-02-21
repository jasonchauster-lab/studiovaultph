'use client'

import { useState } from 'react'
import { Star, ShieldCheck, User, ArrowDownUp } from 'lucide-react'

interface Review {
    id: string
    rating: number
    comment: string | null
    tags: string[] | null
    created_at: string
    reviewer: {
        full_name: string
        avatar_url?: string | null
        role?: string
    } | {
        full_name: string
        avatar_url?: string | null
        role?: string
    }[] | null
}

interface ReviewListProps {
    reviews: Review[]
}

type SortOption = 'newest' | 'oldest' | 'highest' | 'lowest'

export default function ReviewList({ reviews }: ReviewListProps) {
    const [sortBy, setSortBy] = useState<SortOption>('newest')

    if (!reviews || reviews.length === 0) {
        return (
            <div className="text-center py-10 text-charcoal-400">
                <Star className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No reviews available yet.</p>
            </div>
        )
    }

    // Helper to handle array-wrapped Supabase joins
    const getFirst = <T,>(val: T | T[]): T | undefined => Array.isArray(val) ? val[0] : val

    // Sort the reviews
    const sortedReviews = [...reviews].sort((a, b) => {
        if (sortBy === 'newest') {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        }
        if (sortBy === 'oldest') {
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        }
        if (sortBy === 'highest') {
            return b.rating - a.rating
        }
        if (sortBy === 'lowest') {
            return a.rating - b.rating
        }
        return 0
    })

    return (
        <div className="space-y-4">
            {/* Sorting Header */}
            <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-medium text-charcoal-600">
                    {reviews.length} {reviews.length === 1 ? 'Review' : 'Reviews'}
                </span>
                <div className="flex items-center gap-2">
                    <ArrowDownUp className="w-4 h-4 text-charcoal-400" />
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortOption)}
                        className="text-sm border-none bg-transparent text-charcoal-700 font-medium focus:ring-0 cursor-pointer p-0"
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="highest">Highest Rated</option>
                        <option value="lowest">Lowest Rated</option>
                    </select>
                </div>
            </div>

            {/* Reviews List */}
            {sortedReviews.map((review) => {
                const reviewer = getFirst(review.reviewer)
                const date = new Date(review.created_at).toLocaleDateString('en-PH', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                })

                return (
                    <div
                        key={review.id}
                        className="bg-white border border-cream-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex items-center gap-3">
                                {/* Avatar */}
                                <div className="w-9 h-9 rounded-full bg-cream-100 flex items-center justify-center flex-shrink-0">
                                    <User className="w-4 h-4 text-charcoal-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-charcoal-900">
                                        {reviewer?.full_name ?? 'Anonymous'}
                                    </p>
                                    <p className="text-xs text-charcoal-500 font-medium mt-0.5">{date}</p>
                                </div>
                            </div>

                            {/* Verified Session Badge */}
                            <div className="flex items-center gap-1 bg-green-50 border border-green-200 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0">
                                <ShieldCheck className="w-3 h-3" />
                                <span className="hidden sm:inline">Verified Session</span>
                                <span className="sm:hidden">Verified</span>
                            </div>
                        </div>

                        {/* Stars */}
                        <div className="flex mb-3">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                    key={star}
                                    className="w-4 h-4"
                                    fill={review.rating >= star ? '#D4A017' : 'none'}
                                    stroke={review.rating >= star ? '#D4A017' : '#D1D5DB'}
                                    strokeWidth={1.5}
                                />
                            ))}
                        </div>

                        {/* Tags */}
                        {review.tags && review.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-3">
                                {review.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="bg-charcoal-100 text-charcoal-700 text-xs px-2.5 py-0.5 rounded-full border border-charcoal-200"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Comment */}
                        {review.comment && (
                            <p className="text-sm text-charcoal-700 leading-relaxed">
                                &ldquo;{review.comment}&rdquo;
                            </p>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
