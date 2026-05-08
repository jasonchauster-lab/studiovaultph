import React from 'react'
import PricingCard from './PricingCard'

interface PricingSectionProps {
    title: string
    description?: string
    items: any[]
    studioId: string
    studioLocation?: string
}

export default function PricingSection({ title, description, items, studioId, studioLocation }: PricingSectionProps) {
    if (items.length === 0) return null

    return (
        <section className="py-16 border-t border-charcoal-100 first:border-t-0">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                {/* Left side: Category Header */}
                <div className="space-y-4">
                    <h2 className="text-2xl font-serif font-black text-charcoal-900 leading-tight">
                        {title}
                    </h2>
                    {description && (
                        <p className="text-[11px] text-charcoal-400 font-medium leading-relaxed max-w-[200px]">
                            {description}
                        </p>
                    )}
                </div>

                {/* Right side: Cards Grid */}
                <div className="md:col-span-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {items.map((item: any) => (
                            <PricingCard 
                                key={item.id}
                                {...item}
                                studioId={studioId}
                                studioLocation={studioLocation}
                                type={item.type || 'package'}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
