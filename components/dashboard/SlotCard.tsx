import { Slot } from '@/types';
import { Clock, CreditCard, Calendar, MapPin } from 'lucide-react';
import BookSlotButton from './BookSlotButton';

interface SlotCardProps {
    slot: Slot;
}

export default function SlotCard({ slot }: SlotCardProps) {
    const studio = slot.studios!;
    // Combine date and time correctly to avoid Invalid Date issues
    const startDateStr = `${slot.date}T${slot.start_time}+08:00`;
    const endDateStr = `${slot.date}T${slot.end_time}+08:00`;
    
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    const startTime = startDate.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hour12: true });
    const endTime = endDate.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hour12: true });
    const dateString = startDate.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'short', month: 'short', day: 'numeric' });

    return (
        <div className="earth-card p-6 h-full flex flex-col justify-between group hover:translate-y-[-4px] transition-all duration-300 shadow-tight relative">
            <div>
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                    <h3 className="text-xl font-serif font-bold text-charcoal tracking-tight leading-tight group-hover:text-forest transition-colors line-clamp-2">
                        {studio?.name || 'Unknown Studio'}
                    </h3>
                    <div className="status-pill-earth status-pill-green shrink-0 flex items-center gap-1.5 max-w-full">
                        <MapPin className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{studio?.location || 'Unknown Location'}</span>
                    </div>
                </div>

                {/* Equipment Badges */}
                {(slot.equipment || (slot.studios?.equipment && slot.studios.equipment.length > 0)) && (
                    <div className="flex flex-wrap gap-2 mb-6">
                        {slot.equipment ? (
                            Object.entries(slot.equipment || {}).map(([item, qty], i) => (
                                <span key={i} className="px-2.5 py-1 bg-white text-slate border border-border-grey text-[9px] rounded-full uppercase tracking-widest font-bold shadow-tight">
                                    {qty}x {item}
                                </span>
                            ))
                        ) : (
                            slot.studios?.equipment && slot.studios.equipment.slice(0, 3).map((item, i) => (
                                <span key={i} className="px-2.5 py-1 bg-white text-slate border border-border-grey text-[9px] rounded-full uppercase tracking-widest font-bold shadow-tight">
                                    {item}
                                </span>
                            ))
                        )}
                        {!slot.equipment && (slot.studios?.equipment?.length || 0) > 3 && (
                            <span className="px-2.5 py-1 bg-off-white text-slate/40 text-[9px] rounded-full font-bold">
                                +{(slot.studios?.equipment?.length || 0) - 3}
                            </span>
                        )}
                    </div>
                )}

                <div className="space-y-3 mb-8">
                    <div className="flex items-center gap-3">
                        <Calendar className="w-3.5 h-3.5 text-forest" />
                        <span className="text-[11px] font-bold text-slate uppercase tracking-tighter">{dateString}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Clock className="w-3.5 h-3.5 text-forest" />
                        <span className="text-[11px] font-bold text-slate uppercase tracking-tighter">{startTime} - {endTime}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <CreditCard className="w-3.5 h-3.5 text-forest" />
                        <span className="text-[13px] font-bold text-charcoal tracking-tight">
                            {(() => {
                                const minPrice = (studio?.pricing && Object.values(studio.pricing).some(v => typeof v === 'number' && v > 0))
                                    ? Math.min(...Object.values(studio.pricing as Record<string, number>).filter(v => typeof v === 'number' && v > 0))
                                    : null;
                                return minPrice !== null ? `From ₱${minPrice.toLocaleString()}` : 'Price on Request';
                            })()}
                        </span>
                    </div>
                </div>
            </div>

            <BookSlotButton
                slotId={slot.id}
                availableEquipment={slot.equipment ? Object.keys(slot.equipment) : (slot.studios?.equipment || [])}
            />
        </div>
    );
}
