import { Star } from 'lucide-react'

interface StarRatingProps {
    rating: number | null
    count?: number
    size?: 'sm' | 'md' | 'lg'
}

export default function StarRating({ rating, count, size = 'md' }: StarRatingProps) {
    if (!rating) {
        return (
            <span className="text-charcoal-400 text-sm italic">No reviews yet</span>
        )
    }

    const sizeMap = {
        sm: 'w-3.5 h-3.5',
        md: 'w-5 h-5',
        lg: 'w-6 h-6',
    }
    const textMap = {
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg',
    }

    const starClass = sizeMap[size]
    const textClass = textMap[size]

    return (
        <div className="flex items-center gap-1.5">
            <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => {
                    const fill = rating >= star ? 1 : rating >= star - 0.5 ? 0.5 : 0
                    return (
                        <Star
                            key={star}
                            className={starClass}
                            fill={fill === 1 ? '#D4A017' : 'none'}
                            stroke={fill > 0 ? '#D4A017' : '#D1D5DB'}
                            strokeWidth={1.5}
                        />
                    )
                })}
            </div>
            <span className={`font-semibold text-charcoal-900 ${textClass}`}>{rating.toFixed(1)}</span>
            {count !== undefined && (
                <span className={`text-charcoal-500 ${textClass}`}>({count})</span>
            )}
        </div>
    )
}
