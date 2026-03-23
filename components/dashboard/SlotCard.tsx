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
        <div className="marketplace-card earth-card overflow-hidden h-full flex flex-col group hover:translate-y-[-4px] transition-all duration-300 shadow-tight relative">

            {/* ── Banner: studio lifestyle area (aspect-video) ── */}
            <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-off-white via-buttermilk/30 to-walking-vinnie/30">
                <div
                    className="absolute inset-0 opacity-25"
                    style={{ backgroundImage: 'radial-gradient(circle at 75% 85%, rgba(81,50,41,0.2) 0%, transparent 55%)' }}
                    aria-hidden="true"
                />
                {/* Studio name initial as large letter */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-burgundy/10 font-serif italic select-none" style={{ fontSize: '6rem' }}>
                        {studio?.name?.slice(0, 1) || 'S'}
                    </span>
                </div>

                {/* Location badge top-left */}
                <div className="absolute top-3 left-3 z-10">
                    <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-2.5 py-1.5 rounded-full shadow-tight border border-white/60">
                        <MapPin className="w-2.5 h-2.5 text-burgundy shrink-0" />
                        <span className="text-[9px] font-bold text-burgundy truncate max-w-[150px]">
                            {studio?.location || 'Unknown Location'}
                        </span>
                    </div>
                </div>

                {/* Price highlight top-right — The Bay accent */}
                <div className="absolute top-3 right-3 z-10">
                    <div className="tag-last-minute">
                        {(() => {
                            const minPrice = (studio?.pricing && Object.values(studio.pricing).some(v => typeof v === 'number' && v > 0))
                                ? Math.min(...Object.values(studio.pricing as Record<string, number>).filter(v => typeof v === 'number' && v > 0))
                                : null;
                            return minPrice !== null ? `From ₱${minPrice.toLocaleString()}` : 'POR';
                        })()}
                    </div>
                </div>

                {/* Studio trust avatar overlapping bottom edge */}
                <div className="instructor-trust-avatar">
                    <div className="w-full h-full flex items-center justify-center bg-off-white">
                        <span className="text-burgundy font-bold font-serif text-base">
                            {studio?.name?.slice(0, 1) || 'S'}
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Card Body ── */}
            <div className="p-5 pt-10 flex flex-col gap-y-4 flex-1">

                {/* Studio name */}
                <h3 className="text-lg font-serif font-bold text-burgundy tracking-tight leading-tight group-hover:text-burgundy/80 transition-colors line-clamp-2">
                    {studio?.name || 'Unknown Studio'}
                </h3>

                {/* Equipment Badges */}
                {(slot.equipment || (slot.studios?.equipment && slot.studios.equipment.length > 0)) && (
                    <div className="flex flex-wrap gap-1.5">
                        {slot.equipment ? (
                            Object.entries(slot.equipment || {}).map(([item, qty], i) => (
                                <span key={i} className="px-2.5 py-1 bg-walking-vinnie/40 text-burgundy border border-walking-vinnie text-[9px] rounded-full uppercase tracking-widest font-bold">
                                    {qty}x {item}
                                </span>
                            ))
                        ) : (
                            slot.studios?.equipment && slot.studios.equipment.slice(0, 3).map((item, i) => (
                                <span key={i} className="px-2.5 py-1 bg-walking-vinnie/40 text-burgundy border border-walking-vinnie text-[9px] rounded-full uppercase tracking-widest font-bold">
                                    {item}
                                </span>
                            ))
                        )}
                        {!slot.equipment && (slot.studios?.equipment?.length || 0) > 3 && (
                            <span className="px-2.5 py-1 bg-off-white text-muted-burgundy text-[9px] rounded-full font-bold">
                                +{(slot.studios?.equipment?.length || 0) - 3}
                            </span>
                        )}
                    </div>
                )}

                {/* Time + Date details — clear Sans-Serif */}
                <div className="flex flex-col gap-y-2">
                    <div className="flex items-center gap-2.5">
                        <Calendar className="w-3.5 h-3.5 text-muted-burgundy shrink-0" />
                        <span className="text-[11px] font-semibold text-muted-burgundy uppercase tracking-tight">{dateString}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <Clock className="w-3.5 h-3.5 text-muted-burgundy shrink-0" />
                        <span className="text-[11px] font-semibold text-muted-burgundy uppercase tracking-tight">{startTime} – {endTime}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <CreditCard className="w-3.5 h-3.5 text-burgundy shrink-0" />
                        <span className="text-[13px] font-bold text-burgundy tracking-tight">
                            {(() => {
                                const minPrice = (studio?.pricing && Object.values(studio.pricing).some(v => typeof v === 'number' && v > 0))
                                    ? Math.min(...Object.values(studio.pricing as Record<string, number>).filter(v => typeof v === 'number' && v > 0))
                                    : null;
                                return minPrice !== null ? `From ₱${minPrice.toLocaleString()}` : 'Price on Request';
                            })()}
                        </span>
                    </div>
                </div>

                {/* Book Slot CTA */}
                <div className="mt-auto pt-2">
                    <BookSlotButton
                        slotId={slot.id}
                        availableEquipment={slot.equipment ? Object.keys(slot.equipment) : (slot.studios?.equipment || [])}
                    />
                </div>
            </div>
        </div>
    );
}
