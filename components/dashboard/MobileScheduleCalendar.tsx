'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { format, addDays, startOfWeek, isSameDay, eachDayOfInterval, startOfDay } from 'date-fns';
import { MapPin, Clock, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Sparkles, Plus } from 'lucide-react';
import { clsx } from 'clsx';

interface Session {
    id: string;
    start_time: string;
    end_time: string;
    date: string;
    type: string;
    location: string;
    is_booked: boolean;
    displayRatio?: string;
    displayTitle?: string;
}

interface MobileScheduleCalendarProps {
    initialSessions: Session[];
    currentDate?: Date;
    onAddSlot?: (date: Date) => void;
    onRecurringSchedule?: () => void;
    onSlotClick?: (session: Session) => void;
}

export default function MobileScheduleCalendar({
    initialSessions = [],
    currentDate = new Date(),
    onAddSlot,
    onRecurringSchedule,
    onSlotClick
}: MobileScheduleCalendarProps) {
    const [selectedDate, setSelectedDate] = useState(startOfDay(currentDate));
    const scrollRef = useRef<HTMLDivElement>(null);
    const agendaRef = useRef<HTMLDivElement>(null);

    // Generate current week for horizontal scroll
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekDays = useMemo(() =>
        eachDayOfInterval({
            start: weekStart,
            end: addDays(weekStart, 13) // Show 2 weeks for better scrolling behavior
        }), [weekStart]
    );

    // Filter and consolidate sessions for selected date
    const agendaSessions = useMemo(() => {
        const filtered = initialSessions.filter(s => isSameDay(new Date(s.date), selectedDate));

        // Group availability-only slots by time
        const consolidated: any[] = [];
        const availabilityGroups: Record<string, any> = {};

        filtered.forEach(s => {
            if (s.is_booked) {
                consolidated.push(s);
            } else {
                const key = `${s.start_time}-${s.end_time}`;
                const mainLoc = s.location?.split(' - ')[0] || s.location || 'Studio';

                if (!availabilityGroups[key]) {
                    availabilityGroups[key] = {
                        ...s,
                        locations: [mainLoc]
                    };
                } else {
                    if (!availabilityGroups[key].locations.includes(mainLoc)) {
                        availabilityGroups[key].locations.push(mainLoc);
                    }
                }
            }
        });

        // Add grouped availability to the list
        Object.values(availabilityGroups).forEach(group => {
            consolidated.push(group);
        });

        return consolidated.sort((a, b) => a.start_time.localeCompare(b.start_time));
    }, [initialSessions, selectedDate]);

    // Helper to check for dots
    const getDateStatus = (date: Date) => {
        const dateSessions = initialSessions.filter(s => isSameDay(new Date(s.date), date));
        if (dateSessions.length === 0) return null;
        const hasBooked = dateSessions.some(s => s.is_booked);
        const hasAvailable = dateSessions.some(s => !s.is_booked);
        return { hasBooked, hasAvailable };
    };

    const formatTo12Hour = (time: string) => {
        const [hour, minute] = time.split(':');
        const h = parseInt(hour);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 || 12;
        return `${displayH}:${minute} ${ampm}`;
    };

    const currentTimeIndex = useMemo(() => {
        if (!isSameDay(selectedDate, new Date())) return -1;
        const nowStr = format(new Date(), 'HH:mm');
        const index = agendaSessions.findIndex(s => s.start_time > nowStr);
        return index === -1 ? agendaSessions.length : index;
    }, [agendaSessions, selectedDate]);

    // Auto-scroll logic for selected date (Weekly Strip)
    useEffect(() => {
        if (scrollRef.current) {
            const selectedIdx = weekDays.findIndex(day => isSameDay(day, selectedDate));
            if (selectedIdx !== -1) {
                const element = scrollRef.current.children[selectedIdx] as HTMLElement;
                if (element) {
                    scrollRef.current.scrollTo({
                        left: element.offsetLeft - (scrollRef.current.offsetWidth / 2) + (element.offsetWidth / 2),
                        behavior: 'smooth'
                    });
                }
            }
        }
    }, [selectedDate, weekDays]);

    // Agenda Auto-scroll logic
    useEffect(() => {
        if (agendaRef.current && isSameDay(selectedDate, new Date())) {
            const nowTime = format(new Date(), 'HH:mm');
            const targetSession = agendaSessions.find(s => s.start_time >= nowTime) || agendaSessions[0];

            if (targetSession) {
                const sessionElement = document.getElementById(`session-${targetSession.id}`);
                if (sessionElement) {
                    sessionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        }
    }, [selectedDate, agendaSessions]);

    return (
        <div className="flex flex-col h-full bg-off-white/50 font-sans antialiased text-charcoal">
            {/* Sticky Top Section: Weekly Strip */}
            <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-border-grey/60 px-4 pt-5 pb-3 shadow-tight">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex flex-col">
                        <h2 className="text-xl font-serif text-charcoal tracking-tighter leading-none">
                            {format(selectedDate, 'MMMM yyyy')}
                        </h2>
                        <p className="text-[8px] font-black tracking-[0.4em] text-charcoal/40 uppercase mt-1">Schedule View</p>
                    </div>
                    <div className="flex bg-off-white/50 backdrop-blur-sm rounded-full p-0.5 border border-border-grey/60">
                        <button
                            onClick={() => setSelectedDate(addDays(selectedDate, -7))}
                            className="p-1.5 hover:bg-white rounded-full transition-all text-charcoal/40 hover:text-charcoal border border-transparent hover:border-border-grey hover:shadow-tight"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => setSelectedDate(startOfDay(new Date()))}
                            className="px-3 py-1 text-[8px] font-black text-charcoal uppercase tracking-[0.3em]"
                        >
                            Today
                        </button>
                        <button
                            onClick={() => setSelectedDate(addDays(selectedDate, 7))}
                            className="p-1.5 hover:bg-white rounded-full transition-all text-charcoal/40 hover:text-charcoal border border-transparent hover:border-border-grey hover:shadow-tight"
                        >
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Mobile Action Buttons */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                    <button
                        onClick={() => onAddSlot?.(selectedDate)}
                        className="flex items-center justify-center gap-2 py-2.5 bg-forest text-white rounded-lg text-[9px] font-black uppercase tracking-[0.2em] shadow-tight active:scale-95 transition-all"
                    >
                        <Plus className="w-3.5 h-3.5 stroke-[3px]" /> Add Slot
                    </button>
                    {onRecurringSchedule && (
                        <button
                            onClick={() => onRecurringSchedule()}
                            className="flex items-center justify-center gap-2 py-2.5 bg-white text-charcoal border border-border-grey rounded-lg text-[9px] font-black uppercase tracking-[0.2em] shadow-tight active:scale-95 transition-all"
                        >
                            <CalendarIcon className="w-3.5 h-3.5 text-forest" /> Recurring
                        </button>
                    )}
                </div>

                <div
                    ref={scrollRef}
                    className="flex overflow-x-auto no-scrollbar gap-1.5 pb-3 snap-x"
                >
                    {weekDays.map((day) => {
                        const isSelected = isSameDay(day, selectedDate);
                        const isToday = isSameDay(day, new Date());
                        const status = getDateStatus(day);

                        return (
                            <button
                                key={day.toISOString()}
                                onClick={() => setSelectedDate(day)}
                                className="flex flex-col items-center min-w-[42px] snap-center group focus:outline-none py-1"
                            >
                                <span className={clsx(
                                    "text-[8px] font-black uppercase tracking-[0.15em] mb-2.5 transition-colors",
                                    isSelected ? "text-charcoal" : "text-slate"
                                )}>
                                    {format(day, 'EEE')}
                                </span>
                                <div className={clsx(
                                    "w-9 h-9 flex items-center justify-center rounded-full text-[12px] font-black transition-all duration-300",
                                    isToday
                                        ? "bg-buttermilk text-charcoal shadow-tight scale-110 border-2 border-charcoal/20"
                                        : isSelected
                                            ? "border-2 border-charcoal text-charcoal bg-buttermilk/10 scale-110"
                                            : "text-charcoal/60 hover:bg-off-white border border-transparent hover:border-border-grey"
                                )}>
                                    {format(day, 'd')}
                                </div>
                                {/* Indicator Dots */}
                                <div className="flex gap-0.5 mt-2 h-1">
                                    {status?.hasBooked && (
                                        <div className="w-1 h-1 rounded-full bg-forest shadow-[0_0_6px_rgba(26,28,30,0.3)]" />
                                    )}
                                    {status?.hasAvailable && (
                                        <div className="w-1 h-1 rounded-full bg-charcoal/20 border border-charcoal/20" />
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Bottom Section: Agenda List */}
            <div ref={agendaRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4 scroll-smooth">
                <div className="flex items-center gap-3 mb-2">
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[#E5E7EB]" />
                    <span className="text-[9px] font-black text-burgundy uppercase tracking-[0.35em] px-3">
                        {format(selectedDate, 'EEEE, MMM d')}
                    </span>
                    <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[#E5E7EB]" />
                </div>

                {agendaSessions.length > 0 ? (
                    <div className="space-y-3">
                        {agendaSessions.map((session, index) => (
                            <React.Fragment key={session.id}>
                                {currentTimeIndex === index && (
                                    <div className="flex items-center gap-3 py-1.5 animate-in fade-in slide-in-from-left duration-700">
                                        <div className="w-2.5 h-2.5 rounded-full bg-burgundy shadow-[0_0_12px_rgba(67,48,46,0.4)] flex-shrink-0" />
                                        <div className="h-[2px] flex-1 bg-forest opacity-30" />
                                        <span className="text-[8px] font-black text-charcoal uppercase tracking-widest whitespace-nowrap">Now</span>
                                    </div>
                                )}
                                <div
                                    id={`session-${session.id}`}
                                    onClick={() => onSlotClick?.(session)}
                                    className={clsx(
                                        "w-full rounded-2xl p-4 shadow-tight active:scale-[0.98] transition-all duration-300 flex flex-col gap-3 relative overflow-hidden group cursor-pointer border",
                                        session.is_booked
                                            ? "bg-forest text-white border-forest/20"
                                            : "bg-white/80 backdrop-blur-sm border-border-grey/50 text-charcoal"
                                    )}
                                >
                                    {session.is_booked && (
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none" />
                                    )}
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="space-y-2 flex-1 min-w-0">
                                            <div className={clsx("flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.25em]", session.is_booked ? "text-white/60" : "text-charcoal/40")}>
                                                <div className={clsx("px-2.5 py-1 rounded-lg border flex items-center gap-2 w-full sm:w-auto", session.is_booked ? "bg-white/10 border-white/20" : "bg-off-white/70 border-border-grey/60")}>
                                                    <Clock className="w-3 h-3 shrink-0" />
                                                    <span className="truncate">{formatTo12Hour(session.start_time)} — {formatTo12Hour(session.end_time)}</span>
                                                </div>
                                            </div>
                                            <h3 className={clsx("text-base font-serif text-charcoal tracking-tight leading-none truncate", session.is_booked && "text-white")}>
                                                {session.displayTitle || (session.is_booked ? session.type : 'Available Opening')}
                                            </h3>
                                        </div>
                                        {session.displayRatio ? (
                                            <div className="bg-buttermilk text-charcoal px-3 py-1 rounded-full text-[9px] font-black tracking-widest shadow-sm shrink-0 border border-charcoal/5">
                                                {session.displayRatio}
                                            </div>
                                        ) : session.is_booked ? (
                                            <div className="bg-white/20 text-white px-3 py-1 rounded-full text-[9px] font-black tracking-widest shadow-sm shrink-0 border border-white/20">
                                                1/1
                                            </div>
                                        ) : (
                                            <div className="bg-off-white/70 text-charcoal/40 border border-border-grey/60 px-3 py-1 rounded-full text-[9px] font-black tracking-widest shrink-0 shadow-sm">
                                                0/1
                                            </div>
                                        )}
                                    </div>

                                    <div className={clsx("flex flex-wrap items-center gap-2 pt-2 border-t", session.is_booked ? "border-white/10" : "border-[#EADED7]")}>
                                        {session.locations ? (
                                            session.locations.map((loc: string, idx: number) => (
                                                <a 
                                                    key={idx} 
                                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className={clsx(
                                                        "flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-all text-[8px] font-bold uppercase tracking-wider",
                                                        session.is_booked 
                                                            ? "text-white/70 bg-white/10 border-white/20 hover:bg-forest hover:text-white"
                                                            : "text-slate bg-white/60 border-border-grey hover:bg-forest hover:text-white hover:border-forest"
                                                    )}
                                                >
                                                    <MapPin className="w-3 h-3" />
                                                    {loc}
                                                </a>
                                            ))
                                        ) : (
                                            <a 
                                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(session.location)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className={clsx(
                                                    "flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-all text-[8px] font-bold uppercase tracking-wider",
                                                    session.is_booked 
                                                        ? "text-white/70 bg-white/10 border-white/20 hover:bg-white/20" 
                                                        : "text-muted-burgundy bg-white/60 border-border-grey hover:bg-forest hover:text-white hover:border-forest"
                                                )}
                                            >
                                                <MapPin className="w-3 h-3" />
                                                {session.location?.split(' - ')[0] || session.location || 'Studio'}
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </React.Fragment>
                        ))}
                        {currentTimeIndex === agendaSessions.length && (
                            <div className="flex items-center gap-3 py-1.5 animate-in fade-in slide-in-from-left duration-700">
                                <div className="w-2.5 h-2.5 rounded-full bg-burgundy shadow-[0_0_12px_rgba(67,48,46,0.4)] flex-shrink-0" />
                                <div className="h-[2px] flex-1 bg-forest opacity-30" />
                                <span className="text-[8px] font-black text-charcoal uppercase tracking-widest whitespace-nowrap">Now</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-border-grey/50 shadow-tight relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-b from-buttermilk/5 to-transparent pointer-events-none" />
                        <div className="w-14 h-14 bg-off-white rounded-full flex items-center justify-center border border-border-grey/50 shadow-tight mb-5 relative z-10 group-hover:scale-110 transition-transform duration-700">
                            <CalendarIcon className="w-6 h-6 text-burgundy/40" />
                        </div>
                        <h3 className="text-[10px] font-black text-burgundy uppercase tracking-[0.4em] mb-2 relative z-10">Rest Day</h3>
                        <p className="text-[8px] font-black text-charcoal/50 uppercase tracking-[0.2em] max-w-[180px] relative z-10">No sessions scheduled for this day.</p>
                    </div>
                )}
            </div>

            <style jsx>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
}
