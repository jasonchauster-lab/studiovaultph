'use client';

import { useState } from 'react';
import { Slot, Studio } from '@/types';
import { ChevronDown, ChevronUp, MapPin, Clock, CreditCard, ShieldCheck } from 'lucide-react';
import { bookSlot } from '@/app/(dashboard)/instructor/actions'; // Type only import if needed, actual usage in subcomponent
import BookSlotGroup from './BookSlotGroup';
import clsx from 'clsx';

interface StudioAvailabilityGroupProps {
    studio: Studio;
    date: Date;
    slots: Slot[];
}

export default function StudioAvailabilityGroup({ studio, date, slots }: StudioAvailabilityGroupProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Grouping Logic
    const groupedSlots: Record<string, { start_time: string, slots: Slot[] }> = groupSlotsByTime(slots);

    // Sort for summary (min/max time)
    const sortedSlots = [...slots].sort((a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    const startTime = new Date(sortedSlots[0].start_time);
    const endTime = new Date(sortedSlots[sortedSlots.length - 1].end_time);

    const timeRangeString = `${startTime.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true })} - ${endTime.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true })}`;
    const dateString = date.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'long', month: 'long', day: 'numeric' });

    // Calculate minimum price from equipment pricing
    const minPrice = studio.pricing && Object.values(studio.pricing).some(v => typeof v === 'number' && v > 0)
        ? Math.min(...Object.values(studio.pricing).filter(v => typeof v === 'number' && v > 0))
        : null;

    // Get unique equipment types across all slots for the summary
    const allEquipment = Array.from(new Set(slots.flatMap(s => s.equipment || [])));

    return (
        <div className="bg-white border border-cream-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
            {/* Header / Summary View */}
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-4 sm:p-5 cursor-pointer flex justify-between items-start bg-white hover:bg-cream-50/50 transition-colors relative"
            >
                <div className="flex items-start gap-5 w-full">
                    {/* Studio Thumbnail */}
                    <div className="hidden sm:block w-32 h-32 rounded-xl overflow-hidden bg-cream-100 border border-cream-200 flex-shrink-0 shadow-inner">
                        <img
                            src={studio.logo_url || ((studio.space_photos_urls && studio.space_photos_urls.length > 0) ? studio.space_photos_urls[0] : "/hero-bg.png")}
                            alt={studio.name}
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = "/hero-bg.png";
                            }}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                    </div>

                    {/* Mobile Logo / Date Section */}
                    <div className="flex flex-col gap-3 flex-1 min-w-0">
                        <div className="flex justify-between items-start w-full">
                            <div className="flex items-center gap-2">
                                <div className="sm:hidden w-10 h-10 rounded-lg overflow-hidden bg-cream-50 border border-cream-200 flex-shrink-0">
                                    <img
                                        src={studio.logo_url || "/logo.png"}
                                        alt={studio.name}
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = "/logo.png";
                                        }}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <h3 className="text-xl font-serif text-charcoal-900 font-bold leading-tight">{studio.name}</h3>
                                        {studio.verified && (
                                            <div className="flex items-center gap-0.5 bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                                                <ShieldCheck className="w-3 h-3" />
                                                Verified
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 text-sm text-charcoal-500 mt-0.5">
                                        <MapPin className="w-3.5 h-3.5" />
                                        <span className="truncate">{studio.location}</span>
                                    </div>
                                </div>
                            </div>


                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1.5 text-sm bg-cream-100/50 px-2.5 py-1 rounded-lg text-charcoal-700 font-medium border border-cream-200">
                                <span className="text-charcoal-400">{date.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', weekday: 'short' })}</span>
                                <span className="w-1 h-1 rounded-full bg-cream-300" />
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    {timeRangeString}
                                </span>
                            </div>

                            <div className="text-xs text-white font-bold bg-rose-gold px-3 py-1 rounded-full shadow-sm flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                {slots.length} Slots Available
                            </div>
                        </div>

                        {/* Equipment Quick View with Prices */}
                        <div className="flex flex-wrap gap-1.5">
                            {allEquipment.slice(0, 4).map(eq => (
                                <span key={eq} className="text-[10px] bg-cream-50 text-charcoal-600 px-2 py-0.5 rounded border border-cream-200">
                                    {eq}: <span className="font-bold text-charcoal-900">{studio.pricing?.[eq] ? `₱${studio.pricing[eq]}` : 'TBA'}</span>
                                </span>
                            ))}
                            {allEquipment.length > 4 && (
                                <span className="text-[10px] bg-cream-50 text-charcoal-400 px-2 py-0.5 rounded border border-cream-100 italic">
                                    +{allEquipment.length - 4} more type{allEquipment.length - 4 !== 1 && 's'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="text-charcoal-300 ml-4 mt-2">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
            </div>

            {/* Expanded View: Individual Slots grouped by time */}
            {
                isExpanded && (
                    <div className="p-4 sm:p-6 pt-0 border-t border-cream-100 bg-cream-50/30">
                        <h4 className="text-sm font-medium text-charcoal-700 mb-3 mt-4">Select a time block to book:</h4>
                        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {Object.entries(groupedSlots).map(([key, group]) => {
                                const slotStart = new Date(group.slots[0].start_time).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true });
                                const slotEnd = new Date(group.slots[0].end_time).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true });

                                return (
                                    <BookSlotGroup
                                        key={key}
                                        startTime={slotStart}
                                        endTime={slotEnd}
                                        slots={group.slots}
                                        studioPricing={studio.pricing}
                                    />
                                )
                            })}
                        </div>
                    </div>
                )
            }
        </div >
    );
}

// Helper: Group by exact start_time (assuming standard hour blocks)
function groupSlotsByTime(slots: Slot[]) {
    const groups: Record<string, { start_time: string, slots: Slot[] }> = {};

    slots.forEach(slot => {
        const timeKey = new Date(slot.start_time).toISOString();
        if (!groups[timeKey]) {
            groups[timeKey] = { start_time: slot.start_time, slots: [] };
        }
        groups[timeKey].slots.push(slot);
    });

    // Sort by time
    return Object.fromEntries(
        Object.entries(groups).sort((a, b) => new Date(a[1].start_time).getTime() - new Date(b[1].start_time).getTime())
    );
}
