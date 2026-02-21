'use client';

import { useState } from 'react';
import { Slot, Studio } from '@/types';
import { ChevronDown, ChevronUp, MapPin, Clock, CreditCard } from 'lucide-react';
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

    const timeRangeString = `${startTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${endTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    const dateString = date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

    return (
        <div className="bg-white border border-cream-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
            {/* Header / Summary View */}
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-4 sm:p-6 cursor-pointer flex justify-between items-center bg-white hover:bg-cream-50/50 transition-colors"
            >
                <div className="flex items-start gap-4">
                    {/* Date Box */}
                    <div className="flex flex-col items-center justify-center w-16 h-16 bg-cream-100 rounded-lg text-charcoal-900">
                        <span className="text-xs font-medium uppercase tracking-wider">{date.toLocaleDateString([], { month: 'short' })}</span>
                        <span className="text-2xl font-serif font-bold">{date.getDate()}</span>
                    </div>

                    <div>
                        <h3 className="text-lg font-serif text-charcoal-900 font-medium">{studio.name}</h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-charcoal-600 mt-1">
                            <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                {studio.location}
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {timeRangeString}
                            </span>
                            <span className="flex items-center gap-1">
                                <CreditCard className="w-3.5 h-3.5 shrink-0" />
                                ₱{studio.hourly_rate}/hr
                            </span>
                        </div>
                        <div className="mt-2 text-xs text-charcoal-500 font-medium bg-cream-50 px-2 py-1 rounded inline-block">
                            {slots.length} available slots
                        </div>
                    </div>
                </div>

                <div className="text-charcoal-400">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
            </div>

            {/* Expanded View: Individual Slots grouped by time */}
            {isExpanded && (
                <div className="p-4 sm:p-6 pt-0 border-t border-cream-100 bg-cream-50/30">
                    <h4 className="text-sm font-medium text-charcoal-700 mb-3 mt-4">Select a time block to book:</h4>
                    <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {Object.entries(groupedSlots).map(([key, group]) => {
                            const slotStart = new Date(group.slots[0].start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                            const slotEnd = new Date(group.slots[0].end_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

                            return (
                                <BookSlotGroup
                                    key={key}
                                    startTime={slotStart}
                                    endTime={slotEnd}
                                    slots={group.slots}
                                />
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
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
