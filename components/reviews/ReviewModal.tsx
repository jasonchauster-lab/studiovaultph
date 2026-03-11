'use client'

import { useState, useEffect } from 'react'
import { Star, X } from 'lucide-react'
import { submitReview } from '@/app/(dashboard)/reviews/actions'
import { CUSTOMER_TAGS, INSTRUCTOR_TAGS, ReviewRole } from '@/lib/reviews'

interface PendingBooking {
    id: string
    client_id: string
    instructor_id: string
    slots: { date: string; start_time: string; studios: { name: string } | { name: string }[] } | null
    client: { id: string; full_name: string } | null
    instructor: { id: string; full_name: string } | null
}

interface ReviewModalProps {
    booking: PendingBooking
    currentUserId: string
    isInstructor: boolean
    revieweeId?: string       // optional override
    revieweeName?: string     // optional override
    reviewContext?: string    // e.g. 'Instructor' | 'Studio'
    onClose: () => void
    onSuccess: () => void
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
    const [hovered, setHovered] = useState(0)
    return (
        <div className="flex gap-1" role="group" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    onClick={() => onChange(star)}
                    onMouseEnter={() => setHovered(star)}
                    onMouseLeave={() => setHovered(0)}
                    className="transition-transform hover:scale-110 focus:outline-none"
                    aria-label={`${star} star`}
                >
                    <Star
                        className="w-8 h-8"
                        fill={(hovered || value) >= star ? '#2F5233' : 'none'}
                        stroke={(hovered || value) >= star ? '#2F5233' : '#E5E7EB'}
                        strokeWidth={1.5}
                    />
                </button>
            ))}
        </div>
    )
}

export default function ReviewModal({ booking, isInstructor, revieweeId: revieweeIdProp, revieweeName: revieweeNameProp, reviewContext, onClose, onSuccess }: ReviewModalProps) {
    const [rating, setRating] = useState(0)
    const [comment, setComment] = useState('')
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Implement scroll lock
    useEffect(() => {
        const originalStyle = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = originalStyle;
        };
    }, []);

    // Studio reviews use customer tags too (same pool as rating the instructor)
    const tags = isInstructor ? INSTRUCTOR_TAGS : CUSTOMER_TAGS
    const role: ReviewRole = isInstructor ? 'instructor' : 'customer'

    // Helper to handle potentially-arrayed Supabase joins
    const getFirst = <T,>(val: T | T[]): T | undefined => Array.isArray(val) ? val[0] : val

    const slots = getFirst(booking.slots)
    const studioName = getFirst(slots?.studios)?.name ?? 'Studio'
    const sessionDate = slots?.date && slots?.start_time
        ? new Date(`${slots.date}T${slots.start_time}+08:00`).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
        : ''

    // Use explicit props if provided, else derive from booking
    const reviewee = isInstructor
        ? getFirst(booking.client)
        : getFirst(booking.instructor)
    const revieweeId = revieweeIdProp ?? (isInstructor ? booking.client_id : booking.instructor_id)
    const displayName = revieweeNameProp ?? reviewee?.full_name ?? (isInstructor ? 'Your Client' : 'Your Instructor')
    const contextLabel = reviewContext ?? (isInstructor ? 'Instructor' : 'Instructor')

    const toggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        )
    }

    const handleSubmit = async () => {
        if (rating === 0) {
            setError('Please select a star rating.')
            return
        }
        setIsSubmitting(true)
        setError(null)

        const result = await submitReview({
            bookingId: booking.id,
            revieweeId,
            role,
            rating,
            comment,
            tags: selectedTags,
        })

        setIsSubmitting(false)

        if (result?.error) {
            setError(result.error)
        } else {
            onSuccess()
        }
    }

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-charcoal/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-500">
                {/* Header */}
                <div className="bg-charcoal px-8 py-6 text-white relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Review Your Session</p>
                    <h2 className="text-xl font-serif font-bold">{studioName}</h2>
                    {sessionDate && <p className="text-sm text-white/60 mt-0.5">{sessionDate}</p>}
                </div>

                {/* Body */}
                <div className="px-8 py-6 space-y-6">
                    {/* Who you're reviewing */}
                    <div>
                        <p className="text-[10px] font-bold text-slate uppercase tracking-wider mb-1">
                            Reviewing {contextLabel}
                        </p>
                        <p className="text-charcoal font-bold text-lg">
                            {displayName}
                        </p>
                    </div>

                    {/* Star Rating */}
                    <div>
                        <p className="text-sm font-bold text-charcoal mb-3">Overall Rating</p>
                        <StarPicker value={rating} onChange={setRating} />
                    </div>

                    {/* Quick Tags */}
                    <div>
                        <p className="text-sm font-bold text-charcoal mb-3">Quick Tags <span className="text-slate font-normal">(optional)</span></p>
                        <div className="flex flex-wrap gap-2">
                            {tags.map(tag => (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={() => toggleTag(tag)}
                                    className={`px-4 py-1.5 rounded-full text-xs border font-bold transition-all ${selectedTags.includes(tag)
                                        ? 'bg-forest text-white border-forest shadow-tight'
                                        : 'bg-white text-charcoal border-border-grey hover:border-forest'
                                        }`}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Comment */}
                    <div>
                        <label className="text-sm font-bold text-charcoal block mb-2" htmlFor="review-comment">
                            Share your experience <span className="text-slate font-normal">(optional)</span>
                        </label>
                        <textarea
                            id="review-comment"
                            rows={3}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="What stood out about this session?"
                            className="w-full px-4 py-3 rounded-lg border border-border-grey text-sm text-charcoal placeholder:text-slate/40 resize-none focus:outline-none focus:ring-1 focus:ring-forest bg-off-white"
                        />
                    </div>

                    {error && (
                        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>
                    )}

                    {/* Submit */}
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || rating === 0}
                        className="btn-forest w-full py-4 text-sm font-bold"
                    >
                        {isSubmitting ? 'Submitting…' : 'Submit Review'}
                    </button>

                    <p className="text-center text-xs text-charcoal-400">
                        Your review is private until the other party submits theirs, or 48 hours pass.
                    </p>
                </div>
            </div>
        </div>
    )
}
