import { Slot } from '@/types';
import { Clock, CreditCard, Calendar } from 'lucide-react';
import BookSlotButton from './BookSlotButton';

interface SlotCardProps {
    slot: Slot;
}

export default function SlotCard({ slot }: SlotCardProps) {
    const studio = slot.studios!;
    const startDate = new Date(slot.start_time);
    const startTime = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const endTime = new Date(slot.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateString = startDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

    return (
        <div className="bg-white border border-cream-300 rounded-xl p-5 hover:shadow-md transition-shadow flex flex-col justify-between h-full group">
            <div>
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-serif text-lg text-charcoal-900 leading-tight group-hover:text-charcoal-700 transition-colors">
                        {studio.name}
                    </h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cream-200 text-charcoal-800">
                        {studio.location}
                    </span>
                </div>

                {slot.studios?.equipment && slot.studios.equipment.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                        {slot.studios.equipment.slice(0, 3).map((item, i) => (
                            <span key={i} className="px-2 py-0.5 bg-cream-100 text-charcoal-600 text-[10px] rounded-full uppercase tracking-wider font-medium">
                                {item}
                            </span>
                        ))}
                        {slot.studios.equipment.length > 3 && (
                            <span className="px-2 py-0.5 bg-cream-50 text-charcoal-400 text-[10px] rounded-full font-medium">
                                +{slot.studios.equipment.length - 3}
                            </span>
                        )}
                    </div>
                )}

                <div className="space-y-2 text-sm text-charcoal-600 mb-4">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-charcoal-400" />
                        <span>{dateString}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-charcoal-400" />
                        <span>{startTime} - {endTime}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-charcoal-400" />
                        <span className="font-medium text-charcoal-900">
                            {(() => {
                                const minPrice = studio.pricing && Object.values(studio.pricing).some(v => typeof v === 'number' && v > 0)
                                    ? Math.min(...Object.values(studio.pricing).filter(v => typeof v === 'number' && v > 0))
                                    : null;
                                return minPrice !== null ? `From ₱${minPrice.toLocaleString()}` : 'Price on Request';
                            })()}
                        </span>
                    </div>
                </div>
            </div>

            <BookSlotButton slotId={slot.id} availableEquipment={slot.studios?.equipment || []} />
        </div>
    );
}
