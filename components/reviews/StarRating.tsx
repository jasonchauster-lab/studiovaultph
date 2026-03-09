import { Star } from 'lucide-react'

interface StarRatingProps {
    rating: number | null
    count?: number
    size?: 'xs' | 'sm' | 'md' | 'lg'
}

export default function StarRating({ rating, count, size = 'md' }: StarRatingProps) {
    if (!rating) {
        return (
            <span className="text-charcoal/30 text-[10px] font-bold uppercase tracking-wider italic">No reviews</span>
        )
    }

    const sizeMap = {
        xs: 'w-2.5 h-2.5',
        sm: 'w-3.5 h-3.5',
        md: 'w-5 h-5',
        lg: 'w-6 h-6',
    }
    const textMap = {
        xs: 'text-[9px]',
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
                            fill={fill === 1 ? '#D4AF37' : 'none'}
                            stroke={fill > 0 ? '#D4AF37' : '#E5D1B8'}
                            strokeWidth={1.5}
                        />
                    )
                })}
            </div>
            <span className={`font-bold text-charcoal tracking-tight ${textClass}`}>{rating.toFixed(1)}</span>
            {count !== undefined && (
                <span className={`text-charcoal/40 font-medium ${textClass}`}>({count})</span>
            )}
        </div>
    )
}
